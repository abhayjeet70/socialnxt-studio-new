import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["employee", "client", "admin"]),
  agencyRole: z.string().optional(),
  workspaceId: z.string().uuid(),
});

const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["employee", "client", "admin"]),
  agencyRole: z.string().optional(),
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
        invited_agency_role: data.agencyRole || null,
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
              agency_role: data.agencyRole || null,
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

const deleteAccountSchema = z.object({
  userId: z.string().uuid(),
});

export const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteAccountSchema.parse(data))
  .handler(async ({ data }) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Missing Supabase admin credentials on server.");
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete user from auth (should cascade to workspace_members and users if foreign keys are set up)
    const { error } = await adminSupabase.auth.admin.deleteUser(data.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
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

    let userId: string;

    const { data: newUser, error } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      phone: data.phone,
      password: data.password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: data.name,
      },
    });

    if (error) {
      if (error.message.includes("already been registered") || error.message.includes("already exists")) {
        const { data: existingUser } = await adminSupabase
          .from("users")
          .select("id")
          .eq("email", data.email)
          .single();
          
        if (existingUser) {
          userId = existingUser.id;
          
          // Check if user is already in this workspace
          const { data: existingMember } = await adminSupabase
            .from("workspace_members")
            .select("id")
            .eq("workspace_id", data.workspaceId)
            .eq("user_id", userId)
            .single();

          if (existingMember) {
            throw new Error("User is already in this workspace.");
          }

          // Optional: Update their name in public.users if they provide a new one
          await adminSupabase.from("users").update({ full_name: data.name }).eq("id", userId);
        } else {
          throw new Error("User auth exists but public record missing. Please contact support.");
        }
      } else {
        throw new Error(error.message);
      }
    } else if (newUser?.user) {
      userId = newUser.user.id;
      // Update public.users table as well for new user
      await adminSupabase.from("users").update({ full_name: data.name }).eq("id", userId);
    } else {
      throw new Error("Failed to create user account.");
    }

    if (userId) {
      // Add user to workspace
      const { error: insertError } = await adminSupabase
        .from("workspace_members")
        .insert({
          workspace_id: data.workspaceId,
          user_id: userId,
          role: data.role,
          agency_role: data.agencyRole || null,
        });

      if (insertError) {
        throw new Error("Failed to add user to workspace: " + insertError.message);
      }
    }

    return { success: true, email: data.email };
  });
