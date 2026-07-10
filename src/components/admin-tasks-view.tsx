import { useState, useMemo } from "react";
import { useClients, usePosts, useWorkspaceMembers, Post, Client } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, AlertCircle, Search, ChevronRight } from "lucide-react";

export function AdminTasksView({ workspaceId, userId, isSMM, onClientClick }: { workspaceId: string, userId?: string, isSMM?: boolean, onClientClick: (clientName: string) => void }) {
  const { data: clients = [], isLoading: clientsLoading } = useClients(workspaceId);
  const { data: posts = [], isLoading: postsLoading } = usePosts(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("tasks_desc");

  if (clientsLoading || postsLoading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  // Filter out clients that are closed if needed, or show all active ones.
  // If SMM, only show clients they are assigned to
  const activeClients = clients
    .filter(c => c.status !== "Closed")
    .filter(c => !isSMM || c.team_assignments?.["Account/Social Media Manager"] === userId);

  // Get active tasks for a client
  const getClientTasks = (clientName: string) => {
    return posts.filter(p => (p.client_name || "").toLowerCase() === clientName.toLowerCase());
  };

  const getTeamNames = (client: Client, tasks: Post[]) => {
    const roles = ["Account/Social Media Manager", "Designer", "Video Editor"];
    const team: { name: string, role: string, id: string }[] = [];
    roles.forEach(role => {
      const id = client.team_assignments?.[role];
      if (id) {
        const m = members.find(x => x.user_id === id);
        const name = m?.users?.full_name || m?.users?.email?.split("@")[0] || "Unknown";
        let shortRole = role;
        if (role === "Account/Social Media Manager") shortRole = "Manager";
        team.push({ name, role: shortRole, id });
      }
    });

    tasks.forEach(t => {
      if (t.assigned_to && Array.isArray(t.assigned_to)) {
        t.assigned_to.forEach(id => {
          if (!team.find(x => x.id === id)) {
            const m = members.find(x => x.user_id === id);
            if (m) {
              const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
              const role = m.role === "admin" ? "Admin" : (m.agency_role || "Social Media Manager");
              team.push({ name, role, id });
            }
          }
        });
      }
    });

    return team;
  };

  const processedClients = activeClients.map(client => {
    const tasks = getClientTasks(client.name);
    const pendingTasks = tasks.filter(t => t.status !== "published");
    const nextScheduled = pendingTasks
      .filter(t => t.scheduled_for)
      .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime())[0];
    const team = getTeamNames(client, tasks);

    const publishedTasks = tasks.filter(t => t.status === "published");
    let progress = 0;
    const statusLower = (client.status || "").toLowerCase();
    
    if (statusLower.includes("plan")) {
      progress = 20;
    } else if (statusLower.includes("design") || statusLower.includes("draft")) {
      progress = 40;
    } else if (statusLower.includes("review") || statusLower.includes("approv")) {
      progress = 60;
    } else if (statusLower.includes("schedul")) {
      progress = 80;
    } else if (statusLower.includes("publish") || statusLower.includes("done")) {
      progress = 100;
    } else {
      progress = tasks.length === 0 ? 0 : Math.round((publishedTasks.length / tasks.length) * 100);
    }

    return {
      ...client,
      totalTasks: tasks.length,
      activeTasks: pendingTasks.length,
      publishedTasks: publishedTasks.length,
      progress,
      nextDate: nextScheduled?.scheduled_for ? new Date(nextScheduled.scheduled_for).getTime() : Infinity,
      nextDateString: nextScheduled?.scheduled_for ? new Date(nextScheduled.scheduled_for).toLocaleDateString() : "None",
      team,
    };
  });

  const filteredAndSorted = processedClients
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "tasks_desc") return b.activeTasks - a.activeTasks;
      if (sortBy === "tasks_asc") return a.activeTasks - b.activeTasks;
      if (sortBy === "date_asc") return a.nextDate - b.nextDate;
      if (sortBy === "alpha") return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients..." 
            className="pl-9 h-10 bg-muted/50 border-transparent focus-visible:bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 border-input">
              <SelectValue placeholder="Sort..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks_desc">Most Active Tasks</SelectItem>
              <SelectItem value="tasks_asc">Least Active Tasks</SelectItem>
              <SelectItem value="date_asc">Earliest Next Date</SelectItem>
              <SelectItem value="alpha">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredAndSorted.map(client => (
          <div 
            key={client.id} 
            onClick={() => onClientClick(client.name)}
            className="group flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl border border-border shadow-sm p-4 hover:shadow-md hover:border-primary/40 cursor-pointer transition-all"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate text-foreground group-hover:text-primary transition-colors">
                {client.name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary/70" />
                  <span>Next: {client.nextDateString}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Users className="h-4 w-4 text-primary/70 shrink-0" />
                  {client.team.length > 0 ? (
                    client.team.map((member, idx) => (
                      <span key={idx} className="bg-muted px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                        {member.name} <span className="text-muted-foreground opacity-75">({member.role})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No team assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[200px] flex flex-col justify-center px-4 md:px-8 border-t md:border-t-0 border-border pt-4 md:pt-0">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
                <span className="font-bold text-foreground">
                  {client.progress === 100 ? "Published" : `${client.progress}%`}
                  <span className="font-normal text-muted-foreground ml-1">({client.status})</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${client.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                  style={{ width: `${client.progress}%` }} 
                />
              </div>
              <div className="text-[10px] text-muted-foreground text-right mt-1">
                {client.publishedTasks} / {client.totalTasks} tasks published
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6">
              <div className="flex flex-col md:items-end">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Active Tasks</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary w-fit md:ml-auto font-bold text-sm px-3 py-0.5">
                  {client.activeTasks}
                </Badge>
              </div>
              <div className="hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-20 text-muted-foreground bg-white rounded-xl border border-dashed border-border">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No active clients match your filters.</p>
        </div>
      )}
    </div>
  );
}
