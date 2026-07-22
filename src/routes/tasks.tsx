import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminTasksView } from "@/components/admin-tasks-view";
import { usePosts, useCurrentWorkspace, useUpdatePostDetails, useCreatePost, useUpdatePostStatus, useDeletePost, uploadMediaFile, Post, useClients, Client, useWorkspaceMembers, useBulkCreatePosts } from "@/lib/queries";
import { Loader2, UploadCloud, Link as LinkIcon, Image as ImageIcon, Trash2, ChevronDown, Download, Undo, X, Upload, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type UndoAction = {
  description: string;
  undo: () => Promise<void>;
};

// SVG brand logos for social platforms
function PlatformLogo({ platform, size = 14 }: { platform: string; size?: number }) {
  const s = size;
  if (platform === "Instagram") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
    </svg>
  );
  if (platform === "Facebook") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#1877F2"/>
      <path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="white"/>
    </svg>
  );
  if (platform === "LinkedIn") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#0A66C2"/>
      <path d="M7 10h2v7H7v-7zm1-3a1.1 1.1 0 1 1 0 2.2A1.1 1.1 0 0 1 8 7zm4 3h2v1h.03C14.42 10.36 15.28 10 16.2 10 18.3 10 19 11.27 19 13.2V17h-2v-3.4c0-.8-.02-1.84-1.12-1.84-1.13 0-1.3.88-1.3 1.78V17H12v-7z" fill="white"/>
    </svg>
  );
  if (platform === "YouTube") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#FF0000"/>
      <path d="M19.6 7.8a2 2 0 0 0-1.4-1.4C16.8 6 12 6 12 6s-4.8 0-6.2.4A2 2 0 0 0 4.4 7.8C4 9.2 4 12 4 12s0 2.8.4 4.2a2 2 0 0 0 1.4 1.4C7.2 18 12 18 12 18s4.8 0 6.2-.4a2 2 0 0 0 1.4-1.4C20 14.8 20 12 20 12s0-2.8-.4-4.2z" fill="white" opacity="0.9"/>
      <polygon points="10,9.5 10,14.5 15,12" fill="#FF0000"/>
    </svg>
  );
  if (platform === "TikTok") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#010101"/>
      <path d="M16 6.5a3.5 3.5 0 0 0 3.5 3.5v2.5A6 6 0 0 1 14 9.5V16a5 5 0 1 1-5-5v2.7a2.3 2.3 0 1 0 2.3 2.3V6.5H16z" fill="white"/>
    </svg>
  );
  return <span className="text-xs">{platform[0]}</span>;
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-50 text-pink-700 border border-pink-200",
  Facebook: "bg-blue-50 text-blue-700 border border-blue-200",
  LinkedIn: "bg-sky-50 text-sky-700 border border-sky-200",
  YouTube: "bg-red-50 text-red-700 border border-red-200",
  TikTok: "bg-gray-100 text-gray-800 border border-gray-200",
};

const ALL_PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok"];

