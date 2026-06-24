import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

async function assertMainAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "main_admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only Main Admin can create portal users.");
}

export const createPortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createPortalUserSchema)
  .handler(async ({ context, data }) => {
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
