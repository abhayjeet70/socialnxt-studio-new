import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, MoreHorizontal, Loader2, Check, Users } from "lucide-react";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import { useCurrentWorkspace, useClients, useCreateClient, useWorkspaceMembers } from "@/lib/queries";
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

  const isLoading = isLoadingClients || isLoadingMembers;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("Planning");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Workspace members with role 'client'
  const clientMembers = members.filter((m) => m.role === "client");

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
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
        setName("");
        setEmail("");
        setIndustry("");
        setSelectedPlatforms([]);
        setStatus("Planning");
      },
      onError: (err) => {
        toast.error(err.message);
      }
    });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMembers = clientMembers.filter((m) => {
    const name = m.users?.full_name || m.users?.email?.split("@")[0] || "";
    const email = m.users?.email || "";
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
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
                        onClick={() => togglePlatform(p)}
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
      <div className="card-soft p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search clients..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/50 border-transparent" 
            />
          </div>
          <Button variant="outline" className="rounded-xl h-10"><Filter className="h-4 w-4" /> Filters</Button>
          <Button variant="outline" className="rounded-xl h-10">All Statuses</Button>
          <Button variant="outline" className="rounded-xl h-10">All Platforms</Button>
        </div>

        <div className="overflow-x-auto -mx-1">
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
                  {/* ── Business Clients (from clients table) ── */}
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
                          <button className="h-8 w-8 rounded-lg hover:bg-muted inline-grid place-items-center"><MoreHorizontal className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* ── Client Members (from workspace_members with role='client') ── */}
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
                              <button className="h-8 w-8 rounded-lg hover:bg-muted inline-grid place-items-center"><MoreHorizontal className="h-4 w-4" /></button>
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
    </AppShell>
  );
}
