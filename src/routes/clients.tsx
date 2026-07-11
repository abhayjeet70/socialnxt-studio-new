import { createFileRoute, Link as RouterLink, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, MoreHorizontal, Loader2, Check, Users, Pencil, Trash2, Archive, Link, Instagram, Facebook, Linkedin, Youtube, Music, ChevronsUpDown, IndianRupee, FileText, CheckCircle2, AlertOctagon, Calendar } from "lucide-react";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import { useCurrentWorkspace, useClients, useCreateClient, useUpdateClient, useDeleteClient, useWorkspaceMembers, useDeals, type Client } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients — SocialNxt CRM" }] }),
  component: ClientsPage,
});

const STATUS_TONE: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-600",
  Inactive: "bg-muted text-muted-foreground",
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

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "Instagram": return <Instagram className="w-3.5 h-3.5" />;
    case "Facebook": return <Facebook className="w-3.5 h-3.5" />;
    case "LinkedIn": return <Linkedin className="w-3.5 h-3.5" />;
    case "YouTube": return <Youtube className="w-3.5 h-3.5" />;
    case "TikTok": return <svg className="w-3 h-3 fill-current" viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg>;
    default: return platform[0];
  }
}

const ASSIGNABLE_ROLES = ["Account/Social Media Manager", "Designer", "Video Editor"];

