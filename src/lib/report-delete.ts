import { deleteReportAsMainAdmin } from "@/lib/report-admin";

export async function deleteReportWithAttachments(reportId: string) {
  await deleteReportAsMainAdmin({ data: { reportId } });
}
