import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Save, ShieldCheck, Search, MoreHorizontal, UserX } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCurrentWorkspace, useWorkspaceMembers, useRemoveWorkspaceMember, useUpdateWorkspace, useDeleteWorkspace,
} from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SocialNxt CRM" }] }),
  component: SettingsPage,
});

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  employee: "bg-blue-100 text-blue-700",
  client: "bg-green-100 text-green-700",
};

const BG_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6", "#f97316", "#8b5cf6"];

const DEFAULT_PERMISSIONS = [
  { label: "View all clients", key: "view_clients", roles: { admin: true, employee: true, client: false } },
  { label: "Edit content calendar", key: "edit_calendar", roles: { admin: true, employee: true, client: false } },
  { label: "Access Proposals", key: "access_proposals", roles: { admin: true, employee: false, client: false } },
  { label: "Approve proposals", key: "approve_proposals", roles: { admin: true, employee: false, client: false } },
  { label: "Access Quotations", key: "access_quotations", roles: { admin: true, employee: false, client: false } },
  { label: "Access Deals", key: "access_deals", roles: { admin: true, employee: false, client: false } },
  { label: "Manage employees", key: "manage_employees", roles: { admin: true, employee: false, client: false } },
  { label: "Export reports", key: "export_reports", roles: { admin: true, employee: false, client: false } },
  { label: "View reports", key: "view_reports", roles: { admin: true, employee: true, client: false } },
  { label: "Delete content rows", key: "delete_content", roles: { admin: true, employee: true, client: false } },
  { label: "Mark posts as Posted", key: "mark_posted", roles: { admin: true, employee: true, client: false } },
];

type PermMatrix = Record<string, Record<string, boolean>>;

