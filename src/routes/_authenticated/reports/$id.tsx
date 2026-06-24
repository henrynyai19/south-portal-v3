import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { deleteReportWithAttachments } from "@/lib/report-delete";

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

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*, churches(name), departments(name), units(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      navigate({ to: "/reports", replace: true });
      return;
    }
    if (!data) {
      toast.error("This report is no longer available or your account does not have access to it.");
      setLoading(false);
      navigate({ to: "/reports", replace: true });
      return;
    }
    let submitterProfile: { full_name: string | null; email: string | null } | null = null;
    if (data.submitted_by) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", data.submitted_by)
        .maybeSingle();

      if (profileError) {
        console.error("[report detail] could not load submitter profile", profileError);
      } else {
        submitterProfile = profile;
      }
    }

    setReport({ ...data, profiles: submitterProfile });
    const { data: atts } = await supabase.from("report_attachments").select("*").eq("report_id", id);
    setAttachments(atts ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);

  const remove = async () => {
    if (!confirm("Delete this report?")) return;
    try {
      await deleteReportWithAttachments(id);
      toast.success("Deleted");
      navigate({ to: "/reports" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete report");
    }
  };

  const downloadAttachment = async (a: any) => {
    const { data, error } = await supabase.storage.from("report-attachments").createSignedUrl(a.storage_path, 60);
    if (error || !data) return toast.error("Could not generate link");
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!report) return <p className="text-sm text-muted-foreground">Redirecting to reports...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/reports"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <StatusBadge status={report.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{report.churches?.name ?? "—"} · {report.departments?.name ?? "—"}</CardTitle>
          <CardDescription>
            {report.units?.name ? `${report.units.name} · ` : ""}{report.reporting_period} · Week {report.week_number ?? "—"} · {format(new Date(report.report_date), "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-xs text-muted-foreground">Submitted by {report.profiles?.full_name ?? report.profiles?.email}</div>

          <Section title="Membership Statistics" data={{
            "Total Attendance": report.total_attendance, "Male": report.male_attendance, "Female": report.female_attendance, "Children": report.children_attendance,
            "First Timers": report.first_timers, "New Converts": report.new_converts, "Holy Ghost Receivers": report.holy_ghost_receivers, "Active Members": report.active_members,
          }} />
          <Section title="Cell Ministry" data={{ "Cells": report.num_cells, "Meetings Held": report.cell_meetings_held, "Avg Attendance": report.avg_cell_attendance, "Active Leaders": report.active_cell_leaders }} />
          <Section title="Evangelism" data={{ "Outreaches": report.num_outreaches, "Souls Reached": report.souls_reached, "Souls Won": report.souls_won, "Follow-Ups": report.follow_ups }} />
          <Section title="Finance" data={{ "Offering": fmtMoney(report.offering_amount), "Partnership": fmtMoney(report.partnership_amount), "Special Giving": fmtMoney(report.special_giving) }} />
          <Section title="Programs" data={{ "Programs Held": report.programs_held, "Special Events": report.special_events, "Outreach Programs": report.outreach_programs, "Prayer Meetings": report.prayer_meetings }} />

          {report.notes && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Notes</h4>
              <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-muted-foreground">{report.notes}</p>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Attachments ({attachments.length})</h4>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {attachments.map((a) => (
                  <button key={a.id} onClick={() => downloadAttachment(a)} className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-accent">
                    {a.file_type?.startsWith("image/") ? <ImageIcon className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.file_name}</div>
                      <div className="text-xs text-muted-foreground">{(a.file_size / 1024).toFixed(1)} KB</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {report.status === "rejected" && report.rejection_reason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span className="font-semibold">Rejected:</span> {report.rejection_reason}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Button variant="destructive" onClick={remove}>Delete Report</Button>
      )}
    </div>
  );
}

function Section({ title, data }: { title: string; data: Record<string, any> }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-primary">{title}</h4>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted/50 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">{v ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtMoney(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
