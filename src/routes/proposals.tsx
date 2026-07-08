import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, Check, X, Plus, FileText, Loader2,
  Paperclip, Eye, ExternalLink, Edit3, Trash2
} from "lucide-react";
import { useState, useRef } from "react";
import {
  useCurrentWorkspace, useProposals, useCreateProposal, useUpdateProposal,
  useUpdateProposalStatus, useDeleteProposal, useClients, Proposal,
  uploadProposalPDF, useWorkspaceMembers
} from "@/lib/queries";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const updateProposal = useUpdateProposal();
  const updateStatus = useUpdateProposalStatus();
  const deleteProposal = useDeleteProposal();

  const isClient = workspace?.role === "client";
  const isAdmin = workspace?.role === "admin";
  const canEdit = workspace?.role === "admin" || workspace?.role === "employee";

  // Combine clients from clients table with actual workspace members who are clients
  const closedClientNames = new Set(clients.filter(c => c.status === "Closed").map(c => c.name.toLowerCase()));
  const closedClientEmails = new Set(clients.filter(c => c.status === "Closed" && c.email).map(c => c.email!.toLowerCase()));

  const clientNames = new Set(clients.filter(c => c.status !== "Closed").map(c => c.name));
  members.filter(m => m.role === 'client').forEach(m => {
    const name = m.users?.full_name || m.users?.email?.split('@')[0];
    const email = m.users?.email?.toLowerCase();
    const isClosedByName = name && closedClientNames.has(name.toLowerCase());
    const isClosedByEmail = email && closedClientEmails.has(email);
    
    if (name && !isClosedByName && !isClosedByEmail) {
      clientNames.add(name);
    }
  });
  const allClientNames = Array.from(clientNames).sort();

  const [open, setOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [form, setForm] = useState({ title: "", client_name: "", amount: "", notes: "", status: "Draft" });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

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

  const handleSave = async () => {
    if (!form.title || !form.client_name || !form.amount) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (!workspace) return;
    const { data: { user } } = await (await import("@/lib/supabase")).supabase.auth.getUser();
    if (!user) return;

    setUploadingPdf(true);
    let pdfUrl: string | null = editingProposal ? editingProposal.pdf_url : null;
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

    if (editingProposal) {
      updateProposal.mutate(
        {
          id: editingProposal.id,
          workspace_id: workspace.workspaceId,
          title: form.title,
          client_name: form.client_name,
          amount: parseFloat(form.amount),
          notes: form.notes || null,
          status: form.status as Proposal["status"],
          pdf_url: pdfUrl,
        },
        {
          onSuccess: () => {
            toast.success("Proposal updated!");
            setOpen(false);
            setEditingProposal(null);
            setForm({ title: "", client_name: "", amount: "", notes: "", status: "Draft" });
            setPdfFile(null);
          },
          onError: (e) => toast.error("Failed: " + e.message),
        }
      );
    } else {
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
    }
  };

  const handleEdit = (p: Proposal) => {
    setEditingProposal(p);
    setForm({
      title: p.title,
      client_name: p.client_name,
      amount: String(p.amount),
      notes: p.notes || "",
      status: p.status,
    });
    setPdfFile(null);
    setOpen(true);
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

  // Filter proposals
  let visibleProposals = isClient
    ? proposals.filter((p) => {
        const clientName = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";
        return p.client_name?.toLowerCase() === clientName.toLowerCase() && p.status !== "Draft";
      })
    : proposals;

  visibleProposals = visibleProposals.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (!isClient && filterClient !== "all" && p.client_name !== filterClient) return false;
    return true;
  });

  const handleBulkDownload = () => {
    if (visibleProposals.length === 0) return toast.info("No proposals to download.");
    
    // Create a CSV of all proposals as the "Bulk Download"
    const headers = "ID,Title,Client,Amount,Status,Created At\n";
    const csv = visibleProposals.map(p => 
      `${p.id},"${p.title}","${p.client_name}",${p.amount},${p.status},${p.created_at}`
    ).join("\n");
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposals-bulk-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Bulk download completed (CSV)");
  };

  const handleDownloadWord = (p: Proposal) => {
    // Generate a simple mock Word document content
    const content = `
Proposal: ${p.title}
Client: ${p.client_name}
Amount: ₹${p.amount.toLocaleString("en-IN")}
Status: ${p.status}
Created: ${new Date(p.created_at).toLocaleDateString()}

Notes:
${p.notes || "No additional notes."}
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.title.replace(/\s+/g, '-').toLowerCase()}-proposal.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Word Document");
  };

  return (
    <AppShell
      title="Proposals"
      subtitle="Send, track and manage client proposals end-to-end."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl h-10 border-border" onClick={handleBulkDownload} title="Bulk Download">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Bulk Download</span>
          </Button>
          {canEdit && (
            <Button className="rounded-xl h-10" onClick={() => {
              setEditingProposal(null);
              setForm({ title: "", client_name: "", amount: "", notes: "", status: "Draft" });
              setPdfFile(null);
              setOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">New Proposal</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="card-soft p-4 sm:p-5">
        {proposals.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {STATUSES.map((s) => {
                    if (isClient && s === "Draft") return null;
                    return <SelectItem key={s} value={s}>{s}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {!isClient && allClientNames.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Client</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {allClientNames.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

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
                        {/* Download PDF/Word */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              title="Download Proposal"
                              className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.pdf_url ? (
                              <DropdownMenuItem asChild>
                                <a href={p.pdf_url} download target="_blank" rel="noreferrer" className="cursor-pointer">
                                  <FileText className="h-4 w-4 mr-2" /> Download as PDF
                                </a>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <FileText className="h-4 w-4 mr-2" /> No PDF available
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDownloadWord(p)} className="cursor-pointer">
                              <FileText className="h-4 w-4 mr-2" /> Download as Word
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

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

                        {/* Admin delete & edit */}
                        {isAdmin && (
                          <>
                            <button
                              title="Edit"
                              onClick={() => handleEdit(p)}
                              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground grid place-items-center"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => handleDelete(p)}
                              className="h-8 w-8 rounded-lg hover:bg-[#EF4444]/10 text-[#B91C1C] grid place-items-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingProposal ? "Edit Proposal" : "New Proposal"}</DialogTitle>
            <DialogDescription>
              {editingProposal 
                ? "Update your proposal details and optionally replace the PDF." 
                : "Send a branded social media proposal — attach your PDF deck for the client to review and sign off."}
            </DialogDescription>
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
                    <div className="text-sm text-muted-foreground">Upload new PDF</div>
                    <div className="text-[11px] text-muted-foreground/60">PDF only, max 20 MB</div>
                    {editingProposal?.pdf_url && !pdfFile && (
                      <div className="text-xs text-primary mt-1 truncate">Current file exists. Upload new to replace.</div>
                    )}
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
              <Button variant="outline" onClick={() => { setOpen(false); setPdfFile(null); setEditingProposal(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={createProposal.isPending || updateProposal.isPending || uploadingPdf}>
                {uploadingPdf ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading PDF...</>
                ) : createProposal.isPending || updateProposal.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                ) : editingProposal ? "Update Proposal" : "Create Proposal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