function ClientsPage() {
  const navigate = useNavigate();
  const { data: workspace } = useCurrentWorkspace();
  const { data: clients = [], isLoading: isLoadingClients } = useClients(workspace?.workspaceId);
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: deals = [] } = useDeals(workspace?.workspaceId);
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
  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
  const [addManagerOpen, setAddManagerOpen] = useState<string | null>(null);

  // ── Edit state ──
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editStatus, setEditStatus] = useState("Planning");
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editTeamAssignments, setEditTeamAssignments] = useState<Record<string, string>>({});
  const [editManagerOpen, setEditManagerOpen] = useState<string | null>(null);

  // ── Delete state ──
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  // ── Close Client state ──
  const [closeTarget, setCloseTarget] = useState<import("@/lib/queries").Client | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [platformFilter, setPlatformFilter] = useState("All Platforms");
  const [sortBy, setSortBy] = useState("newest");
  const [isInitializing, setIsInitializing] = useState<string | null>(null);

  // Workspace members with role 'client' who DO NOT have a CRM profile yet
  const clientMembers = members.filter((m) => {
    if (m.role !== "client") return false;
    const memberEmail = m.users?.email?.toLowerCase();
    if (!memberEmail) return true;
    return !clients.some((c) => c.email?.toLowerCase() === memberEmail);
  });
  
  const staffMembers = members.filter((m) => m.role === "employee");

  const togglePlatform = (p: string, arr: string[], setArr: (v: string[]) => void) => {
    setArr(arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p]);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    if (!teamAssignments["Account/Social Media Manager"] || teamAssignments["Account/Social Media Manager"] === "unassigned") {
      toast.error("Please assign an Account/Social Media Manager.");
      return;
    }
    createClient.mutate({
      workspace_id: workspace.workspaceId,
      name,
      email,
      industry,
      platforms: selectedPlatforms,
      status,
      team_assignments: teamAssignments,
    }, {
      onSuccess: () => {
        toast.success("Client added successfully!");
        setIsAddOpen(false);
        setName(""); setEmail(""); setIndustry(""); setSelectedPlatforms([]); setStatus("Planning"); setTeamAssignments({});
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
    setEditTeamAssignments(c.team_assignments || {});
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient || !workspace) return;
    if (!editTeamAssignments["Account/Social Media Manager"] || editTeamAssignments["Account/Social Media Manager"] === "unassigned") {
      toast.error("Please assign an Account/Social Media Manager.");
      return;
    }
    updateClient.mutate({
      id: editClient.id,
      workspace_id: workspace.workspaceId,
      updates: {
        name: editName,
        email: editEmail || null,
        industry: editIndustry || null,
        platforms: editPlatforms,
        status: editStatus,
        team_assignments: editTeamAssignments,
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

  const isEmployee = workspace?.role === "employee";
  const myUserId = workspace?.userId;

  const accessibleClients = isEmployee
    ? clients.filter(c => Object.values(c.team_assignments || {}).includes(myUserId!))
    : clients;

  const filteredClients = accessibleClients.filter(c => {
    const isInactive = c.status === "Closed" || c.status === "Inactive";
    const mappedStatus = isInactive ? "Inactive" : "Active";
    
    if (statusFilter !== "All Statuses" && mappedStatus !== statusFilter) return false;

    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPlatform = platformFilter === "All Platforms" || (c.platforms && c.platforms.includes(platformFilter));
    return matchesSearch && matchesPlatform;
  });

  const accessibleMembers = isEmployee ? [] : members;
  const filteredMembers = accessibleMembers.filter(m => {
    if (m.role !== "client") return false;
    if (statusFilter !== "All Statuses" && statusFilter !== "Active") return false;
    const n = m.users?.full_name || m.users?.email?.split("@")[0] || "";
    const matchesSearch = n.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.users?.email && m.users.email.toLowerCase().includes(searchTerm.toLowerCase()));
    // Exclude members who are already initialized as clients
    const isAlreadyClient = clients.some(c => c.name.toLowerCase() === n.toLowerCase() || c.email === m.users?.email);
    return matchesSearch && !isAlreadyClient;
  });

  const getClientFinancials = (clientName: string) => {
    const clientDeals = deals.filter(d => d.client_name?.toLowerCase() === clientName.toLowerCase());
    const totalRevenue = clientDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const advancePaid = clientDeals.reduce((sum, d) => sum + (d.advance_paid || 0), 0);
    const pendingPayment = totalRevenue - advancePaid;
    return { totalRevenue, advancePaid, pendingPayment };
  };

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortBy) {
      case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "revenue_desc": return getClientFinancials(b.name).totalRevenue - getClientFinancials(a.name).totalRevenue;
      case "revenue_asc": return getClientFinancials(a.name).totalRevenue - getClientFinancials(b.name).totalRevenue;
      case "pending_desc": return getClientFinancials(b.name).pendingPayment - getClientFinancials(a.name).pendingPayment;
      case "advance_desc": return getClientFinancials(b.name).advancePaid - getClientFinancials(a.name).advancePaid;
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const nameA = a.users?.full_name || a.users?.email?.split("@")[0] || "Unknown";
    const nameB = b.users?.full_name || b.users?.email?.split("@")[0] || "Unknown";
    switch (sortBy) {
      case "name_asc": return nameA.localeCompare(nameB);
      case "name_desc": return nameB.localeCompare(nameA);
      case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "newest":
      case "revenue_desc":
      case "revenue_asc":
      case "pending_desc":
      case "advance_desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleInitializeWorkspaceClient = async (m: any) => {
    if (!workspace) return;
    const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
    const e = m.users?.email || "";
    setIsInitializing(m.user_id);
    
    try {
      const newClient = await createClient.mutateAsync({
         workspace_id: workspace.workspaceId,
         name: n,
         email: e,
         industry: "",
         platforms: [],
         status: "Active",
         team_assignments: {},
      });
      toast.success("CRM Profile initialized!");
      navigate({ to: '/clients/$clientId', params: { clientId: newClient.id } });
    } catch (err: any) {
      toast.error("Failed to initialize CRM profile.");
    } finally {
      setIsInitializing(null);
    }
  };

  return (
    <AppShell
      title="Client Management"
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
              <div className="space-y-3 border-t border-border pt-4 mt-2">
                <Label className="text-sm font-semibold">Team Assignment *</Label>
                {ASSIGNABLE_ROLES.map(role => (
                  <div key={role} className="flex items-center gap-2">
                    <Label className="w-1/3 text-xs text-muted-foreground">{role}</Label>
                    <Popover open={addManagerOpen === role} onOpenChange={(open) => setAddManagerOpen(open ? role : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={addManagerOpen === role}
                          className="flex-1 justify-between font-normal bg-background"
                        >
                          {teamAssignments[role] && teamAssignments[role] !== "unassigned"
                            ? (() => {
                                const m = staffMembers.find((m) => m.user_id === teamAssignments[role]);
                                if (!m) return "Select Manager";
                                const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                                const em = m.users?.email || "";
                                return `${n} ${em ? `(${em})` : ""}`;
                              })()
                            : "Select Manager"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search manager..." />
                          <CommandList>
                            <CommandEmpty>No manager found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="unassigned"
                                onSelect={() => {
                                  setTeamAssignments(prev => ({...prev, [role]: ""}));
                                  setAddManagerOpen(null);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${(!teamAssignments[role] || teamAssignments[role] === "unassigned") ? "opacity-100" : "opacity-0"}`}
                                />
                                Select Manager
                              </CommandItem>
                              {staffMembers.filter(m => (m.agency_role || "Social Media Manager") === (role === "Account/Social Media Manager" ? "Social Media Manager" : role)).map(m => {
                                const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                                const em = m.users?.email || "";
                                const displayName = `${n} ${em ? `(${em})` : ""}`;
                                return (
                                  <CommandItem
                                    key={m.user_id}
                                    value={displayName}
                                    onSelect={() => {
                                      setTeamAssignments(prev => ({...prev, [role]: m.user_id}));
                                      setAddManagerOpen(null);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${teamAssignments[role] === m.user_id ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {displayName}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
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
            <div className="space-y-3 border-t border-border pt-4 mt-2">
              <Label className="text-sm font-semibold">Team Assignment *</Label>
              {ASSIGNABLE_ROLES.map(role => (
                <div key={role} className="flex items-center gap-2">
                  <Label className="w-1/3 text-xs text-muted-foreground">{role}</Label>
                  <Popover open={editManagerOpen === role} onOpenChange={(open) => setEditManagerOpen(open ? role : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={editManagerOpen === role}
                        className="flex-1 justify-between font-normal bg-background"
                      >
                        {editTeamAssignments[role] && editTeamAssignments[role] !== "unassigned"
                          ? (() => {
                              const m = staffMembers.find((m) => m.user_id === editTeamAssignments[role]);
                              if (!m) return "Select Manager";
                              const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                              const em = m.users?.email || "";
                              return `${n} ${em ? `(${em})` : ""}`;
                            })()
                          : "Select Manager"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search manager..." />
                        <CommandList>
                          <CommandEmpty>No manager found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="unassigned"
                              onSelect={() => {
                                setEditTeamAssignments(prev => ({...prev, [role]: ""}));
                                setEditManagerOpen(null);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${(!editTeamAssignments[role] || editTeamAssignments[role] === "unassigned") ? "opacity-100" : "opacity-0"}`}
                              />
                              Select Manager
                            </CommandItem>
                            {staffMembers.filter(m => (m.agency_role || "Social Media Manager") === (role === "Account/Social Media Manager" ? "Social Media Manager" : role)).map(m => {
                              const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                              const em = m.users?.email || "";
                              const displayName = `${n} ${em ? `(${em})` : ""}`;
                              return (
                                <CommandItem
                                  key={m.user_id}
                                  value={displayName}
                                  onSelect={() => {
                                    setEditTeamAssignments(prev => ({...prev, [role]: m.user_id}));
                                    setEditManagerOpen(null);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${editTeamAssignments[role] === m.user_id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  {displayName}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Sort By</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="revenue_desc">Revenue (High - Low)</SelectItem>
                <SelectItem value="revenue_asc">Revenue (Low - High)</SelectItem>
                <SelectItem value="pending_desc">Pending Amt (High - Low)</SelectItem>
                <SelectItem value="advance_desc">Advance Paid (High - Low)</SelectItem>
              </SelectContent>
            </Select>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full py-20 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {filteredClients.length === 0 && filteredMembers.length === 0 ? (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  No clients found. Click 'Add Client' to add your first one!
                </div>
              ) : (
                <>
                  {sortedClients.map((c) => {
                  const clientDeals = deals.filter(d => d.client_name?.toLowerCase() === c.name.toLowerCase());
                  const totalRevenue = clientDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
                  const advancePaid = clientDeals.reduce((sum, d) => sum + (d.advance_paid || 0), 0);
                  const pendingPayment = totalRevenue - advancePaid;
                  
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => navigate({ to: '/clients/$clientId', params: { clientId: c.id } })}
                      className="relative rounded-2xl border border-border bg-[#F9FAFB]/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden cursor-pointer group"
                    >
                      {/* Active/Inactive Badge */}
                      <div className="absolute top-5 right-5">
                        <Badge className={`rounded-sm font-bold tracking-wider text-[10px] px-2 py-0.5 border-0 ${c.status === 'Closed' ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 text-emerald-600'}`}>
                          {c.status === 'Closed' ? 'INACTIVE' : 'ACTIVE'}
                        </Badge>
                      </div>

                      <div className="mb-4 pr-16">
                        <span className="font-bold text-[17px] truncate block group-hover:text-primary transition-colors text-[#1C1917]">
                          {c.name}
                        </span>
                        <div className="text-xs text-muted-foreground truncate font-medium mt-0.5">{c.industry || "No industry"}</div>
                      </div>

                      <div className="flex flex-col gap-2 flex-1 mt-3">
                        {workspace?.role !== "employee" && (
                          <>
                            <div className="flex justify-between text-[13px]">
                              <span className="text-muted-foreground font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Total revenue</span>
                              <span className="font-bold text-emerald-600 flex items-center"><IndianRupee className="w-3 h-3" />{totalRevenue.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                              <span className="text-muted-foreground font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Advance Paid</span>
                              <span className="font-bold text-foreground flex items-center"><IndianRupee className="w-3 h-3" />{advancePaid.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                              <span className="text-muted-foreground font-medium flex items-center gap-1.5"><AlertOctagon className="w-3.5 h-3.5" /> Outstanding</span>
                              <span className="font-bold text-rose-500 flex items-center"><IndianRupee className="w-3 h-3" />{pendingPayment.toLocaleString("en-IN")}</span>
                            </div>
                          </>
                        )}
                        <div className={`flex justify-between text-[13px] ${workspace?.role !== 'employee' ? 'mt-1 border-t border-border/60 pt-2.5' : ''}`}>
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Start</span>
                          <span className="font-semibold text-foreground">{new Date(c.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-border/60 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocated Manager</span>
                          {(() => {
                            const managerId = c.team_assignments?.["Account/Social Media Manager"];
                            const member = managerId ? members.find(m => m.user_id === managerId) : null;
                            const n = member ? (member.users?.full_name || member.users?.email?.split("@")[0] || "Unknown") : "Unassigned";
                            return <span className="text-xs font-semibold text-foreground truncate max-w-[140px] text-right">{n}</span>;
                          })()}
                        </div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Platforms</span>
                          <div className="flex -space-x-1">
                            {c.platforms?.map((p) => (
                              <span key={p} title={p} className="h-6 w-6 rounded-full ring-2 ring-[#F9FAFB] grid place-items-center text-white shadow-sm" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || '#666' }}>
                                {getPlatformIcon(p)}
                              </span>
                            ))}
                            {(!c.platforms || c.platforms.length === 0) && <span className="text-muted-foreground text-xs">-</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 opacity-40 hover:opacity-100 transition-opacity mt-2 pt-3 border-t border-border/40">
                          <button disabled={!isAdmin} onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted inline-grid place-items-center transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button disabled={!isAdmin} onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }} className="h-7 w-7 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 inline-grid place-items-center transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  {sortedMembers.map((m) => {
                    const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                    return (
                      <div 
                        key={m.user_id}
                        onClick={() => handleInitializeWorkspaceClient(m)}
                        className={`relative rounded-2xl border border-border bg-[#F9FAFB]/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden cursor-pointer group ${isInitializing === m.user_id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="absolute top-5 right-5">
                          <Badge className="rounded-sm font-bold tracking-wider text-[10px] px-2 py-0.5 border-0 bg-emerald-50 text-emerald-600">
                            WORKSPACE CLIENT
                          </Badge>
                        </div>
                        <div className="mb-4 pr-16">
                          <span className="font-bold text-[17px] truncate block group-hover:text-primary transition-colors text-[#1C1917]">
                            {n}
                          </span>
                          <div className="text-xs text-muted-foreground truncate font-medium mt-0.5">{m.users?.email || "No email"}</div>
                        </div>
                        <div className="flex flex-col gap-2 flex-1 mt-3 opacity-60 pointer-events-none">
                          <div className="flex justify-between text-[13px]">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Total revenue</span>
                            <span className="font-bold text-emerald-600 flex items-center"><IndianRupee className="w-3 h-3" />0</span>
                          </div>
                          <div className="flex justify-between text-[13px]">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Advance Paid</span>
                            <span className="font-bold text-foreground flex items-center"><IndianRupee className="w-3 h-3" />0</span>
                          </div>
                          <div className="flex justify-between text-[13px]">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5"><AlertOctagon className="w-3.5 h-3.5" /> Outstanding</span>
                            <span className="font-bold text-rose-500 flex items-center"><IndianRupee className="w-3 h-3" />0</span>
                          </div>
                          <div className="flex justify-between text-[13px] mt-1 border-t border-border/60 pt-2.5">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Start</span>
                            <span className="font-semibold text-foreground">{new Date(m.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="mt-4 text-center text-[10px] font-bold text-primary uppercase tracking-widest border-t border-border/60 pt-3 group-hover:bg-primary/5 rounded-b-xl -mx-5 -mb-5 pb-5 transition-colors">
                          {isInitializing === m.user_id ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> INITIALIZING...</span>
                          ) : (
                            "CLICK TO SETUP CRM PROFILE"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
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
