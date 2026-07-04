import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Plus, IndianRupee, Calendar as CalIcon, User as UserIcon, Loader2, Trash2, GripVertical } from "lucide-react";
import { useCurrentWorkspace, useDeals, useCreateDeal, useUpdateDealStage, useDeleteDeal, useClients } from "@/lib/queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/deals")({
  head: () => ({ meta: [{ title: "Deals — SocialNxt CRM" }] }),
  component: DealsPage,
});

const STAGES = ["New", "Planning", "Design", "Editing", "Review", "Completed"] as const;
const STAGE_COLOR: Record<string, string> = {
  New: "#64748B",
  Planning: "#F59E0B",
  Design: "#8B5CF6",
  Editing: "#06B6D4",
  Review: "#EC4899",
  Completed: "#10B981",
};

function DealsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: deals = [], isLoading } = useDeals(workspace?.workspaceId);
  const { data: clients = [] } = useClients(workspace?.workspaceId);
  const createDeal = useCreateDeal();
  const updateStage = useUpdateDealStage();
  const deleteDeal = useDeleteDeal();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");

  // Drag state
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragCardId = useRef<string | null>(null);
  const dragFromStage = useRef<string | null>(null);

  const isClient = workspace?.role === "client";
  const canEdit = !isClient;

  const visibleDeals = isClient
    ? deals.filter((d) =>
        d.client_name?.toLowerCase() === workspace?.userEmail?.split("@")[0]?.toLowerCase() ||
        d.client_name?.toLowerCase() === workspace?.userFullName?.toLowerCase()
      )
    : deals;

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      await createDeal.mutateAsync({
        workspace_id: workspace.workspaceId,
        created_by: workspace.userId,
        client_name: clientName,
        project_name: projectName,
        amount: Number(amount),
        days,
        stage: "New",
      });
      toast.success("Deal created successfully!");
      setIsDialogOpen(false);
      setClientName("");
      setProjectName("");
      setAmount("");
      setDays("");
    } catch (err: any) {
      toast.error("Failed to create deal: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this deal? This cannot be undone.")) return;
    try {
      await deleteDeal.mutateAsync({ id });
      toast.success("Deal deleted.");
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  // ── Drag handlers ──
  const handleDragStart = (e: React.DragEvent, dealId: string, stage: string) => {
    dragCardId.current = dealId;
    dragFromStage.current = stage;
    e.dataTransfer.effectAllowed = "move";
    // Ghost image will be the card itself via browser default
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = dragCardId.current;
    const fromStage = dragFromStage.current;
    if (!id || fromStage === targetStage) return;
    updateStage.mutate(
      { id, stage: targetStage },
      {
        onSuccess: () => toast.success(`Moved to ${targetStage}`),
        onError: (err: any) => toast.error(err.message),
      }
    );
    dragCardId.current = null;
    dragFromStage.current = null;
  };

  const handleDragEnd = () => {
    setDragOverStage(null);
    dragCardId.current = null;
    dragFromStage.current = null;
  };

  return (
    <AppShell
      title="Deals"
      subtitle="Kanban view of every active project across stages."
      actions={
        canEdit && (
          <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl h-10">
            <Plus className="h-4 w-4 mr-2" /> Add Deal
          </Button>
        )
      }
    >
      <div className="overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[280px] gap-4 min-w-full pb-2">
          {STAGES.map((stage) => {
            const items = visibleDeals.filter((d) => d.stage === stage);
            const total = items.reduce((s, d) => s + d.amount, 0);
            const isOver = dragOverStage === stage;

            return (
              <div
                key={stage}
                className={`rounded-2xl p-3 transition-colors ${
                  isOver ? "bg-primary/5 ring-2 ring-primary/30" : "bg-muted/40"
                }`}
                onDragOver={canEdit ? (e) => handleDragOver(e, stage) : undefined}
                onDrop={canEdit ? (e) => handleDrop(e, stage) : undefined}
                onDragLeave={() => setDragOverStage(null)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_COLOR[stage] }} />
                    <span className="text-sm font-semibold">{stage}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">₹{(total / 1000).toFixed(0)}k</span>
                </div>

                {/* Drop zone hint */}
                {isOver && items.length === 0 && (
                  <div className="mb-2 border-2 border-dashed border-primary/40 rounded-xl h-16 flex items-center justify-center text-xs text-primary/60">
                    Drop here
                  </div>
                )}

                {/* Deal cards */}
                <div className="space-y-2.5">
                  {items.map((d) => {
                    const ownerName = d.users?.full_name || d.users?.email?.split("@")[0] || "Unknown";
                    return (
                      <div
                        key={d.id}
                        draggable={canEdit}
                        onDragStart={canEdit ? (e) => handleDragStart(e, d.id, stage) : undefined}
                        onDragEnd={canEdit ? handleDragEnd : undefined}
                        className={`card-soft p-3.5 relative group transition-all ${
                          canEdit ? "cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95" : ""
                        }`}
                        style={{
                          borderTop: `3px solid ${STAGE_COLOR[stage]}`,
                        }}
                      >
                        {/* Drag handle + client name row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {canEdit && (
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                            )}
                            <div className="text-xs text-muted-foreground truncate">{d.client_name}</div>
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              title="Delete deal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="font-semibold text-sm mt-0.5 leading-snug">{d.project_name}</div>
                        <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {d.amount.toLocaleString("en-IN")}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {ownerName.split(" ")[0]}</span>
                          <span className="flex items-center gap-1"><CalIcon className="h-3 w-3" /> {d.days}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Drop zone hint when column has cards */}
                  {isOver && items.length > 0 && (
                    <div className="border-2 border-dashed border-primary/40 rounded-xl h-10 flex items-center justify-center text-xs text-primary/60">
                      Drop here
                    </div>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => setIsDialogOpen(true)}
                      className="w-full text-xs text-muted-foreground hover:text-primary py-2 rounded-xl border border-dashed border-border hover:border-primary/40 transition-colors"
                    >
                      + Add deal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Deal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Deal</DialogTitle>
            <DialogDescription>Add a new project to your deals pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Select value={clientName} onValueChange={setClientName} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type of Work / Project Name</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} required placeholder="e.g. Website Redesign" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="e.g. 50000" />
              </div>
              <div className="space-y-2">
                <Label>Days / Duration</Label>
                <Input value={days} onChange={(e) => setDays(e.target.value)} required placeholder="e.g. 14 Days" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createDeal.isPending}>
              {createDeal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Deal
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
