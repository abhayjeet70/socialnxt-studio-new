import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, X, ExternalLink, Calendar, Instagram, Facebook, Linkedin, Youtube } from "lucide-react";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import { useCurrentWorkspace, usePosts, useUpdatePostStatus, Post, useClients, useWorkspaceMembers, useCreatePost } from "@/lib/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Content Calendar — SocialNxt CRM" }] }),
  component: CalendarPage,
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Get a post's platforms, preferring the new platforms[] array over the legacy single field. */
function getPostPlatforms(post: Post): string[] {
  if (post.platforms && post.platforms.length) return post.platforms;
  if (post.platform) return [post.platform];
  const m = post.content?.match(/^\[(.*?)\]/);
  return m ? [m[1]] : [];
}

function getPlatformIcon(platform: string, className = "w-3.5 h-3.5") {
  switch (platform) {
    case "Instagram": return <Instagram className={className} />;
    case "Facebook": return <Facebook className={className} />;
    case "LinkedIn": return <Linkedin className={className} />;
    case "YouTube": return <Youtube className={className} />;
    case "TikTok": return <svg className={`fill-current ${className}`} viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg>;
    default: return platform ? <span className="text-[10px] font-bold">{platform[0]}</span> : null;
  }
}

function getPlatformColor(post: Post): string {
  const first = getPostPlatforms(post)[0];
  return first ? (PLATFORM_COLOR[first as keyof typeof PLATFORM_COLOR] || "#6366f1") : "#6366f1";
}

