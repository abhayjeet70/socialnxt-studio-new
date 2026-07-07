import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Loader2, Download, MoreHorizontal, ArchiveRestore, Trash2, Building2 } from "lucide-react";
import { useCurrentWorkspace, useClients, useUpdateClient, useDeleteClient } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/clients_/closed")({
  head: () => ({ meta: [{ title: "Closed Clients — SocialNxt CRM" }] }),
  component: ClosedClientsPage,
});

const CLIENT_AVATAR_COLORS = [
  "#2563EB", "#10B981", "#F59E0B", "#EC4899",
  "#8B5CF6", "#06B6D4", "#EF4444", "#0EA5E9",
];

function getClientAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % CLIENT_AVATAR_COLORS.length;
  return CLIENT_AVATAR_COLORS[idx];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ClosedClientsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: allClients = [], isLoading } = useClients(workspace?.workspaceId);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const isAdmin = workspace?.role === "admin" || workspace?.role === "employee";

  const [searchTerm, setSearchTerm] = useState("");

  // Only show closed clients
  const closedClients = allClients
    .filter((c) => c.status === "Closed")
    .filter((c) => {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });

  const handleReopen = (id: string, name: string) => {
    if (!workspace) return;
    updateClient.mutate(
      {
        id,
        workspace_id: workspace.workspaceId,
        updates: { status: "Planning", closed_at: null, close_reason: null },
      },
      {
        onSuccess: () => toast.success(`${name} has been re-opened.`),
        onError: (e) => toast.error("Failed: " + e.message),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    if (!workspace) return;
    deleteClient.mutate(
      { id, workspace_id: workspace.workspaceId },
      {
        onSuccess: () => toast.success(`${name} permanently deleted.`),
        onError: (e) => toast.error("Failed: " + e.message),
      }
    );
  };

  const handleExportCSV = () => {
    if (closedClients.length === 0) return toast.info("No closed clients to export.");
    const headers = "Client Name,Email,Industry,Date Closed,Close Reason,Platforms\n";
    const csv = closedClients.map((c) =>
      `"${c.name}","${c.email ?? ""}","${c.industry ?? ""}","${c.closed_at ? new Date(c.closed_at).toLocaleDateString() : ""}","${c.close_reason ?? ""}","${(c.platforms ?? []).join("; ")}"`
    ).join("\n");
    const blob = new Blob([headers + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `closed-clients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Closed clients exported as CSV");
  };

  return (
    <AppShell
      title="Closed Clients"
      subtitle="Clients whose contracts or projects have been completed or terminated."
      actions={
        <Button variant="outline" className="rounded-xl h-10 border-border" onClick={handleExportCSV} disabled={closedClients.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      }
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search closed clients…"
            className="pl-9 rounded-xl h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {closedClients.length} {closedClients.length === 1 ? "client" : "clients"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : closedClients.length === 0 ? (
        <div className="card-soft py-24 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <div className="text-base font-semibold text-foreground/60">No closed clients</div>
          <div className="text-sm text-muted-foreground mt-1">
            {searchTerm ? "No clients match your search." : "Clients you close will appear here."}
          </div>
        </div>
      ) : (
        <div className="card-soft overflow-hidden">
          <div className="overflow-x-auto -mx-px">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Industry</th>
                <th className="px-4 py-3 font-semibold">Date Closed</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Reason</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Platforms</th>
                {isAdmin && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {closedClients.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-xl grid place-items-center text-xs font-bold text-white shrink-0"
                        style={{ background: getClientAvatarColor(c.name) }}
                      >
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/70">{c.industry || "—"}</td>
                  <td className="px-4 py-3 text-foreground/70">
                    {c.closed_at
                      ? new Date(c.closed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground/70 max-w-[200px] truncate hidden md:table-cell" title={c.close_reason ?? ""}>
                    {c.close_reason || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(c.platforms ?? []).length > 0
                        ? c.platforms!.slice(0, 3).map((p) => (
                            <Badge key={p} variant="secondary" className="text-[10px] rounded-full px-2 py-0.5">{p}</Badge>
                          ))
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleReopen(c.id, c.name)} className="cursor-pointer text-[#10B981]">
                              <ArchiveRestore className="h-4 w-4 mr-2" /> Re-open Client
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(c.id, c.name)} className="cursor-pointer text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
