import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Calendar as CalIcon, Download, GripVertical, Users as UsersIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentWorkspace, usePosts, useUpdatePostStatus, useActiveClients, useWorkspaceMembers, Post } from "@/lib/queries";
import { usePermissions } from "@/lib/permissions";
import { InstagramLogo, FacebookLogo, LinkedInLogo, YouTubeLogo, TikTokLogo, TwitterLogo } from "@/components/social-icons";
import { toast } from "sonner";

const STATUSES = ["draft", "pending_approval", "changes_requested", "approved", "scheduled", "published", "failed"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  changes_requested: "Changes Requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

const STATUS_COLOR: Record<Status, string> = {
  draft: "#64748B",
  pending_approval: "#F59E0B",
  changes_requested: "#EF4444",
  approved: "#10B981",
  scheduled: "#06B6D4",
  published: "#6366F1",
  failed: "#DC2626",
};

function PlatformIcon({ platform }: { platform: string }) {
  const size = 12;
  switch (platform?.toLowerCase()) {
    case "instagram": return <InstagramLogo width={size} height={size} />;
    case "facebook": return <FacebookLogo width={size} height={size} />;
    case "linkedin": return <LinkedInLogo width={size} height={size} />;
    case "youtube": return <YouTubeLogo width={size} height={size} />;
    case "tiktok": return <TikTokLogo width={size} height={size} />;
    case "twitter": return <TwitterLogo width={size} height={size} />;
    default: return null;
  }
}

export function DealsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: posts = [], isLoading } = usePosts(workspace?.workspaceId);
  const { data: clients = [] } = useActiveClients(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const updateStatus = useUpdatePostStatus();

  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("All Clients");

  // Drag state
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const dragCardId = useRef<string | null>(null);
  const dragFromStatus = useRef<string | null>(null);

  const isClient = workspace?.role === "client";
  const { hasPermission } = usePermissions();
  const canEdit = workspace?.role === "admin" || (workspace?.role === "employee" && hasPermission("access_deals"));

  const visiblePosts = isClient
    ? posts.filter((p) =>
        p.client_name?.toLowerCase() === workspace?.userEmail?.split("@")[0]?.toLowerCase() ||
        p.client_name?.toLowerCase() === workspace?.userFullName?.toLowerCase()
      )
    : selectedClientFilter === "All Clients"
      ? posts
      : posts.filter((p) => p.client_name === selectedClientFilter);

  const handleExport = () => {
    if (visiblePosts.length === 0) {
      toast.error("No tasks to export.");
      return;
    }
    const headers = ["Client Name", "Topic", "Platform", "Status", "Scheduled For", "Date Created"];
    const csvContent = [
      headers.join(","),
      ...visiblePosts.map((p) => {
        const date = new Date(p.created_at).toLocaleDateString();
        const scheduled = p.scheduled_for ? new Date(p.scheduled_for).toLocaleDateString() : "";
        return `"${p.client_name || ""}","${(p.topic || p.content || "").replace(/"/g, '""').slice(0, 80)}","${p.platform || ""}","${p.status}","${scheduled}","${date}"`;
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tasks_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const moveTo = (id: string, fromStatus: string, targetStatus: string) => {
    if (!workspace || fromStatus === targetStatus) return;
    updateStatus.mutate(
      { id, status: targetStatus, workspace_id: workspace.workspaceId },
      {
        onSuccess: () => {
          toast.success(`Moved to ${STATUS_LABEL[targetStatus as Status] || targetStatus}`, {
            action: {
              label: "Undo",
              onClick: () => updateStatus.mutate({ id, status: fromStatus, workspace_id: workspace.workspaceId }),
            },
          });
        },
        onError: (err: any) => toast.error(err.message),
      }
    );
  };

  // ── Drag handlers ──
  const handleDragStart = (e: React.DragEvent, postId: string, status: string) => {
    dragCardId.current = postId;
    dragFromStatus.current = status;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    const id = dragCardId.current;
    const fromStatus = dragFromStatus.current;
    dragCardId.current = null;
    dragFromStatus.current = null;
    if (!id || !fromStatus) return;
    moveTo(id, fromStatus, targetStatus);
  };

  const handleDragEnd = () => {
    setDragOverStatus(null);
    dragCardId.current = null;
    dragFromStatus.current = null;
  };

  // ── Touch drag handlers (mobile) ──
  const touchCardId = useRef<string | null>(null);
  const touchFromStatus = useRef<string | null>(null);
  const touchLastX = useRef<number>(0);
  const touchLastY = useRef<number>(0);
  const touchDragging = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent, postId: string, status: string) => {
    touchCardId.current = postId;
    touchFromStatus.current = status;
    touchDragging.current = false;
    const t = e.touches[0];
    touchLastX.current = t.clientX;
    touchLastY.current = t.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchCardId.current) return;
    const t = e.touches[0];
    touchLastX.current = t.clientX;
    touchLastY.current = t.clientY;
    touchDragging.current = true;
    e.preventDefault();

    const el = document.elementFromPoint(t.clientX, t.clientY);
    const colEl = el?.closest("[data-status]");
    const hoverStatus = colEl?.getAttribute("data-status");
    setDragOverStatus(hoverStatus || null);
  };

  const handleTouchEnd = () => {
    setDragOverStatus(null);
    if (!touchDragging.current) {
      touchCardId.current = null;
      touchFromStatus.current = null;
      return;
    }
    const el = document.elementFromPoint(touchLastX.current, touchLastY.current);
    const colEl = el?.closest("[data-status]");
    const targetStatus = colEl?.getAttribute("data-status");
    const id = touchCardId.current;
    const fromStatus = touchFromStatus.current;
    touchCardId.current = null;
    touchFromStatus.current = null;
    touchDragging.current = false;
    if (!id || !fromStatus || !targetStatus) return;
    moveTo(id, fromStatus, targetStatus);
  };

  // ── Client-wise progress ──
  const progressCounts = STATUSES.map((s) => ({
    status: s,
    count: visiblePosts.filter((p) => p.status === s).length,
  })).filter((s) => s.count > 0);
  const progressTotal = visiblePosts.length;

  return (
    <AppShell
      title="Project Tracker"
      subtitle="Kanban view of every client task, grouped by status."
      actions={
        <div className="flex items-center gap-2">
          {!isClient && (
            <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-white border-input w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Clients">All Clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleExport} className="rounded-xl h-10 bg-white">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      }
    >
      {/* Client-wise progress bar */}
      {progressTotal > 0 && (
        <div className="card-soft p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              {selectedClientFilter === "All Clients" ? "All Clients" : selectedClientFilter} — Task Progress
            </span>
            <span className="text-xs text-muted-foreground">{progressTotal} task{progressTotal === 1 ? "" : "s"}</span>
          </div>
          <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
            {progressCounts.map(({ status, count }) => (
              <div
                key={status}
                style={{ width: `${(count / progressTotal) * 100}%`, background: STATUS_COLOR[status] }}
                title={`${STATUS_LABEL[status]}: ${count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
            {progressCounts.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                {STATUS_LABEL[status]} <span className="font-semibold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">Loading tasks…</div>
      ) : (
        <div className="overflow-x-auto kanban-board -mx-1 px-1 pb-4">
          <div className="grid grid-flow-col auto-cols-[min(280px,80vw)] gap-4 min-w-full pb-2">
            {STATUSES.map((status) => {
              const items = visiblePosts.filter((p) => p.status === status);
              const isOver = dragOverStatus === status;

              return (
                <div
                  key={status}
                  data-status={status}
                  className={`kanban-col rounded-2xl p-3 transition-colors ${
                    isOver ? "bg-primary/5 ring-2 ring-primary/30" : "bg-muted/40"
                  }`}
                  onDragOver={canEdit ? (e) => handleDragOver(e, status) : undefined}
                  onDrop={canEdit ? (e) => handleDrop(e, status) : undefined}
                  onDragLeave={() => setDragOverStatus(null)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-2 mb-3">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[status] }} />
                    <span className="text-sm font-semibold truncate">{STATUS_LABEL[status]}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>

                  {/* Drop zone hint */}
                  {isOver && items.length === 0 && (
                    <div className="mb-2 border-2 border-dashed border-primary/40 rounded-xl h-16 flex items-center justify-center text-xs text-primary/60">
                      Drop here
                    </div>
                  )}

                  {/* Task cards */}
                  <div className="space-y-2.5">
                    {items.map((p: Post) => {
                      const assignees = (p.assigned_to || [])
                        .map((uid) => members.find((m) => m.user_id === uid))
                        .filter(Boolean);
                      return (
                        <div
                          key={p.id}
                          draggable={canEdit}
                          onDragStart={canEdit ? (e) => handleDragStart(e, p.id, status) : undefined}
                          onDragEnd={canEdit ? handleDragEnd : undefined}
                          onTouchStart={canEdit ? (e) => handleTouchStart(e, p.id, status) : undefined}
                          onTouchMove={canEdit ? handleTouchMove : undefined}
                          onTouchEnd={canEdit ? handleTouchEnd : undefined}
                          className={`card-soft p-3.5 relative group transition-all ${
                            canEdit ? "cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95" : ""
                          }`}
                          style={{
                            borderTop: `3px solid ${STATUS_COLOR[status]}`,
                            touchAction: canEdit ? "none" : "auto",
                          }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {canEdit && (
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                            )}
                            <div className="text-xs text-muted-foreground truncate">{p.client_name || "Unassigned"}</div>
                          </div>

                          <div className="font-semibold text-sm mt-0.5 leading-snug line-clamp-2">
                            {p.topic || p.content || "Untitled task"}
                          </div>

                          {(p.platforms?.length || p.platform) && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {(p.platforms && p.platforms.length > 0 ? p.platforms : [p.platform!]).map((plat) => (
                                <span key={plat} className="h-4 w-4 rounded-[3px] overflow-hidden grid place-items-center bg-muted">
                                  <PlatformIcon platform={plat} />
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <UsersIcon className="h-3 w-3 shrink-0" />
                              {assignees.length > 0
                                ? assignees.map((m: any) => (m.users?.full_name || m.users?.email || "?").split(" ")[0]).join(", ")
                                : "Unassigned"}
                            </span>
                            {p.scheduled_for && (
                              <span className="flex items-center gap-1 shrink-0">
                                <CalIcon className="h-3 w-3" />
                                {new Date(p.scheduled_for).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isOver && items.length > 0 && (
                      <div className="border-2 border-dashed border-primary/40 rounded-xl h-10 flex items-center justify-center text-xs text-primary/60">
                        Drop here
                      </div>
                    )}

                    {items.length === 0 && !isOver && (
                      <div className="text-center text-xs text-muted-foreground py-6">No tasks</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
