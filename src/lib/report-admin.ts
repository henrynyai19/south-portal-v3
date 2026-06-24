import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertMainAdmin } from "@/lib/user-admin";

const deleteReportSchema = z.object({
  reportId: z.string().uuid(),
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

      if (storageError) throw new Error(storageError.message);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("reports")
      .delete()
      .eq("id", data.reportId);

    if (deleteError) throw new Error(deleteError.message);

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