function PlatformMultiSelect({ value, onChange, disabled, availablePlatforms }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean; availablePlatforms?: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const platforms = availablePlatforms !== undefined ? availablePlatforms : ALL_PLATFORMS;


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (p: string) => {
    if (disabled) return;
    const next = value.includes(p) ? value.filter(x => x !== p) : [...value, p];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[44px] px-3 py-2 text-left text-sm flex flex-wrap gap-1 items-center bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground text-xs">Select platforms</span>
        ) : (
          value.map(p => (
            <span key={p} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PLATFORM_COLORS[p] || "bg-gray-100 text-gray-700"}`}>
              <PlatformLogo platform={p} size={12} />
              {p}
            </span>
          ))
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 mt-1">
          {platforms.map(p => {
            const selected = value.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggle(p)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors text-left ${
                  selected ? "bg-violet-50" : ""
                }`}
              >
                <PlatformLogo platform={p} size={16} />
                <span className="font-medium flex-1">{p}</span>
                {selected && (
                  <span className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/tasks")({
  validateSearch: (search: Record<string, unknown>): { client?: string } => {
    return {
      client: search.client as string | undefined,
    }
  },
  head: () => ({ meta: [{ title: "Tasks & Content Sheet — SocialNxt" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: posts = [], isLoading: isLoadingPosts } = usePosts(workspace?.workspaceId);
  const { data: clients = [], isLoading: isLoadingClients } = useClients(workspace?.workspaceId);
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspace?.workspaceId);
  const createPost = useCreatePost();
  const bulkCreatePosts = useBulkCreatePosts();
  const importInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const [newlyAddedPostId, setNewlyAddedPostId] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleUndo = async () => {
    if (!undoAction) return;
    try {
      await undoAction.undo();
      toast.success(`Undid: ${undoAction.description}`);
      setUndoAction(null);
    } catch (e: any) {
      toast.error("Undo failed: " + e.message);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = newlyAddedPostId || params.get("highlight");
    
    if (highlightId && posts.length > 0) {
      setTimeout(() => {
        const row = document.getElementById(`post-row-${highlightId}`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.style.transition = 'background-color 0.5s';
          row.style.backgroundColor = '#f3e8ff'; // highlight color
          setTimeout(() => {
            row.style.backgroundColor = '';
          }, 1500);
          setNewlyAddedPostId(null);
          
          if (params.has("highlight")) {
            const url = new URL(window.location.href);
            url.searchParams.delete("highlight");
            window.history.replaceState({}, '', url.toString());
          }
        }
      }, 500);
    }
  }, [posts, newlyAddedPostId]);

  const isLoading = isLoadingPosts || isLoadingClients || isLoadingMembers;


  const isClient = workspace?.role === "client";
  const isSMM = workspace?.role === "employee" && workspace?.agencyRole === "Social Media Manager";
  const isDesignerOrEditor = workspace?.role === "employee" && (workspace?.agencyRole === "Designer" || workspace?.agencyRole === "Video Editor");

  const clientNameForFilter = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";

  const closedClientNames = new Set(clients.filter(c => c.status === "Closed").map(c => c.name.toLowerCase()));
  const closedClientEmails = new Set(clients.filter(c => c.status === "Closed" && c.email).map(c => c.email!.toLowerCase()));

  const clientNamesSet = new Set(
    clients
      .filter(c => c.status !== "Closed")
      .filter(c => !isSMM || c.team_assignments?.["Account/Social Media Manager"] === workspace?.userId)
      .map(c => c.name)
  );
  members.filter(m => m.role === 'client').forEach(m => {
    const name = m.users?.full_name || m.users?.email?.split('@')[0];
    const email = m.users?.email?.toLowerCase();
    const isClosedByName = name && closedClientNames.has(name.toLowerCase());
    const isClosedByEmail = email && closedClientEmails.has(email);
    
    if (name && !isClosedByName && !isClosedByEmail) {
      clientNamesSet.add(name);
    }
  });
  const allClientNames = Array.from(clientNamesSet).sort();

  const allWorkspacePlatforms = useMemo(() => {
    const defaultPlats = ["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok"];
    const customPlats = workspace?.customPlatforms?.map(p => p.name) || [];
    return [...defaultPlats, ...customPlats];
  }, [workspace?.customPlatforms]);

  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("All Clients");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>("All Platforms");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All Status");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("All Dates");

  const [adminViewMode, setAdminViewMode] = useState<"dashboard" | "details">("dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientParam = params.get("client");
    if (clientParam) {
      setSelectedClientFilter(clientParam);
      setAdminViewMode("details");
    }
  }, []);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");

  const [customColumns, setCustomColumns] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`socialnxt_custom_cols_${workspace?.workspaceId || 'default'}`) || "[]"); } catch { return []; }
  });

  const handleAddColumn = () => {
    const name = prompt("Enter new column name:");
    if (!name || customColumns.includes(name)) return;
    const newCols = [...customColumns, name];
    setCustomColumns(newCols);
    localStorage.setItem(`socialnxt_custom_cols_${workspace?.workspaceId || 'default'}`, JSON.stringify(newCols));
    toast.success(`Column "${name}" added`);
  };

  const handleDeleteColumn = (name: string) => {
    if (!confirm(`Are you sure you want to delete the column "${name}"?`)) return;
    const newCols = customColumns.filter(c => c !== name);
    setCustomColumns(newCols);
    localStorage.setItem(`socialnxt_custom_cols_${workspace?.workspaceId || 'default'}`, JSON.stringify(newCols));
    toast.success(`Column "${name}" deleted`);
  };

  const handleAddRow = () => {
    if (!workspace) return;
    
    const selectedClientObj = selectedClientFilter !== "All Clients" 
      ? clients.find(c => c.name === selectedClientFilter) 
      : null;
    const initialPlatforms = selectedPlatformFilter !== "All Platforms" 
      ? [selectedPlatformFilter] 
      : (selectedClientObj?.platforms || []);

    createPost.mutate({
      workspace_id: workspace.workspaceId,
      author_id: workspace.userId,
      status: "draft",
      scheduled_for: selectedDateFilter === "Custom Date" && customDateFrom ? new Date(customDateFrom).toISOString() : new Date().toISOString(),
      content: "",
      topic: "",
      content_type: "",
      client_name: selectedClientFilter !== "All Clients" ? selectedClientFilter : "",
      platform: undefined,
      platforms: initialPlatforms,
    }, {
      onSuccess: (data) => {
        toast.success("Added new row!");
        if (data && data.id) {
          setNewlyAddedPostId(data.id);
          setUndoAction({
            description: "Add Row",
            undo: async () => {
              await supabase.from("posts").delete().eq("id", data.id);
              queryClient.invalidateQueries({ queryKey: ["posts"] });
            }
          });
        } else {
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 500);
        }
      },
      onError: (err: any) => {
        console.error("Add Row Error:", err);
        toast.error("Error adding row: " + (err.message || "Unknown error"));
      }
    });
  };

  const sortedPosts = [...posts]
    .filter((p) => {
      if (isDesignerOrEditor) {
        if (!p.assigned_to?.includes(workspace?.userId || "")) return false;
      }

      // Client filter
      if (isClient) {
        if (p.client_name?.toLowerCase() !== clientNameForFilter.toLowerCase()) return false;
      } else if (isSMM && selectedClientFilter === "All Clients") {
        if (!clientNamesSet.has(p.client_name || "")) return false;
      } else if (selectedClientFilter !== "All Clients") {
        if (p.client_name !== selectedClientFilter) return false;
      }

      // Platform filter (checks both legacy single + new array)
      if (selectedPlatformFilter !== "All Platforms") {
        const pls = p.platforms && p.platforms.length ? p.platforms : (p.platform ? [p.platform] : []);
        if (!pls.includes(selectedPlatformFilter)) return false;
      }

      // Status filter
      if (selectedStatusFilter !== "All Status") {
        if (p.status !== selectedStatusFilter) return false;
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
        } else if (selectedDateFilter === "Custom Date") {
          if (customDateFrom) {
            const from = new Date(customDateFrom);
            from.setHours(0, 0, 0, 0);
            if (postDay < from) return false;
          }
          if (customDateTo) {
            const to = new Date(customDateTo);
            to.setHours(23, 59, 59, 999);
            if (postDay > to) return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.scheduled_for ? new Date(a.scheduled_for).getTime() : new Date(a.created_at).getTime();
      const dateB = b.scheduled_for ? new Date(b.scheduled_for).getTime() : new Date(b.created_at).getTime();
      return dateA - dateB;
    });

  // Pagination — keeps the sheet fast even with thousands of rows
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  useEffect(() => { if (page > totalPages - 1) setPage(0); }, [totalPages, page]);
  const pagedPosts = sortedPosts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Parse a single CSV line respecting double-quoted fields
  const parseCSVLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) { toast.error("CSV has no data rows"); return; }
      // Header: Client,Platform,Content Type,Topic,Assigned To,Status,Schedule (Assigned To ignored on import)
      const rows: Partial<Post>[] = lines.slice(1).map(line => {
        const c = parseCSVLine(line);
        const platforms = (c[1] || "").split(/[;|]/).map(s => s.trim()).filter(Boolean);
        const scheduleRaw = c[6] || "";
        const parsed = scheduleRaw ? new Date(scheduleRaw) : null;
        const scheduled = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
        return {
          workspace_id: workspace.workspaceId,
          author_id: workspace.userId,
          client_name: c[0] || null,
          platforms: platforms.length ? platforms : [],
          content_type: c[2] || "",
          topic: c[3] || "",
          status: "draft" as const,
          scheduled_for: scheduled,
        };
      });
      await bulkCreatePosts.mutateAsync({ rows, workspace_id: workspace.workspaceId });
      toast.success(`Imported ${rows.length} row${rows.length === 1 ? "" : "s"}!`);
    } catch (err: any) {
      toast.error("Import failed: " + (err.message || "bad CSV"));
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleExportCSV = () => {
    if (sortedPosts.length === 0) return toast.info("No data to export");
    const headers = "Client,Platform,Content Type,Topic,Caption,Reference Content,Completed Content,Assigned To,Status,Schedule\n";
    const csv = sortedPosts.map(p => {
      const assigned = members.filter(m => Array.isArray(p.assigned_to) && p.assigned_to.includes(m.user_id))
        .map(m => m.users?.full_name || m.users?.email?.split('@')[0] || 'Unknown').join('; ');
      const platforms = p.platform || (p.platforms ? p.platforms.join('; ') : '');
      const schedule = p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : '';
      const caption = p.content ? p.content.replace(/"/g, '""').replace(/\n/g, ' ') : '';
      const reference = p.reference_content ? p.reference_content.join('; ') : '';
      const completed = p.completed_work ? p.completed_work.join('; ') : '';
      return `"${p.client_name || ''}","${platforms}","${p.content_type || ''}","${p.topic ? p.topic.replace(/"/g, '""') : ''}","${caption}","${reference}","${completed}","${assigned}","${p.status}","${schedule}"`;
    }).join("\n");
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-sheet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Content Sheet exported as CSV");
  };

  const showAdminDashboard = (workspace?.role === "admin" || isSMM) && adminViewMode === "dashboard";
  const showAdminDetails = (workspace?.role === "admin" || isSMM) && adminViewMode === "details";

  if (showAdminDashboard) {
    return (
      <AppShell title={isSMM ? "My Clients" : "Content Sheet (Admin)"} subtitle={isSMM ? "Your assigned clients and tasks" : "High-level dashboard of all client tasks"}>
        <AdminTasksView 
          workspaceId={workspace.workspaceId} 
          userId={workspace.userId}
          isSMM={isSMM}
          onClientClick={(clientName) => {
            setSelectedClientFilter(clientName);
            setAdminViewMode("details");
          }} 
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={showAdminDetails ? `Content Sheet - ${selectedClientFilter}` : "Content Sheet"}
      subtitle="Spreadsheet view for managing content topics, references, and final deliverables."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {showAdminDetails && (
            <Button variant="outline" onClick={() => { setAdminViewMode("dashboard"); setSelectedClientFilter("All Clients"); }} className="rounded-xl h-10 border-input mr-2">
              <Undo className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          )}
          <div className="w-32 sm:w-40">
            <Select value={selectedDateFilter} onValueChange={(v) => { setSelectedDateFilter(v); setPage(0); }}>
              <SelectTrigger className="h-10 rounded-xl bg-white border-input text-xs sm:text-sm">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Dates">All Dates</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="Custom Date">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedDateFilter === "Custom Date" && (
            <div className="flex items-center gap-1 bg-white rounded-xl border border-input h-10 px-2 shadow-sm text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium pl-1">From</span>
              <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[110px]" />
              <span className="text-muted-foreground font-medium px-1 border-l border-border/50">To</span>
              <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[110px]" />
            </div>
          )}
          <div className="w-36 sm:w-44">
            <Select value={selectedPlatformFilter} onValueChange={(v) => { setSelectedPlatformFilter(v); setPage(0); }}>
              <SelectTrigger className="h-10 rounded-xl bg-white border-input text-xs sm:text-sm">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Platforms">All Platforms</SelectItem>
                {allWorkspacePlatforms.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 sm:w-40">
            <Select value={selectedStatusFilter} onValueChange={(v) => { setSelectedStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="h-10 rounded-xl bg-white border-input text-xs sm:text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                {["draft","pending_approval","changes_requested","approved","scheduled","published"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isClient && !showAdminDetails && (
            <div className="w-36 sm:w-48">
              <Select value={selectedClientFilter} onValueChange={(v) => { setSelectedClientFilter(v); setPage(0); }}>
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
          <Button variant="outline" onClick={handleExportCSV} className="rounded-xl h-10 border-input" title="Export as CSV">
            <Download className="h-4 w-4 mr-2" />
            <span>Export CSV</span>
          </Button>
          {!isClient && (
            <>
              <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportCSV} className="hidden" />
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={bulkCreatePosts.isPending}
                className="rounded-xl h-10 border-input"
                title="Bulk import posts from a CSV (Client, Platform, Content Type, Topic, Assigned To, Status, Schedule)"
              >
                {bulkCreatePosts.isPending ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Upload className="h-4 w-4 sm:mr-2" />}
                <span className="hidden sm:inline">Import</span>
              </Button>
            </>
          )}
          {!isClient && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleUndo} 
                disabled={!undoAction}
                className={`rounded-xl h-10 border-input ${undoAction ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200' : 'text-gray-400'}`} 
                title={undoAction ? `Undo ${undoAction.description}` : "Nothing to undo"}
              >
                <Undo className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
              <Button variant="outline" onClick={handleAddColumn} disabled={!workspace} className="rounded-xl h-10 border-input bg-white">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Column</span>
              </Button>
              <Button onClick={handleAddRow} disabled={!workspace} className="rounded-xl h-10">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Row</span>
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="card-soft flex-1 flex flex-col overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-sm text-left border-collapse min-w-[1200px]" style={{ tableLayout: "fixed" }}>
              <thead className="bg-primary text-white">
                <tr>
                  <ResizableHeader label="DATE" defaultWidth={96} />
                  <ResizableHeader label="WEEK DAY" defaultWidth={96} />
                  <ResizableHeader label="CLIENT" defaultWidth={160} />
                  <ResizableHeader label="PLATFORM" defaultWidth={140} />
                  <ResizableHeader label="CONTENT TYPE" defaultWidth={128} />
                  <ResizableHeader label="TOPIC" defaultWidth={192} />
                  <ResizableHeader label="REFERENCE CONTENT" defaultWidth={320} />
                  <ResizableHeader label="COMPLETED CONTENT" defaultWidth={320} />
                  <ResizableHeader label="ASSIGNED TO" defaultWidth={160} />
                  <ResizableHeader label="SCHEDULED TIME" defaultWidth={160} />
                  <ResizableHeader label="STATUS" defaultWidth={128} className="text-center" />
                  {customColumns.map(col => <ResizableHeader key={col} label={col.toUpperCase()} defaultWidth={160} onDelete={() => handleDeleteColumn(col)} />)}
                </tr>
              </thead>
              <tbody>
                {pagedPosts.map((post, idx) => (
                  <TaskRow key={post.id} post={post} index={safePage * PAGE_SIZE + idx} isClient={isClient} allClientNames={allClientNames} members={members} setUndoAction={setUndoAction} selectedClientFilter={selectedClientFilter} customColumns={customColumns} setLightboxImage={setLightboxImage} clients={clients} allWorkspacePlatforms={allWorkspacePlatforms} />
                ))}
                {sortedPosts.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-muted-foreground">
                      No posts found. Click 'Add Row' to draft new content!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination footer */}
        {sortedPosts.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-white">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, sortedPosts.length)}</span> of {sortedPosts.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Prev</Button>
              <span className="text-xs text-muted-foreground">Page {safePage + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
      
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="Fullscreen preview" className="max-w-[90vw] max-h-[90vh] rounded shadow-2xl object-contain animate-in fade-in zoom-in duration-200" />
          <button 
            className="absolute top-6 right-6 text-white bg-black/50 hover:bg-black p-2 rounded-full transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </AppShell>
  );
}

function ResizableHeader({ label, defaultWidth, className = "", onDelete }: { label: string; defaultWidth: number; className?: string; onDelete?: () => void }) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.pageX;
    startWidth.current = width;
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      setWidth(Math.max(60, startWidth.current + (e.pageX - startX.current)));
    };
    const onMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  return (
    <th className={`relative px-4 py-3 border-r border-white/20 font-semibold group ${className}`} style={{ width, minWidth: width }}>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {onDelete && (
          <button 
            onClick={onDelete} 
            className="text-white/50 hover:text-white/100 hover:bg-white/20 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Column"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>
      <div 
        onMouseDown={onMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 ${isResizing ? 'bg-white/50' : ''}`}
        title="Drag to resize column"
      />
    </th>
  );
}

// Separate component for each row so they manage their own local edit state
function TaskRow({ post, index, isClient, allClientNames,
  members,
  setUndoAction,
  selectedClientFilter,
  customColumns,
  setLightboxImage,
  clients,
  allWorkspacePlatforms,
}: {
  post: Post;
  index: number;
  isClient: boolean;
  allClientNames: string[];
  members: any[];
  setUndoAction: (action: any | null) => void;
  selectedClientFilter: string;
  customColumns: string[];
  setLightboxImage: (url: string | null) => void;
  clients: Client[];
  allWorkspacePlatforms: string[];
}) {
  const queryClient = useQueryClient();
  const { data: workspace } = useCurrentWorkspace();
  const isSMM = workspace?.role === "employee" && workspace?.agencyRole === "Social Media Manager";
  const updatePost = useUpdatePostDetails();
  const updateStatus = useUpdatePostStatus();
  const deletePost = useDeletePost();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTarget, setUploadingTarget] = useState<"reference_content" | "completed_work" | null>(null);

  // Date formatting for the date input
  const dateObj = post.scheduled_for ? new Date(post.scheduled_for) : new Date(post.created_at);
  const dateInputVal = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const rowColor = index % 2 === 0 ? "bg-purple-50" : "bg-white"; // Light purple/white alternating

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
  const renderMedia = (urls: string[] | null, target: "reference_content" | "completed_work") => {
    if (!urls || urls.length === 0) return <div className="text-muted-foreground text-sm opacity-70 italic mb-2">No media added</div>;
    return (
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url, i) => {
          const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes("supabase.co");
          const handleDelete = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm("Remove this item?")) {
              const previous = urls;
              const updated = urls.filter((_, idx) => idx !== i);
              updatePost.mutate({ id: post.id, updates: { [target]: updated } }, {
                onSuccess: () => {
                  setUndoAction({
                    description: "Remove Media/Link",
                    undo: async () => {
                      await supabase.from("posts").update({ [target]: previous }).eq("id", post.id);
                      queryClient.invalidateQueries({ queryKey: ["posts"] });
                    }
                  });
                }
              });
            }
          };

          if (isImage) {
            return (
              <div key={i} className="relative group w-16 h-16 rounded overflow-hidden border border-border shrink-0">
                <button type="button" onClick={() => setLightboxImage(url)} className="block w-full h-full cursor-zoom-in">
                  <img src={url} alt="media" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white rounded-full p-1 transition-colors backdrop-blur-sm shadow-sm"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          }
          return (
            <div key={i} className="relative group flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                <LinkIcon className="w-3 h-3" /> Link {i+1}
              </a>
              <button
                type="button"
                onClick={handleDelete}
                className="ml-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-full p-0.5 transition-colors shrink-0"
                title="Remove link"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <tr id={`post-row-${post.id}`} className={`border-b border-gray-200 ${rowColor} hover:bg-gray-50 transition-colors`}>
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
        {selectedClientFilter !== "All Clients" ? (
          <div className="w-full px-3 py-3 text-sm h-[80px] flex items-start">
            <span className="font-medium text-gray-700">{post.client_name || "—"}</span>
          </div>
        ) : (
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
        )}
      </td>

      {/* PLATFORM — multi-select */}
      <td className="p-0 border-r border-gray-200 align-top bg-transparent">
        <PlatformMultiSelect
          value={post.platforms ?? (post.platform ? [post.platform] : [])}
          disabled={isClient}
          onChange={(vals) => updatePost.mutate({ id: post.id, updates: { platforms: vals } })}
          availablePlatforms={post.client_name 
            ? (clients.find(c => c.name === post.client_name)?.platforms ?? []) 
            : allWorkspacePlatforms}
        />
      </td>

      {/* CONTENT TYPE */}
      <td className="p-0 border-r border-gray-200 align-top">
        <select
          defaultValue={post.content_type || ""}
          onChange={(e) => updatePost.mutate({ id: post.id, updates: { content_type: e.target.value } })}
          className="w-full p-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
        >
          <option value="" disabled>Select Type</option>
          {Array.from(new Set([
            "Static Post",
            "Reel",
            "Carousel",
            "Story",
            "Video",
            "Short",
            "Thread",
            "Live Stream",
            "Other",
            ...(post.content_type ? [post.content_type] : [])
          ])).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </td>

      {/* TOPIC */}
      <td className="p-0 border-r border-gray-200 align-top">
        <textarea
          defaultValue={post.topic || ""}
          onBlur={(e) => handleTextBlur("topic", e.target.value)}
          className="w-full min-h-[80px] p-3 bg-transparent resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
          placeholder="Enter topic..."
        />
      </td>

      {/* REFERENCE CONTENT */}
      <td className="p-3 border-r border-gray-200 align-top">
        {renderMedia(post.reference_content, "reference_content")}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-white/50" onClick={() => handleAddLink("reference_content")}>
            <LinkIcon className="w-3.5 h-3.5 mr-1" /> Add Link
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-white/50" onClick={() => { setUploadingTarget("reference_content"); fileInputRef.current?.click(); }}>
            {uploadingTarget === "reference_content" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}
            Upload Image
          </Button>
        </div>
      </td>

      {/* COMPLETED CONTENT */}
      <td className="p-3 border-r border-gray-200 align-top">
        {renderMedia(post.completed_work, "completed_work")}
        
        {/* We also show the post.content here (the caption) */}
        <div className="mt-3 mb-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Caption Text</label>
          <textarea
            defaultValue={post.content || ""}
            onBlur={(e) => handleTextBlur("content", e.target.value)}
            className="w-full h-16 p-2 bg-white/60 border border-gray-300 rounded text-xs resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Final caption goes here..."
          />
        </div>

        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-white/50" onClick={() => handleAddLink("completed_work")}>
            <LinkIcon className="w-3.5 h-3.5 mr-1" /> Add Link
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-white/50" onClick={() => { setUploadingTarget("completed_work"); fileInputRef.current?.click(); }}>
            {uploadingTarget === "completed_work" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3 mr-1" />}
            Upload Final
          </Button>
        </div>
      </td>

      {/* ASSIGNED TO — multi-select */}
      <td className="p-0 border-r border-gray-200 align-top bg-transparent">
        <div className="h-full min-h-[140px] p-2 flex flex-col gap-2 justify-start relative">
          <RoleSelectAssign
            post={post}
            members={members}
            isClient={isClient}
            onUpdate={(userIds) => updatePost.mutate({ id: post.id, updates: { assigned_to: userIds } })}
            targetRole="Social Media Manager"
          />
          <RoleSelectAssign
            post={post}
            members={members}
            isClient={isClient}
            onUpdate={(userIds) => updatePost.mutate({ id: post.id, updates: { assigned_to: userIds } })}
            targetRole="Designer"
          />
          <RoleSelectAssign
            post={post}
            members={members}
            isClient={isClient}
            onUpdate={(userIds) => updatePost.mutate({ id: post.id, updates: { assigned_to: userIds } })}
            targetRole="Video Editor"
          />
        </div>
      </td>

      {/* SCHEDULED TIME */}
      <td className="px-3 py-3 border-r border-gray-200 align-top">
        <div className="flex flex-col gap-1">
          {post.scheduled_for ? (
            <>
              <div className="text-xs font-medium text-gray-800">
                {new Date(post.scheduled_for).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(post.scheduled_for).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Not scheduled</span>
          )}
          {!isClient && (
            <input
              type="datetime-local"
              defaultValue={post.scheduled_for ? (() => {
                const d = new Date(post.scheduled_for);
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
              })() : ""}
              onChange={(e) => {
                if (!e.target.value) return;
                updatePost.mutate({ id: post.id, updates: { scheduled_for: new Date(e.target.value).toISOString() } });
              }}
              className="mt-1 w-full text-[10px] px-1.5 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}
        </div>
      </td>

      {/* STATUS */}
      <td className="px-4 py-3 align-middle text-center">
        <div className="flex flex-col items-center gap-2">
          <span 
            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${post.approved_by ? 'cursor-help' : ''}`}
            title={post.approved_by ? `Approved By: ${post.approved_by}\nDate: ${post.approved_at ? new Date(post.approved_at).toLocaleString() : ''}` : undefined}
            style={{
            backgroundColor: post.status === 'draft' ? '#f3f4f6' :
                            post.status === 'pending_approval' ? '#fef3c7' :
                            post.status === 'changes_requested' ? '#fee2e2' :
                            post.status === 'approved' ? '#d1fae5' : '#dbeafe',
            color: post.status === 'draft' ? '#4b5563' :
                   post.status === 'pending_approval' ? '#d97706' :
                   post.status === 'changes_requested' ? '#dc2626' :
                   post.status === 'approved' ? '#059669' : '#2563eb'
          }}>
            {post.status.replace(/_/g, " ")}
          </span>

          {/* Revision note from the last rejection */}
          {post.status === 'changes_requested' && post.revision_note && (
            <div className="text-[9px] text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-1 mt-1 text-left leading-tight max-w-[120px]">
              <span className="font-semibold">Changes: </span>{post.revision_note}
            </div>
          )}
          {post.approved_by && (
            <div className="text-[9px] text-muted-foreground mt-1 text-center leading-tight">
              Approved by<br/>
              <span className="font-semibold text-foreground/80">{post.approved_by}</span>
            </div>
          )}

          <div className="flex flex-col gap-1 w-full mt-2">
            {/* Employees OR Admins can submit drafts for approval */}
            {(workspace?.role === "employee" || workspace?.role === "admin") && post.status === "draft" && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-[10px] w-full"
                onClick={() => { if (!workspace) return; updateStatus.mutate({ id: post.id, status: "pending_approval", workspace_id: workspace.workspaceId }) }}
                disabled={updateStatus.isPending}
              >
                Submit
              </Button>
            )}
            
            {/* Clients, Admins, or SMMs can approve/reject pending posts */}
            {(workspace?.role === "client" || workspace?.role === "admin" || isSMM) && post.status === "pending_approval" && (
              <>
                <Button 
                  size="sm" 
                  className="h-7 text-[10px] w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (!workspace) return;
                    updateStatus.mutate({ 
                    id: post.id, 
                    status: "approved", 
                    workspace_id: workspace.workspaceId,
                    approved_by: workspace.userFullName || workspace.userEmail?.split("@")[0] || "Unknown",
                    approved_at: new Date().toISOString()
                  })}}
                  disabled={updateStatus.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[10px] w-full"
                  onClick={() => {
                    const note = window.prompt("What needs to change? (this note is shown to the team)");
                    if (note === null) return;
                    updatePost.mutate({ id: post.id, updates: { status: "changes_requested", revision_note: note } });
                  }}
                  disabled={updatePost.isPending}
                >
                  Request Changes
                </Button>
              </>
            )}

            {/* Employees/Admins resubmit after changes requested */}
            {(workspace?.role === "employee" || workspace?.role === "admin") && post.status === "changes_requested" && (
              <Button
                size="sm"
                className="h-7 text-[10px] w-full"
                onClick={() => updatePost.mutate({ id: post.id, updates: { status: "pending_approval", revision_note: null } })}
                disabled={updatePost.isPending}
              >
                Resubmit
              </Button>
            )}

            {/* Admins and SMMs can final-schedule approved posts */}
            {(workspace?.role === "admin" || isSMM) && post.status === "approved" && (
              <Button 
                size="sm" 
                className="h-7 text-[10px] w-full"
                onClick={() => { if (!workspace) return; updateStatus.mutate({ id: post.id, status: "scheduled", workspace_id: workspace.workspaceId }) }}
                disabled={updateStatus.isPending}
              >
                Schedule
              </Button>
            )}
            
            {/* Admins or SMMs can complete an approved/scheduled task at any time */}
            {(workspace?.role === "admin" || isSMM) &&
              (post.status === "scheduled" || post.status === "approved") && (
              <Button
                size="sm"
                className="h-7 text-[10px] w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  if (!workspace) return;
                  updateStatus.mutate({ id: post.id, status: "published", workspace_id: workspace.workspaceId }, {
                  onSuccess: () => toast.success("Task completed ✓"),
                })}}
                disabled={updateStatus.isPending}
              >
                <Check className="w-3 h-3 mr-1" /> Complete
              </Button>
            )}
            
            {/* Admin or SMM can delete the row */}
            {(workspace?.role === "admin" || isSMM) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-full text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this row?")) {
                    const postCopy = { ...post };
                    deletePost.mutate(post.id, {
                      onSuccess: () => {
                        setUndoAction({
                          description: "Delete Row",
                          undo: async () => {
                            await supabase.from("posts").insert(postCopy);
                            queryClient.invalidateQueries({ queryKey: ["posts"] });
                          }
                        });
                      }
                    });
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

      {/* CUSTOM COLUMNS */}
      {customColumns.map(col => (
        <td key={col} className="p-2 border-r border-gray-200 align-top">
          <textarea
            defaultValue={(() => { try { return JSON.parse(localStorage.getItem(`socialnxt_custom_data_${post.id}`) || '{}')[col] || ''; } catch { return ''; } })()}
            onBlur={(e) => {
               try {
                 const data = JSON.parse(localStorage.getItem(`socialnxt_custom_data_${post.id}`) || '{}');
                 data[col] = e.target.value;
                 localStorage.setItem(`socialnxt_custom_data_${post.id}`, JSON.stringify(data));
               } catch(err) { console.error(err); }
            }}
            className="w-full min-h-[80px] p-3 bg-transparent rounded text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={`Enter ${col}...`}
          />
        </td>
      ))}

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

// ── Role specific Assigned To dropdown ──────────────────────────────────────
function RoleSelectAssign({
  post,
  members,
  isClient,
  onUpdate,
  targetRole,
}: {
  post: Post;
  members: any[];
  isClient?: boolean;
  onUpdate: (ids: string[]) => void;
  targetRole: "Social Media Manager" | "Designer" | "Video Editor";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: workspace } = useCurrentWorkspace();
  const isSMM = workspace?.role === "employee" && workspace?.agencyRole === "Social Media Manager";
  const currentUserId = workspace?.userId;

  const eligibleMembers = useMemo(() => {
    let list = members.filter((m) => m.role === "employee" && (m.agency_role || "Social Media Manager") === targetRole);
    if (isSMM) {
      list = list.filter(m => 
        m.agency_role === "Designer" || 
        m.agency_role === "Video Editor" || 
        m.user_id === currentUserId
      );
    }
    return list;
  }, [members, targetRole, isSMM, currentUserId]);

  const roleMemberIds = useMemo(() => new Set(eligibleMembers.map(m => m.user_id)), [eligibleMembers]);

  // ── Local state for immediate checkbox feedback ──
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (post.assigned_to ?? []).filter(id => roleMemberIds.has(id)));

  // Sync from prop when Supabase refetch arrives
  useEffect(() => {
    setSelectedIds((post.assigned_to ?? []).filter(id => roleMemberIds.has(id)));
  }, [post.assigned_to, roleMemberIds]);

  const getMemberName = (userId: string) => {
    const m = eligibleMembers.find((m) => m.user_id === userId);
    if (!m) return "Unknown";
    const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
    const roleName = (m.role === "admin" || m.role === "owner") ? "Admin" : (m.agency_role || "Social Media Manager");
    return `${name} (${roleName})`;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const toggleMember = (userId: string) => {
    const isCurrentlySelected = selectedIds.includes(userId);
    const newSelectedForThisRole = isCurrentlySelected 
      ? selectedIds.filter(id => id !== userId)
      : [...selectedIds, userId];

    setSelectedIds(newSelectedForThisRole);

    // Merge this back into the global assigned_to
    const otherRolesIds = (post.assigned_to ?? []).filter(id => !roleMemberIds.has(id));
    const merged = [...otherRolesIds, ...newSelectedForThisRole];
    onUpdate(merged);
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
          <span className="text-muted-foreground">Select {targetRole}</span>
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

