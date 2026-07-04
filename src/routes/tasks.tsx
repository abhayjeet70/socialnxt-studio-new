import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { usePosts, useCurrentWorkspace, useUpdatePostDetails, useCreatePost, useUpdatePostStatus, useDeletePost, uploadMediaFile, Post, useClients, Client, useWorkspaceMembers } from "@/lib/queries";
import { Loader2, UploadCloud, Link as LinkIcon, Image as ImageIcon, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks & Content Sheet — SocialNxt" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: posts = [], isLoading: isLoadingPosts } = usePosts(workspace?.workspaceId);
  const { data: clients = [], isLoading: isLoadingClients } = useClients(workspace?.workspaceId);
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspace?.workspaceId);
  const createPost = useCreatePost();
  
  const isLoading = isLoadingPosts || isLoadingClients || isLoadingMembers;

  const handleAddRow = () => {
    if (!workspace) return;
    createPost.mutate({
      workspace_id: workspace.workspaceId,
      author_id: workspace.userId,
      status: "draft",
      scheduled_for: new Date().toISOString(),
      content: "",
      topic: "",
      content_type: "",
    }, {
      onSuccess: () => toast.success("Added new row!"),
      onError: (err: any) => {
        console.error("Add Row Error:", err);
        toast.error("Error adding row: " + (err.message || "Unknown error"));
      }
    });
  };

  const isClient = workspace?.role === "client";
  const clientNameForFilter = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";

  const clientNamesSet = new Set(clients.map(c => c.name));
  members.filter(m => m.role === 'client').forEach(m => {
    const name = m.users?.full_name || m.users?.email?.split('@')[0];
    if (name) clientNamesSet.add(name);
  });
  const allClientNames = Array.from(clientNamesSet).sort();

  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("All Clients");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("All Platforms");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("All Dates");

  const sortedPosts = [...posts]
    .filter((p) => {
      // Client filter
      if (isClient) {
        if (p.client_name?.toLowerCase() !== clientNameForFilter.toLowerCase()) return false;
      } else if (selectedClientFilter !== "All Clients") {
        if (p.client_name !== selectedClientFilter) return false;
      }

      // Platform filter
      if (selectedPlatformFilter !== "All Platforms") {
        if (p.platform !== selectedPlatformFilter) return false;
      }

      // Date filter
      if (selectedDateFilter !== "All Dates") {
        const postDate = p.scheduled_for ? new Date(p.scheduled_for) : new Date(p.created_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const postDay = new Date(postDate.getFullYear(), postDate.getMonth(), postDate.getDate());
        
        if (selectedDateFilter === "Today") {
          if (postDay.getTime() !== today.getTime()) return false;
        } else if (selectedDateFilter === "This Week") {
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (postDay < today || postDay > nextWeek) return false;
        } else if (selectedDateFilter === "This Month") {
          if (postDate.getMonth() !== now.getMonth() || postDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.scheduled_for ? new Date(a.scheduled_for).getTime() : new Date(a.created_at).getTime();
      const dateB = b.scheduled_for ? new Date(b.scheduled_for).getTime() : new Date(b.created_at).getTime();
      return dateA - dateB;
    });

  return (
    <AppShell
      title="Content Sheet"
      subtitle="Spreadsheet view for managing content topics, references, and final deliverables."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32 sm:w-40">
            <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-white border-input text-xs sm:text-sm">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Dates">All Dates</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-36 sm:w-44">
            <Select value={selectedPlatformFilter} onValueChange={setSelectedPlatformFilter}>
              <SelectTrigger className="h-10 rounded-xl bg-white border-input text-xs sm:text-sm">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Platforms">All Platforms</SelectItem>
                {PLATFORMS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isClient && (
            <div className="w-36 sm:w-48">
              <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-white border-input text-xs sm:text-sm">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Clients">All Clients</SelectItem>
                  {allClientNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isClient && (
            <Button onClick={handleAddRow} disabled={!workspace} className="rounded-xl h-10">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          )}
        </div>
      }
    >
      <div className="card-soft overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold w-24">DATE</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold w-24">WEEK DAY</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold min-w-[160px]">CLIENT</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold min-w-[140px]">PLATFORM</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold w-32">CONTENT TYPE</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold w-48">TOPIC</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold w-64">REFERENCE CONTENT</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold min-w-[200px]">COMPLETED CONTENT</th>
                  <th className="px-4 py-3 border-r border-white/20 font-semibold w-40">ASSIGNED TO</th>
                  <th className="px-4 py-3 font-semibold w-32 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sortedPosts.map((post, idx) => (
                  <TaskRow key={post.id} post={post} index={idx} isClient={isClient} allClientNames={allClientNames} members={members} />
                ))}
                {sortedPosts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      No posts found. Click 'Add Row' to draft new content!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// Separate component for each row so they manage their own local edit state
function TaskRow({ post, index, isClient, allClientNames, members }: { post: Post; index: number; isClient?: boolean; allClientNames: string[]; members: any[] }) {
  const { data: workspace } = useCurrentWorkspace();
  const updatePost = useUpdatePostDetails();
  const updateStatus = useUpdatePostStatus();
  const deletePost = useDeletePost();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTarget, setUploadingTarget] = useState<"reference_content" | "completed_work" | null>(null);

  // Date formatting for the date input
  const dateObj = post.scheduled_for ? new Date(post.scheduled_for) : new Date(post.created_at);
  const dateInputVal = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const rowColor = index % 2 === 0 ? "bg-[#e0f2fe]" : "bg-white"; // Light blue/white alternating

  const handleTextBlur = (field: keyof Post, value: string) => {
    if (post[field] === value) return;
    updatePost.mutate({ id: post.id, updates: { [field]: value } });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    // convert YYYY-MM-DD back to ISO string for backend
    const newDate = new Date(e.target.value);
    updatePost.mutate({ id: post.id, updates: { scheduled_for: newDate.toISOString() } });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTarget) return;

    try {
      toast.info(`Uploading to ${uploadingTarget}...`);
      const url = await uploadMediaFile(file);
      
      // Append to the existing array of URLs
      const existing = post[uploadingTarget] || [];
      updatePost.mutate({ 
        id: post.id, 
        updates: { [uploadingTarget]: [...existing, url] } 
      }, {
        onSuccess: () => toast.success("Upload successful!")
      });
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLink = (target: "reference_content" | "completed_work") => {
    const url = window.prompt("Enter the URL link (e.g., Canva, Drive, Pinterest):");
    if (!url) return;
    
    const existing = post[target] || [];
    updatePost.mutate({ 
      id: post.id, 
      updates: { [target]: [...existing, url] } 
    });
  };

  // Helper to render media items (images or links)
  const renderMedia = (urls: string[] | null) => {
    if (!urls || urls.length === 0) return <div className="text-muted-foreground text-xs opacity-50 italic">Empty</div>;
    return (
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url, i) => {
          const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes("supabase.co");
          if (isImage) {
            return (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded overflow-hidden border border-border shrink-0">
                <img src={url} alt="media" className="w-full h-full object-cover" />
              </a>
            );
          }
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-100">
              <LinkIcon className="w-3 h-3" /> Link {i+1}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <tr className={`border-b border-gray-200 ${rowColor} hover:bg-gray-50 transition-colors`}>
      <td className="p-0 border-r border-gray-200 align-top">
        <input 
          type="date"
          value={dateInputVal}
          onChange={handleDateChange}
          className="bg-transparent border-none px-3 py-3 focus:ring-1 focus:ring-blue-500 rounded-none text-sm w-full cursor-pointer"
        />
      </td>
      <td className="px-3 py-3 font-medium text-gray-800 border-r border-gray-200 align-top">{weekdayStr}</td>
      
      {/* CLIENT */}
      <td className="p-0 border-r border-gray-200 align-top bg-transparent">
        <select
          defaultValue={post.client_name || ""}
          onChange={(e) => updatePost.mutate({ id: post.id, updates: { client_name: e.target.value } })}
          disabled={isClient}
          className="w-full px-3 py-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer appearance-none disabled:opacity-50"
        >
          <option value="" disabled>Select Client</option>
          {allClientNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </td>

      {/* PLATFORM */}
      <td className="p-0 border-r border-gray-200 align-top bg-transparent">
        <select
          defaultValue={post.platform || ""}
          onChange={(e) => updatePost.mutate({ id: post.id, updates: { platform: e.target.value } })}
          className="w-full px-3 py-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer appearance-none"
        >
          <option value="" disabled>Select Platform</option>
          <option value="Instagram">Instagram</option>
          <option value="Facebook">Facebook</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="YouTube">YouTube</option>
          <option value="TikTok">TikTok</option>
        </select>
      </td>

      {/* CONTENT TYPE */}
      <td className="p-0 border-r border-gray-200 align-top">
        <textarea
          defaultValue={post.content_type || ""}
          onBlur={(e) => handleTextBlur("content_type", e.target.value)}
          className="w-full min-h-[80px] p-3 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          placeholder="e.g. Reel"
        />
      </td>

      {/* TOPIC */}
      <td className="p-0 border-r border-gray-200 align-top">
        <textarea
          defaultValue={post.topic || ""}
          onBlur={(e) => handleTextBlur("topic", e.target.value)}
          className="w-full min-h-[80px] p-3 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          placeholder="Enter topic..."
        />
      </td>

      {/* REFERENCE CONTENT */}
      <td className="p-3 border-r border-gray-200 align-top">
        {renderMedia(post.reference_content)}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 bg-white/50" onClick={() => handleAddLink("reference_content")}>
            <LinkIcon className="w-3 h-3 mr-1" /> Add Link
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 bg-white/50" onClick={() => { setUploadingTarget("reference_content"); fileInputRef.current?.click(); }}>
            {uploadingTarget === "reference_content" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}
            Upload Image
          </Button>
        </div>
      </td>

      {/* COMPLETED CONTENT */}
      <td className="p-3 border-r border-gray-200 align-top">
        {renderMedia(post.completed_work)}
        
        {/* We also show the post.content here (the caption) */}
        <div className="mt-3 mb-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Caption Text</label>
          <textarea
            defaultValue={post.content || ""}
            onBlur={(e) => handleTextBlur("content", e.target.value)}
            className="w-full h-16 p-2 bg-white/60 border border-gray-300 rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Final caption goes here..."
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 bg-white/50" onClick={() => handleAddLink("completed_work")}>
            <LinkIcon className="w-3 h-3 mr-1" /> Add Link
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 bg-white/50" onClick={() => { setUploadingTarget("completed_work"); fileInputRef.current?.click(); }}>
            {uploadingTarget === "completed_work" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3 mr-1" />}
            Upload Final
          </Button>
        </div>
      </td>

      {/* ASSIGNED TO — multi-select */}
      <td className="p-0 border-r border-gray-200 align-top bg-transparent">
        <AssignedToCell
          post={post}
          members={members}
          isClient={isClient}
          onUpdate={(ids) => updatePost.mutate({ id: post.id, updates: { assigned_to: ids } })}
        />
      </td>

      {/* STATUS */}
      <td className="px-4 py-3 align-middle text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
            backgroundColor: post.status === 'draft' ? '#f3f4f6' : 
                            post.status === 'pending_approval' ? '#fef3c7' :
                            post.status === 'approved' ? '#d1fae5' : '#dbeafe',
            color: post.status === 'draft' ? '#4b5563' :
                   post.status === 'pending_approval' ? '#d97706' :
                   post.status === 'approved' ? '#059669' : '#2563eb'
          }}>
            {post.status.replace("_", " ")}
          </span>

          <div className="flex flex-col gap-1 w-full mt-2">
            {/* Employees OR Admins can submit drafts for approval */}
            {(workspace?.role === "employee" || workspace?.role === "admin") && post.status === "draft" && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-[10px] w-full"
                onClick={() => updateStatus.mutate({ id: post.id, status: "pending_approval", workspace_id: workspace.workspaceId })}
                disabled={updateStatus.isPending}
              >
                Submit
              </Button>
            )}
            
            {/* Clients OR Admins can approve/reject pending posts */}
            {(workspace?.role === "client" || workspace?.role === "admin") && post.status === "pending_approval" && (
              <>
                <Button 
                  size="sm" 
                  className="h-7 text-[10px] w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => updateStatus.mutate({ id: post.id, status: "approved", workspace_id: workspace.workspaceId })}
                  disabled={updateStatus.isPending}
                >
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="h-7 text-[10px] w-full"
                  onClick={() => updateStatus.mutate({ id: post.id, status: "draft", workspace_id: workspace.workspaceId })}
                  disabled={updateStatus.isPending}
                >
                  Reject
                </Button>
              </>
            )}

            {/* Only Admins can final-schedule approved posts */}
            {workspace?.role === "admin" && post.status === "approved" && (
              <Button 
                size="sm" 
                className="h-7 text-[10px] w-full"
                onClick={() => updateStatus.mutate({ id: post.id, status: "scheduled", workspace_id: workspace.workspaceId })}
                disabled={updateStatus.isPending}
              >
                Schedule
              </Button>
            )}
            
            {/* Employees or Admins can mark scheduled posts as published (posted) — only on the scheduled date */}
            {(workspace?.role === "employee" || workspace?.role === "admin") && post.status === "scheduled" && (() => {
              const today = new Date().toISOString().slice(0, 10);
              const scheduledDay = post.scheduled_for?.slice(0, 10);
              return scheduledDay === today;
            })() && (
              <Button 
                size="sm" 
                className="h-7 text-[10px] w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => updateStatus.mutate({ id: post.id, status: "published", workspace_id: workspace.workspaceId })}
                disabled={updateStatus.isPending}
              >
                Mark Posted
              </Button>
            )}
            
            {/* Admin or Employee can delete the row */}
            {(workspace?.role === "admin" || workspace?.role === "employee") && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-full text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this row?")) {
                    deletePost.mutate(post.id);
                  }
                }}
                disabled={deletePost.isPending}
              >
                {deletePost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </td>

      {/* Hidden file input for uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleMediaUpload} 
        className="hidden" 
        accept="image/*" 
      />
    </tr>
  );
}

// ── Multi-select Assigned To cell ──────────────────────────────────────────
function AssignedToCell({
  post,
  members,
  isClient,
  onUpdate,
}: {
  post: Post;
  members: any[];
  isClient?: boolean;
  onUpdate: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ── Local state for immediate checkbox feedback ──
  // post.assigned_to is now a string[] from Supabase text[] column
  const [selectedIds, setSelectedIds] = useState<string[]>(() => post.assigned_to ?? []);

  // Sync from prop when Supabase refetch arrives
  useEffect(() => {
    setSelectedIds(post.assigned_to ?? []);
  }, [post.assigned_to]);

  const eligibleMembers = members.filter((m) => m.role === "employee" || m.role === "admin");

  const getMemberName = (userId: string) => {
    const m = eligibleMembers.find((m) => m.user_id === userId);
    return m ? (m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown") : "Unknown";
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const toggleMember = (userId: string) => {
    // Update local state immediately for instant UI feedback
    const next = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    setSelectedIds(next);
    onUpdate(next); // persist to Supabase in background
  };

  // Click outside to close — proper useEffect with cleanup
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isCollab = selectedIds.length > 1;

  return (
    <div ref={ref} className="relative p-2">
      {/* Trigger button */}
      <button
        onClick={() => !isClient && setOpen((o) => !o)}
        disabled={isClient}
        className={`w-full min-h-[36px] flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-xs transition-colors
          ${isClient ? "opacity-60 cursor-default border-transparent" : "border-transparent hover:border-input hover:bg-white/60 cursor-pointer"}`}
      >
        {selectedIds.length === 0 ? (
          <span className="text-muted-foreground">Unassigned</span>
        ) : isCollab ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Stacked avatars */}
            <div className="flex -space-x-1.5">
              {selectedIds.slice(0, 3).map((id) => {
                const name = getMemberName(id);
                return (
                  <span
                    key={id}
                    title={name}
                    className="h-6 w-6 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                  >
                    {getInitials(name)}
                  </span>
                );
              })}
              {selectedIds.length > 3 && (
                <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  +{selectedIds.length - 3}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">
              Collab
            </span>
          </div>
        ) : (
          <span className="font-medium truncate">{getMemberName(selectedIds[0])}</span>
        )}
        {!isClient && <span className="ml-auto text-muted-foreground text-[10px]">▾</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 bg-white rounded-xl shadow-xl border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Select employees
          </div>
          <div className="max-h-48 overflow-y-auto">
            {eligibleMembers.map((m) => {
              const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
              const checked = selectedIds.includes(m.user_id);
              return (
                <label
                  key={m.user_id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(m.user_id)}
                    className="accent-violet-600 h-3.5 w-3.5 rounded"
                  />
                  <span
                    className="h-6 w-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: checked ? "#7c3aed" : "#94a3b8" }}
                  >
                    {getInitials(name)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{m.role}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedIds.length > 0 && (
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => onUpdate([])}
                className="text-[10px] text-red-500 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

