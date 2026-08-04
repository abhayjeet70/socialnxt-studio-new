import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "create" | "invite" | "delete";

type CreateBody = {
  action: "create";
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "employee" | "client" | "admin";
  agencyRole?: string;
  workspaceId: string;
};

type InviteBody = {
  action: "invite";
  email: string;
  role: "employee" | "client" | "admin";
  agencyRole?: string;
  workspaceId: string;
  redirectTo?: string;
};

type DeleteBody = {
  action: "delete";
  userId: string;
};

type Body = CreateBody | InviteBody | DeleteBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const body = (await req.json()) as Body;
    if (!body?.action) {
      return json({ error: "Missing action." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (body.action === "create" || body.action === "invite") {
      const allowed = await assertWorkspaceAdmin(
        admin,
        user.id,
        body.workspaceId,
      );
      if (!allowed) {
        return json({ error: "Only workspace admins can manage members." }, 403);
      }
    }

    if (body.action === "create") {
      return await handleCreate(admin, body);
    }
    if (body.action === "invite") {
      return await handleInvite(admin, body);
    }
    if (body.action === "delete") {
      return await handleDelete(admin, user.id, body);
    }

    return json({ error: `Unknown action: ${(body as { action: Action }).action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertWorkspaceAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string,
  workspaceId: string,
) {
  const { data } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role === "admin";
}

async function handleCreate(
  admin: ReturnType<typeof createClient>,
  data: CreateBody,
) {
  let userId: string | undefined;

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.name,
      phone: data.phone,
    },
  });

  if (error) {
    if (
      error.message.includes("already been registered") ||
      error.message.includes("already exists")
    ) {
      const { data: existingUser } = await admin
        .from("users")
        .select("id")
        .eq("email", data.email)
        .single();

      if (!existingUser) {
        throw new Error(
          "User auth exists but public record missing. Please contact support.",
        );
      }

      userId = existingUser.id;

      const { data: existingMember } = await admin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        throw new Error("User is already in this workspace.");
      }

      await admin.from("users").update({ full_name: data.name }).eq("id", userId);
    } else {
      throw new Error(error.message);
    }
  } else if (newUser?.user) {
    userId = newUser.user.id;
    await admin.from("users").update({ full_name: data.name }).eq("id", userId);
  } else {
    throw new Error("Failed to create user account.");
  }

  const { error: insertError } = await admin.from("workspace_members").insert({
    workspace_id: data.workspaceId,
    user_id: userId,
    role: data.role,
    agency_role: data.agencyRole || null,
  });

  if (insertError) {
    throw new Error("Failed to add user to workspace: " + insertError.message);
  }

  return json({ success: true, email: data.email });
}

async function handleInvite(
  admin: ReturnType<typeof createClient>,
  data: InviteBody,
) {
  const redirectTo = data.redirectTo || undefined;

  const { error } = await admin.auth.admin.inviteUserByEmail(data.email, {
    data: {
      invited_workspace_id: data.workspaceId,
      invited_role: data.role,
      invited_agency_role: data.agencyRole || null,
    },
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (error) {
    if (
      error.message.includes("already been registered") ||
      error.message.includes("already exists")
    ) {
      const { data: existingUser } = await admin
        .from("users")
        .select("id")
        .eq("email", data.email)
        .single();

      if (existingUser) {
        const { error: insertError } = await admin
          .from("workspace_members")
          .insert({
            workspace_id: data.workspaceId,
            user_id: existingUser.id,
            role: data.role,
            agency_role: data.agencyRole || null,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            throw new Error("This user is already in the workspace!");
          }
          throw new Error("Failed to add existing user: " + insertError.message);
        }

        return json({
          success: true,
          email: data.email,
          message: "User already had an account and was added directly!",
        });
      }
    }
    throw new Error(error.message);
  }

  return json({ success: true, email: data.email });
}

async function handleDelete(
  admin: ReturnType<typeof createClient>,
  requesterId: string,
  data: DeleteBody,
) {
  const { data: memberships } = await admin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", data.userId);

  if (!memberships?.length) {
    throw new Error("User is not in any workspace.");
  }

  for (const membership of memberships) {
    const allowed = await assertWorkspaceAdmin(
      admin,
      requesterId,
      membership.workspace_id,
    );
    if (!allowed) {
      return json({ error: "Only workspace admins can delete members." }, 403);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(data.userId);
  if (error) {
    throw new Error(error.message);
  }

  return json({ success: true });
}
