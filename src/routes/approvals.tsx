import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Link as LinkIcon, Loader2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useCurrentWorkspace,
  usePosts,
  useUpdatePostStatus,
  useUpdatePostDetails,
  type Post,
} from "@/lib/queries";

function getPostPlatforms(post: Post): string[] {
  if (post.platforms && post.platforms.length) return post.platforms;
  if (post.platform) return [post.platform];
  return [];
}

const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp)/i.test(url) || url.includes("supabase.co");

function CompletedWorkMedia({ urls, onZoom }: { urls: string[] | null; onZoom: (url: string) => void }) {
  if (!urls || urls.length === 0) return <span className="text-xs text-muted-foreground italic">No content uploaded</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((url, i) =>
        isImageUrl(url) ? (
          <button
            key={i}
            type="button"
            onClick={() => onZoom(url)}
            className="w-12 h-12 rounded overflow-hidden border border-border shrink-0 cursor-zoom-in"
            title="Click to preview"
          >
            <img src={url} alt="reference" className="w-full h-full object-cover hover:scale-105 transition-transform" />
          </button>
        ) : (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:underline shrink-0"
          >
            <LinkIcon className="w-3 h-3" /> Link {i + 1}
          </a>
        ),
      )}
    </div>
  );
}

export function ApprovalsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: allPosts = [], isLoading, error } = usePosts(workspace?.workspaceId);
  const updateStatus = useUpdatePostStatus();
  const updatePost = useUpdatePostDetails();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isClient = workspace?.role === "client";
  const isAdmin = workspace?.role === "admin";
  const isSMM = workspace?.role === "employee" && workspace?.agencyRole === "Social Media Manager";
  const clientNameForFilter = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";

  const pending = allPosts.filter((p) => p.status === "pending_approval");

  // Any SMM or admin can approve any client's task; a client only sees their own.
  const visiblePending = isClient
    ? pending.filter((p) => p.client_name?.toLowerCase() === clientNameForFilter.toLowerCase())
    : isAdmin || isSMM
    ? pending
    : [];

  const sorted = [...visiblePending].sort(
    (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
  );

  const canApprove = isClient || isAdmin || isSMM;

  const handleApprove = (post: Post) => {
    if (!workspace) return;
    updateStatus.mutate(
      {
        id: post.id,
        status: "approved",
        workspace_id: workspace.workspaceId,
        approved_by: workspace.userFullName || workspace.userEmail?.split("@")[0] || "Unknown",
        approved_at: new Date().toISOString(),
      },
      { onSuccess: () => toast.success(`Approved "${post.topic || "task"}" for ${post.client_name}`) },
    );
  };

  const handleRequestChanges = (post: Post) => {
    const note = window.prompt("What needs to change? (this note is shown to the team)");
    if (note === null) return;
    updatePost.mutate(
      { id: post.id, updates: { status: "changes_requested", revision_note: note } },
      { onSuccess: () => toast.success("Changes requested") },
    );
  };

  return (
    <AppShell
      title="Approvals"
      subtitle={
        canApprove
          ? "Tasks waiting for approval, across every client. Any manager can review and approve."
          : "Tasks waiting for approval."
      }
    >
      <div className="card-soft p-4 sm:p-5">
        {error ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center text-red-500">
            <XCircle className="h-10 w-10 text-red-500/40" />
            <p className="text-sm font-semibold">Error loading approvals</p>
            <pre className="text-xs max-w-lg whitespace-pre-wrap">{error.message || JSON.stringify(error)}</pre>
          </div>
        ) : isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !canApprove ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">You don't have approval access.</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nothing waiting for approval right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 font-semibold">Task</th>
                  <th className="px-3 py-3 font-semibold">Client</th>
                  <th className="px-3 py-3 font-semibold">Completed Content</th>
                  <th className="px-3 py-3 font-semibold">Platform(s)</th>
                  <th className="px-3 py-3 font-semibold">Scheduled</th>
                  <th className="px-3 py-3 font-semibold">Waiting since</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((post) => {
                  const scheduled = post.scheduled_for ? new Date(post.scheduled_for) : null;
                  const waitingSince = new Date(post.updated_at);
                  return (
                    <tr key={post.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#F59E0B]/10 text-[#B45309] grid place-items-center shrink-0">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold">{post.topic || "Untitled task"}</div>
                            {post.content && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">{post.content}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[10px] text-primary uppercase tracking-widest">
                          {post.client_name || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[180px]">
                        <CompletedWorkMedia urls={post.completed_work} onZoom={setLightboxImage} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {getPostPlatforms(post).length > 0 ? (
                            getPostPlatforms(post).map((p) => (
                              <Badge key={p} className="rounded-full border-0 bg-muted text-foreground/70">
                                {p}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-foreground/70">
                        {scheduled ? (
                          <>
                            <div className="text-xs font-medium text-foreground">
                              {scheduled.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {scheduled.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unscheduled</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground/70">
                        <div className="text-xs font-medium text-foreground">
                          {waitingSince.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {waitingSince.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(post)}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => handleRequestChanges(post)}
                            disabled={updatePost.isPending}
                          >
                            Request Changes
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Fullscreen preview"
            className="max-w-[90vw] max-h-[90vh] rounded shadow-2xl object-contain animate-in fade-in zoom-in duration-200"
          />
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
