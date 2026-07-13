import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  useCurrentWorkspace,
  useMediaAssets,
  useAddMediaAsset,
  useDeleteMediaAsset,
  useUpdateMediaAsset,
  useActiveClients,
  uploadMediaFile,
  MediaAsset,
  useWorkspaceMembers,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, Trash2, Copy, Search, ImageIcon, FileIcon, AlertOctagon, User, Clock, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/media")({
  head: () => ({ meta: [{ title: "Media Library — SocialNxt" }] }),
  component: MediaPage,
});

function isImage(a: MediaAsset) {
  if (a.mime_type?.startsWith("image/")) return true;
  return /\.(jpe?g|gif|png|webp|svg|avif)$/i.test(a.url);
}

function MediaPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: assets = [], isLoading } = useMediaAssets(workspace?.workspaceId);
  const addAsset = useAddMediaAsset();
  const deleteAsset = useDeleteMediaAsset();
  const updateAsset = useUpdateMediaAsset();
  const { data: clientsList = [] } = useActiveClients(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [uploadPlatform, setUploadPlatform] = useState<string>("any");

  const filtered = assets.filter(
    (a) => {
      if (workspace?.role === "client") {
        const myClientId = clientsList.find(c => 
          c.email?.toLowerCase() === workspace.userEmail?.toLowerCase() ||
          c.name.toLowerCase() === workspace.userFullName?.toLowerCase() ||
          workspace.userFullName?.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(workspace.userFullName?.toLowerCase() || "")
        )?.id;
        const isMyUpload = a.uploaded_by === workspace.userId;
        const isAssignedToMe = myClientId && a.client_id === myClientId;
        if (!isMyUpload && !isAssignedToMe) return false;
      } else if (workspace?.role === "employee") {
        const client = clientsList.find(c => c.id === a.client_id);
        const isAssigned = client && Object.values(client.team_assignments || {}).includes(workspace.userId);
        if (!isAssigned && a.uploaded_by !== workspace.userId) return false;
      }

      const clientName = clientsList.find(c => c.id === a.client_id)?.name || "";
      const matchSearch = !q ||
        (a.file_name || "").toLowerCase().includes(q.toLowerCase()) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q.toLowerCase())) ||
        clientName.toLowerCase().includes(q.toLowerCase());
      
      const matchClient = selectedClient === "all" || a.client_id === selectedClient;
      const matchPlatform = filterPlatform === "all" || a.platform === filterPlatform;
      
      let matchDate = true;
      if (dateFilter !== "all" && a.created_at) {
        const assetDate = new Date(a.created_at);
        const now = new Date();
        if (dateFilter === "today") {
          matchDate = assetDate.toDateString() === now.toDateString();
        } else if (dateFilter === "week") {
          const lastWeek = new Date();
          lastWeek.setDate(now.getDate() - 7);
          matchDate = assetDate >= lastWeek;
        } else if (dateFilter === "month") {
          const lastMonth = new Date();
          lastMonth.setDate(now.getDate() - 30);
          matchDate = assetDate >= lastMonth;
        } else if (dateFilter === "custom" && customStart && customEnd) {
          matchDate = assetDate >= new Date(customStart) && assetDate <= new Date(customEnd + "T23:59:59");
        }
      }
      
      return matchSearch && matchClient && matchPlatform && matchDate;
    }
  );

  const uploadableClients = workspace?.role === "employee"
    ? clientsList.filter(c => Object.values(c.team_assignments || {}).includes(workspace.userId))
    : clientsList;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !workspace) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadMediaFile(file);
        
        const payload: any = {
          workspace_id: workspace.workspaceId,
          uploaded_by: workspace.userId,
          url,
          file_name: file.name,
          mime_type: file.type,
          platform: uploadPlatform === "any" ? null : uploadPlatform,
        };
        
        if (workspace.role === "client") {
          const myClientId = clientsList.find(c => 
            c.email?.toLowerCase() === workspace.userEmail?.toLowerCase() ||
            c.name.toLowerCase() === workspace.userFullName?.toLowerCase() ||
            workspace.userFullName?.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(workspace.userFullName?.toLowerCase() || "")
          )?.id;
          if (myClientId) {
            payload.client_id = myClientId;
          }
        } else if (selectedClient !== "all") {
          payload.client_id = selectedClient;
        }

        await addAsset.mutateAsync(payload);
      }
      toast.success(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"}!`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied — paste it into any post");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <AppShell
      title="Media Library"
      subtitle="Reusable brand assets. Upload once, drop the link into any post or content row."
      actions={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-40 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or tag"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white border border-input shadow-sm"
              />
            </div>
            
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 rounded-xl bg-white border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Dates</option>
            </select>
            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 bg-white border rounded-xl px-2 h-10">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-sm outline-none bg-transparent" />
                <span className="text-muted-foreground">-</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-sm outline-none bg-transparent" />
              </div>
            )}
            
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="h-10 rounded-xl bg-white border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter</option>
              <option value="tiktok">TikTok</option>
            </select>
            
            {workspace?.role !== "client" && (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="h-10 rounded-xl bg-white border border-input px-3 text-sm hidden sm:block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Clients Filter</option>
                {uploadableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {workspace?.role !== "client" && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-xl border border-dashed">
              <span className="text-sm font-medium text-muted-foreground mr-2">Upload Settings:</span>
              <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="h-9 rounded-lg bg-white border border-input px-3 text-xs focus:outline-none">
                <option value="all">Select Client to Upload...</option>
                {uploadableClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select value={uploadPlatform} onChange={(e) => setUploadPlatform(e.target.value)} className="h-9 rounded-lg bg-white border border-input px-3 text-xs focus:outline-none">
                <option value="any">Any Platform</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="tiktok">TikTok</option>
              </select>
              <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="hidden" />
              <Button onClick={() => { if (selectedClient === "all") toast.error("Please select a client to upload for."); else inputRef.current?.click(); }} disabled={uploading || !workspace} className="rounded-lg h-9 text-xs">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UploadCloud className="h-3 w-3 mr-1" />}
                Upload
              </Button>
            </div>
          )}
          {workspace?.role === "client" && (
            <div>
              <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="hidden" />
              <Button onClick={() => inputRef.current?.click()} disabled={uploading || !workspace} className="rounded-xl h-10">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <UploadCloud className="h-4 w-4 sm:mr-2" />}
                Upload
              </Button>
            </div>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-soft py-20 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          {assets.length === 0 ? "No assets yet. Upload your first file." : "No assets match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="group card-soft overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                {isImage(a) ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="w-full h-full">
                    <img src={a.url} alt={a.file_name || "asset"} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col items-center text-muted-foreground">
                    <FileIcon className="h-10 w-10" />
                    <span className="text-[10px] mt-1">Open</span>
                  </a>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[12px] font-semibold truncate flex-1" title={a.file_name || a.url}>
                    {a.file_name || "asset"}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => copyUrl(a.url)} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm("Remove this asset?")) deleteAsset.mutate({ id: a.id, workspace_id: workspace!.workspaceId }); }} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-red-50 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1 truncate" title={members.find(m => m.user_id === a.uploaded_by)?.users?.full_name || "Unknown"}>
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {members.find(m => m.user_id === a.uploaded_by)?.users?.full_name?.split(" ")[0] || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" title={new Date(a.created_at).toLocaleString()}>
                      <Clock className="h-3 w-3" />
                      {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  
                  {workspace?.role === "client" ? (
                    <div className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md mt-1 truncate">
                      Client: {clientsList.find(c => c.id === a.client_id)?.name || "You"}
                    </div>
                  ) : (
                    <select
                      className="text-[11px] text-foreground bg-muted/40 border border-transparent rounded-md px-1.5 py-1 focus:ring-1 cursor-pointer w-full mt-1"
                      value={a.client_id || ""}
                      onChange={async (e) => {
                        const newClientId = e.target.value || null;
                        try {
                          await updateAsset.mutateAsync({ id: a.id, workspace_id: workspace!.workspaceId, updates: { client_id: newClientId } });
                          toast.success("Client updated");
                        } catch (err: any) { toast.error("Failed: " + err.message); }
                      }}
                    >
                      <option value="">Unassigned Client</option>
                      {uploadableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  
                  <select
                    className="text-[10px] text-muted-foreground bg-transparent border-none p-0 h-auto focus:ring-0 cursor-pointer hover:text-foreground w-full mt-0.5"
                    value={a.platform || ""}
                    onChange={async (e) => {
                      const p = e.target.value || null;
                      try {
                        await updateAsset.mutateAsync({ id: a.id, workspace_id: workspace!.workspaceId, updates: { platform: p } });
                        toast.success("Platform updated");
                      } catch (err: any) { toast.error("Failed: " + err.message); }
                    }}
                  >
                    <option value="">No Platform Selected</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
