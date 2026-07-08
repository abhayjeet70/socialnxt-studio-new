import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["employee", "client", "admin"]),
  workspaceId: z.string().uuid(),
});

const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["employee", "client", "admin"]),
  workspaceId: z.string().uuid(),
});

export const sendInvite = createServerFn({ method: "POST" })
  .validator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data }) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Missing Supabase admin credentials on server.");
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await adminSupabase.auth.admin.inviteUserByEmail(data.email, {
      data: {
        invited_workspace_id: data.workspaceId,
        invited_role: data.role,
      },
      redirectTo: "http://localhost:3000/login",
    });

    if (error) {
      if (error.message.includes("already been registered") || error.message.includes("already exists")) {
        // The user exists, so let's just add them to the workspace directly!
        const { data: existingUser } = await adminSupabase
          .from("users")
          .select("id")
          .eq("email", data.email)
          .single();

        if (existingUser) {
          const { error: insertError } = await adminSupabase
            .from("workspace_members")
            .insert({
              workspace_id: data.workspaceId,
              user_id: existingUser.id,
              role: data.role,
            });
            
          if (insertError) {
            // If they are already in the workspace, it might throw a unique constraint error
            if (insertError.code === '23505') {
              throw new Error("This user is already in the workspace!");
            }
            throw new Error("Failed to add existing user: " + insertError.message);
          }
          return { success: true, email: data.email, message: "User already had an account and was added directly!" };
        }
      }
      throw new Error(error.message);
    }

    return { success: true, email: data.email };
  });

export const createAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => createAccountSchema.parse(data))
  .handler(async ({ data }) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Missing Supabase admin credentials on server.");
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (newUser?.user) {
      // Add user to workspace
      const { error: insertError } = await adminSupabase
        .from("workspace_members")
        .insert({
          workspace_id: data.workspaceId,
          user_id: newUser.user.id,
          role: data.role,
        });

      if (insertError) {
        throw new Error("User created but failed to add to workspace: " + insertError.message);
      }

      // Update public.users table as well
      await adminSupabase.from("users").update({ full_name: data.name }).eq("id", newUser.user.id);
    }

    return { success: true, email: data.email };
  });
