import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
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

const PERMISSIONS = [
  { label: "View all clients", roles: ["admin", "employee"] },
  { label: "Edit content calendar", roles: ["admin", "employee"] },
  { label: "Approve proposals", roles: ["admin"] },
  { label: "Manage employees", roles: ["admin"] },
  { label: "Export reports", roles: ["admin"] },
  { label: "View reports", roles: ["admin", "employee"] },
  { label: "Delete content rows", roles: ["admin", "employee"] },
  { label: "Mark posts as Posted", roles: ["admin", "employee"] },
];

function SettingsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: members = [], isLoading } = useWorkspaceMembers(workspace?.workspaceId);
  const removeMember = useRemoveWorkspaceMember();
  const updateWorkspace = useUpdateWorkspace();
  const isAdmin = workspace?.role === "admin";

  const [companyName, setCompanyName] = useState(workspace?.workspaceName || "");
  const [supportEmail, setSupportEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <AppShell title="Settings" subtitle="Manage members, roles, departments and workspace preferences.">
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl flex flex-wrap h-auto">
          {["members", "roles", "permissions", "company"].map((v) => (
            <TabsTrigger key={v} value={v} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm capitalize">
              {v === "company" ? "Company Settings" : v}
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
            <div className="text-xs text-muted-foreground mb-2">
              Showing permissions by role. Contact the admin to change access levels.
            </div>
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
                  {PERMISSIONS.map((p) => (
                    <tr key={p.label} className="border-t border-border">
                      <td className="px-3 py-3 font-medium">{p.label}</td>
                      {["admin", "employee", "client"].map((role) => (
                        <td key={role} className="px-3 py-3 text-center">
                          {p.roles.includes(role) ? (
                            <span className="text-green-600 font-bold text-base">✓</span>
                          ) : (
                            <span className="text-muted-foreground text-base">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
