import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Save, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import {
  useCurrentWorkspace, useWorkspaceMembers, useRemoveWorkspaceMember, useUpdateWorkspace,
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

  // Permissions state
  const [permMatrix, setPermMatrix] = useState<PermMatrix>({});
  const [permsDirty, setPermsDirty] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);

  useEffect(() => {
    if (workspace?.workspaceId) {
      setPermMatrix(loadPermissions(workspace.workspaceId));
    }
  }, [workspace?.workspaceId]);

  // Group members by role
  const byRole = {
    admin: members.filter((m) => m.role === "admin"),
    employee: members.filter((m) => m.role === "employee"),
    client: members.filter((m) => m.role === "client"),
  };

  const roles = ["admin", "employee", "client"];

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
        <TabsList className="bg-muted/60 p-1 rounded-xl flex flex-wrap h-auto">
          {["members", "roles", "permissions", "social", "company"].map((v) => (
            <TabsTrigger key={v} value={v} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm capitalize">
              {v === "company" ? "Company Settings" : v === "social" ? "Social Accounts" : v}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Members Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="members" className="mt-5">
          <div className="card-soft p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="font-semibold">Workspace members</div>
                <div className="text-xs text-muted-foreground">All users who have access to this workspace.</div>
              </div>
              {isAdmin && (
                <Button className="rounded-xl h-10">
                  <Plus className="h-4 w-4" /> Invite Member
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-3 font-semibold">Name</th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">Role</th>
                      <th className="px-3 py-3 font-semibold">Joined</th>
                      {isAdmin && <th className="px-3 py-3 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => {
                      const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                      const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                      const isSelf = m.user_id === workspace?.userId;
                      return (
                        <tr key={m.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-8 w-8 rounded-lg grid place-items-center text-white text-xs font-semibold shrink-0"
                                style={{ background: BG_COLORS[i % BG_COLORS.length] }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold">{name} {isSelf && <span className="text-[10px] text-muted-foreground">(you)</span>}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-foreground/70">{m.users?.email || "—"}</td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] || "bg-muted text-foreground/70"}`}>
                              {m.role}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-foreground/70 text-xs">
                            {new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-3 text-right">
                              {!isSelf && (
                                <button
                                  onClick={() => handleRemove(m.user_id, name)}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Remove
                                </button>
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

        {/* ─── Roles Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="roles" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((r) => {
              const count = byRole[r as keyof typeof byRole]?.length || 0;
              const descriptions: Record<string, string> = {
                admin: "Full access — manage members, approve proposals, view all reports.",
                employee: "Can create content, upload media, mark posts as posted.",
                client: "Can view approved content and submit/reject proposals.",
              };
              return (
                <div key={r} className="card-soft p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold capitalize">{r}</div>
                    <Badge className={`rounded-full border-0 ${ROLE_COLORS[r]}`}>{count} member{count !== 1 ? "s" : ""}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{descriptions[r]}</div>
                  {(byRole[r as keyof typeof byRole] || []).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {(byRole[r as keyof typeof byRole] || []).map((m) => (
                        <div key={m.id} className="text-xs text-foreground/70 truncate">
                          {m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Permissions Tab ────────────────────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-5">
          <div className="card-soft p-5 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-base">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Role Permissions
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isAdmin
                    ? "Toggle permissions for each role. Changes apply workspace-wide."
                    : "Showing permissions by role. Only admins can change access levels."}
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs"
                    onClick={handleResetPermissions}
                  >
                    Reset to defaults
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl h-9 text-xs gap-1"
                    onClick={handleSavePermissions}
                    disabled={!permsDirty || permsSaving}
                  >
                    {permsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save changes
                  </Button>
                </div>
              )}
            </div>

            {/* Unsaved indicator */}
            {permsDirty && isAdmin && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You have unsaved permission changes. Click "Save changes" to apply them.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Permission</th>
                    <th className="px-3 py-2 font-semibold text-center">Admin</th>
                    <th className="px-3 py-2 font-semibold text-center">Employee</th>
                    <th className="px-3 py-2 font-semibold text-center">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_PERMISSIONS.map((p) => (
                    <tr key={p.key} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 font-medium">{p.label}</td>
                      {(["admin", "employee", "client"] as const).map((role) => {
                        const adminToggleableKeys = ["access_proposals", "approve_proposals", "access_quotations"];
                        const isOn = permMatrix[p.key]?.[role] ?? p.roles[role];
                        const isLocked = role === "admin" && !adminToggleableKeys.includes(p.key);
                        return (
                          <td key={role} className="px-3 py-3 text-center">
                            {isAdmin ? (
                              <div className="flex justify-center">
                                <Switch
                                  checked={isLocked ? true : isOn}
                                  disabled={isLocked}
                                  onCheckedChange={(val) => !isLocked && handleToggle(p.key, role, val)}
                                  className={isLocked ? "opacity-50 cursor-not-allowed" : ""}
                                />
                              </div>
                            ) : (
                              isOn
                                ? <span className="text-green-600 font-bold text-base">✓</span>
                                : <span className="text-muted-foreground text-base">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground border-t">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-7 bg-primary/20 rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-primary" />
                  </div>
                  Permission granted
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-7 bg-muted rounded-full relative">
                    <div className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-muted-foreground/40" />
                  </div>
                  Permission denied
                </div>
                <div className="flex items-center gap-1.5 opacity-50">
                  <div className="h-4 w-7 bg-primary/20 rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-primary" />
                  </div>
                  Locked (Admin always has access)
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Social Accounts Tab ──────────────────────────────────────────────── */}
        <TabsContent value="social" className="mt-5">
          <div className="card-soft p-5 space-y-4 max-w-2xl">
            <div>
              <div className="font-semibold text-lg">Connected Social Accounts</div>
              <div className="text-sm text-muted-foreground mt-1 mb-4">
                Connect your client's social media profiles to enable direct publishing and analytics.
              </div>
            </div>

            <div className="space-y-4 mt-4">
              {/* Meta / Instagram */}
              <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    Ig
                  </div>
                  <div>
                    <div className="font-semibold">Instagram / Facebook</div>
                    <div className="text-xs text-muted-foreground">Not connected</div>
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => toast("OAuth flow for Meta would start here.")}>
                  Connect
                </Button>
              </div>

              {/* LinkedIn */}
              <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-[#0A66C2] rounded-lg flex items-center justify-center text-white font-bold">
                    in
                  </div>
                  <div>
                    <div className="font-semibold">LinkedIn Pages</div>
                    <div className="text-xs text-muted-foreground">Not connected</div>
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => toast("OAuth flow for LinkedIn would start here.")}>
                  Connect
                </Button>
              </div>

              {/* X / Twitter */}
              <div className="flex items-center justify-between p-4 border rounded-xl bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                    𝕏
                  </div>
                  <div>
                    <div className="font-semibold">X (Twitter)</div>
                    <div className="text-xs text-muted-foreground">Not connected</div>
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => toast("OAuth flow for X would start here.")}>
                  Connect
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg flex items-start gap-2 mt-4">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>We use secure OAuth 2.0 to connect to social platforms. SocialNxt does not store your passwords.</span>
            </div>
          </div>
        </TabsContent>

        {/* ─── Company Settings Tab ────────────────────────────────────────────── */}
        <TabsContent value="company" className="mt-5">
          <div className="card-soft p-5 space-y-4 max-w-xl">
            <div>
              <Label>Workspace name</Label>
              <Input
                className="mt-1.5 rounded-xl h-11"
                value={companyName || workspace?.workspaceName || ""}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label>Your email</Label>
              <Input className="mt-1.5 rounded-xl h-11" value={workspace?.userEmail || ""} disabled />
            </div>
            <div>
              <Label>Your role</Label>
              <Input className="mt-1.5 rounded-xl h-11" value={workspace?.role || ""} disabled />
            </div>
            <div>
              <Label>Total members</Label>
              <Input className="mt-1.5 rounded-xl h-11" value={members.length} disabled />
            </div>
            <div>
              <Label>Support email</Label>
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
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save changes
              </Button>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </AppShell>
  );
}
