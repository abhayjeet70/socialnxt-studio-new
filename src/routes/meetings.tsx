import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Plus, Video, Calendar as CalIcon, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentWorkspace, useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting, useWorkspaceMembers, useClients } from "@/lib/queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — SocialNxt CRM" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: allMeetings = [], isLoading } = useMeetings(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: clients = [] } = useClients(workspace?.workspaceId);
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [agenda, setAgenda] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [participantType, setParticipantType] = useState<string>("whole_team");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isClient = workspace?.role === "client";
  const canCreate = workspace?.role === "admin" || workspace?.role === "employee";

  // Clients only see meetings tagged to them; admins/employees see all
  const meetings = isClient
    ? allMeetings.filter((m) => {
        const pIds = (m as any).participant_ids || [];
        return pIds.includes(workspace?.userId) || (m as any).client_id === workspace?.userId;
      })
    : allMeetings;

  const closedNames = new Set(clients.filter(c => c.status === "Closed").map(c => c.name.toLowerCase()));
  const closedEmails = new Set(clients.filter(c => c.status === "Closed" && c.email).map(c => c.email!.toLowerCase()));

  const activeClients = clients.filter(c => c.status !== "Closed");

  // Only show client members in the picker
  const clientMembers = members.filter((m) => {
    if (m.role !== "client") return false;
    const name = m.users?.full_name || m.users?.email?.split("@")[0];
    const email = m.users?.email?.toLowerCase();
    const isClosedByName = name && closedNames.has(name.toLowerCase());
    const isClosedByEmail = email && closedEmails.has(email);
    return !isClosedByName && !isClosedByEmail;
  });
  const teamMembers = members.filter((m) => m.role === "employee" || m.role === "admin");

  const allAvailableClients = [
    ...clientMembers.map(m => ({ id: m.user_id, label: m.users?.full_name || m.users?.email || m.user_id })),
    ...activeClients.map(c => ({ id: c.id, label: c.name + (c.email ? ` (${c.email})` : "") }))
  ];

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) > now);
  const completed = meetings.filter((m) => new Date(m.scheduled_at) <= now);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    
    const scheduled_at = new Date(`${date}T${time}`).toISOString();

    try {
      if (editingMeeting) {
        await updateMeeting.mutateAsync({
          id: editingMeeting.id,
          workspace_id: workspace.workspaceId,
          updates: {
            agenda,
            meet_link: meetLink,
            scheduled_at,
            participant_type: "custom",
            participant_ids: participantIds,
          }
        });
        toast.success("Meeting updated!");
      } else {
        await createMeeting.mutateAsync({
          workspace_id: workspace.workspaceId,
          created_by: workspace.userId,
          agenda,
          meet_link: meetLink,
          scheduled_at,
          participant_type: "custom",
          participant_ids: participantIds,
        } as any);
        toast.success("Meeting scheduled!");
      }
      
      setIsDialogOpen(false);
      setEditingMeeting(null);
      setAgenda("");
      setMeetLink("");
      setDate("");
      setTime("");
      setParticipantIds([]);
    } catch (err: any) {
      toast.error(`Failed to ${editingMeeting ? 'update' : 'schedule'}: ` + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!workspace) return;
    setDeletingId(id);
    try {
      await deleteMeeting.mutateAsync({ id, workspace_id: workspace.workspaceId });
      toast.success("Meeting deleted.");
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell
      title="Meetings"
      subtitle="Upcoming syncs and past client conversations."
      actions={
        canCreate && (
          <Button onClick={() => {
            setEditingMeeting(null);
            setAgenda("");
            setMeetLink("");
            setDate("");
            setTime("");
            setParticipantIds([]);
            setIsDialogOpen(true);
          }} className="rounded-xl h-10">
            <Plus className="h-4 w-4 mr-2" /> Schedule Meeting
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-4 max-w-5xl">
        <div className="space-y-6">
          {/* ── Upcoming ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Upcoming meetings</h2>
              <Badge variant="secondary" className="rounded-full">{upcoming.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.length === 0 && !isLoading && (
                <div className="text-sm text-muted-foreground italic">No upcoming meetings.</div>
              )}
              {upcoming.map((m) => {
                const dateObj = new Date(m.scheduled_at);
                const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const displayTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                const organizer = m.users?.full_name || m.users?.email?.split('@')[0] || "Unknown";
                const isDeleting = deletingId === m.id;

                return (
                  <div key={m.id} className="card-soft lift p-5 relative">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Video className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{m.agenda}</div>
                        <div className="text-xs text-muted-foreground truncate">Scheduled by {organizer}</div>
                      </div>
                      <Badge className="rounded-full bg-primary/10 text-primary border-0 shrink-0">Upcoming</Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-foreground/70">
                      <span className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" /> {displayDate}</span>
                      <span>{displayTime}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={() => window.open(m.meet_link, "_blank")} className="rounded-xl h-9 flex-1">
                        Join Meeting
                      </Button>
                      {canCreate && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                            onClick={() => {
                              setEditingMeeting(m);
                              setAgenda(m.agenda);
                              setMeetLink(m.meet_link || "");
                              
                              // Handle date parsing safely in case scheduled_at is invalid
                              try {
                                const d = new Date(m.scheduled_at);
                                setDate(d.toISOString().split("T")[0]);
                                setTime(d.toTimeString().slice(0, 5));
                              } catch(e) {}
                              
                              setParticipantIds((m as any).participant_ids || []);
                              setIsDialogOpen(true);
                            }}
                            title="Edit meeting"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shrink-0"
                            onClick={() => handleDelete(m.id)}
                            disabled={isDeleting}
                            title="Delete meeting"
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Completed ── */}
          <section>
            <h2 className="text-sm font-semibold mb-3">Completed meetings</h2>
            <div className="card-soft divide-y divide-border">
              {completed.length === 0 && !isLoading && (
                <div className="p-4 text-sm text-muted-foreground italic">No completed meetings.</div>
              )}
              {completed.map((m) => {
                const dateObj = new Date(m.scheduled_at);
                const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const isDeleting = deletingId === m.id;
                
                return (
                  <div key={m.id} className="p-4 flex items-center gap-3 group">
                    <div className="h-9 w-9 rounded-xl bg-muted grid place-items-center text-muted-foreground shrink-0">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{m.agenda}</div>
                      <div className="text-xs text-muted-foreground truncate">{displayDate}</div>
                    </div>
                    <Badge className="rounded-full bg-[#10B981]/10 text-[#047857] border-0 shrink-0">Completed</Badge>
                    {canCreate && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={isDeleting}
                        className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete meeting"
                      >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingMeeting(null);
      }}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Edit Meeting" : "Schedule Meeting"}</DialogTitle>
            <DialogDescription>{editingMeeting ? "Update the details for this meeting." : "Schedule a client sync, content review, or strategy call."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMeeting} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Meeting Agenda / Title</Label>
              <Input value={agenda} onChange={(e) => setAgenda(e.target.value)} required placeholder="e.g. Weekly Sync with Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} required placeholder="https://meet.google.com/..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Participants</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const allIds = [
                      ...teamMembers.map(m => m.user_id), 
                      ...allAvailableClients.map(c => c.id)
                    ];
                    if (participantIds.length === allIds.length) {
                      setParticipantIds([]); // Deselect all
                    } else {
                      setParticipantIds(allIds); // Select all
                    }
                  }}
                  className="h-8 text-xs hover:bg-muted/50"
                >
                  {participantIds.length > 0 ? "Toggle All" : "Select All"}
                </Button>
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Team Members</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teamMembers.map((m) => (
                      <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-border shadow-sm hover:shadow">
                        <Checkbox
                          checked={participantIds.includes(m.user_id)}
                          onCheckedChange={(c) => {
                            if (c) setParticipantIds([...participantIds, m.user_id]);
                            else setParticipantIds(participantIds.filter((id) => id !== m.user_id));
                          }}
                        />
                        <span className="truncate text-foreground/90 font-medium">{m.users?.full_name || m.users?.email || m.user_id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {allAvailableClients.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">Clients</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {allAvailableClients.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-border shadow-sm hover:shadow">
                        <Checkbox
                          checked={participantIds.includes(m.id)}
                          onCheckedChange={(c) => {
                            if (c) setParticipantIds([...participantIds, m.id]);
                            else setParticipantIds(participantIds.filter((id) => id !== m.id));
                          }}
                        />
                        <span className="truncate text-foreground/90 font-medium">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={createMeeting.isPending || updateMeeting.isPending}>
              {(createMeeting.isPending || updateMeeting.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingMeeting ? "Update Meeting" : "Schedule Meeting"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
