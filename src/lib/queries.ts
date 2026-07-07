import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Post = {
  id: string;
  workspace_id: string;
  author_id: string;
  content: string | null;
  content_type: string | null;
  topic: string | null;
  platform: string | null;
  platforms: string[] | null;
  client_name: string | null;
  reference_content: string[] | null;
  completed_work: string[] | null;
  media_urls: string[] | null;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "published" | "failed";
  scheduled_for: string | null;
  published_at: string | null;
  assigned_to?: string[] | null;
  created_at: string;
  updated_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
};

export type SocialAccount = {
  id: string;
  platform: "facebook" | "instagram" | "linkedin" | "twitter" | "tiktok";
  account_name: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Meeting = {
  id: string;
  workspace_id: string;
  agenda: string;
  meet_link: string;
  scheduled_at: string;
  created_by: string;
  created_at: string;
  users?: Partial<User>; // author info via join
};

export type Deal = {
  id: string;
  workspace_id: string;
  client_name: string;
  project_name: string;
  amount: number;
  days: string;
  stage: string;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at?: string;
  users?: Partial<User>;
};

export type DashboardStats = {
  totalPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
  pendingApprovals: number;
  draftPosts: number;
  connectedAccounts: number;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch all posts for the first workspace the current user belongs to */
export function usePosts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["posts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });
}

/** Fetch the social accounts connected to a workspace */
export function useSocialAccounts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["social_accounts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id, platform, account_name")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data as SocialAccount[];
    },
  });
}

/** Resolve the current Supabase user and their first workspace */
export function useCurrentWorkspace() {
  return useQuery({
    queryKey: ["current_workspace"],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(id, name)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (error) throw error;
      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Unknown";
      
      return {
        workspaceId: data.workspace_id as string,
        role: data.role as string,
        workspaceName: (data.workspaces as unknown as { name: string })?.name ?? "My Workspace",
        userId: user.id,
        userEmail: user.email,
        userFullName: fullName,
        userInitials: fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      };
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspace_id, name }: { workspace_id: string; name: string }) => {
      const { error } = await supabase
        .from("workspaces")
        .update({ name })
        .eq("id", workspace_id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current_workspace"] });
    },
  });
}

/** Derive dashboard summary stats from raw posts + accounts */
export function useDashboardStats(workspaceId: string | undefined): DashboardStats {
  const { data: posts = [] } = usePosts(workspaceId);
  const { data: accounts = [] } = useSocialAccounts(workspaceId);

  return {
    totalPosts: posts.length,
    scheduledPosts: posts.filter((p) => p.status === "scheduled").length,
    publishedPosts: posts.filter((p) => p.status === "published").length,
    pendingApprovals: posts.filter((p) => p.status === "pending_approval").length,
    draftPosts: posts.filter((p) => p.status === "draft").length,
    connectedAccounts: accounts.length,
  };
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (post: Partial<Post> & { workspace_id: string; author_id: string }) => {
      const { data, error } = await supabase.from("posts").insert(post).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts", variables.workspace_id] });
    },
  });
}

export function useUpdatePostStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, workspace_id, approved_by, approved_at }: { id: string; status: string; workspace_id: string; approved_by?: string; approved_at?: string }) => {
      const updates: any = { status };
      if (approved_by !== undefined) updates.approved_by = approved_by;
      if (approved_at !== undefined) updates.approved_at = approved_at;
      const { data, error } = await supabase.from("posts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts", variables.workspace_id] });
    },
  });
}

/** Helper to upload a file to Supabase Storage */
export async function uploadMediaFile(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("post_media")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("post_media")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export function useUpdatePostDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Post> }) => {
      const { data, error } = await supabase.from("posts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate everything to be safe
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export type WorkspaceMember = {
  id: string; // workspace_members.id
  role: "admin" | "employee" | "client";
  user_id: string;
  created_at: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

/** Fetch all members of a workspace with their user profiles */
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, role, user_id, created_at, users(id, email, full_name, avatar_url)")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data as unknown as WorkspaceMember[];
    },
  });
}
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspace_id, user_id }: { workspace_id: string; user_id: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_members", variables.workspace_id] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, full_name }: { user_id: string; full_name: string }) => {
      // Update public.users
      const { error: dbError } = await supabase
        .from("users")
        .update({ full_name })
        .eq("id", user_id);
      if (dbError) throw dbError;

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name }
      });
      if (authError) throw authError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current_workspace"] });
      queryClient.invalidateQueries({ queryKey: ["workspace_members"] });
    },
  });
}

