import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, MoreHorizontal, Loader2, Check, Users, Pencil, Trash2, Archive, Link } from "lucide-react";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import { useCurrentWorkspace, useClients, useCreateClient, useUpdateClient, useDeleteClient, useWorkspaceMembers, type Client } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients — SocialNxt CRM" }] }),
  component: ClientsPage,
});

const STATUS_TONE: Record<string, string> = {
  Planning: "bg-[#F59E0B]/10 text-[#B45309]",
  Designing: "bg-[#8B5CF6]/10 text-[#6D28D9]",
  Editing: "bg-[#06B6D4]/10 text-[#0E7490]",
  Review: "bg-[#F59E0B]/10 text-[#B45309]",
  Published: "bg-[#10B981]/10 text-[#047857]",
  Completed: "bg-[#10B981]/10 text-[#047857]",
};

const CLIENT_AVATAR_COLORS = [
  "#2563EB", "#10B981", "#F59E0B", "#EC4899",
  "#8B5CF6", "#06B6D4", "#EF4444", "#0EA5E9",
];

function getClientAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % CLIENT_AVATAR_COLORS.length;
  return CLIENT_AVATAR_COLORS[idx];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ClientsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: clients = [], isLoading: isLoadingClients } = useClients(workspace?.workspaceId);
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspace?.workspaceId);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const isLoading = isLoadingClients || isLoadingMembers;
  const isAdmin = workspace?.role === "admin" || workspace?.role === "employee";

  // ── Add state ──
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("Planning");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // ── Edit state ──
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editStatus, setEditStatus] = useState("Planning");
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);

  // ── Delete state ──
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  // ── Close Client state ──
  const [closeTarget, setCloseTarget] = useState<import("@/lib/queries").Client | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [platformFilter, setPlatformFilter] = useState("All Platforms");

  // Workspace members with role 'client'
  const clientMembers = members.filter((m) => m.role === "client");

  const togglePlatform = (p: string, arr: string[], setArr: (v: string[]) => void) => {
    setArr(arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p]);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    createClient.mutate({
      workspace_id: workspace.workspaceId,
      name,
      email,
      industry,
      platforms: selectedPlatforms,
      status,
    }, {
      onSuccess: () => {
        toast.success("Client added successfully!");
        setIsAddOpen(false);
        setName(""); setEmail(""); setIndustry(""); setSelectedPlatforms([]); setStatus("Planning");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const openEdit = (c: Client) => {
    setEditClient(c);
    setEditName(c.name);
    setEditEmail(c.email ?? "");
    setEditIndustry(c.industry ?? "");
    setEditStatus(c.status);
    setEditPlatforms(c.platforms ?? []);
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient || !workspace) return;
    updateClient.mutate({
      id: editClient.id,
      workspace_id: workspace.workspaceId,
      updates: {
        name: editName,
        email: editEmail || null,
        industry: editIndustry || null,
        platforms: editPlatforms,
        status: editStatus,
      },
    }, {
      onSuccess: () => {
        toast.success("Client updated successfully!");
        setEditClient(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDeleteClient = () => {
    if (!deleteTarget || !workspace) return;
    deleteClient.mutate({ id: deleteTarget.id, workspace_id: workspace.workspaceId }, {
      onSuccess: () => {
        toast.success("Client deleted.");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleCloseClient = async () => {
    if (!closeTarget || !workspace) return;
    setIsClosing(true);
    updateClient.mutate(
      {
        id: closeTarget.id,
        workspace_id: workspace.workspaceId,
        updates: {
          status: "Closed",
          closed_at: new Date().toISOString(),
          close_reason: closeReason || null,
        } as any,
      },
      {
        onSuccess: () => {
          toast.success(`${closeTarget.name} has been closed.`);
          setCloseTarget(null);
          setCloseReason("");
        },
        onError: (e) => toast.error("Failed: " + e.message),
        onSettled: () => setIsClosing(false),
      }
    );
  };

  const filteredClients = clients.filter(c => {
    if (c.status === "Closed") return false;  // Hide closed clients from main list
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "All Statuses" || c.status === statusFilter;
    const matchesPlatform = platformFilter === "All Platforms" || (c.platforms && c.platforms.includes(platformFilter));
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const filteredMembers = clientMembers.filter((m) => {
    const n = m.users?.full_name || m.users?.email?.split("@")[0] || "";
    const em = m.users?.email || "";
    const q = searchTerm.toLowerCase();
    const matchesSearch = n.toLowerCase().includes(q) || em.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All Statuses";
    const matchesPlatform = platformFilter === "All Platforms";
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <AppShell
      title="Clients"
      subtitle="All active and onboarding accounts across the agency."
      actions={
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-10" disabled={!workspace || workspace.role === 'client'}>
              <Plus className="h-4 w-4 mr-2" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateClient} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@acme.com" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology" />
              </div>
              <div className="space-y-2">
                <Label>Active Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = selectedPlatforms.includes(p);
                    return (
                      <Badge
                        key={p}
                        variant="outline"
                        className={`cursor-pointer px-3 py-1 ${isSelected ? "border-primary bg-primary/10 text-primary" : ""}`}
                        onClick={() => togglePlatform(p, selectedPlatforms, setSelectedPlatforms)}
                      >
                        {isSelected && <Check className="w-3 h-3 mr-1" />}
                        {p}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(STATUS_TONE).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createClient.isPending}>
                {createClient.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Save Client
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* ── Edit Client Dialog ── */}
      <Dialog open={!!editClient} onOpenChange={(open) => !open && setEditClient(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update this client's platforms, status, and contact details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateClient} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input required value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="hello@acme.com" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} placeholder="e.g. Technology" />
            </div>
            <div className="space-y-2">
              <Label>Active Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const isSelected = editPlatforms.includes(p);
                  return (
                    <Badge
                      key={p}
                      variant="outline"
                      className={`cursor-pointer px-3 py-1 ${isSelected ? "border-primary bg-primary/10 text-primary" : ""}`}
                      onClick={() => togglePlatform(p, editPlatforms, setEditPlatforms)}
                    >
                      {isSelected && <Check className="w-3 h-3 mr-1" />}
                      {p}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_TONE).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditClient(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateClient.isPending}>
                {updateClient.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={deleteClient.isPending}>
              {deleteClient.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="card-soft p-4 sm:p-5">
        {/* Filter bar */}
        <div className="flex flex-col gap-2 mb-4">
          {/* Search — full width on mobile */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/50 border-transparent"
            />
          </div>
          {/* Filters — horizontal scroll row on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button variant="outline" className="rounded-xl h-10 shrink-0"><Filter className="h-4 w-4" /> Filters</Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 rounded-xl bg-background shrink-0">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Statuses">All Statuses</SelectItem>
                {Object.keys(STATUS_TONE).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[150px] h-10 rounded-xl bg-background shrink-0">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Platforms">All Platforms</SelectItem>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="font-semibold px-3 py-3">Client</th>
                <th className="font-semibold px-3 py-3">Industry</th>
                <th className="font-semibold px-3 py-3">Platforms</th>
                <th className="font-semibold px-3 py-3">Status</th>
                <th className="font-semibold px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-20"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : (
                <>
                  {/* ── Business Clients ── */}
                  {filteredClients.length === 0 && filteredMembers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-20 text-muted-foreground">No clients found. Click 'Add Client' to add your first one!</td></tr>
                  ) : (
                    filteredClients.map((c) => (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-white text-xs font-semibold" style={{ background: getClientAvatarColor(c.name) }}>
                              {getInitials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{c.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{c.email || "No email provided"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-foreground/80">{c.industry || "-"}</td>
                        <td className="px-3 py-3">
                          <div className="flex -space-x-1">
                            {c.platforms?.map((p) => (
                              <span key={p} title={p} className="h-6 w-6 rounded-full ring-2 ring-white grid place-items-center text-[10px] font-bold text-white" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || '#666' }}>
                                {p[0]}
                              </span>
                            ))}
                            {(!c.platforms || c.platforms.length === 0) && <span className="text-muted-foreground">-</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={`rounded-full font-medium border-0 ${STATUS_TONE[c.status] || STATUS_TONE.Planning}`}>{c.status}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-8 w-8 rounded-lg hover:bg-muted inline-grid place-items-center"><MoreHorizontal className="h-4 w-4" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                onClick={() => openEdit(c)}
                                className="gap-2"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit Client
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                onClick={() => setCloseTarget(c)}
                                className="gap-2 text-[#F59E0B]"
                              >
                                <Archive className="h-3.5 w-3.5" /> Close Client
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                className="text-red-600 gap-2"
                                onClick={() => setDeleteTarget(c)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* ── Client Members (workspace_members with role='client') ── */}
                  {filteredMembers.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={5} className="px-3 pt-5 pb-2">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                            <Users className="h-3.5 w-3.5" />
                            Client Members (Workspace)
                          </div>
                        </td>
                      </tr>
                      {filteredMembers.map((m) => {
                        const displayName = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                        const displayEmail = m.users?.email || "—";
                        return (
                          <tr key={m.user_id} className="border-t border-border hover:bg-muted/40 transition-colors">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-white text-xs font-semibold"
                                  style={{ background: getClientAvatarColor(displayName) }}
                                >
                                  {getInitials(displayName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold truncate flex items-center gap-2">
                                    {displayName}
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none">
                                      Workspace Client
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">{displayEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground text-xs">—</td>
                            <td className="px-3 py-3 text-muted-foreground text-xs">—</td>
                            <td className="px-3 py-3">
                              <Badge className="rounded-full font-medium border-0 bg-emerald-50 text-emerald-700">Active</Badge>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-8 w-8 rounded-lg hover:bg-muted inline-grid place-items-center"><MoreHorizontal className="h-4 w-4" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>Edit Access</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">Remove Member</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Client Dialog */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Close Client</DialogTitle>
            <DialogDescription>
              This will move {closeTarget?.name} to the Closed Clients list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason for closing (Optional)</Label>
            <Input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="e.g. Contract ended, Project completed..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)} disabled={isClosing}>Cancel</Button>
            <Button variant="default" onClick={handleCloseClient} disabled={isClosing}>
              {isClosing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
