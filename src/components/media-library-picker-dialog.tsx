import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon, PlayCircle } from "lucide-react";
import type { MediaAsset } from "@/lib/queries";

function isImageAsset(a: MediaAsset) {
  if (a.mime_type?.startsWith("image/")) return true;
  return /\.(jpe?g|gif|png|webp|svg|avif)$/i.test(a.url);
}

function isVideoAsset(a: MediaAsset) {
  if (a.mime_type?.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(a.url);
}

export function MediaLibraryPickerDialog({
  open,
  onOpenChange,
  assets,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: MediaAsset[];
  onPick: (asset: MediaAsset) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Pick from Media Library</DialogTitle>
        </DialogHeader>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            No photos or videos in the Media Library yet — add some from the Media Library section first.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[440px] overflow-y-auto pt-2">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a)}
                className="group flex flex-col rounded-lg overflow-hidden border border-border hover:border-primary transition-colors text-left"
              >
                <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
                  {isImageAsset(a) ? (
                    <img src={a.url} alt={a.file_name || "media"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : isVideoAsset(a) ? (
                    <>
                      <video src={a.url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                      <PlayCircle className="absolute h-6 w-6 text-white drop-shadow" />
                    </>
                  ) : (
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="px-1.5 py-1 text-[10px] truncate" title={a.file_name || a.url}>
                  {a.file_name || "asset"}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
