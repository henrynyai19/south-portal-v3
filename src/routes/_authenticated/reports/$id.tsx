import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, FileDown, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { deleteReportWithAttachments } from "@/lib/report-delete";
import { getAccessibleReportDetail } from "@/lib/report-admin";
import { exportSingleReportToExcel, exportSingleReportToPdf } from "@/lib/exporters";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAccessibleReportDetail({ data: { reportId: id } });
      setReport(data.report);
      setAttachments(data.attachments);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This report is no longer available or your account does not have access to it.");
      navigate({ to: "/reports", replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const remove = async () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteReportWithAttachments(id);
      toast.success("Report deleted");
      navigate({ to: "/reports" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete report");
    } finally {
      setDeleting(false);
    }
  };

  const downloadAttachment = async (attachment: any) => {
    const { data, error } = await supabase.storage
      .from("report-attachments")
      .createSignedUrl(attachment.storage_path, 60);
    if (error || !data) return toast.error("Could not generate link");
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!report) return <p className="text-sm text-muted-foreground">Redirecting to reports...</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportSingleReportToPdf(report, attachments)}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportSingleReportToExcel(report, attachments)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <StatusBadge status={report.status} />
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-xl">
            {report.churches?.name ?? "—"} · {report.departments?.name ?? "—"}
          </CardTitle>
          <CardDescription className="text-xs">
            {report.units?.name ? `${report.units.name} · ` : ""}
            {report.reporting_period ?? "Report"} · Week {report.week_number ?? "—"} ·{" "}
            {formatDate(report.report_date)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <CompactSection
            title="General Information"
            data={{
              Church: report.churches?.name ?? "—",
              Department: report.departments?.name ?? "—",
              Unit: report.units?.name ?? "—",
              "Reporting Period": report.reporting_period ?? "—",
              "Week #": report.week_number ?? "—",
              Month: report.month ?? "—",
              Year: report.year ?? "—",
              "Report Date": formatDate(report.report_date),
              Status: report.status === "approved" ? "Published" : report.status?.replace("_", " ") ?? "—",
              "Submitted By": report.profiles?.full_name ?? report.profiles?.email ?? "—",
            }}
          />

          <CompactSection
            title="Submission Timeline"
            data={{
              "Submitted At": formatDateTime(report.submitted_at),
              "Published At": formatDateTime(report.approved_at),
              "Reviewed At": formatDateTime(report.reviewed_at),
              "Last Updated": formatDateTime(report.updated_at),
              "Report ID": report.id,
            }}
          />

          {Array.isArray(report.custom_fields) && report.custom_fields.length > 0 ? (
            <CustomFieldsSection fields={report.custom_fields} />
          ) : (
            <>
              <Section
                title="Membership Statistics"
                data={{
                  "Total Attendance": report.total_attendance,
                  Male: report.male_attendance,
                  Female: report.female_attendance,
                  Children: report.children_attendance,
                  "First Timers": report.first_timers,
                  "New Converts": report.new_converts,
                  "Holy Ghost Receivers": report.holy_ghost_receivers,
                  "Active Members": report.active_members,
                }}
              />
              <Section
                title="Cell Ministry"
                data={{
                  Cells: report.num_cells,
                  "Meetings Held": report.cell_meetings_held,
                  "Avg Attendance": report.avg_cell_attendance,
                  "Active Leaders": report.active_cell_leaders,
                }}
              />
              <Section
                title="Evangelism"
                data={{
                  Outreaches: report.num_outreaches,
                  "Souls Reached": report.souls_reached,
                  "Souls Won": report.souls_won,
                  "Follow-Ups": report.follow_ups,
                }}
              />
              <Section
                title="Finance"
                data={{
                  Offering: fmtMoney(report.offering_amount),
                  Partnership: fmtMoney(report.partnership_amount),
                  "Special Giving": fmtMoney(report.special_giving),
                }}
              />
              <Section
                title="Programs"
                data={{
                  "Programs Held": report.programs_held,
                  "Special Events": report.special_events,
                  "Outreach Programs": report.outreach_programs,
                  "Prayer Meetings": report.prayer_meetings,
                }}
              />
            </>
          )}

          {report.notes && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Notes</h4>
              <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                {report.notes}
              </p>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Attachments ({attachments.length})</h4>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => downloadAttachment(attachment)}
                    className="flex items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-accent"
                  >
                    {attachment.file_type?.startsWith("image/") ? (
                      <ImageIcon className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{attachment.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(attachment.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {report.status === "rejected" && report.rejection_reason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span className="font-semibold">Rejected:</span> {report.rejection_reason}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Button variant="destructive" onClick={remove} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete Report"}
        </Button>
      )}
    </div>
  );
}

function CompactSection({ title, data }: { title: string; data: Record<string, any> }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-primary">{title}</h4>
      <div className="grid gap-x-4 gap-y-2 rounded-xl border border-white/25 bg-muted/30 p-3 text-sm md:grid-cols-2 dark:border-white/10">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="grid min-w-0 gap-1 sm:grid-cols-[120px_1fr] sm:gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key}</div>
            <div className="min-w-0 break-words font-medium">{value ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, data }: { title: string; data: Record<string, any> }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-primary">{title}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="rounded-xl bg-muted/50 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">{value ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomFieldsSection({ fields }: { fields: Array<{ label?: string; value?: string; type?: string }> }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-primary">Report Details</h4>
      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        {fields.map((field, index) => (
          <div key={`${field.label ?? "field"}-${index}`} className="rounded-xl bg-muted/50 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {field.label || `Field ${index + 1}`}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm font-semibold">
              {formatCustomFieldValue(field)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtMoney(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCustomFieldValue(field: { value?: string; type?: string }) {
  if (!field.value) return "—";
  if (field.type === "money") return fmtMoney(Number(field.value));
  if (field.type === "date") return formatDate(field.value);
  return field.value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "PPP");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "PPp");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-warning/20 text-warning-foreground",
    under_review: "bg-primary/15 text-primary",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label = status === "approved" ? "Published" : status.replace("_", " ");
  return <Badge className={(map[status] ?? "bg-muted") + " border-0 capitalize"}>{label}</Badge>;
}
