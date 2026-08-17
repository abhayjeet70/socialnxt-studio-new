import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AddLinkDialog } from "@/components/add-link-dialog";
import {
  useCurrentWorkspace,
  useDesignerAssets,
  useAddDesignerAsset,
  useDeleteDesignerAsset,
  uploadMediaFile,
  DesignerAsset,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, Trash2, Copy, Search, ImageIcon, FileIcon, VideoIcon, PlayCircle, Link as LinkIcon, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function isImage(a: DesignerAsset) {
  if (a.mime_type?.startsWith("image/")) return true;
  return /\.(jpe?g|gif|png|webp|svg|avif)$/i.test(a.url);
}

function isVideo(a: DesignerAsset) {
  if (a.mime_type?.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(a.url);
}

export function DesignsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: assets = [], isLoading } = useDesignerAssets(workspace?.userId);
  const addAsset = useAddDesignerAsset();
  const deleteAsset = useDeleteDesignerAsset();

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = assets.filter((a) => !q || (a.file_name || "").toLowerCase().includes(q.toLowerCase()));

  const isDesigner = workspace?.role === "employee" && workspace?.agencyRole === "Designer";
  if (workspace && !isDesigner) {
    return (
      <AppShell title="Designs" subtitle="Your personal design storage.">
        <div className="card-soft py-20 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Lock className="h-10 w-10 opacity-40" />
          This section is only available to team members with the Designer role.
        </div>
      </AppShell>
    );
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !workspace) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadMediaFile(file);
        await addAsset.mutateAsync({
          workspace_id: workspace.workspaceId,
          designer_id: workspace.userId,
          url,
          file_name: file.name,
          mime_type: file.type,
        });
      }
      toast.success(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"}!`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleAddLink = async ({ name, url }: { name: string; url: string }) => {
    if (!workspace) return;
    try {
      await addAsset.mutateAsync({
        workspace_id: workspace.workspaceId,
        designer_id: workspace.userId,
        url,
        file_name: name || url,
        mime_type: null,
      });
      toast.success("Link added to your Designs!");
    } catch (err: any) {
      toast.error("Failed to add link: " + err.message);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <AppShell
      title="Designs"
      subtitle="Your personal design storage. Private until you attach a design to a client's content sheet row."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-10 rounded-xl bg-white border border-input shadow-sm" />
          </div>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="hidden" />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading || !workspace} className="rounded-xl h-10">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <UploadCloud className="h-4 w-4 sm:mr-2" />}
            Upload
          </Button>
          <Button variant="outline" onClick={() => setAddLinkOpen(true)} disabled={!workspace} className="rounded-xl h-10 bg-white">
            <LinkIcon className="h-4 w-4 sm:mr-2" /> Add Link
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
          {assets.length === 0 ? "No designs yet. Upload your first file — it stays private until you attach it to a content sheet row." : "No designs match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="group card-soft overflow-hidden flex flex-col relative">
              <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
                {isImage(a) ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="w-full h-full">
                    <img src={a.url} alt={a.file_name || "design"} className="w-full h-full object-cover" />
                  </a>
                ) : isVideo(a) ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="w-full h-full relative block">
                    <video src={a.url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <PlayCircle className="h-9 w-9 text-white drop-shadow" />
                    </div>
                  </a>
                ) : (
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col items-center text-muted-foreground p-3 text-center">
                    <LinkIcon className="h-10 w-10" />
                    <span className="text-[10px] mt-1 line-clamp-2">{a.file_name || a.url}</span>
                  </a>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[12px] font-semibold truncate flex-1" title={a.file_name || a.url}>
                    {a.file_name || "design"}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => copyUrl(a.url)} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm("Delete this design?")) deleteAsset.mutate({ id: a.id, designer_id: workspace!.userId }); }} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-red-50 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {a.attached_to_post_id ? (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-1">
                    <CheckCircle2 className="h-3 w-3" /> Attached to a content sheet row
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 border border-border rounded px-1.5 py-1">
                    <Lock className="h-3 w-3" /> Private — only you can see this
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddLinkDialog open={addLinkOpen} onOpenChange={setAddLinkOpen} onSubmit={handleAddLink} title="Add a link to your Designs" />
    </AppShell>
  );
}
