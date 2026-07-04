import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Calendar, ListTodo, Users2, Video,
  KanbanSquare, FileText, AlertOctagon, BarChart3, Settings,
  Search, Bell, ChevronDown, LogOut, Menu, X, Activity,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCurrentWorkspace, useUpdateProfile } from "@/lib/queries";
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
import { Loader2, LogOut as LogOutIcon, User } from "lucide-react";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/calendar", label: "Content Calendar", icon: Calendar },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/team", label: "Team", icon: Users2 },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/deals", label: "Deals", icon: KanbanSquare },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/issues", label: "Client Issues", icon: AlertOctagon },
  { to: "/activity-logs", label: "Activity Logs", icon: Activity },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ workspace, pathname, onNavClick }: {
  workspace: any;
  pathname: string;
  onNavClick?: () => void;
}) {
  const visibleNav = NAV.filter(item => {
    if (workspace?.role === "client") {
      return ["/", "/calendar", "/tasks", "/meetings", "/proposals", "/issues", "/activity-logs"].includes(item.to);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo — clickable, goes to dashboard */}
      <Link to="/" onClick={onNavClick} className="px-6 py-5 flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center text-primary-foreground font-bold shrink-0">
          {workspace?.workspaceName ? workspace.workspaceName[0].toUpperCase() : "W"}
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-base font-semibold tracking-tight text-white truncate max-w-[140px]" title={workspace?.workspaceName || "My Workspace"}>
            {workspace?.workspaceName || "My Workspace"}
          </div>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="px-3 pb-6 flex-1 overflow-y-auto">
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
                "group flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl text-sm transition-colors",
                active
                  ? "bg-sidebar-active/95 text-white shadow-[0_4px_14px_-4px_rgba(37,99,235,0.6)]"
                  : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white",
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

  return (
    <div className="min-h-screen w-full bg-[oklch(0.985_0.005_255)] flex">

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

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
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

            {/* Search bar */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients, tasks, proposals..."
                className="pl-9 h-10 bg-muted/60 border-transparent focus-visible:bg-white focus-visible:border-input rounded-xl"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button className="relative h-10 w-10 rounded-xl grid place-items-center hover:bg-muted transition-colors">
                <Bell className="h-[18px] w-[18px] text-foreground/80" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              </button>
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

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6 sm:flex sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information.</DialogDescription>
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
