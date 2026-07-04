import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, Briefcase, CalendarClock, Send, IndianRupee, CheckCircle2,
  TrendingUp, ArrowUpRight, MoreHorizontal, Clock, Video,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { PLATFORM_COLOR } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { useCurrentWorkspace, useDashboardStats, useRevenueGraph, usePosts, useClients, useWorkspaceMembers, useMeetings } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — SocialNxt CRM" }] }),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });

    // If no workspace yet, send to onboarding to create one
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    if (!data?.workspace_id) throw redirect({ to: "/onboarding" });
  },
  component: Dashboard,
});


function Dashboard() {
  const { data: workspace, isLoading: workspaceLoading } = useCurrentWorkspace();
  const navigate = useNavigate();
  const stats = useDashboardStats(workspace?.workspaceId);
  const { data: revenueData = [] } = useRevenueGraph(workspace?.workspaceId);
  const { data: allPostsRaw = [] } = usePosts(workspace?.workspaceId);
  const { data: clientsRaw = [] } = useClients(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: allMeetingsRaw = [] } = useMeetings(workspace?.workspaceId);

  const isClient = workspace?.role === "client";
  const clientName = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";

  const allPosts = isClient 
    ? allPostsRaw.filter(p => p.client_name?.toLowerCase() === clientName.toLowerCase())
    : allPostsRaw;

  const allMeetings = isClient
    ? allMeetingsRaw.filter((m) => (m as any).client_id === workspace?.userId)
    : allMeetingsRaw;

  const clients = isClient
    ? clientsRaw.filter((c) => c.name.toLowerCase() === clientName.toLowerCase())
    : clientsRaw;

  // ─── Platform Distribution (real) ───────────────────────────────────────────
  const platformCounts: Record<string, number> = {};
  allPosts.forEach((p) => { if (p.platform) platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1; });
  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0);
  const livePlatformDistribution = Object.entries(platformCounts)
    .map(([name, count]) => ({ name, value: totalPlatformPosts > 0 ? Math.round((count / totalPlatformPosts) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);

  // ─── Content Progress (real) ─────────────────────────────────────────────────
  const liveContentProgress = clients
    .map((c) => {
      const clientPosts = allPosts.filter((p) => p.client_name === c.name);
      const donePosts = clientPosts.filter((p) => p.status === "published" || p.status === "approved" || p.status === "scheduled");
      const pct = clientPosts.length > 0 ? Math.round((donePosts.length / clientPosts.length) * 100) : 0;
      const initials = c.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
      return { id: c.id, name: c.name, initials, pct };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const bgColors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];

  // ─── Team Workload (real) ────────────────────────────────────────────────────
  // Count posts where this employee appears in the assigned_to array
  const employeeMembers = members.filter((m) => m.role === "employee" || m.role === "admin");
  const liveTeamWorkload = employeeMembers
    .map((m) => ({
      name: (m.users?.full_name || m.users?.email || "Unknown").split(" ")[0],
      tasks: allPosts.filter((p) =>
        Array.isArray(p.assigned_to) && p.assigned_to.includes(m.user_id)
      ).length,
    }))
    .filter((e) => e.tasks > 0);

  // ─── Today's Tasks (real) ────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysTasks = allPosts
    .filter((p) => {
      const scheduledDay = p.scheduled_for?.slice(0, 10);
      return scheduledDay === todayStr || p.status === "pending_approval";
    })
    .slice(0, 5);

  // ─── Recent Activities (real) ────────────────────────────────────────────────
  const recentActivities = [...allPosts]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map((p) => {
      // Look up author by author_id for accurate "who did this" name
      const authorMember = members.find((m) => m.user_id === p.author_id);
      const who = authorMember?.users?.full_name || authorMember?.users?.email?.split("@")[0] || "Someone";
      const action = p.status === "published" ? "marked as posted" : p.status === "approved" ? "approved" : p.status === "pending_approval" ? "submitted for approval" : "updated";
      const diffMs = Date.now() - new Date(p.updated_at).getTime();
      const diffH = Math.floor(diffMs / 3600000);
      const when = diffH < 1 ? "Just now" : diffH < 24 ? `${diffH}h ago` : diffH < 48 ? "Yesterday" : `${Math.floor(diffH / 24)}d ago`;
      return { who, what: `${action} — ${p.topic || p.client_name || "post"}`, when };
    });

  // ─── Upcoming Meetings (real) ────────────────────────────────────────────────
  const upcomingMeetings = allMeetings
    .filter((m) => new Date(m.scheduled_at) > new Date())
    .slice(0, 3);

  // Build live stat cards (replacing hard-coded STATS)
  const LIVE_STATS = [
    {
      label: "Connected Accounts",
      value: workspaceLoading ? "…" : String(stats.connectedAccounts),
      delta: "Social platforms",
      icon: Users,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Total Posts",
      value: workspaceLoading ? "…" : String(stats.totalPosts),
      delta: "All time",
      icon: Briefcase,
      tone: "text-[#10B981] bg-[#10B981]/10",
    },
    {
      label: "Scheduled",
      value: workspaceLoading ? "…" : String(stats.scheduledPosts),
      delta: "Upcoming",
      icon: CalendarClock,
      tone: "text-[#F59E0B] bg-[#F59E0B]/10",
    },
    {
      label: "Posts Published",
      value: workspaceLoading ? "…" : String(stats.publishedPosts),
      delta: "Live",
      icon: Send,
      tone: "text-[#EC4899] bg-[#EC4899]/10",
    },
    {
      label: "Drafts",
      value: workspaceLoading ? "…" : String(stats.draftPosts),
      delta: "In progress",
      icon: IndianRupee,
      tone: "text-[#8B5CF6] bg-[#8B5CF6]/10",
    },
    {
      label: "Pending Approvals",
      value: workspaceLoading ? "…" : String(stats.pendingApprovals),
      delta: "Needs review",
      icon: CheckCircle2,
      tone: "text-[#EF4444] bg-[#EF4444]/10",
    },
  ];

  return (
    <AppShell
      title={`Good morning, ${workspace?.userEmail?.split("@")[0] ?? "there"}`}
      subtitle="Here's what's happening across your agency today."

    >
      {/* Stat cards — live from Supabase */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {LIVE_STATS.filter(s => {
          if (workspace?.role === "client") {
            return ["Pending Approvals", "Scheduled", "Posts Published"].includes(s.label);
          }
          return true;
        }).map((s) => (
          <div key={s.label} className="card-soft lift p-4">
            <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            <div className="text-[11px] mt-2 text-foreground/70 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#10B981]" /> {s.delta}
            </div>
          </div>
        ))}
      </div>

      {workspace?.role !== "client" && (
        <>
      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="card-soft p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Monthly Revenue</div>
              <div className="text-xs text-muted-foreground">Last 6 months (in ₹ thousands)</div>
            </div>
            <Badge variant="secondary" className="rounded-full">+18.2%</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={revenueData.length ? revenueData : [{ month: "Jan", revenue: 0 }]}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Platform Distribution</div>
          </div>
          <div className="h-48">
            {livePlatformDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No posts yet</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={livePlatformDistribution} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {livePlatformDistribution.map((p) => (
                      <Cell key={p.name} fill={PLATFORM_COLOR[p.name as keyof typeof PLATFORM_COLOR] ?? "#9CA3AF"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-2 mt-2">
            {livePlatformDistribution.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[p.name as keyof typeof PLATFORM_COLOR] ?? "#9CA3AF" }} />
                  {p.name}
                </span>
                <span className="font-semibold">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content progress + team workload */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Content Progress</div>
          </div>
          <div className="space-y-4">
            {liveContentProgress.length === 0 ? (
              <div className="text-xs text-muted-foreground">No clients with posts yet.</div>
            ) : liveContentProgress.map((c, i) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg grid place-items-center text-[11px] font-semibold text-white shrink-0" style={{ background: bgColors[i % bgColors.length] }}>{c.initials}</div>
                    <span className="truncate font-medium">{c.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{c.pct}%</span>
                </div>
                <Progress value={c.pct} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Team Workload</div>
          </div>
          <div className="h-64">
            {liveTeamWorkload.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No assigned tasks yet.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={liveTeamWorkload}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Bar dataKey="tasks" fill="#2563EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Tasks + Activity + Meetings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Today's Tasks</div>
          </div>
          <div className="space-y-3">
            {todaysTasks.length === 0 ? (
              <div className="text-xs text-muted-foreground">No tasks scheduled for today.</div>
            ) : todaysTasks.map((t) => {
              const statusColor = t.status === "pending_approval" ? "bg-[#F59E0B]" : t.status === "draft" ? "bg-[#9CA3AF]" : "bg-[#10B981]";
              const isCollab = Array.isArray(t.assigned_to) && t.assigned_to.length > 1;
              const assignedMember = members.find((m) => Array.isArray(t.assigned_to) ? t.assigned_to.includes(m.user_id) : m.user_id === (t.assigned_to as any));
              const assigneeName = isCollab ? "Collab" : (assignedMember?.users?.full_name || assignedMember?.users?.email?.split("@")[0] || "Unassigned");
              return (
                <div key={t.id} className="flex items-start gap-3">
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.topic || t.content_type || "Post"}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.client_name} · {assigneeName}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {t.scheduled_for ? new Date(t.scheduled_for).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : t.status.replace("_", " ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Recent Activities</div>
            <button
              onClick={() => navigate({ to: "/activity-logs" })}
              className="h-7 w-7 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
              title="View full Activity Logs"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <ol className="relative ml-2 border-l border-border space-y-4">
            {recentActivities.length === 0 ? (
              <li className="pl-4 text-xs text-muted-foreground">No recent activity.</li>
            ) : recentActivities.map((a, i) => (
              <li key={i} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                <div className="text-sm"><span className="font-semibold">{a.who}</span> <span className="text-muted-foreground">{a.what}</span></div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {a.when}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Upcoming Meetings</div>
            <button
              onClick={() => navigate({ to: "/meetings" })}
              className="h-7 w-7 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
              title="Go to Meetings"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {upcomingMeetings.length === 0 ? (
              <div className="text-xs text-muted-foreground">No upcoming meetings.</div>
            ) : upcomingMeetings.map((m) => {
              const dt = new Date(m.scheduled_at);
              const dateStr = dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              const timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={m.id} className="rounded-xl border border-border p-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{m.agenda}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.users?.full_name || "Team"}</div>
                      <div className="text-[11px] mt-1 text-foreground/70">{dateStr} · {timeStr}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