function loadPermissions(workspaceId: string): PermMatrix {
  try {
    const stored = localStorage.getItem(`perms_${workspaceId}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  const matrix: PermMatrix = {};
  for (const p of DEFAULT_PERMISSIONS) {
    matrix[p.key] = { ...p.roles };
  }
  return matrix;
}

function savePermissions(workspaceId: string, matrix: PermMatrix) {
  localStorage.setItem(`perms_${workspaceId}`, JSON.stringify(matrix));
}

function SettingsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: members = [], isLoading } = useWorkspaceMembers(workspace?.workspaceId);
  const removeMember = useRemoveWorkspaceMember();
  const updateWorkspace = useUpdateWorkspace();
  const isAdmin = workspace?.role === "admin";

  const [companyName, setCompanyName] = useState(workspace?.workspaceName || "");
  const [supportEmail, setSupportEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteWorkspace = useDeleteWorkspace();

  const handleDeleteWorkspace = () => {
    if (!workspace) return;
    const confirmName = prompt(`To confirm deletion, please type the workspace name precisely:\n\n"${workspace.workspaceName}"\n\nWARNING: This action is permanent and deletes all clients, posts, and data.`);
    if (confirmName !== workspace.workspaceName) {
      if (confirmName !== null) toast.error("Workspace name did not match.");
      return;
    }
    
    setIsDeleting(true);
    deleteWorkspace.mutate({ workspace_id: workspace.workspaceId }, {
      onSuccess: () => {
        toast.success("Workspace deleted. Redirecting...");
        window.location.href = "/";
      },
      onError: (e) => {
        setIsDeleting(false);
        toast.error("Failed to delete workspace: " + e.message);
      }
    });
  };

  // Permissions state
  const [permMatrix, setPermMatrix] = useState<PermMatrix>({});
  const [permsDirty, setPermsDirty] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);

  useEffect(() => {
    if (workspace?.workspaceId) {
      setPermMatrix(loadPermissions(workspace.workspaceId));
    }
  }, [workspace?.workspaceId]);

  const byRole = {
    admin: members.filter((m) => m.role === "admin"),
    employee: members.filter((m) => m.role === "employee"),
    client: members.filter((m) => m.role === "client"),
  };

  const roles = ["admin", "employee", "client"];

  // Member filtering
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const name = (m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown").toLowerCase();
      const email = (m.users?.email || "").toLowerCase();
      const matchesSearch = name.includes(memberSearch.toLowerCase()) || email.includes(memberSearch.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, memberSearch, roleFilter]);

  const handleRemove = (userId: string, name: string) => {
    if (!workspace) return;
    if (!confirm(`Remove ${name} from the workspace?`)) return;
    removeMember.mutate(
      { workspace_id: workspace.workspaceId, user_id: userId },
      {
        onSuccess: () => toast.success(`${name} removed.`),
        onError: (e) => toast.error("Failed: " + e.message),
      }
    );
  };

  const handleSaveCompanySettings = () => {
    if (!workspace) return;
    setIsSaving(true);
    updateWorkspace.mutate(
      { workspace_id: workspace.workspaceId, name: companyName },
      {
        onSuccess: () => toast.success("Workspace settings updated successfully!"),
        onError: (err) => toast.error("Failed to update settings: " + err.message),
        onSettled: () => setIsSaving(false),
      }
    );
  };

  const handleToggle = (permKey: string, role: string, value: boolean) => {
    setPermMatrix((prev) => ({
      ...prev,
      [permKey]: {
        ...prev[permKey],
        [role]: value,
      },
    }));
    setPermsDirty(true);
  };

  const handleSavePermissions = () => {
    if (!workspace) return;
    setPermsSaving(true);
    setTimeout(() => {
      savePermissions(workspace.workspaceId, permMatrix);
      setPermsDirty(false);
      setPermsSaving(false);
      toast.success("Permissions saved successfully!");
    }, 400);
  };

  const handleResetPermissions = () => {
    const matrix: PermMatrix = {};
    for (const p of DEFAULT_PERMISSIONS) {
      matrix[p.key] = { ...p.roles };
    }
    setPermMatrix(matrix);
    setPermsDirty(true);
  };

  return (
    <AppShell title="Settings" subtitle="Manage members, roles, departments and workspace preferences.">
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          {[
            { value: "members", label: "Members" },
            { value: "roles-permissions", label: "Roles & Permissions" },
            { value: "social", label: "Social Accounts" },
            { value: "platforms", label: "Platforms" },
            { value: "company", label: "Company Settings" },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm px-4">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Members Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="members" className="mt-5">
          <div className="card-soft p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="font-semibold text-lg">Workspace members</div>
                <div className="text-sm text-muted-foreground">All users who have access to this workspace.</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search members..." 
                    className="pl-9 h-10 rounded-xl min-w-[220px]"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-10 rounded-xl min-w-[140px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <UserX className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <div className="font-semibold text-foreground/80">No members found</div>
                <div className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="px-3 py-3 font-semibold">Name</th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">Role</th>
                      <th className="px-3 py-3 font-semibold">Joined</th>
                      {isAdmin && <th className="px-3 py-3 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m, i) => {
                      const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                      const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                      const isSelf = m.user_id === workspace?.userId;
                      return (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-9 w-9 rounded-xl grid place-items-center text-white text-xs font-semibold shrink-0 shadow-sm"
                                style={{ background: BG_COLORS[i % BG_COLORS.length] }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-[13px]">{name} {isSelf && <span className="text-[10px] text-muted-foreground ml-1">(you)</span>}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-foreground/70">{m.users?.email || "—"}</td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className={`font-semibold border-0 ${ROLE_COLORS[m.role] || "bg-muted text-foreground/70"}`}>
                              {m.role}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-foreground/70 text-xs">
                            {new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-3 text-right">
                              {!isSelf && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleRemove(m.user_id, name)} className="text-red-600 focus:text-red-700">
                                      Remove from workspace
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Roles & Permissions Tab (merged) ───────────────────────────────── */}
        <TabsContent value="roles-permissions" className="mt-5">
          <div className="space-y-4">
            {/* Header + actions */}
            <div className="card-soft p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Roles &amp; Permissions
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {isAdmin ? "Expand a role to see its members and manage permissions." : "Showing role assignments and permission levels. Only admins can make changes."}
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs" onClick={handleResetPermissions}>
                    Reset to defaults
                  </Button>
                  <Button size="sm" className="rounded-xl h-9 text-xs gap-1.5" onClick={handleSavePermissions} disabled={!permsDirty || permsSaving}>
                    {permsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save changes
                  </Button>
                </div>
              )}
            </div>

            {permsDirty && isAdmin && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                Unsaved permission changes — click "Save changes" to apply them workspace-wide.
              </div>
            )}

            {/* Accordion per role */}
            <Accordion type="multiple" className="space-y-3">
              {(["admin", "employee", "client"] as const).map((role) => {
                const roleMembers = byRole[role] || [];
                const count = roleMembers.length;
                const descriptions: Record<string, string> = {
                  admin: "Full access — can manage all members, approve proposals, configure settings, and view all reports.",
                  employee: "Team member access — can create content, upload media, and mark posts as posted.",
                  client: "Client access — can view approved content, provide feedback, and manage proposals.",
                };
                const roleIcons: Record<string, string> = { admin: "🛡️", employee: "👤", client: "🏢" };
                return (
                  <AccordionItem key={role} value={role} className="card-soft border-0 overflow-hidden">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&>svg]:text-muted-foreground">
                      <div className="flex items-center gap-3 text-left">
                        <span className="text-xl">{roleIcons[role]}</span>
                        <div>
                          <div className="font-semibold capitalize text-base flex items-center gap-2">
                            {role}
                            <Badge className={`rounded-full border-0 text-xs font-semibold ${ROLE_COLORS[role]}`}>{count} member{count !== 1 ? "s" : ""}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">{descriptions[role]}</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5">
                      {/* Members */}
                      <div className="mb-5">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Members with this role</div>
                        {roleMembers.length === 0 ? (
                          <div className="text-sm text-muted-foreground italic">No members assigned to this role yet.</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {roleMembers.map((m, i) => {
                              const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                              const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                              return (
                                <div key={m.id} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
                                  <div className="h-6 w-6 rounded-lg grid place-items-center text-white text-[10px] font-bold shrink-0" style={{ background: BG_COLORS[i % BG_COLORS.length] }}>
                                    {initials}
                                  </div>
                                  <span className="text-sm font-medium">{name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Permissions for this role */}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Permissions</div>
                        <div className="space-y-0 border border-border rounded-xl overflow-hidden">
                          {DEFAULT_PERMISSIONS.map((p, idx) => {
                            const adminToggleableKeys = ["access_proposals", "approve_proposals", "access_quotations", "access_deals"];
                            const isOn = permMatrix[p.key]?.[role] ?? p.roles[role as keyof typeof p.roles];
                            const isLocked = role === "admin" && !adminToggleableKeys.includes(p.key);
                            return (
                              <div key={p.key} className={`flex items-center justify-between px-4 py-3 ${idx !== DEFAULT_PERMISSIONS.length - 1 ? "border-b border-border/60" : ""} ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                                <div>
                                  <div className="text-sm font-medium">{p.label}</div>
                                  {isLocked && <div className="text-[10px] text-muted-foreground mt-0.5">Always granted to Admin</div>}
                                </div>
                                {isAdmin ? (
                                  <Switch
                                    checked={isLocked ? true : isOn}
                                    disabled={isLocked}
                                    onCheckedChange={(val) => !isLocked && handleToggle(p.key, role, val)}
                                    className={isLocked ? "opacity-40 cursor-not-allowed" : ""}
                                  />
                                ) : (
                                  <span className={`text-sm font-semibold ${isOn ? "text-green-600" : "text-muted-foreground"}`}>
                                    {isOn ? "✓ Granted" : "— Denied"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </TabsContent>

        {/* ─── Social Accounts Tab ──────────────────────────────────────────────── */}
        <TabsContent value="social" className="mt-5">
          <div className="space-y-4 max-w-2xl">
            <div className="card-soft p-4 sm:p-5">
              <div className="font-semibold text-lg mb-1">Connected Social Accounts</div>
              <div className="text-sm text-muted-foreground">
                Connect your social media profiles to enable direct publishing and analytics.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { name: "Instagram / Facebook", sub: "Meta Business Suite", icon: "Ig", gradient: "from-yellow-400 via-pink-500 to-purple-600", toast: "OAuth flow for Meta would start here." },
                { name: "LinkedIn Pages", sub: "LinkedIn Marketing", icon: "in", bg: "#0A66C2", toast: "OAuth flow for LinkedIn would start here." },
                { name: "X (Twitter)", sub: "X Developer Platform", icon: "𝕏", bg: "#000000", toast: "OAuth flow for X would start here." },
                { name: "YouTube", sub: "Google OAuth", icon: "▶", bg: "#EF4444", toast: "OAuth flow for YouTube would start here." },
              ].map((acc) => (
                <Card key={acc.name} className="border border-border shadow-none rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${acc.gradient ? `bg-gradient-to-tr ${acc.gradient}` : ""}`}
                        style={acc.bg ? { background: acc.bg } : {}}
                      >
                        {acc.icon}
                      </div>
                      <div>
                        <div className="font-semibold">{acc.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{acc.sub}</div>
                        <Badge variant="outline" className="text-[10px] font-medium mt-1.5 text-amber-600 border-amber-200 bg-amber-50">Not connected</Badge>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-xl h-9 text-xs shrink-0" onClick={() => toast(acc.toast)}>
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-xs text-muted-foreground bg-muted/60 border border-border p-4 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>We use <strong>secure OAuth 2.0</strong> to connect to social platforms. SocialNxt never stores your passwords.</span>
            </div>
          </div>
        </TabsContent>

        {/* ─── Platforms Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="platforms" className="mt-5">
          <div className="card-soft p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <div className="font-semibold text-lg">Platforms</div>
                <div className="text-sm text-muted-foreground">Manage social media and real estate platforms available in Content Sheets.</div>
              </div>
              {isAdmin && (
                <Button
                  className="rounded-xl h-9"
                  onClick={() => {
                    const name = prompt("Platform Name (e.g. 99acres):");
                    if (!name) return;
                    const category = prompt("Category (e.g. Real Estate):") || "Other";
                    const urlPattern = prompt("URL Pattern (e.g. 99acres.com):") || "";
                    const newPlatforms = [...(workspace?.customPlatforms || []), { name, category, urlPattern }];
                    updateWorkspace.mutate(
                      { workspace_id: workspace!.workspaceId, custom_platforms: newPlatforms },
                      { onSuccess: () => toast.success("Platform added") }
                    );
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Platform
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-3 py-3 font-semibold">Platform Name</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">URL Pattern</th>
                    <th className="px-3 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok"].map((p) => (
                    <tr key={p} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-medium">{p}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">Default Social</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">—</td>
                      <td className="px-3 py-3 text-right">
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">Default</Badge>
                      </td>
                    </tr>
                  ))}
                  {workspace?.customPlatforms?.map((p, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-medium">{p.name}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{p.category}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{p.urlPattern || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (!confirm(`Remove ${p.name}?`)) return;
                              const newPlatforms = workspace.customPlatforms.filter((_, idx) => idx !== i);
                              updateWorkspace.mutate(
                                { workspace_id: workspace.workspaceId, custom_platforms: newPlatforms },
                                { onSuccess: () => toast.success("Platform removed") }
                              );
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Company Settings Tab ────────────────────────────────────────────── */}
        <TabsContent value="company" className="mt-5">
          <div className="space-y-4 max-w-2xl">
            {/* Workspace profile card */}
            <Card className="border border-border shadow-none rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workspace Profile</CardTitle>
                <CardDescription>Update your agency's workspace details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Workspace name</Label>
                  <Input
                    className="mt-1.5 rounded-xl h-11"
                    value={companyName || workspace?.workspaceName || ""}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="e.g. My Agency"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Support email</Label>
                  <Input
                    className="mt-1.5 rounded-xl h-11"
                    placeholder="hello@youragency.in"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
                {isAdmin && (
                  <Button className="rounded-xl h-10" onClick={handleSaveCompanySettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save changes
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Your account info */}
            <Card className="border border-border shadow-none rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Account</CardTitle>
                <CardDescription>Read-only information about your account in this workspace.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="mt-1 font-medium text-sm">{workspace?.userEmail || "—"}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <div className="mt-1">
                    <Badge className={`font-semibold border-0 capitalize ${ROLE_COLORS[workspace?.role || ""] || "bg-muted text-foreground/70"}`}>
                      {workspace?.role || "—"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total members</Label>
                  <div className="mt-1 font-medium text-sm">{members.length}</div>
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            {isAdmin && (
              <Card className="border border-red-200 shadow-none rounded-2xl bg-red-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
                  <CardDescription className="text-red-600/80">
                    Permanently delete this workspace and all its data (clients, posts, issues, deals, etc). This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" className="rounded-xl h-10" onClick={handleDeleteWorkspace} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Delete Workspace
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
