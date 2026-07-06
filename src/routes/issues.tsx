import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, AlertOctagon, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentWorkspace, useIssues, useCreateIssue, useUpdateIssueStatus, useWorkspaceMembers, type Issue } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/issues")({
  head: () => ({ meta: [{ title: "Client Issues — SocialNxt CRM" }] }),
  component: IssuesPage,
});

const PRIORITY_TONE: Record<string, string> = {
  Low: "bg-[#10B981]/10 text-[#047857]",
  Medium: "bg-[#F59E0B]/10 text-[#B45309]",
  High: "bg-[#EF4444]/10 text-[#B91C1C]",
  Critical: "bg-[#7F1D1D] text-white",
};
const STATUS_TONE: Record<string, string> = {
  Open: "bg-[#EF4444]/10 text-[#B91C1C]",
  "In Progress": "bg-primary/10 text-primary",
  Resolved: "bg-[#10B981]/10 text-[#047857]",
};

const ISSUE_TYPES = ["New Work Request", "Bug / Problem", "Feedback"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

function IssuesPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: allIssues = [], isLoading } = useIssues(workspace?.workspaceId);
  const createIssue = useCreateIssue();
  const updateStatus = useUpdateIssueStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<string>("Bug / Problem");
  const [priority, setPriority] = useState<string>("Medium");
  const [clientId, setClientId] = useState<string>("none");

  const isClient = workspace?.role === "client";
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const clientMembers = members.filter(m => m.role === "client");

  // Clients only see their own issues
  const issues = isClient
    ? allIssues.filter((i) => i.raised_by === workspace?.userId)
    : allIssues;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      await createIssue.mutateAsync({
        workspace_id: workspace.workspaceId,
        raised_by: workspace.userId,
        title,
        description,
        issue_type: issueType as Issue["issue_type"],
        priority: priority as Issue["priority"],
        status: "Open",
        ...(clientId !== "none" && { client_id: clientId }),
      });
      toast.success("Issue raised successfully!");
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setIssueType("Bug / Problem");
      setPriority("Medium");
    } catch (err: any) {
      toast.error("Failed to raise issue: " + err.message);
    }
  };

  const handleStatusChange = (issue: Issue, newStatus: string) => {
    updateStatus.mutate({ id: issue.id, status: newStatus }, {
      onSuccess: () => toast.success("Status updated!"),
      onError: (err: any) => toast.error(err.message),
    });
  };

  return (
    <AppShell
      title="Client Issues"
      subtitle={isClient ? "Raise and track your requests and issues." : "Track and resolve every issue raised by your clients."}
      actions={
        <Button className="rounded-xl h-10" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {isClient ? "Raise Issue" : "Report Issue"}
        </Button>
      }
    >
      <div className="card-soft p-4 sm:p-5">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <AlertOctagon className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {isClient ? "You have no issues raised yet. Click 'Raise Issue' to get started." : "No issues found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 font-semibold">Issue</th>
                  {!isClient && <th className="px-3 py-3 font-semibold">Raised By</th>}
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Priority</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  {!isClient && <th className="px-3 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const raisedBy = issue.users?.full_name || issue.users?.email?.split("@")[0] || "Unknown";
                  const dateObj = new Date(issue.created_at);
                  const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                  return (
                    <tr key={issue.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#EF4444]/10 text-[#B91C1C] grid place-items-center shrink-0">
                            <AlertOctagon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold">{issue.title}</div>
                            {issue.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{issue.description}</div>}
                          </div>
                        </div>
                      </td>
                      {!isClient && (
                        <td className="px-3 py-3 text-foreground/80">{raisedBy}</td>
                      )}
                      <td className="px-3 py-3">
                        <Badge className="rounded-full border-0 bg-muted text-foreground/70">{issue.issue_type}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`rounded-full border-0 ${PRIORITY_TONE[issue.priority]}`}>{issue.priority}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`rounded-full border-0 ${STATUS_TONE[issue.status]}`}>{issue.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-foreground/70">
                        <div className="text-xs font-medium text-foreground">{dateStr}</div>
                        <div className="text-[10px] text-muted-foreground">{timeStr}</div>
                      </td>
                      {!isClient && (
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {issue.status !== "In Progress" && (
                              <button
                                title="Mark In Progress"
                                onClick={() => handleStatusChange(issue, "In Progress")}
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary grid place-items-center"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            )}
                            {issue.status !== "Resolved" && (
                              <button
                                title="Mark Resolved"
                                onClick={() => handleStatusChange(issue, "Resolved")}
                                className="h-8 w-8 rounded-lg hover:bg-[#10B981]/10 text-[#047857] grid place-items-center"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isClient ? "Raise an Issue" : "Report an Issue"}</DialogTitle>
            <DialogDescription>
              {isClient
                ? "Submit a new work request, report a problem, or share feedback."
                : "Create a new issue on behalf of a client."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Need a new reel for product launch" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 p-3 rounded-lg border border-input bg-background text-sm"
                placeholder="Add more details about your issue..."
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isClient && clientMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific client</SelectItem>
                    {clientMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={createIssue.isPending}>
              {createIssue.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Issue
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
