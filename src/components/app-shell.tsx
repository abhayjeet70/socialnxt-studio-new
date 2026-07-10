import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Calendar, ListTodo, Users2, Video,
  KanbanSquare, FileText, AlertOctagon, BarChart3, Settings,
  Search, Bell, ChevronDown, LogOut, Menu, X, Activity, Archive, Receipt, Images,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useCurrentWorkspace, useUpdateProfile, useClients, usePosts, useWorkspaceMembers, useIssues } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, LogOut as LogOutIcon, User, CheckCircle2 } from "lucide-react";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Client Management", icon: Users, exact: true },
  { to: "/calendar", label: "Content Calendar", icon: Calendar },
  { to: "/tasks", label: "Content Sheet", icon: ListTodo },
  { to: "/media", label: "Media Library", icon: Images },
  { to: "/team", label: "Team", icon: Users2 },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/deals", label: "Deals", icon: KanbanSquare },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/quotations", label: "Quotations", icon: Receipt },
  { to: "/issues", label: "Client Issues", icon: AlertOctagon },
  { to: "/activity-logs", label: "Activity Logs", icon: Activity },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

// Bottom tab bar — 5 most-used routes
const BOTTOM_TABS = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Clients", icon: Users, exact: true },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/tasks", label: "Content Sheet", icon: ListTodo },
];

