import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Download, Calendar as CalIcon, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { PLATFORM_COLOR } from "@/lib/demo-data";
import {
  useCurrentWorkspace, usePosts, useClients, useWorkspaceMembers,
  useRevenueGraph, useDeals,
} from "@/lib/queries";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — SocialNxt CRM" }] }),
  component: ReportsPage,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BG_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6"];

function ReportsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: posts = [], isLoading: postsLoading } = usePosts(workspace?.workspaceId);
  const { data: clients = [], isLoading: clientsLoading } = useClients(workspace?.workspaceId);
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: revenueData = [], isLoading: revenueLoading } = useRevenueGraph(workspace?.workspaceId);
  const { data: deals = [] } = useDeals(workspace?.workspaceId);

  const isLoading = postsLoading || clientsLoading || membersLoading || revenueLoading;

  // ─── Platform Distribution ───────────────────────────────────────────────────
  const platformCounts: Record<string, number> = {};
  posts.forEach((p) => { if (p.platform) platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1; });
  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0);
  const platformDistribution = Object.entries(platformCounts)
    .map(([name, count]) => ({ name, value: totalPlatformPosts > 0 ? Math.round((count / totalPlatformPosts) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);

  // ─── Monthly Performance (published vs scheduled) ────────────────────────────
  const now = new Date();
  const monthlyPerf: { month: string; published: number; scheduled: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthName = MONTHS[m];
    monthlyPerf.push({
      month: monthName,
      published: posts.filter((p) => {
        const pd = p.scheduled_for ? new Date(p.scheduled_for) : null;
        return pd && pd.getMonth() === m && pd.getFullYear() === y && p.status === "published";
      }).length,
      scheduled: posts.filter((p) => {
        const pd = p.scheduled_for ? new Date(p.scheduled_for) : null;
        return pd && pd.getMonth() === m && pd.getFullYear() === y && (p.status === "scheduled" || p.status === "published");
      }).length,
    });
  }

  // ─── Team Productivity ───────────────────────────────────────────────────────
  const teamProductivity = members
    .filter((m) => m.role === "employee" || m.role === "admin")
    .map((m) => {
      const assigned = posts.filter((p) => Array.isArray(p.assigned_to) ? p.assigned_to.includes(m.user_id) : p.assigned_to === (m.user_id as any)).length;
      const published = posts.filter((p) => (Array.isArray(p.assigned_to) ? p.assigned_to.includes(m.user_id) : p.assigned_to === (m.user_id as any)) && p.status === "published").length;
      const pct = assigned > 0 ? Math.round((published / assigned) * 100) : 0;
      return {
        name: m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown",
        assigned,
        published,
        pct,
      };
    })
    .sort((a, b) => b.assigned - a.assigned);

  // ─── Top Clients by Revenue ──────────────────────────────────────────────────
  const clientRevenue = clients.map((c) => {
    const rev = deals
      .filter((d) => d.client_name === c.name && d.stage === "Completed")
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const activePosts = posts.filter((p) => p.client_name === c.name && (p.status === "scheduled" || p.status === "approved")).length;
    return { ...c, revenue: rev, activePosts };
  }).sort((a, b) => b.revenue - a.revenue);

  if (isLoading) {
    return (
      <AppShell title="Reports" subtitle="Agency-wide performance, revenue and team productivity.">
        <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Reports"
      subtitle="Agency-wide performance, revenue and team productivity."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl h-10"><CalIcon className="h-4 w-4" /> Last 6 months</Button>
          <Button className="rounded-xl h-10"><Download className="h-4 w-4" /> Export Report</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue Bar Chart */}
        <div className="card-soft p-5 xl:col-span-2">
          <div className="text-sm font-semibold mb-1">Revenue</div>
          <div className="text-xs text-muted-foreground mb-4">Monthly recognized revenue (₹ thousands)</div>
          {revenueData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">No completed deals yet — approve proposals to see revenue.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`₹${v}k`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="#2563EB" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Platform Distribution Pie */}
        <div className="card-soft p-5">
          <div className="text-sm font-semibold mb-1">Platform analytics</div>
          <div className="text-xs text-muted-foreground mb-4">Share of all content by platform</div>
          {platformDistribution.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">No posts yet.</div>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={platformDistribution} dataKey="value" innerRadius={48} outerRadius={84} paddingAngle={2}>
                      {platformDistribution.map((p) => (
                        <Cell key={p.name} fill={PLATFORM_COLOR[p.name as keyof typeof PLATFORM_COLOR] ?? "#9CA3AF"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`${v}%`, "Share"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {platformDistribution.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[p.name as keyof typeof PLATFORM_COLOR] ?? "#9CA3AF" }} />
                      {p.name}
                    </span>
                    <span className="font-semibold">{p.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Monthly Performance Line Chart */}
        <div className="card-soft p-5 xl:col-span-2">
          <div className="text-sm font-semibold mb-1">Monthly performance</div>
          <div className="text-xs text-muted-foreground mb-4 flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-[#2563EB] inline-block" /> Published</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-[#10B981] inline-block" /> Scheduled</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={monthlyPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Line type="monotone" dataKey="published" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Published" />
                <Line type="monotone" dataKey="scheduled" stroke="#10B981" strokeWidth={2.5} dot={false} name="Scheduled" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Productivity */}
        <div className="card-soft p-5">
          <div className="text-sm font-semibold mb-4">Team productivity</div>
          {teamProductivity.length === 0 ? (
            <div className="text-xs text-muted-foreground">No assigned posts yet.</div>
          ) : (
            <div className="space-y-3">
              {teamProductivity.slice(0, 6).map((e, i) => (
                <div key={e.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate">{e.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">{e.published}/{e.assigned} posts · {e.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: BG_COLORS[i % BG_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Clients by Revenue */}
        <div className="card-soft p-5 xl:col-span-3">
          <div className="text-sm font-semibold mb-4">Top clients by revenue</div>
          {clientRevenue.length === 0 ? (
            <div className="text-xs text-muted-foreground">No clients yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Client</th>
                    <th className="px-3 py-2 font-semibold">Industry</th>
                    <th className="px-3 py-2 font-semibold">Active posts</th>
                    <th className="px-3 py-2 font-semibold">Total Posts</th>
                    <th className="px-3 py-2 font-semibold">Revenue (deals)</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRevenue.slice(0, 8).map((c, i) => {
                    const initials = c.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                    const totalPosts = posts.filter((p) => p.client_name === c.name).length;
                    return (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-3 py-3 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-7 w-7 rounded-lg grid place-items-center text-[10px] font-semibold text-white" style={{ background: BG_COLORS[i % BG_COLORS.length] }}>{initials}</span>
                            {c.name}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-foreground/80">{c.industry || "—"}</td>
                        <td className="px-3 py-3 text-foreground/80">{c.activePosts}</td>
                        <td className="px-3 py-3 text-foreground/80">{totalPosts}</td>
                        <td className="px-3 py-3 font-semibold">
                          {c.revenue > 0 ? `₹${c.revenue.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
