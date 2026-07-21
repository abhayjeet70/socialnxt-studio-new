import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { usePosts, useCurrentWorkspace, useWorkspaceMembers, useIssues, useQuotations } from "@/lib/queries";
import { useState, useMemo } from "react";
import {
  UploadCloud, Link as LinkIcon, FileText, CheckCircle2,
  Clock, User, Filter, Calendar, X, KanbanSquare, Download,
  Receipt, AlertOctagon,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const { data: issues = [], isLoading: issuesLoading } = useIssues(workspace?.workspaceId);
  const { data: allQuotations = [], isLoading: invoicesLoading } = useQuotations(workspace?.workspaceId);

  const isLoading = postsLoading || membersLoading || issuesLoading || invoicesLoading;

  const [range, setRange] = useState<RangeOption>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const isClient = workspace?.role === "client";
  const clientName = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";

  // Build all activity entries from posts, deals, and proposals
  const allActivities = useMemo(() => {
    // Filter to invoices only (INV- prefix)
    const invoices = allQuotations.filter(q => q.quotation_number?.startsWith("INV-"));
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
        const client = p.client_name || "-";
        const platform = p.platform || (p.platforms && p.platforms.length > 0 ? p.platforms.join("; ") : "-");

        const events: { ts: Date; who: string; action: string; subject: string; client: string; platform: string; icon: any; color: string; extra: string }[] = [];

        // Creation event
        events.push({
          ts: new Date(p.created_at || p.updated_at),
          who,
          action: "created a task",
          subject,
          client,
          platform,
          icon: FileText,
          color: "bg-blue-100 text-blue-700",
          extra: "-",
        });

        // Main status event
        if (p.updated_at && p.updated_at !== p.created_at) {
          events.push({
            ts: new Date(p.updated_at),
            who,
            action,
            subject,
            client,
            platform,
            icon: getActionIcon(action),
            color: getActionColor(action),
            extra: "-",
          });
        }

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



    // 5. Issue Events
    const filteredIssues = isClient ? issues.filter(i => i.client_name?.toLowerCase() === clientName.toLowerCase()) : issues;
    const issueEvents = filteredIssues.map((i) => {
      const reporterMember = members.find((m) => m.user_id === i.raised_by);
      const who = reporterMember?.users?.full_name || reporterMember?.users?.email?.split("@")[0] || "System";
      const events = [];
      events.push({
        ts: new Date(i.created_at || new Date()),
        who,
        action: "reported an issue",
        subject: i.title || "Issue",
        client: i.client_name || "-",
        platform: "Issues",
        icon: AlertOctagon,
        color: "bg-red-100 text-red-700",
        extra: `Priority: ${i.priority}`,
      });
      if (i.updated_at && i.updated_at !== i.created_at) {
        events.push({
          ts: new Date(i.updated_at),
          who,
          action: i.status === "Resolved" ? "resolved the issue" : `updated issue to ${i.status}`,
          subject: i.title || "Issue",
          client: i.client_name || "-",
          platform: "Issues",
          icon: AlertOctagon,
          color: i.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700",
          extra: `Priority: ${i.priority}`,
        });
      }
      return events;
    }).flat();

    // Invoice Events
    const filteredInvoices = isClient
      ? invoices.filter(q => q.client_name?.toLowerCase() === clientName.toLowerCase())
      : invoices;

    const invoiceEvents = filteredInvoices.flatMap((q) => {
      const creatorMember = members.find((m) => m.user_id === q.created_by);
      const who = creatorMember?.users?.full_name || creatorMember?.users?.email?.split("@")[0] || "System";
      const events: any[] = [];

      events.push({
        ts: new Date(q.created_at),
        who,
        action: "created invoice",
        subject: q.quotation_number,
        client: q.client_name || "-",
        platform: "Billing",
        icon: Receipt,
        color: "bg-violet-100 text-violet-700",
        extra: `Status: ${q.status}`,
      });

      if (q.updated_at && q.updated_at !== q.created_at) {
        events.push({
          ts: new Date(q.updated_at),
          who,
          action: "updated invoice",
          subject: q.quotation_number,
          client: q.client_name || "-",
          platform: "Billing",
          icon: Receipt,
          color: "bg-amber-100 text-amber-700",
          extra: `Status: ${q.status}`,
        });
      }

      return events;
    });

    return [...postEvents, ...issueEvents, ...invoiceEvents]
      .sort((a, b) => b.ts.getTime() - a.ts.getTime());
  }, [posts, issues, allQuotations, members, isClient, clientName]);

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

  const handleExportCSV = () => {
    if (filteredActivities.length === 0) return;
    const headers = "Date,Time,Who,Action,Subject,Client,Platform,Details\n";
    const csv = filteredActivities.map(a => {
      const date = a.ts.toLocaleDateString("en-IN");
      const time = a.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const esc = (s: string) => `"${(s || "-").replace(/"/g, '""')}"`;
      return [date, time, a.who, a.action, a.subject, a.client, a.platform, a.extra].map(esc).join(",");
    }).join("\n");
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (filteredActivities.length === 0) return;

    const cols = ["Date", "Time", "Who", "Action", "Subject", "Client", "Platform", "Details"];

    const esc = (v: string) => (v || "-").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const headerRow = cols.map(c => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(c)}</Data></Cell>`).join("");

    const dataRows = filteredActivities.map(a => {
      const date = a.ts.toLocaleDateString("en-IN");
      const time = a.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const cells = [date, time, a.who, a.action, a.subject, a.client, a.platform, a.extra]
        .map(v => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    }).join("");

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<?mso-application progid="Excel.Sheet"?>`,
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"`,
      ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`,
      `<Styles>`,
      `<Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#7C3AED" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style>`,
      `</Styles>`,
      `<Worksheet ss:Name="Activity Logs">`,
      `<Table>`,
      `<Row>${headerRow}</Row>`,
      dataRows,
      `</Table>`,
      `</Worksheet>`,
      `</Workbook>`,
    ].join("");

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (filteredActivities.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>Activity Logs Export</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 1.5rem; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Activity Logs</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Client</th>
                <th>Platform</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${filteredActivities.map(a => `
                <tr>
                  <td>${a.ts.toLocaleDateString("en-IN")}</td>
                  <td>${a.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>${a.who || "-"}</td>
                  <td>${a.action || "-"}</td>
                  <td>${a.subject || "-"}</td>
                  <td>${a.client || "-"}</td>
                  <td>${a.platform || "-"}</td>
                  <td>${a.extra || "-"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <AppShell
      title="Activity Logs"
      subtitle="A full timeline of every upload, link, and status change across all content."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-xl h-10" disabled={filteredActivities.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export Logs
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer gap-2">
              <FileText className="h-4 w-4 text-green-600" /> Export as Excel (.xls)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
              <FileText className="h-4 w-4" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2">
              <FileText className="h-4 w-4 text-red-500" /> Export as PDF (Print)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
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
