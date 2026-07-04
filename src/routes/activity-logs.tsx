import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { usePosts, useCurrentWorkspace, useWorkspaceMembers, useDeals, useProposals } from "@/lib/queries";
import { useState, useMemo } from "react";
import {
  UploadCloud, Link as LinkIcon, FileText, CheckCircle2,
  Clock, User, Filter, Calendar, X, KanbanSquare,
} from "lucide-react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/activity-logs")({
  head: () => ({ meta: [{ title: "Activity Logs — SocialNxt CRM" }] }),
  component: ActivityLogsPage,
});

type RangeOption = "today" | "3days" | "week" | "month" | "custom";

function getActionIcon(action: string) {
  if (action.includes("uploaded") || action.includes("upload")) return UploadCloud;
  if (action.includes("link")) return LinkIcon;
  if (action.includes("approved") || action.includes("published")) return CheckCircle2;
  if (action.includes("created")) return FileText;
  return User;
}

function getActionColor(action: string) {
  if (action.includes("approved") || action.includes("published")) return "bg-[#10B981]/10 text-[#047857]";
  if (action.includes("uploaded")) return "bg-[#3B82F6]/10 text-[#1D4ED8]";
  if (action.includes("rejected")) return "bg-[#EF4444]/10 text-[#B91C1C]";
  if (action.includes("approval")) return "bg-[#F59E0B]/10 text-[#92400E]";
  return "bg-muted text-foreground/60";
}

function deriveAction(post: any): string {
  if (post.status === "published") return "marked as published";
  if (post.status === "approved") return "approved";
  if (post.status === "pending_approval") return "submitted for approval";
  if (post.status === "scheduled") return "scheduled";
  if (post.status === "draft") return "saved as draft";
  return "updated";
}

function ActivityLogsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: posts = [], isLoading: postsLoading } = usePosts(workspace?.workspaceId);
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: deals = [], isLoading: dealsLoading } = useDeals(workspace?.workspaceId);
  const { data: proposals = [], isLoading: proposalsLoading } = useProposals(workspace?.workspaceId);

  const isLoading = postsLoading || membersLoading || dealsLoading || proposalsLoading;

  const [range, setRange] = useState<RangeOption>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const isClient = workspace?.role === "client";
  const clientName = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";

  // Build all activity entries from posts, deals, and proposals
  const allActivities = useMemo(() => {
    // 1. Post Events
    const filteredPosts = isClient
      ? posts.filter(p => p.client_name?.toLowerCase() === clientName.toLowerCase())
      : posts;

    const postEvents = filteredPosts
      .map((p) => {
        const authorMember = members.find((m) => m.user_id === p.author_id);
        const who = authorMember?.users?.full_name || authorMember?.users?.email?.split("@")[0] || "Someone";
        const action = deriveAction(p);
        const subject = p.topic || p.content_type || "content";
        const client = p.client_name || "";
        const platform = p.platform || "";

        const events: { ts: Date; who: string; action: string; subject: string; client: string; platform: string; icon: any; color: string; extra: string }[] = [];

        // Main status event
        events.push({
          ts: new Date(p.updated_at),
          who,
          action,
          subject,
          client,
          platform,
          icon: getActionIcon(action),
          color: getActionColor(action),
          extra: "",
        });

        // Reference content uploads
        if (p.reference_content && Array.isArray(p.reference_content)) {
          p.reference_content.forEach((url: string) => {
            const isLink = !url.match(/\.(jpeg|jpg|png|gif|webp)/i) && !url.includes("supabase.co");
            events.push({
              ts: new Date(p.updated_at),
              who,
              action: isLink ? "added a reference link" : "uploaded reference media",
              subject,
              client,
              platform,
              icon: isLink ? LinkIcon : UploadCloud,
              color: "bg-[#3B82F6]/10 text-[#1D4ED8]",
              extra: isLink ? url : "📎 media file",
            });
          });
        }

        // Completed work uploads
        if (p.completed_work && Array.isArray(p.completed_work)) {
          p.completed_work.forEach((url: string) => {
            const isLink = !url.match(/\.(jpeg|jpg|png|gif|webp)/i) && !url.includes("supabase.co");
            events.push({
              ts: new Date(p.updated_at),
              who,
              action: isLink ? "added a completed work link" : "uploaded completed content",
              subject,
              client,
              platform,
              icon: isLink ? LinkIcon : UploadCloud,
              color: "bg-[#10B981]/10 text-[#047857]",
              extra: isLink ? url : "📎 final file",
            });
          });
        }

        return events;
      })
      .flat();

    // 2. Deal Events
    const filteredDeals = isClient ? deals.filter(d => d.client_name?.toLowerCase() === clientName.toLowerCase()) : deals;
    const dealEvents = filteredDeals.map((d) => {
      const authorMember = members.find((m) => m.user_id === d.created_by);
      const who = authorMember?.users?.full_name || authorMember?.users?.email?.split("@")[0] || "Someone";
      return {
        ts: new Date(d.created_at || new Date()),
        who,
        action: `moved deal to ${d.stage}`,
        subject: d.project_name || "Project",
        client: d.client_name || "",
        platform: "Deals",
        icon: KanbanSquare,
        color: "bg-[#8B5CF6]/10 text-[#6D28D9]",
        extra: `₹${d.amount?.toLocaleString("en-IN") || 0}`,
      };
    });

    // 3. Proposal Events
    const filteredProposals = isClient ? proposals.filter(p => p.client_name?.toLowerCase() === clientName.toLowerCase()) : proposals;
    const proposalEvents = filteredProposals.map((p) => {
      const authorMember = members.find((m) => m.user_id === p.created_by);
      const who = authorMember?.users?.full_name || authorMember?.users?.email?.split("@")[0] || "Someone";
      const action = p.status === "Draft" ? "drafted a proposal" : p.status === "Sent" ? "sent a proposal" : `marked proposal as ${p.status}`;
      return {
        ts: new Date(p.updated_at || p.created_at || new Date()),
        who,
        action,
        subject: p.title || "Proposal",
        client: p.client_name || "",
        platform: "Proposals",
        icon: FileText,
        color: p.status === "Approved" ? "bg-[#10B981]/10 text-[#047857]" : "bg-[#F59E0B]/10 text-[#92400E]",
        extra: p.pdf_url ? "📄 View PDF" : "",
      };
    });

    return [...postEvents, ...dealEvents, ...proposalEvents]
      .sort((a, b) => b.ts.getTime() - a.ts.getTime());
  }, [posts, deals, proposals, members, isClient, clientName]);

  const filteredActivities = useMemo(() => {
    const now = new Date();
    let cutoff: Date;

    if (range === "today") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "3days") {
      cutoff = new Date(now.getTime() - 3 * 24 * 3600000);
    } else if (range === "week") {
      cutoff = new Date(now.getTime() - 7 * 24 * 3600000);
    } else if (range === "month") {
      cutoff = new Date(now.getTime() - 30 * 24 * 3600000);
    } else {
      // custom
      const from = customFrom ? new Date(customFrom) : new Date(0);
      const to = customTo ? new Date(customTo + "T23:59:59") : now;
      return allActivities.filter(a => a.ts >= from && a.ts <= to);
    }

    return allActivities.filter(a => a.ts >= cutoff);
  }, [allActivities, range, customFrom, customTo]);

  const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "3days", label: "Last 3 Days" },
    { value: "week", label: "This Week" },
    { value: "month", label: "Past Month" },
    { value: "custom", label: "Custom Date" },
  ];

  // Group by calendar date
  const grouped: Record<string, typeof filteredActivities> = {};
  filteredActivities.forEach(a => {
    const day = a.ts.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(a);
  });

  return (
    <AppShell
      title="Activity Logs"
      subtitle="A full timeline of every upload, link, and status change across all content."
    >
      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              setRange(opt.value);
              if (opt.value === "custom") setShowCustom(true);
              else setShowCustom(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              range === opt.value
                ? "bg-primary text-white shadow-sm"
                : "bg-muted text-foreground/70 hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}

        {/* Custom date pickers */}
        {showCustom && (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="text-xs bg-transparent focus:outline-none text-foreground"
              />
            </div>
            <span className="text-xs text-muted-foreground">to</span>
            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="text-xs bg-transparent focus:outline-none text-foreground"
              />
            </div>
            <button
              onClick={() => { setShowCustom(false); setRange("week"); setCustomFrom(""); setCustomTo(""); }}
              className="h-6 w-6 rounded-full bg-muted hover:bg-red-100 text-muted-foreground hover:text-red-600 grid place-items-center transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {filteredActivities.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredActivities.length} event{filteredActivities.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-24 text-center text-sm text-muted-foreground">No activity in this time range.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, events]) => (
            <div key={day}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 bg-muted rounded-full">{day}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="card-soft divide-y divide-border overflow-hidden">
                {events.map((a, i) => {
                  const Icon = a.icon;
                  const timeStr = a.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 mt-0.5 ${a.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          <span className="font-semibold">{a.who}</span>{" "}
                          <span className="text-muted-foreground">{a.action}</span>{" "}
                          <span className="font-medium">— {a.subject}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {a.client && (
                            <span className="text-[11px] bg-primary/8 text-primary font-medium px-2 py-0.5 rounded-full">{a.client}</span>
                          )}
                          {a.platform && (
                            <span className="text-[11px] bg-muted text-foreground/60 px-2 py-0.5 rounded-full">{a.platform}</span>
                          )}
                          {a.extra && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[240px]" title={a.extra}>{a.extra}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {timeStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
