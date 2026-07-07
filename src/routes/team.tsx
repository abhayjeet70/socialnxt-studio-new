import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Mail, Loader2, Users, UserCheck, ShieldCheck, Trash2, Pencil,
  TrendingUp, CheckCircle2, Clock, BarChart3, ChevronRight, X, FileText,
} from "lucide-react";
import {
  useCurrentWorkspace, useWorkspaceMembers, useRemoveWorkspaceMember,
  useUpdateProfile, WorkspaceMember, usePosts,
} from "@/lib/queries";
import { sendInvite } from "@/server/invite";
import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — SocialNxt CRM" }] }),
  component: TeamPage,
});

const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  admin:    { bg: "bg-purple-100",  text: "text-purple-700",  label: "Admin" },
  employee: { bg: "bg-blue-100",    text: "text-blue-700",    label: "Employee" },
  client:   { bg: "bg-emerald-100", text: "text-emerald-700", label: "Client" },
};

const ROLE_ICON: Record<string, React.ReactNode> = {
  admin:    <ShieldCheck className="h-3.5 w-3.5" />,
  employee: <UserCheck className="h-3.5 w-3.5" />,
  client:   <Users className="h-3.5 w-3.5" />,
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  published:        { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  approved:         { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500" },
  scheduled:        { bg: "bg-cyan-50",     text: "text-cyan-700",    dot: "bg-cyan-500" },
  pending_approval: { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  draft:            { bg: "bg-slate-50",    text: "text-slate-600",   dot: "bg-slate-400" },
  failed:           { bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500" },
};

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#2563EB", "#10B981", "#F59E0B", "#EC4899",
  "#8B5CF6", "#06B6D4", "#EF4444", "#0EA5E9",
];

function getAvatarColor(userId: string): string {
  const idx = userId.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function TeamPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: members = [], isLoading } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: posts = [] } = usePosts(workspace?.workspaceId);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"employee" | "client" | "admin">("employee");
  const [isSending, setIsSending] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);

  const isAdmin = workspace?.role === "admin";

  const employees = members.filter((m) => m.role === "employee" || m.role === "admin");
  const clients = members.filter((m) => m.role === "client");

  // ── Team-wide metrics ──
  const teamMetrics = useMemo(() => {
    const teamMemberIds = employees.map((m) => m.user_id);
    const teamPosts = posts.filter((p) =>
      p.assigned_to && p.assigned_to.some((uid) => teamMemberIds.includes(uid))
    );
    const total = teamPosts.length;
    const completed = teamPosts.filter((p) => p.status === "published" || p.status === "approved").length;
    const pending = teamPosts.filter((p) => p.status === "draft" || p.status === "pending_approval").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, rate };
  }, [posts, employees]);

  // ── Per-member workload ──
  const memberWorkload = useMemo(() => {
    return employees.map((m) => {
      const memberPosts = posts.filter((p) =>
        p.assigned_to && p.assigned_to.includes(m.user_id)
      );
      const completed = memberPosts.filter((p) => p.status === "published" || p.status === "approved").length;
      const pending = memberPosts.filter((p) => p.status === "draft" || p.status === "pending_approval").length;
      const total = memberPosts.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { member: m, total, completed, pending, rate };
    }).sort((a, b) => b.total - a.total);
  }, [posts, employees]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.workspaceId) return;
    setIsSending(true);
    try {
      await sendInvite({
        data: { email: inviteEmail, role: inviteRole, workspaceId: workspace.workspaceId },
      });
      toast.success(`Invite sent to ${inviteEmail}!`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("employee");
    } catch (err: any) {
      toast.error("Failed to send invite: " + (err.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppShell
      title="Team"
      subtitle="Everyone in your workspace, their roles and active workload."
      actions={
        isAdmin ? (
          <Button className="rounded-xl h-10" onClick={() => setIsInviteOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Invite Member
          </Button>
        ) : null
      }
    >
      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a Team Member</DialogTitle>
            <DialogDescription>Add a new team member or client to collaborate on content, approvals, and campaigns.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input id="invite-email" type="email" required placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === "client" ? "Clients can view and approve content on the calendar." : inviteRole === "admin" ? "Admins have full access to the workspace." : "Employees can create and manage content."}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSending}>
              {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Invite...</> : <><Mail className="h-4 w-4 mr-2" /> Send Invite Email</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Profile Modal (TC25) */}
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          posts={posts}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-muted/60 p-1 rounded-xl mb-6">
            <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2" /> Members
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" /> Performance
            </TabsTrigger>
          </TabsList>

          {/* ── MEMBERS TAB ── */}
          <TabsContent value="members">
            {members.length === 0 ? (
              <div className="card-soft p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No team members yet</h3>
                <p className="text-muted-foreground text-sm mb-6">Invite employees and clients to collaborate.</p>
                {isAdmin && <Button onClick={() => setIsInviteOpen(true)}><Plus className="h-4 w-4 mr-2" /> Invite First Member</Button>}
              </div>
            ) : (
              <div className="space-y-8">
                {employees.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Agency Team ({employees.length})</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {employees.map((m) => (
                        <MemberCard key={m.id} member={m} onViewProfile={() => setSelectedMember(m)} />
                      ))}
                    </div>
                  </div>
                )}
                {clients.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Clients ({clients.length})</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {clients.map((m) => <MemberCard key={m.id} member={m} onViewProfile={() => setSelectedMember(m)} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── PERFORMANCE TAB (TC24) ── */}
          <TabsContent value="performance">
            <div className="space-y-6">
              {/* Team Overview Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Tasks"
                  value={teamMetrics.total}
                  icon={<FileText className="h-5 w-5 text-primary" />}
                  color="bg-primary/10"
                />
                <MetricCard
                  title="Completed"
                  value={teamMetrics.completed}
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  color="bg-emerald-100"
                />
                <MetricCard
                  title="Pending"
                  value={teamMetrics.pending}
                  icon={<Clock className="h-5 w-5 text-amber-600" />}
                  color="bg-amber-100"
                />
                <MetricCard
                  title="Completion Rate"
                  value={`${teamMetrics.rate}%`}
                  icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                  color="bg-blue-100"
                />
              </div>

              {/* Workload Distribution */}
              <div className="card-soft p-6">
                <h3 className="font-semibold text-base mb-1">Workload Distribution</h3>
                <p className="text-sm text-muted-foreground mb-5">Tasks assigned or authored per team member.</p>
                {memberWorkload.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
                ) : (
                  <div className="space-y-4">
                    {memberWorkload.map(({ member, total, completed, pending, rate }) => {
                      const name = member.users?.full_name || member.users?.email?.split("@")[0] || "Unknown";
                      const color = getAvatarColor(member.user_id);
                      const initials = getInitials(member.users?.full_name, member.users?.email ?? "??");
                      return (
                        <div key={member.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-8 w-8 rounded-xl grid place-items-center text-white text-xs font-bold shrink-0"
                                style={{ background: color }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {completed} done · {pending} pending · {total} total
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-primary">{rate}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Individual Member Summary Cards */}
              <div>
                <h3 className="font-semibold text-base mb-3">Individual Performance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memberWorkload.map(({ member, total, completed, pending, rate }) => {
                    const name = member.users?.full_name || member.users?.email?.split("@")[0] || "Unknown";
                    const color = getAvatarColor(member.user_id);
                    const initials = getInitials(member.users?.full_name, member.users?.email ?? "??");
                    const roleStyle = ROLE_STYLE[member.role] ?? ROLE_STYLE.employee;
                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className="card-soft p-5 text-left hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl grid place-items-center text-white text-sm font-bold" style={{ background: color }}>
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{name}</div>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                                {ROLE_ICON[member.role]}{roleStyle.label}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-bold">{total}</div>
                            <div className="text-[10px] text-muted-foreground">Total</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-emerald-600">{completed}</div>
                            <div className="text-[10px] text-muted-foreground">Done</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-primary">{rate}%</div>
                            <div className="text-[10px] text-muted-foreground">Rate</div>
                          </div>
                        </div>
                        <div className="mt-3 w-full bg-muted rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

// ── Metric Card ──
function MetricCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-9 w-9 rounded-xl grid place-items-center ${color}`}>{icon}</div>
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// ── Member Profile Modal (TC25) ──
function MemberProfileModal({
  member, posts, onClose,
}: { member: WorkspaceMember; posts: any[]; onClose: () => void }) {
  const user = member.users;
  const name = user?.full_name || user?.email?.split("@")[0] || "Unknown";
  const email = user?.email ?? "";
  const color = getAvatarColor(member.user_id);
  const initials = getInitials(user?.full_name, email);
  const roleStyle = ROLE_STYLE[member.role] ?? ROLE_STYLE.employee;

  const memberPosts = useMemo(() => {
    return posts.filter(
      (p) => p.assigned_to && p.assigned_to.includes(member.user_id)
    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [posts, member.user_id]);

  const completed = memberPosts.filter((p) => p.status === "published" || p.status === "approved").length;
  const pending = memberPosts.filter((p) => p.status === "draft" || p.status === "pending_approval").length;
  const total = memberPosts.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl grid place-items-center text-white text-sm font-bold shrink-0" style={{ background: color }}>
              {initials}
            </div>
            <div>
              <div className="font-bold text-base">{name}</div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                {ROLE_ICON[member.role]}{roleStyle.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-5 border-b">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Tasks Assigned</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{completed}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Completed</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{pending}</div>
              <div className="text-xs text-amber-600 mt-0.5">Pending</div>
            </div>
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <div className="text-2xl font-bold text-primary">{rate}%</div>
              <div className="text-xs text-primary/70 mt-0.5">Completion Rate</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall progress</span>
              <span>{rate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-700"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Assigned Tasks ({total})
          </h3>
          {memberPosts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memberPosts.map((p) => {
                const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
                const label = p.status.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                const date = new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.topic || p.content_type || "Untitled Post"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.client_name || "—"} · {p.platform || "General"} · {date}
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" /> {email}
        </div>
      </div>
    </div>
  );
}

// ── Member Card ──
function MemberCard({ member, onViewProfile }: { member: WorkspaceMember; onViewProfile: () => void }) {
  const user = member.users;
  const email = user?.email ?? "Unknown";
  const name = user?.full_name || null;
  const initials = getInitials(name, email);
  const color = getAvatarColor(member.user_id);
  const roleStyle = ROLE_STYLE[member.role] ?? ROLE_STYLE.employee;
  const joinedDate = new Date(member.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const { data: workspace } = useCurrentWorkspace();
  const isAdmin = workspace?.role === "admin";
  const removeMember = useRemoveWorkspaceMember();

  const handleRemove = async () => {
    if (!workspace?.workspaceId) return;
    if (confirm(`Are you sure you want to remove ${name ?? email} from the workspace?`)) {
      try {
        await removeMember.mutateAsync({ workspace_id: workspace.workspaceId, user_id: member.user_id });
        toast.success("Member removed.");
      } catch (err: any) {
        toast.error("Failed to remove member: " + err.message);
      }
    }
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(name ?? email.split("@")[0]);
  const updateProfile = useUpdateProfile();

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await updateProfile.mutateAsync({ user_id: member.user_id, full_name: editName.trim() });
      toast.success("Name updated!");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error("Failed to update name: " + err.message);
    }
  };

  return (
    <div className="card-soft lift p-5">
      {/* Edit Name Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription>Update the display name for {email}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveName} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${member.user_id}`}>Full Name</Label>
              <Input
                id={`edit-name-${member.user_id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Name"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between">
        <button className="flex items-center gap-3 min-w-0 text-left" onClick={onViewProfile}>
          <div className="h-12 w-12 shrink-0 rounded-2xl grid place-items-center text-white text-sm font-semibold" style={{ background: color }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate hover:text-primary transition-colors">{name ?? email.split("@")[0]}</div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${roleStyle.bg} ${roleStyle.text}`}>
              {ROLE_ICON[member.role]}{roleStyle.label}
            </span>
          </div>
        </button>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600 rounded-full" onClick={() => { setEditName(name ?? email.split("@")[0]); setIsEditOpen(true); }} title="Edit name">
              <Pencil className="h-4 w-4" />
            </Button>
            {member.role !== "admin" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 rounded-full" onClick={handleRemove} disabled={removeMember.isPending}>
                {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 text-xs flex items-center gap-2 text-muted-foreground">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{email}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Joined {joinedDate}</span>
        <button onClick={onViewProfile} className="text-primary hover:underline font-medium flex items-center gap-1">
          View Work <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
