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
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, Trash2, Copy, Search, ImageIcon, FileIcon, AlertOctagon, User } from "lucide-react";
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");

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
      }

      const clientName = clientsList.find(c => c.id === a.client_id)?.name || "";
      const matchSearch = !q ||
        (a.file_name || "").toLowerCase().includes(q.toLowerCase()) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q.toLowerCase())) ||
        clientName.toLowerCase().includes(q.toLowerCase());
      
      const matchClient = selectedClient === "all" || a.client_id === selectedClient;
      
      return matchSearch && matchClient;
    }
  );

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-40 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or tag"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white"
            />
          </div>
          {workspace?.role !== "client" && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="h-10 rounded-xl bg-white border border-input px-3 text-sm hidden sm:block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Clients</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="hidden" />
          <Button 
            onClick={() => {
              if (workspace?.role !== "client" && selectedClient === "all") {
                toast.error("Please select a client from the dropdown first before uploading.");
                return;
              }
              inputRef.current?.click();
            }} 
            disabled={uploading || !workspace} 
            className="rounded-xl h-10"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <UploadCloud className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">Upload</span>
          </Button>
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
              <div className="p-2 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium truncate flex-1" title={a.file_name || a.url}>
                    {a.file_name || "asset"}
                  </span>
                  <button
                    onClick={() => copyUrl(a.url)}
                    className="h-6 w-6 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"
                    title="Copy URL"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Remove this asset from the library? (the file stays in storage)"))
                        deleteAsset.mutate({ id: a.id, workspace_id: workspace!.workspaceId });
                    }}
                    className="h-6 w-6 grid place-items-center rounded-lg hover:bg-red-50 text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                
                {workspace?.role === "client" ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {clientsList.find(c => c.id === a.client_id)?.name || "Uploaded by you"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <select
                      className="text-[10px] text-muted-foreground bg-transparent border-none p-0 h-auto focus:ring-0 cursor-pointer hover:text-foreground w-full truncate"
                      value={a.client_id || ""}
                      onChange={async (e) => {
                        const newClientId = e.target.value || null;
                        try {
                          await updateAsset.mutateAsync({
                            id: a.id,
                            workspace_id: workspace!.workspaceId,
                            updates: { client_id: newClientId }
                          });
                          toast.success("Client assigned successfully");
                        } catch (err: any) {
                          toast.error("Failed to assign client: " + (err.message || "Schema column missing"));
                        }
                      }}
                      title="Assign to client"
                    >
                      <option value="">No Client</option>
                      {clientsList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
