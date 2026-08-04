import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

import { Dashboard } from "@/routes/index";
import { LoginPage } from "@/routes/login";
import { OnboardingPage } from "@/routes/onboarding";
import { ClientsPage } from "@/routes/clients";
import { ClientDetailPage } from "@/routes/clients_.$clientId";
import { TasksPage } from "@/routes/tasks";
import { ApprovalsPage } from "@/routes/approvals";
import { CalendarPage } from "@/routes/calendar";
import { MediaPage } from "@/routes/media";
import { MeetingsPage } from "@/routes/meetings";
import { DealsPage } from "@/routes/deals";
import { ProposalsPage } from "@/routes/proposals";
import { QuotationsPage } from "@/routes/quotations";
import { IssuesPage } from "@/routes/issues";
import { ReportsPage } from "@/routes/reports";
import { TeamPage } from "@/routes/team";
import { SettingsPage } from "@/routes/settings";
import { ActivityLogsPage } from "@/routes/activity-logs";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <>{children}</>;
}

function useWorkspaceMembership() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  return useQuery({
    queryKey: ["workspace-membership", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId!)
        .limit(1)
        .maybeSingle();
      return data?.workspace_id ?? null;
    },
  });
}

function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireWorkspace() {
  const { data, isLoading, isFetching } = useWorkspaceMembership();
  if (isLoading || isFetching) return <FullScreenLoader />;
  if (!data) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

function OnboardingGate() {
  const { data, isLoading, isFetching } = useWorkspaceMembership();
  if (isLoading || isFetching) return <FullScreenLoader />;
  if (data) return <Navigate to="/" replace />;
  return <Outlet />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  // Supabase invite/recovery links create a temporary session and must stay on
  // /login so the user can set their password.
  const isAuthCallback =
    typeof window !== "undefined" &&
    (window.location.hash.includes("type=invite") ||
      window.location.hash.includes("type=recovery"));
  if (loading) return <FullScreenLoader />;
  if (session && !isAuthCallback) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Page title="Sign in - SocialNxt CRM">
              <LoginPage />
            </Page>
          </PublicOnly>
        }
      />

      <Route element={<RequireAuth />}>
        <Route element={<OnboardingGate />}>
          <Route
            path="/onboarding"
            element={
              <Page title="Setup Your Workspace — SocialNxt">
                <OnboardingPage />
              </Page>
            }
          />
        </Route>

        <Route element={<RequireWorkspace />}>
          <Route
            path="/"
            element={
              <Page title="Dashboard — SocialNxt CRM">
                <Dashboard />
              </Page>
            }
          />
          <Route
            path="/clients"
            element={
              <Page title="Clients — SocialNxt CRM">
                <ClientsPage />
              </Page>
            }
          />
          <Route
            path="/clients/:clientId"
            element={
              <Page title="Client — SocialNxt CRM">
                <ClientDetailPage />
              </Page>
            }
          />
          <Route
            path="/tasks"
            element={
              <Page title="Tasks & Content Sheet — SocialNxt">
                <TasksPage />
              </Page>
            }
          />
          <Route
            path="/calendar"
            element={
              <Page title="Content Calendar — SocialNxt CRM">
                <CalendarPage />
              </Page>
            }
          />
          <Route
            path="/approvals"
            element={
              <Page title="Approvals — SocialNxt CRM">
                <ApprovalsPage />
              </Page>
            }
          />
          <Route
            path="/media"
            element={
              <Page title="Media Library — SocialNxt">
                <MediaPage />
              </Page>
            }
          />
          <Route
            path="/meetings"
            element={
              <Page title="Meetings — SocialNxt CRM">
                <MeetingsPage />
              </Page>
            }
          />
          <Route
            path="/deals"
            element={
              <Page title="Project Tracker — SocialNxt CRM">
                <DealsPage />
              </Page>
            }
          />
          <Route
            path="/proposals"
            element={
              <Page title="Proposals — SocialNxt CRM">
                <ProposalsPage />
              </Page>
            }
          />
          <Route
            path="/quotations"
            element={
              <Page title="Quotations — SocialNxt CRM">
                <QuotationsPage />
              </Page>
            }
          />
          <Route
            path="/issues"
            element={
              <Page title="Client Issues — SocialNxt CRM">
                <IssuesPage />
              </Page>
            }
          />
          <Route
            path="/reports"
            element={
              <Page title="Reports — SocialNxt CRM">
                <ReportsPage />
              </Page>
            }
          />
          <Route
            path="/team"
            element={
              <Page title="Team — SocialNxt CRM">
                <TeamPage />
              </Page>
            }
          />
          <Route
            path="/settings"
            element={
              <Page title="Settings — SocialNxt CRM">
                <SettingsPage />
              </Page>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <Page title="Activity Logs — SocialNxt CRM">
                <ActivityLogsPage />
              </Page>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