export function useMeetings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["meetings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, users(id, full_name, email)")
        .eq("workspace_id", workspaceId!)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Meeting[];
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meeting: Partial<Meeting> & { workspace_id: string; created_by: string }) => {
      const { data, error } = await supabase.from("meetings").insert(meeting).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings", variables.workspace_id] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id }: { id: string; workspace_id: string }) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings", variables.workspace_id] });
    },
  });
}

// --------------------------------------------------------
// DEALS
// --------------------------------------------------------

export function useDeals(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["deals", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, users(id, full_name, email)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Deal[];
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deal: Partial<Deal> & { workspace_id: string; created_by: string }) => {
      const { data, error } = await supabase.from("deals").insert(deal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals", variables.workspace_id] });
    },
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const updates: any = { stage };
      if (stage === "Completed") {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_graph"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      const finalUpdates = { ...updates };
      const { error } = await supabase.from("deals").update(finalUpdates).eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_graph"] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_graph"] });
    },
  });
}

// --------------------------------------------------------
// DASHBOARD GRAPHS
// --------------------------------------------------------

export function useRevenueGraph(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["revenue_graph", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("amount, completed_at")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "Completed")
        .not("completed_at", "is", null);
      
      if (error) throw error;

      // Group by month
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      // Initialize last 6 months with 0 revenue
      const now = new Date();
      const revenueByMonth: Record<string, number> = {};
      const order: string[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = months[d.getMonth()];
        revenueByMonth[monthName] = 0;
        order.push(monthName);
      }

      data.forEach(deal => {
        const date = new Date(deal.completed_at);
        const monthName = months[date.getMonth()];
        if (revenueByMonth[monthName] !== undefined) {
          // Convert amount to thousands (K)
          revenueByMonth[monthName] += (deal.amount / 1000);
        }
      });

      return order.map(month => ({
        month,
        revenue: Math.round(revenueByMonth[month])
      }));
    },
  });
}

// --------------------------------------------------------
// ISSUES
// --------------------------------------------------------

export type Issue = {
  id: string;
  workspace_id: string;
  raised_by: string;
  title: string;
  description: string | null;
  issue_type: "New Work Request" | "Bug / Problem" | "Feedback";
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved";
  client_id?: string | null;
  created_at: string;
  users?: Partial<User>;
};

export function useIssues(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["issues", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*, users(id, full_name, email)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Issue[];
    },
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (issue: Partial<Issue> & { workspace_id: string; raised_by: string }) => {
      const { data, error } = await supabase.from("issues").insert(issue).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["issues", variables.workspace_id] });
    },
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("issues").update({ status }).eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

// --------------------------------------------------------
// CLIENTS
// --------------------------------------------------------

export type Client = {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  industry: string | null;
  platforms: string[] | null;
  status: string;
  created_at: string;
  closed_at?: string | null;
  close_reason?: string | null;
};

export function useClients(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["clients", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: Partial<Client> & { workspace_id: string; name: string }) => {
      const { data, error } = await supabase.from("clients").insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", variables.workspace_id] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, workspace_id }: { id: string; updates: Partial<Client>; workspace_id: string }) => {
      const { data, error } = await supabase.from("clients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", variables.workspace_id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id }: { id: string; workspace_id: string }) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", variables.workspace_id] });
    },
  });
}

// --------------------------------------------------------
// PROPOSALS
// --------------------------------------------------------

export type Proposal = {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  client_name: string;
  amount: number;
  status: "Draft" | "Sent" | "Approved" | "Rejected";
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function uploadProposalPDF(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("proposal_pdfs").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("proposal_pdfs").getPublicUrl(path);
  return data.publicUrl;
}

export function useProposals(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["proposals", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Proposal[];
    },
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposal: Partial<Proposal> & { workspace_id: string; created_by: string; title: string; client_name: string; amount: number }) => {
      const { data, error } = await supabase.from("proposals").insert(proposal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.workspace_id] });
    },
  });
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, workspace_id, proposal }: { id: string; status: string; workspace_id: string; proposal?: Proposal }) => {
      // 1. Update proposal status
      const { error } = await supabase
        .from("proposals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // 2. If approved → create a New deal so they can start work
      if (status === "Approved" && proposal) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("deals").insert({
            workspace_id,
            client_name: proposal.client_name,
            project_name: proposal.title,
            amount: proposal.amount,
            days: "30",
            stage: "New",
            created_by: user.id,
          });
        }
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals", variables.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["deals", variables.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ["revenue_graph", variables.workspace_id] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