function SidebarContent({ workspace, pathname, onNavClick }: {
  workspace: any;
  pathname: string;
  onNavClick?: () => void;
}) {
  const visibleNav = NAV.filter(item => {
    if (workspace?.role === "client") {
      return ["/", "/calendar", "/tasks", "/meetings", "/issues", "/activity-logs", "/proposals", "/quotations"].includes(item.to);
    }
    if (workspace?.role === "employee") {
      return !["/team", "/deals", "/proposals", "/quotations"].includes(item.to);
    }
    if (workspace?.role === "admin" && item.to === "/media") {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <Link to="/" onClick={onNavClick} className="px-6 py-6 flex flex-col items-center gap-3 hover:opacity-90 transition-opacity text-center">
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm">
          <img src={logo} alt="Logo" className="h-8 w-auto object-contain shrink-0" />
        </div>
        <div className="leading-tight min-w-0 mt-1 w-full">
          <div className="text-lg font-bold tracking-tight text-white truncate w-full" title={workspace?.workspaceName || "My Workspace"}>
            {workspace?.workspaceName || "My Workspace"}
          </div>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="px-3 pb-6 flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-sidebar-muted">Workspace</div>
        {visibleNav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavClick}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-white text-[#2a0a4a] font-semibold shadow-md"
                  : "text-sidebar-foreground/85 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 p-4">
        <Link to="/login" className="flex items-center gap-3 text-sm text-sidebar-muted hover:text-white">
          <LogOut className="h-4 w-4" /> Sign out
        </Link>
      </div>
    </div>
  );
}

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { data: workspace } = useCurrentWorkspace();
  const updateProfile = useUpdateProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: clients = [] } = useClients(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: posts = [] } = usePosts(workspace?.workspaceId);
  const { data: issues = [] } = useIssues(workspace?.workspaceId);

  const query = globalSearch.toLowerCase();
  
  const searchResults = query ? {
    clients: [
      ...clients.map(c => ({ id: c.id, name: c.name, desc: c.industry || "Client" })),
      ...members.filter(m => m.role === "client").map(m => {
        const name = m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown";
        return { id: m.user_id, name, desc: m.users?.email || "Workspace Client" };
      })
    ].filter(c => c.name.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query)),
    posts: posts.filter(p => (p.topic || "").toLowerCase().includes(query) || (p.client_name || "").toLowerCase().includes(query)),
  } : { clients: [], posts: [] };

  const hasResults = query && (searchResults.clients.length > 0 || searchResults.posts.length > 0);
  const showDropdown = searchFocused && query.length > 0;

  const recentActivities = [
    ...posts.slice(0, 5).map(p => ({
      ts: p.created_at || p.updated_at,
      who: p.client_name || "Someone",
      action: "added",
      subject: "Task " + (p.topic || ""),
      color: "bg-blue-100 text-blue-700",
      icon: ListTodo,
      link: "/tasks",
    })),
    ...posts.filter(p => p.updated_at && p.updated_at !== p.created_at).slice(0, 5).map(p => ({
      ts: p.updated_at,
      who: p.client_name || "Someone",
      action: p.status === "approved" ? "approved" : "updated",
      subject: "Task " + (p.topic || ""),
      color: p.status === "approved" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700",
      icon: p.status === "approved" ? CheckCircle2 : ListTodo,
      link: "/tasks",
    })),
    ...issues.slice(0, 5).map(i => ({
      ts: i.created_at || i.updated_at,
      who: i.client_name || "Someone",
      action: "reported",
      subject: "Issue " + (i.title || ""),
      color: "bg-red-100 text-red-700",
      icon: AlertOctagon,
      link: "/issues",
    })),
    ...issues.filter(i => i.updated_at && i.updated_at !== i.created_at).slice(0, 5).map(i => ({
      ts: i.updated_at,
      who: i.client_name || "Someone",
      action: i.status === "Resolved" ? "resolved" : "updated",
      subject: "Issue " + (i.title || ""),
      color: i.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700",
      icon: AlertOctagon,
      link: "/issues",
    }))
  ]
    .sort((a, b) => new Date(b.ts ?? 0).getTime() - new Date(a.ts ?? 0).getTime())
    .slice(0, 5);

  const handleEditProfile = () => {
    setEditName(workspace?.userFullName || "");
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.userId) return;
    try {
      await updateProfile.mutateAsync({ user_id: workspace.userId, full_name: editName });
      toast.success("Profile updated successfully!");
      setIsProfileOpen(false);
    } catch (err: any) {
      toast.error("Failed to update profile: " + err.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const SearchDropdown = ({ onClose }: { onClose?: () => void }) => (
    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-border rounded-xl shadow-lg z-50 max-h-[400px] overflow-y-auto p-2">
      {!hasResults ? (
        <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
      ) : (
        <div className="flex flex-col gap-2">
          {searchResults.clients.length > 0 && (
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clients</div>
              {searchResults.clients.map(c => (
                <Link key={c.id} to="/clients" onClick={onClose} className="block px-3 py-2 text-sm rounded-lg hover:bg-muted text-foreground transition-colors">
                  {c.name} <span className="text-muted-foreground ml-2 text-xs">{c.desc}</span>
                </Link>
              ))}
            </div>
          )}
          {searchResults.posts.length > 0 && (
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</div>
              {searchResults.posts.map(p => (
                <Link key={p.id} to="/tasks" onClick={onClose} className="block px-3 py-2 text-sm rounded-lg hover:bg-muted text-foreground transition-colors">
                  {p.topic || "Untitled Task"} <span className="text-muted-foreground ml-2 text-xs">for {p.client_name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen w-full bg-[oklch(0.985_0.005_255)] flex overflow-hidden">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col">
        <SidebarContent workspace={workspace} pathname={pathname} />
      </aside>

      {/* ── Mobile drawer overlay ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ───────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 lg:hidden transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 z-10 h-8 w-8 rounded-lg bg-white/10 grid place-items-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent workspace={workspace} pathname={pathname} onNavClick={() => setMobileMenuOpen(false)} />
      </aside>

      {/* ── Mobile search overlay ─────────────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => { setMobileSearchOpen(false); setGlobalSearch(""); }}>
          <div className="bg-white px-4 pt-4 pb-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search clients, tasks, proposals..."
                  className="pl-9 h-11 bg-muted/60 border-transparent focus-visible:bg-white focus-visible:border-input rounded-xl"
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                />
              </div>
              <button
                onClick={() => { setMobileSearchOpen(false); setGlobalSearch(""); }}
                className="text-sm font-medium text-primary px-2 py-2 shrink-0"
              >
                Cancel
              </button>
            </div>
            {showDropdown && (
              <div className="relative">
                <div className="mt-2 w-full bg-white border border-border rounded-xl shadow-lg max-h-[60vh] overflow-y-auto p-2">
                  <SearchDropdown onClose={() => { setMobileSearchOpen(false); setGlobalSearch(""); }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-border">
          <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-3">

            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden h-10 w-10 rounded-xl grid place-items-center hover:bg-muted transition-colors shrink-0"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5 text-foreground/80" />
            </button>

            {/* Logo text — mobile only, links to dashboard */}
            <Link to="/" className="lg:hidden font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
              SocialNxt
            </Link>

            {/* Desktop search bar */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients, tasks, proposals..."
                className="pl-9 h-10 bg-muted/60 border-transparent focus-visible:bg-white focus-visible:border-input rounded-xl"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              {showDropdown && <SearchDropdown />}
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {/* Mobile search icon */}
              <button
                className="sm:hidden h-10 w-10 rounded-xl grid place-items-center hover:bg-muted transition-colors"
                onClick={() => setMobileSearchOpen(true)}
              >
                <Search className="h-[18px] w-[18px] text-foreground/80" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative h-10 w-10 rounded-xl grid place-items-center hover:bg-muted transition-colors">
                    <Bell className="h-[18px] w-[18px] text-foreground/80" />
                    {recentActivities.length > 0 && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white grid place-items-center border-2 border-white">
                        {recentActivities.length}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="font-semibold text-sm">Notifications</div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {recentActivities.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No new notifications.</div>
                    ) : (
                      recentActivities.map((act, i) => (
                        <div key={i}>
                          <Link to={act.link} className="flex gap-3 px-4 py-3 hover:bg-muted transition-colors">
                            <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${act.color}`}>
                              <act.icon className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm leading-tight text-foreground/90">
                                <span className="font-semibold">{act.who}</span> {act.action} <span className="font-medium">{act.subject}</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">{act.ts ? new Date(act.ts).toLocaleString() : ""}</p>
                            </div>
                          </Link>
                          {i < recentActivities.length - 1 && <DropdownMenuSeparator className="my-0" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-border">
                    <Link to="/activity-logs" className="block text-center text-xs font-medium text-primary hover:underline py-1">View all activity</Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 pl-2 pr-3 h-10 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                    <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                      {workspace?.userInitials || "U"}
                    </div>
                    <div className="hidden md:block text-left leading-tight">
                      <div className="text-xs font-semibold">{workspace?.userFullName || "User"}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{workspace?.role || "Member"}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleEditProfile}>
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={handleSignOut}>
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 lg:py-8 pb-24 lg:pb-8">
          <div className="flex flex-row flex-wrap justify-between items-end gap-y-4 gap-x-8 mb-6">
            <div className="flex-1 min-w-[280px]">
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">{title}</h1>
              {/* Subtitle hidden on mobile to prevent layout overflow */}
              {subtitle && <p className="hidden sm:block mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="shrink-0 max-w-full overflow-x-auto pb-1">{actions}</div>}
          </div>
          {children}
        </main>

        {/* ── Bottom Tab Bar — mobile only ──────────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-border safe-area-bottom">
          <div className="flex items-stretch h-16">
            {BOTTOM_TABS.map((tab) => {
              const active = tab.exact ? pathname === tab.to : pathname === tab.to || pathname.startsWith(tab.to + "/");
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your name as it appears to clients and team members across SocialNxt.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input disabled value={workspace?.userEmail || ""} />
              <p className="text-xs text-muted-foreground">Email cannot be changed currently.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name</Label>
              <Input
                id="fullname"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