function getPostText(post: Post): string {
  return post.topic || post.content?.replace(/^\[.*?\]\s*/, "") || "No content";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    scheduled: "bg-amber-50 text-amber-700 border-amber-200",
    published: "bg-green-50 text-green-700 border-green-200",
    draft: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function CalendarPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: allPosts = [], isLoading: isLoadingPosts } = usePosts(workspace?.workspaceId);
  const { data: clients = [], isLoading: isLoadingClients } = useClients(workspace?.workspaceId);
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspace?.workspaceId);
  
  const allWorkspacePlatforms = useMemo(() => {
    const defaultPlats = ["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok", "Twitter"];
    const customPlats = workspace?.customPlatforms?.map(p => p.name) || [];
    return Array.from(new Set([...defaultPlats, ...customPlats]));
  }, [workspace?.customPlatforms]);
  const updatePostStatus = useUpdatePostStatus();
  const createPost = useCreatePost();
  const isLoading = isLoadingPosts || isLoadingClients || isLoadingMembers;

  const isClient = workspace?.role === "client";
  const isEmployee = workspace?.role === "employee";
  const clientNameForFilter = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";
  const myUserId = workspace?.userId;

  const isSMM = workspace?.role === "employee" && workspace?.agencyRole === "Social Media Manager";
  const isDesignerOrEditor = workspace?.role === "employee" && (workspace?.agencyRole === "Designer" || workspace?.agencyRole === "Video Editor");

  const accessibleClients = isEmployee
    ? clients.filter(c => Object.values((c as any).team_assignments || {}).includes(myUserId))
    : clients;

  const accessiblePosts = isEmployee
    ? allPosts.filter(p => {
        if (isDesignerOrEditor) {
          return p.assigned_to && p.assigned_to.includes(myUserId!);
        }
        // For SMMs and others, strict client assignment is required
        return accessibleClients.some(c => c.name.toLowerCase() === p.client_name?.toLowerCase());
      })
    : allPosts;

  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("All Clients");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("All Platforms");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAddPostOpen, setIsAddPostOpen] = useState(false);
  const [newPostClient, setNewPostClient] = useState<string>("");
  const [newPostType, setNewPostType] = useState<string>("");
  const [newPostTopic, setNewPostTopic] = useState<string>("");

  const handleAddPostSubmit = () => {
    if (!workspace || !selectedDay) return;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, 10, 0, 0);
    createPost.mutate({
      workspace_id: workspace.workspaceId,
      author_id: workspace.userId,
      status: "scheduled",
      scheduled_for: date.toISOString(),
      content: "",
      topic: newPostTopic,
      content_type: newPostType,
      client_name: newPostClient,
      platform: selectedPlatformFilter !== "All Platforms" ? selectedPlatformFilter : undefined,
    }, {
      onSuccess: () => {
        toast.success(`Post added for ${selectedDayLabel}`);
        setIsAddPostOpen(false);
        setNewPostClient("");
        setNewPostType("");
        setNewPostTopic("");
      },
      onError: (err: any) => {
        toast.error("Error adding post: " + err.message);
      }
    });
  };

  // Merge clients table + workspace members with role 'client' into one list for the filter dropdown
  const allClientOptions = useMemo(() => {
    const closedNames = new Set(clients.filter(c => c.status === "Closed").map(c => c.name.toLowerCase()));
    const closedEmails = new Set(clients.filter(c => c.status === "Closed" && c.email).map(c => c.email!.toLowerCase()));

    const fromClientsTable = accessibleClients
      .filter(c => c.status !== "Closed")
      .map((c) => ({
        value: c.name,
        label: c.name,
        group: "clients" as const,
      }));

    const fromMembers = members
      .filter((m) => m.role === "client")
      .map((m) => {
        const name = m.users?.full_name || m.users?.email?.split("@")[0] || m.user_id;
        return { value: name, label: name, group: "members" as const, email: m.users?.email?.toLowerCase() };
      })
      .filter((m) => {
        const isClosedByName = m.value && closedNames.has(m.value.toLowerCase());
        const isClosedByEmail = m.email && closedEmails.has(m.email);
        return !isClosedByName && !isClosedByEmail;
      });

    // Deduplicate by value
    const seen = new Set<string>();
    return [...fromClientsTable, ...fromMembers].filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [clients, members, accessibleClients]);

  // Only show approved/scheduled/published posts on the calendar
  const approvedPosts = accessiblePosts.filter(
    (p) => p.status === "approved" || p.status === "scheduled" || p.status === "published"
  );

  // Apply client filter
  const clientFiltered = isClient
    ? approvedPosts.filter((p) => p.client_name?.toLowerCase() === clientNameForFilter.toLowerCase())
    : selectedClientFilter !== "All Clients"
    ? approvedPosts.filter((p) => p.client_name === selectedClientFilter)
    : approvedPosts;

  // Apply platform filter on top
  const posts = selectedPlatformFilter !== "All Platforms"
    ? clientFiltered.filter((p) => getPostPlatforms(p).includes(selectedPlatformFilter))
    : clientFiltered;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
    setSelectedPost(null);
    setIsAddPostOpen(false);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
    setSelectedPost(null);
    setIsAddPostOpen(false);
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
    setSelectedPost(null);
    setIsAddPostOpen(false);
  };

  const firstWeekday = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const getPostsForDay = (d: number) =>
    posts.filter((p) => {
      if (!p.scheduled_for) return false;
      const date = new Date(p.scheduled_for);
      return (
        date.getDate() === d &&
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear()
      );
    });

  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  const selectedDayLabel = selectedDay
    ? `${DAY_NAMES[new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).getDay()]}, ${selectedDay} ${MONTH_NAMES[currentDate.getMonth()]}`
    : null;

  const handleDayClick = (d: number) => {
    setSelectedDay(d);
    setSelectedPost(null);
    setIsAddPostOpen(false);
  };

  const handleStatusChange = (post: Post, newStatus: string) => {
    if (!workspace) return;
    updatePostStatus.mutate(
      { id: post.id, status: newStatus, workspace_id: workspace.workspaceId },
      {
        onSuccess: () => {
          toast.success("Post status updated!");
        },
      }
    );
  };

  return (
    <AppShell
      title="Content Calendar"
      subtitle="Plan, schedule and approve content across every platform."
    >
      <div className="flex gap-0 h-full" style={{ minHeight: 600 }}>
        {/* ── Main Calendar Card ── */}
        <div className="flex-1 min-w-0">
          <div className="card-soft p-4 sm:p-5 h-full">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-bold text-lg min-w-[140px] text-center">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 text-xs ml-1" onClick={goToday}>
                  Today
                </Button>
              </div>

              {!isClient && (
                <div className="sm:ml-auto flex items-center gap-2 overflow-x-auto pb-0.5">
                  {/* Platform filter dropdown */}
                  <div className="w-44">
                    <Select
                      value={selectedPlatformFilter}
                      onValueChange={(v) => { setSelectedPlatformFilter(v); setSelectedDay(null); setSelectedPost(null); }}
                    >
                      <SelectTrigger className="h-8 rounded-xl bg-white border-input text-xs">
                        <SelectValue placeholder="All Platforms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Platforms">All Platforms</SelectItem>
                        {allWorkspacePlatforms.map((p) => (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-full shrink-0 grid place-items-center text-white"
                                style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#6366f1" }}
                              >
                                {getPlatformIcon(p, "w-2.5 h-2.5")}
                              </span>
                              {p}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client filter dropdown */}
                  <div className="w-48">
                    <Select value={selectedClientFilter} onValueChange={(v) => { setSelectedClientFilter(v); setSelectedDay(null); setSelectedPost(null); }}>
                      <SelectTrigger className="h-8 rounded-xl bg-white border-input text-xs">
                        <SelectValue placeholder="All Clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Clients">All Clients</SelectItem>
                        {/* Business clients from clients table */}
                        {allClientOptions.filter((o) => o.group === "clients").length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                              Business Clients
                            </div>
                            {allClientOptions
                              .filter((o) => o.group === "clients")
                              .map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                          </>
                        )}
                        {/* Workspace members with client role */}
                        {allClientOptions.filter((o) => o.group === "members").length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1 border-t border-border pt-2">
                              Client Members
                            </div>
                            {allClientOptions
                              .filter((o) => o.group === "members")
                              .map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Platform legend — hidden on mobile, shown on sm+ */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5 mb-4">
              {allWorkspacePlatforms.map((p) => (
                <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-muted flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded-full shrink-0 grid place-items-center text-white"
                    style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#6366f1" }}
                  >
                    {getPlatformIcon(p, "w-2.5 h-2.5")}
                  </span>
                  {p}
                </span>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
              <div style={{ minWidth: 560 }}>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold px-2 py-1 text-center">
                      {d}
                    </div>
                  ))}
                </div>

                {isLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 border-l border-t border-border">
                    {cells.map((d, i) => {
                      const dayPosts = d ? getPostsForDay(d) : [];
                      const isToday = isCurrentMonth && d === today.getDate();
                      const isSelected = d !== null && d === selectedDay;

                      return (
                        <div
                          key={i}
                          onClick={() => d && handleDayClick(d)}
                          className={`
                            relative border-b border-r border-border
                            min-h-[96px] p-1.5 transition-colors
                            ${d ? "cursor-pointer" : ""}
                            ${!d ? "bg-muted/20" : isSelected ? "bg-primary/5" : "bg-white hover:bg-muted/30"}
                          `}
                          style={isSelected ? { boxShadow: "inset 0 0 0 2px var(--primary, #6366f1)" } : undefined}
                        >
                          {d && (
                            <>
                              {/* Day number */}
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`
                                    text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday ? "bg-foreground text-background" : "text-foreground/70"}
                                  `}
                                >
                                  {d}
                                </span>
                              </div>

                              {/* Event chips */}
                              <div className="space-y-0.5">
                                {dayPosts.slice(0, 3).map((post) => {
                                  const color = getPlatformColor(post);
                                  const text = getPostText(post);
                                  const pls = getPostPlatforms(post);
                                  return (
                                    <div
                                      key={post.id}
                                      className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 text-foreground/80 hover:opacity-80 transition-opacity truncate"
                                      style={{ background: `${color}18`, borderLeft: `2.5px solid ${color}` }}
                                      title={`${text}${pls.length ? " — " + pls.join(", ") : ""}`}
                                    >
                                      <span className="shrink-0 flex items-center gap-0.5">
                                        {(pls.length ? pls : [""]).slice(0, 3).map((p, i) => (
                                          <span
                                            key={i}
                                            className="h-3.5 w-3.5 rounded-full inline-flex items-center justify-center text-white"
                                            style={{ background: p ? (PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#6366f1") : "#6366f1" }}
                                          >
                                            {p ? getPlatformIcon(p, "w-2 h-2") : null}
                                          </span>
                                        ))}
                                      </span>
                                      <span className="truncate font-medium leading-tight">{text}</span>
                                    </div>
                                  );
                                })}
                                {dayPosts.length > 3 && (
                                  <div className="text-[10px] text-muted-foreground pl-1">
                                    +{dayPosts.length - 3} more
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Side Panel — desktop sidebar / mobile bottom sheet ── */}
        {/* Desktop: sidebar next to calendar */}
        <div
          className={`
            hidden sm:block
            transition-all duration-300 ease-in-out overflow-hidden
            ${selectedDay ? "w-[300px] min-w-[280px] opacity-100 ml-4" : "w-0 opacity-0 ml-0"}
          `}
          style={{ flexShrink: 0 }}
        >
          {selectedDay && (
            <div className="card-soft h-full flex flex-col" style={{ width: 300 }}>
              {/* Panel header */}
              <div className="p-4 border-b border-border flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                    {DAY_NAMES[new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).getDay()].toUpperCase()}
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {selectedDay} {MONTH_NAMES[currentDate.getMonth()]}
                  </div>

                </div>
                <button
                  onClick={() => { setSelectedDay(null); setSelectedPost(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 rounded p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {selectedDayPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                    <Calendar className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nothing scheduled</p>
                  </div>
                ) : (
                  selectedDayPosts.map((post) => {
                    const color = getPlatformColor(post);
                    const text = getPostText(post);
                    const isImageUrl = (url: string) =>
                      url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes("supabase.co");
                    const allMedia = [...(post.completed_work || []), ...(post.reference_content || [])];
                    const previewUrl = allMedia.find(isImageUrl);
                    const isExpanded = selectedPost?.id === post.id;

                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(isExpanded ? null : post)}
                        className={`
                          rounded-xl border cursor-pointer transition-all duration-200
                          ${isExpanded ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/20"}
                          bg-white overflow-hidden
                        `}
                      >
                        {/* Colored top bar */}
                        <div className="h-1 w-full" style={{ background: color }} />

                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="h-4 w-4 rounded-full shrink-0 mt-0.5 grid place-items-center text-white"
                                style={{ background: color }}
                              >
                                {getPlatformIcon(getPostPlatforms(post)[0] || "", "w-2.5 h-2.5")}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate">{text}</span>
                            </div>
                            <StatusBadge status={post.status} />
                          </div>

                          {/* Platform + client row */}
                          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground mb-1">
                            {getPostPlatforms(post).map((p) => (
                              <span key={p} className="pl-1 pr-1.5 py-0.5 rounded-full text-white font-medium flex items-center gap-1" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#6366f1" }}>
                                {getPlatformIcon(p, "w-2.5 h-2.5")}
                                {p}
                              </span>
                            ))}
                            {post.client_name && !isClient && (
                              <span className="bg-muted px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                                Client: {post.client_name}
                              </span>
                            )}
                            {post.content_type && (
                              <span className="bg-muted px-1.5 py-0.5 rounded-full">{post.content_type}</span>
                            )}
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="mt-2 space-y-2 border-t border-border pt-2">
                              {previewUrl && (
                                <div className="w-full h-28 rounded-lg overflow-hidden bg-muted">
                                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                                </div>
                              )}

                              {post.content && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Caption</div>
                                  <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                                    {post.content.replace(/^\[.*?\]\s*/, "")}
                                  </p>
                                </div>
                              )}

                              {post.approved_by && (
                                <div className="space-y-0.5 mt-2">
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Approved By
                                  </div>
                                  <div className="text-[11px] font-medium text-foreground">
                                    {post.approved_by}
                                  </div>
                                </div>
                              )}

                              {post.assigned_to && post.assigned_to.length > 0 && members && (() => {
                                const assignedMembers = post.assigned_to
                                  .map((uid) => members.find((m) => m.user_id === uid))
                                  .filter(Boolean);
                                if (assignedMembers.length === 0) return null;
                                const names = assignedMembers.map(
                                  (m: any) => {
                                    const n = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
                                    const role = (m.role === "admin" || m.role === "owner") ? "Admin" : (m.agency_role || "Social Media Manager");
                                    return `${n} (${role})`;
                                  }
                                );
                                const isCollab = assignedMembers.length > 1;
                                return (
                                  <div className="space-y-0.5">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                      Assigned to
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isCollab && (
                                        <span className="text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">
                                          Collab
                                        </span>
                                      )}
                                      <span className="text-[11px] font-medium text-foreground">
                                        {names.join(", ")}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Media links */}
                              {(post.completed_work?.length || post.reference_content?.length) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {[...(post.completed_work || []), ...(post.reference_content || [])].slice(0, 4).map((url, i) => (
                                    <a
                                      key={i}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[10px] flex items-center gap-0.5 text-primary hover:underline"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                      File {i + 1}
                                    </a>
                                  ))}
                                </div>
                              ) : null}

                              {/* Status actions (agency only) */}
                              {!isClient && post.status !== "published" && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {post.status !== "scheduled" && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(post, "scheduled"); }}
                                      className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-colors"
                                    >
                                      Mark Scheduled
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(post, "published"); }}
                                    className="text-[10px] px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors"
                                  >
                                    Mark Published
                                  </button>

                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      window.location.href = `/tasks${post.client_name ? `?client=${encodeURIComponent(post.client_name)}&highlight=${post.id}` : `?highlight=${post.id}`}`; 
                                    }}
                                    className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Edit in Content Sheet
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add to day button */}
              {!isClient && (
                <div className="p-3 border-t border-border">
                  <button
                    onClick={() => setIsAddPostOpen(true)}
                    className="w-full text-xs font-medium py-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="text-base leading-none">+</span> Add to this day
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Add Post Modal */}
      {isAddPostOpen && selectedDay && !isClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddPostOpen(false)} />
           <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
              <h2 className="text-lg font-bold">Add Post for {selectedDayLabel}</h2>
              <div className="space-y-3">
                 <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Client</label>
                    <Select value={newPostClient} onValueChange={setNewPostClient}>
                      <SelectTrigger className="w-full h-10 rounded-xl bg-white border-input">
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {allClientOptions.filter(o => o.group === 'clients').map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Topic / Title</label>
                    <input 
                      type="text" 
                      className="w-full h-10 rounded-xl border border-input px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={newPostTopic} 
                      onChange={e => setNewPostTopic(e.target.value)} 
                      placeholder="e.g. Diwali Campaign" 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Content Type</label>
                    <input 
                      type="text" 
                      className="w-full h-10 rounded-xl border border-input px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={newPostType} 
                      onChange={e => setNewPostType(e.target.value)} 
                      placeholder="e.g. Reel, Static, Carousel" 
                    />
                 </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                 <Button variant="outline" className="rounded-xl" onClick={() => setIsAddPostOpen(false)}>Cancel</Button>
                 <Button className="rounded-xl" onClick={handleAddPostSubmit} disabled={createPost.isPending || !newPostClient}>Save</Button>
              </div>
           </div>
        </div>
      )}

      {/* Mobile modal — centered dialog when a day is tapped on small screens */}
      {selectedDay && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSelectedDay(null); setSelectedPost(null); }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-sm max-h-[80vh]">
            {/* Sheet header */}
            <div className="px-4 pb-3 border-b border-border flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
                  {DAY_NAMES[new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).getDay()].toUpperCase()}
                </div>
                <div className="text-xl font-bold text-foreground">
                  {selectedDay} {MONTH_NAMES[currentDate.getMonth()]}
                </div>
              </div>
              <button
                onClick={() => { setSelectedDay(null); setSelectedPost(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 rounded p-1.5 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Sheet body — scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedDayPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                  <Calendar className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nothing scheduled for this day</p>
                </div>
              ) : (
                selectedDayPosts.map((post) => {
                  const color = getPlatformColor(post);
                  const text = getPostText(post);
                  const isImageUrl = (url: string) =>
                    url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes("supabase.co");
                  const allMedia = [...(post.completed_work || []), ...(post.reference_content || [])];
                  const previewUrl = allMedia.find(isImageUrl);
                  const isExpanded = selectedPost?.id === post.id;

                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(isExpanded ? null : post)}
                      className={`rounded-xl border cursor-pointer transition-all duration-200 ${isExpanded ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/20"} bg-white overflow-hidden`}
                    >
                      <div className="h-1 w-full" style={{ background: color }} />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-4 w-4 rounded-full shrink-0 mt-0.5 grid place-items-center text-white" style={{ background: color }}>
                               {getPlatformIcon(getPostPlatforms(post)[0] || "", "w-2.5 h-2.5")}
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate">{text}</span>
                          </div>
                          <StatusBadge status={post.status} />
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground mb-1">
                          {getPostPlatforms(post).map((p) => (
                            <span key={p} className="pl-1 pr-1.5 py-0.5 rounded-full text-white font-medium flex items-center gap-1" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#6366f1" }}>
                              {getPlatformIcon(p, "w-2.5 h-2.5")}
                              {p}
                            </span>
                          ))}
                          {post.client_name && !isClient && (
                            <span className="bg-muted px-1.5 py-0.5 rounded-full truncate max-w-[160px]">
                              Client: {post.client_name}
                            </span>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="mt-2 space-y-2 border-t border-border pt-2">
                            {previewUrl && (
                              <div className="w-full h-36 rounded-lg overflow-hidden bg-muted">
                                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                            {post.content && (
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Caption</div>
                                <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                                  {post.content.replace(/^\[.*?\]\s*/, "")}
                                </p>
                              </div>
                            )}
                            {!isClient && post.status !== "published" && (
                              <div className="flex gap-1.5 pt-1">
                                {post.status !== "scheduled" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(post, "scheduled"); }}
                                    className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-colors"
                                  >
                                    Mark Scheduled
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(post, "published"); }}
                                  className="text-[10px] px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors"
                                >
                                  Mark Published
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
