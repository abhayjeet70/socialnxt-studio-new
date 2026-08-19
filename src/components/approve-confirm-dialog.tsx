import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toLinkEntries, type Post } from "@/lib/queries";
import { LinkChip } from "@/components/link-chip";

const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp)/i.test(url) || url.includes("supabase.co");

function getPostPlatforms(post: Post): string[] {
  if (post.platforms && post.platforms.length) return post.platforms;
  if (post.platform) return [post.platform];
  return [];
}

function CompletedWorkPreview({ urls }: { urls: unknown }) {
  const entries = toLinkEntries(urls);
  if (entries.length === 0) return <span className="text-xs text-muted-foreground italic">No content uploaded</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry, i) =>
        isImageUrl(entry.url) ? (
          <img
            key={i}
            src={entry.url}
            alt={entry.name || "completed work"}
            className="w-14 h-14 rounded overflow-hidden border border-border shrink-0 object-cover"
          />
        ) : (
          <LinkChip key={i} entry={entry} index={i} />
        ),
      )}
    </div>
  );
}

export function ApproveConfirmDialog({
  post,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  if (!post) return null;
  const scheduled = post.scheduled_for ? new Date(post.scheduled_for) : null;
  const hasCompletedWork = toLinkEntries(post.completed_work).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Approve "{post.topic || "this task"}"?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Client</div>
              <div className="font-medium text-primary">{post.client_name || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Scheduled</div>
              <div className="font-medium">
                {scheduled ? scheduled.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "Unscheduled"}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Platform(s)</div>
            <div className="flex flex-wrap gap-1">
              {getPostPlatforms(post).length > 0 ? (
                getPostPlatforms(post).map((p) => (
                  <Badge key={p} className="rounded-full border-0 bg-muted text-foreground/70">{p}</Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Completed content</div>
            <CompletedWorkPreview urls={post.completed_work} />
          </div>

          {!hasCompletedWork && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="text-xs">
                No completed content has been uploaded for this task yet. You can still approve it,
                but consider requesting the final files from the team first.
              </span>
            </div>
          )}

          <p className="text-muted-foreground pt-1">
            Are you sure you want to approve this task? This moves it forward in the workflow.
          </p>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
            Confirm approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
