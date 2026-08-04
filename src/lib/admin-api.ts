import { supabase } from "@/lib/supabase";

type Role = "employee" | "client" | "admin";

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body,
  });

  if (error) {
    throw new Error(error.message || "Admin request failed.");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as T;
}

export async function createAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  agencyRole?: string;
  workspaceId: string;
}) {
  return invokeAdminUsers<{ success: true; email: string }>({
    action: "create",
    ...input,
  });
}

export async function sendInvite(input: {
  email: string;
  role: Role;
  agencyRole?: string;
  workspaceId: string;
  redirectTo?: string;
}) {
  const redirectTo =
    input.redirectTo ||
    (typeof window !== "undefined" ? `${window.location.origin}/login` : undefined);

  return invokeAdminUsers<{ success: true; email: string; message?: string }>({
    action: "invite",
    ...input,
    redirectTo,
  });
}

export async function deleteAccount(input: { userId: string }) {
  return invokeAdminUsers<{ success: true }>({
    action: "delete",
    ...input,
  });
}
