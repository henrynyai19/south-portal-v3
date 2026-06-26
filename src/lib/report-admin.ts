import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertMainAdmin } from "@/lib/user-admin";

const deleteReportSchema = z.object({
  reportId: z.string().uuid(),
});

const getReportSchema = z.object({
  reportId: z.string().uuid(),
});

async function canOpenReport(userId: string, report: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (report.submitted_by === userId) return true;

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) throw new Error(rolesError.message);

  const roleNames = (roles ?? []).map((role) => role.role);
  if (roleNames.includes("main_admin")) return true;
  if (!roleNames.includes("sub_admin")) return false;

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from("user_assignments")
    .select("scope, church_id, department_id, unit_id")
    .eq("user_id", userId);

  if (assignmentsError) throw new Error(assignmentsError.message);

  return (assignments ?? []).some((assignment) => {
    if (assignment.scope === "unit") {
      return assignment.unit_id && assignment.unit_id === report.unit_id;
    }
    if (assignment.scope === "department") {
      return assignment.department_id && assignment.department_id === report.department_id;
    }
    if (assignment.scope === "church") {
      return assignment.church_id && assignment.church_id === report.church_id;
    }
    return false;
  });
}

export const getAccessibleReportDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data: rawData }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const data = getReportSchema.parse(rawData);

    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*, churches(name), departments(name), units(name)")
      .eq("id", data.reportId)
      .maybeSingle();

    if (reportError) throw new Error(reportError.message);
    if (!report) throw new Error("Report not found.");

    const allowed = await canOpenReport(context.userId, report);
    if (!allowed) {
      throw new Error("You do not have access to this report.");
    }

    const [{ data: profile, error: profileError }, { data: attachments, error: attachmentError }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("full_name, email")
          .eq("id", report.submitted_by)
          .maybeSingle(),
        supabaseAdmin.from("report_attachments").select("*").eq("report_id", data.reportId),
      ]);

    if (profileError) {
      console.error("[getAccessibleReportDetail] profile lookup failed", profileError);
    }
    if (attachmentError) throw new Error(attachmentError.message);

    return {
      report: { ...report, profiles: profile ?? null },
      attachments: attachments ?? [],
    };
  });

export const deleteReportAsMainAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data: rawData }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const data = deleteReportSchema.parse(rawData);

    await assertMainAdmin(context.userId);

    const { data: attachments, error: attachmentError } = await supabaseAdmin
      .from("report_attachments")
      .select("storage_path")
      .eq("report_id", data.reportId);

    if (attachmentError) throw new Error(attachmentError.message);

    const storagePaths = (attachments ?? [])
      .map((attachment) => attachment.storage_path)
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("report-attachments")
        .remove(storagePaths);

      if (storageError) {
        console.error("[deleteReportAsMainAdmin] storage cleanup failed", {
          reportId: data.reportId,
          message: storageError.message,
        });
      }
    }

    const { error: attachmentDeleteError } = await supabaseAdmin
      .from("report_attachments")
      .delete()
      .eq("report_id", data.reportId);

    if (attachmentDeleteError) {
      console.error("[deleteReportAsMainAdmin] attachment row cleanup failed", {
        reportId: data.reportId,
        message: attachmentDeleteError.message,
      });
      throw new Error(attachmentDeleteError.message);
    }

    const { data: deletedReport, error: deleteError } = await supabaseAdmin
      .from("reports")
      .delete()
      .eq("id", data.reportId)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      console.error("[deleteReportAsMainAdmin] report delete failed", {
        reportId: data.reportId,
        message: deleteError.message,
      });
      throw new Error(deleteError.message);
    }
    if (!deletedReport) {
      throw new Error("Report not found or already deleted.");
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "report.delete",
      entity_type: "report",
      entity_id: data.reportId,
    });

    if (auditError) {
      console.error("[deleteReportAsMainAdmin] audit insert failed", auditError);
    }

    return { id: data.reportId };
  });
