import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/lib/auth";

const createPortalUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["main_admin", "sub_admin", "submitter"]),
  assignment: z
    .object({
      scope: z.enum(["church", "department", "unit"]),
      churchId: z.string().uuid().optional(),
      departmentId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
    })
    .optional(),
});

const deletePortalUserSchema = z.object({
  userId: z.string().uuid(),
});

export async function assertMainAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "main_admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only Main Admin can manage portal users.");
}

export const createPortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data: rawData }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const data = createPortalUserSchema.parse(rawData);

    await assertMainAdmin(context.userId);

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();
    const phone = data.phone?.trim() || null;

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError) {
      throw new Error(createError.message);
    }

    const userId = created.user?.id;
    if (!userId) {
      throw new Error("Supabase did not return a user ID for the new account.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      phone,
      is_active: true,
    });

    if (profileError) throw new Error(profileError.message);

    const { error: roleDeleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (roleDeleteError) throw new Error(roleDeleteError.message);

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.role as AppRole,
    });

    if (roleError) throw new Error(roleError.message);

    if (data.assignment) {
      const assignment =
        data.assignment.scope === "unit"
          ? {
              user_id: userId,
              scope: "unit" as const,
              unit_id: data.assignment.unitId,
            }
          : data.assignment.scope === "department"
            ? {
                user_id: userId,
                scope: "department" as const,
                department_id: data.assignment.departmentId,
              }
            : {
                user_id: userId,
                scope: "church" as const,
                church_id: data.assignment.churchId,
              };

      if (
        (assignment.scope === "unit" && !assignment.unit_id) ||
        (assignment.scope === "department" && !assignment.department_id) ||
        (assignment.scope === "church" && !assignment.church_id)
      ) {
        throw new Error("Selected assignment is incomplete.");
      }

      const { error: assignmentError } = await supabaseAdmin
        .from("user_assignments")
        .insert(assignment);

      if (assignmentError) throw new Error(assignmentError.message);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "user.create",
      entity_type: "user",
      entity_id: userId,
      details: {
        email,
        role: data.role,
        assignment: data.assignment ?? null,
      },
    });

    if (auditError) {
      console.error("[createPortalUser] audit insert failed", auditError);
    }

    return { id: userId, email, fullName, role: data.role };
  });

export const deletePortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data: rawData }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const data = deletePortalUserSchema.parse(rawData);

    await assertMainAdmin(context.userId);

    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own Main Admin login while signed in.");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", data.userId)
      .maybeSingle();

    const cleanupAccess = async () => {
      const { error: assignmentError } = await supabaseAdmin
        .from("user_assignments")
        .delete()
        .eq("user_id", data.userId);

      if (assignmentError) {
        console.error("[deletePortalUser] assignment cleanup failed", {
          userId: data.userId,
          message: assignmentError.message,
        });
        throw new Error(assignmentError.message);
      }

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId);

      if (roleError) {
        console.error("[deletePortalUser] role cleanup failed", {
          userId: data.userId,
          message: roleError.message,
        });
        throw new Error(roleError.message);
      }

      const { error: notificationError } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", data.userId);

      if (notificationError) {
        console.error("[deletePortalUser] notification cleanup failed", {
          userId: data.userId,
          message: notificationError.message,
        });
      }
    };

    await cleanupAccess();

    let deletionMode: "deleted" | "access_revoked" = "deleted";
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (deleteError) {
      deletionMode = "access_revoked";
      console.error("[deletePortalUser] auth delete failed; revoking access instead", {
        userId: data.userId,
        message: deleteError.message,
      });

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ban_duration: "876000h",
        user_metadata: {
          deleted_from_portal: true,
          deleted_at: new Date().toISOString(),
        },
      });

      if (banError) {
        console.error("[deletePortalUser] auth ban failed", {
          userId: data.userId,
          message: banError.message,
        });
        throw new Error(
          `Could not fully delete this user because they have existing records, and access revocation failed: ${banError.message}`,
        );
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: false })
        .eq("id", data.userId);

      if (profileError) {
        console.error("[deletePortalUser] profile deactivation failed", {
          userId: data.userId,
          message: profileError.message,
        });
        throw new Error(profileError.message);
      }
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "user.delete",
      entity_type: "user",
      entity_id: data.userId,
      details: {
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        mode: deletionMode,
        note:
          deletionMode === "access_revoked"
            ? "Auth user was retained because historical records reference it; roles and assignments were removed and login access was banned."
            : null,
      },
    });

    if (auditError) {
      console.error("[deletePortalUser] audit insert failed", auditError);
    }

    return { id: data.userId, mode: deletionMode };
  });
