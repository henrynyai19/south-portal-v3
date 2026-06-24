import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export async function deleteReportWithAttachments(reportId: string) {
  const { data: attachments, error: attachmentError } = await supabase
    .from("report_attachments")
    .select("storage_path")
    .eq("report_id", reportId);

  if (attachmentError) throw attachmentError;

  const storagePaths = (attachments ?? [])
    .map((attachment) => attachment.storage_path)
    .filter(Boolean);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("report-attachments")
      .remove(storagePaths);

    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("reports").delete().eq("id", reportId);
  if (error) throw error;

  await logAudit("report.delete", "report", reportId);
}
