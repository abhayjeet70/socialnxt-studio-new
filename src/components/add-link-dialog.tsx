import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon } from "lucide-react";

export function AddLinkDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "Add link",
  initialName = "",
  initialUrl = "",
  submitLabel = "Add link",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: { name: string; url: string }) => void;
  title?: string;
  initialName?: string;
  initialUrl?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);

  const reset = () => {
    setName(initialName);
    setUrl(initialUrl);
  };

  // Re-sync fields to the caller's initial values whenever the dialog opens, so editing a
  // different entry doesn't carry over the previous one's values (or vice versa for "Add").
  useEffect(() => {
    if (open) {
      setName(initialName);
      setUrl(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    onSubmit({ name: name.trim(), url: trimmedUrl });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label>Link name</Label>
            <Input placeholder="e.g. Drive folder, Canva design" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Link address</Label>
            <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!url.trim()}>
            <LinkIcon className="h-4 w-4 mr-2" /> {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
