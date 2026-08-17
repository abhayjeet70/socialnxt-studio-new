import { supabase } from "@/lib/supabase";

type Role = "employee" | "client" | "admin";

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body,
  });

  if (error) {
    // supabase-js only gives a generic "non-2xx status code" message here — the
    // actual { error: "..." } body we return from the Edge Function is on
    // error.context (a Response), so read it to surface the real reason.
    let message = error.message || "Admin request failed.";
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === "function") {
      try {
        const body = await response.clone().json();
        if (body?.error) message = String(body.error);
      } catch {
        // response wasn't JSON — fall back to the generic message
      }
    }
    throw new Error(message);
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
