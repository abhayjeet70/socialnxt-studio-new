import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, Check, X, Plus, FileText, Loader2,
  Paperclip, Eye, ExternalLink,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  useCurrentWorkspace, useProposals, useCreateProposal,
  useUpdateProposalStatus, useDeleteProposal, useClients, Proposal,
  uploadProposalPDF, useWorkspaceMembers
} from "@/lib/queries";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/proposals")({
  head: () => ({ meta: [{ title: "Proposals — SocialNxt CRM" }] }),
  component: ProposalsPage,
});

const STATUS_TONE: Record<string, string> = {
  Draft: "bg-muted text-foreground/70",
  Sent: "bg-primary/10 text-primary",
  Approved: "bg-[#10B981]/10 text-[#047857]",
  Rejected: "bg-[#EF4444]/10 text-[#B91C1C]",
};

const STATUSES = ["Draft", "Sent", "Approved", "Rejected"];

function ProposalsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: proposals = [], isLoading } = useProposals(workspace?.workspaceId);
  const { data: clients = [] } = useClients(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const createProposal = useCreateProposal();
  const updateStatus = useUpdateProposalStatus();
  const deleteProposal = useDeleteProposal();

  const isClient = workspace?.role === "client";
  const isAdmin = workspace?.role === "admin";
  const canEdit = workspace?.role === "admin" || workspace?.role === "employee";

  // Combine clients from clients table with actual workspace members who are clients
  const clientNames = new Set(clients.map(c => c.name));
  members.filter(m => m.role === 'client').forEach(m => {
    const name = m.users?.full_name || m.users?.email?.split('@')[0];
    if (name) clientNames.add(name);
  });
  const allClientNames = Array.from(clientNames).sort();

  // New Proposal Dialog state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_name: "", amount: "", notes: "", status: "Draft" });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF must be under 20 MB.");
      return;
    }
    setPdfFile(file);
  };

  const handleCreate = async () => {
    if (!form.title || !form.client_name || !form.amount) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (!workspace) return;
    const { data: { user } } = await (await import("@/lib/supabase")).supabase.auth.getUser();
    if (!user) return;

    setUploadingPdf(true);
    let pdfUrl: string | null = null;
    try {
      if (pdfFile) {
        pdfUrl = await uploadProposalPDF(pdfFile);
      }
    } catch (err: any) {
      toast.error("PDF upload failed: " + err.message);
      setUploadingPdf(false);
      return;
    }
    setUploadingPdf(false);

    createProposal.mutate(
      {
        workspace_id: workspace.workspaceId,
        created_by: user.id,
        title: form.title,
        client_name: form.client_name,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
        status: form.status as Proposal["status"],
        pdf_url: pdfUrl,
      },
      {
        onSuccess: () => {
          toast.success("Proposal created!");
          setOpen(false);
          setForm({ title: "", client_name: "", amount: "", notes: "", status: "Draft" });
          setPdfFile(null);
        },
        onError: (e) => toast.error("Failed: " + e.message),
      }
    );
  };

  const handleStatusChange = (proposal: Proposal, newStatus: string) => {
    if (!workspace) return;
    updateStatus.mutate(
      { id: proposal.id, status: newStatus, workspace_id: workspace.workspaceId, proposal },
      {
        onSuccess: () => {
          toast.success(
            newStatus === "Approved"
              ? "Proposal approved! Revenue updated."
              : `Proposal marked as ${newStatus}.`
          );
        },
        onError: (e) => toast.error("Failed: " + e.message),
      }
    );
  };

  const handleDelete = (proposal: Proposal) => {
    if (!confirm(`Delete proposal "${proposal.title}"?`)) return;
    deleteProposal.mutate(
      { id: proposal.id },
      {
        onSuccess: () => toast.success("Proposal deleted."),
        onError: (e) => toast.error("Failed: " + e.message),
      }
    );
  };

  // Filter proposals for clients — only show proposals addressed to them (and hide Drafts)
  const visibleProposals = isClient
    ? proposals.filter((p) => {
        const clientName = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";
        return p.client_name?.toLowerCase() === clientName.toLowerCase() && p.status !== "Draft";
      })
    : proposals;

  return (
    <AppShell
      title="Proposals"
      subtitle="Send, track and manage client proposals end-to-end."
      actions={
        canEdit ? (
          <Button className="rounded-xl h-10" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Proposal
          </Button>
        ) : null
      }
    >
      <div className="card-soft p-4 sm:p-5">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : visibleProposals.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {isClient ? "No proposals have been sent to you yet." : "No proposals yet. Click \"New Proposal\" to create one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 font-semibold">Proposal</th>
                  <th className="px-3 py-3 font-semibold">Client</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">PDF</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Created</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProposals.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                    {/* Proposal title */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{p.title}</div>
                          {p.notes && <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{p.notes}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-foreground/80">{p.client_name}</td>
                    <td className="px-3 py-3 font-semibold">₹{p.amount.toLocaleString("en-IN")}</td>

                    {/* PDF column */}
                    <td className="px-3 py-3">
                      {p.pdf_url ? (
                        <a
                          href={p.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/8 hover:bg-primary/15 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View PDF
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No PDF</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      {/* Employees/admins can change status between Draft/Sent; if Approved/Rejected it locks as a badge */}
                      {canEdit && (p.status === "Draft" || p.status === "Sent") ? (
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_TONE[p.status]}`}
                        >
                          {["Draft", "Sent"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge className={`rounded-full border-0 ${STATUS_TONE[p.status]}`}>{p.status}</Badge>
                      )}
                    </td>

                    <td className="px-3 py-3 text-foreground/80">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download PDF */}
                        {p.pdf_url && (
                          <a
                            href={p.pdf_url}
                            download
                            title="Download PDF"
                            className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}

                        {/* Client-only Approve button */}
                        {isClient && p.status === "Sent" && (
                          <button
                            title="Approve Proposal"
                            onClick={() => handleStatusChange(p, "Approved")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981]/10 text-[#047857] hover:bg-[#10B981]/20 text-xs font-semibold transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}

                        {/* Client-only Reject button */}
                        {isClient && p.status === "Sent" && (
                          <button
                            title="Reject Proposal"
                            onClick={() => handleStatusChange(p, "Rejected")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444]/10 text-[#B91C1C] hover:bg-[#EF4444]/20 text-xs font-semibold transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        )}

                        {/* Admin delete */}
                        {isAdmin && (
                          <button
                            title="Delete"
                            onClick={() => handleDelete(p)}
                            className="h-8 w-8 rounded-lg hover:bg-[#EF4444]/10 text-[#B91C1C] grid place-items-center"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Proposal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Proposal</DialogTitle>
            <DialogDescription>Create a new client proposal. Upload a PDF for the client to review and approve.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Proposal Title *</Label>
              <Input placeholder="e.g. Q3 Social Retainer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label>Client *</Label>
              {allClientNames.length > 0 ? (
                <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {allClientNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Client name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              )}
            </div>

            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="e.g. 135000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Draft", "Sent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            {/* PDF Upload */}
            <div className="space-y-1">
              <Label>Proposal PDF</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  pdfFile ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/40"
                }`}
              >
                <Paperclip className={`h-4 w-4 shrink-0 ${pdfFile ? "text-primary" : "text-muted-foreground"}`} />
                {pdfFile ? (
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{pdfFile.name}</div>
                    <div className="text-[11px] text-muted-foreground">{(pdfFile.size / 1024).toFixed(0)} KB · Click to change</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-muted-foreground">Upload PDF proposal</div>
                    <div className="text-[11px] text-muted-foreground/60">PDF only, max 20 MB</div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfSelect}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setOpen(false); setPdfFile(null); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createProposal.isPending || uploadingPdf}>
                {uploadingPdf ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading PDF...</>
                ) : createProposal.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                ) : "Create Proposal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
