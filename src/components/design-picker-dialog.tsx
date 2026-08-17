import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon } from "lucide-react";
import type { DesignerAsset } from "@/lib/queries";

function isImageAsset(a: DesignerAsset) {
  if (a.mime_type?.startsWith("image/")) return true;
  return /\.(jpe?g|gif|png|webp|svg|avif)$/i.test(a.url);
}

export function DesignPickerDialog({
  open,
  onOpenChange,
  assets,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: DesignerAsset[];
  onPick: (asset: DesignerAsset) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Pick from My Designs</DialogTitle>
        </DialogHeader>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            No designs yet — upload some in the Designs section first.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pt-2">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a)}
                className="group flex flex-col rounded-lg overflow-hidden border border-border hover:border-primary transition-colors text-left"
              >
                <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                  {isImageAsset(a) ? (
                    <img src={a.url} alt={a.file_name || "design"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="px-1.5 py-1 text-[10px] truncate" title={a.file_name || a.url}>
                  {a.file_name || "design"}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
