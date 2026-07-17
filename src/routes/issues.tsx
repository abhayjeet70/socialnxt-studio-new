import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, AlertOctagon, Loader2, CheckCircle2, Clock, Trash2, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentWorkspace, useIssues, useCreateIssue, useUpdateIssueStatus, useUpdateIssue, useDeleteIssue, useClients, useWorkspaceMembers, type Issue } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/issues")({
  validateSearch: (search: Record<string, unknown>): { client?: string } => {
    return {
      client: search.client as string | undefined,
    }
  },
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
  Completed: "bg-[#10B981]/10 text-[#047857]",
  Rejected: "bg-red-100 text-red-700",
};

const ISSUE_TYPES = ["New Work Request", "Bug / Problem", "Feedback"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

function IssuesPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: allIssues = [], isLoading, error } = useIssues(workspace?.workspaceId);
  const createIssue = useCreateIssue();
  const updateStatus = useUpdateIssueStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<string>("Bug / Problem");
  const [priority, setPriority] = useState<string>("Medium");
  const [clientId, setClientId] = useState<string>("none");
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientParam = params.get("client");
    if (clientParam) {
      setFilterClient(clientParam);
    }
  }, []);

  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();

  const isClient = workspace?.role === "client";
  const isEmployee = workspace?.role === "employee";
  const { data: clientsList = [] } = useClients(workspace?.workspaceId);
  
  const activeClients = clientsList.filter(c => {
    if (c.status === "Closed") return false;
    if (isEmployee) {
      return Object.values(c.team_assignments || {}).includes(workspace.userId);
    }
    return true;
  });
  
  const closedNames = new Set(clientsList.filter(c => c.status === "Closed").map(c => c.name.toLowerCase()));
  const closedEmails = new Set(clientsList.filter(c => c.status === "Closed" && c.email).map(c => c.email!.toLowerCase()));

  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const clientMembers = members.filter(m => {
    if (m.role !== "client") return false;
    const name = m.users?.full_name || m.users?.email?.split("@")[0];
    const email = m.users?.email?.toLowerCase();
    const isClosedByName = name && closedNames.has(name.toLowerCase());
    const isClosedByEmail = email && closedEmails.has(email);
    return !isClosedByName && !isClosedByEmail;
  });

  const issues = allIssues.filter((i) => {
    if (isClient && i.raised_by !== workspace?.userId) return false;
    if (filterPriority !== "all" && i.priority !== filterPriority) return false;
    
    // Restrict employees to only see issues for their assigned clients
    if (isEmployee) {
      const isAssigned = activeClients.some(c => c.name === i.client_name);
      // Allow if it's not linked to any client (e.g. general workspace issue) or if it's assigned
      if (i.client_name && !isAssigned) return false;
    }

    if (!isClient && filterClient !== "all") {
      const selectedClientName = resolveClientName(filterClient);
      const matchesClient = i.raised_by === filterClient || (selectedClientName && i.client_name === selectedClientName) || i.client_id === filterClient;
      if (!matchesClient) return false;
    }
    return true;
  });

  function resolveClientName(id: string): string | null {
    if (id === "none") return null;
    const c = activeClients.find((c) => c.id === id);
    if (c) return c.name;
    const m = clientMembers.find((m) => m.user_id === id);
    if (m) return m.users?.full_name || m.users?.email?.split("@")[0] || null;
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    const clientName = resolveClientName(clientId);
    try {
      if (editingIssue) {
        await updateIssue.mutateAsync({
          id: editingIssue.id,
          title,
          description,
          issue_type: issueType as Issue["issue_type"],
          priority: priority as Issue["priority"],
          client_name: clientName,
          ...(clientId.startsWith("user_") && { client_id: clientId.replace("user_", "") }),
        });
        toast.success("Issue updated successfully!");
      } else {
        await createIssue.mutateAsync({
          workspace_id: workspace.workspaceId,
          raised_by: workspace.userId,
          title,
          description,
          issue_type: issueType as Issue["issue_type"],
          priority: priority as Issue["priority"],
          status: "Open",
          client_name: clientName,
          ...(clientId.startsWith("user_") && { client_id: clientId.replace("user_", "") }),
        });
        toast.success("Issue raised successfully!");
      }
      setIsDialogOpen(false);
      setEditingIssue(null);
      setTitle("");
      setDescription("");
      setIssueType("Bug / Problem");
      setPriority("Medium");
      setClientId("none");
    } catch (err: any) {
      console.error("Failed to save issue:", err);
      const msg = err.message || JSON.stringify(err) || "Unknown error occurred";
      toast.error(`Failed to ${editingIssue ? 'update' : 'raise'} issue: ` + msg);
      // Fallback alert in case toast is hidden behind dialog
      alert(`Error saving issue: ${msg}\n\nThis is usually caused by a missing database column or foreign key constraint. Please ensure all migrations are applied.`);
    }
  };

  const handleEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setTitle(issue.title);
    setDescription(issue.description || "");
    setIssueType(issue.issue_type);
    setPriority(issue.priority);
    setClientId(issue.client_id || "none");
    setIsDialogOpen(true);
  };

  const handleDelete = (issue: Issue) => {
    if (confirm("Are you sure you want to delete this issue?")) {
      deleteIssue.mutate({ id: issue.id }, {
        onSuccess: () => toast.success("Issue deleted successfully!"),
        onError: (err: any) => toast.error("Failed to delete issue: " + err.message),
      });
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
        <Button className="rounded-xl h-10" onClick={() => {
          setEditingIssue(null);
          setTitle("");
          setDescription("");
          setIssueType("Bug / Problem");
          setPriority("Medium");
          setClientId("none");
          setIsDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-1" />
          {isClient ? "Raise Issue" : "Report Issue"}
        </Button>
      }
    >
      <div className="card-soft p-4 sm:p-5">
        {allIssues.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isClient && (activeClients.length > 0 || clientMembers.length > 0) && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Client</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    
                    {clientMembers.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Invited Clients
                      </div>
                    )}
                    {clientMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown"}
                      </SelectItem>
                    ))}

                    {activeClients.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                        Business Clients
                      </div>
                    )}
                    {activeClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {error ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center text-red-500">
            <AlertOctagon className="h-10 w-10 text-red-500/40" />
            <p className="text-sm font-semibold">Error loading issues</p>
            <pre className="text-xs max-w-lg whitespace-pre-wrap">{error.message || JSON.stringify(error)}</pre>
          </div>
        ) : isLoading ? (
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
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
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
                        <td className="px-3 py-3 text-foreground/80">
                          <div className="font-medium">{raisedBy}</div>
                          {issue.client_name && <div className="text-[10px] text-primary uppercase tracking-widest mt-1">{issue.client_name}</div>}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <Badge className="rounded-full border-0 bg-muted text-foreground/70">{issue.issue_type}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`rounded-full border-0 ${PRIORITY_TONE[issue.priority]}`}>{issue.priority}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        {!isClient ? (
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_TONE[issue.status] || "bg-gray-100 text-gray-800"}`}
                          >
                            {["Open", "In Progress", "Completed", "Rejected", "Resolved"].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <Badge className={`rounded-full border-0 ${STATUS_TONE[issue.status] || "bg-gray-100"}`}>{issue.status}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground/70">
                        <div className="text-xs font-medium text-foreground">{dateStr}</div>
                        <div className="text-[10px] text-muted-foreground">{timeStr}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Edit"
                            onClick={() => handleEdit(issue)}
                            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground grid place-items-center"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(issue)}
                            className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-red-500 grid place-items-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {!isClient && issue.status !== "In Progress" && (
                            <button
                              title="Mark In Progress"
                              onClick={() => handleStatusChange(issue, "In Progress")}
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary grid place-items-center"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                          )}
                          {!isClient && issue.status !== "Resolved" && (
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIssue ? "Edit Issue" : isClient ? "Raise an Issue" : "Report an Issue"}</DialogTitle>
            <DialogDescription>
              {editingIssue 
                ? "Update the details of your issue below."
                : isClient
                  ? "Submit a new work request, report a problem, or share feedback."
                  : "Create a new issue on behalf of a client."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
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
            {!isClient && (activeClients.length > 0 || clientMembers.length > 0) && (
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific client</SelectItem>
                    
                    {clientMembers.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Invited Clients (Users)
                      </div>
                    )}
                    {clientMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown"}
                      </SelectItem>
                    ))}

                    {activeClients.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 border-t">
                        Business Clients
                      </div>
                    )}
                    {activeClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
