import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Save, Send } from "lucide-react";
import { fetchAllChurchOptions } from "@/lib/churches";
import { format, getISOWeek } from "date-fns";

export const Route = createFileRoute("/_authenticated/reports/new")({
  component: NewReportPage,
});

const NUMERIC_FIELDS = [
  "total_attendance",
  "male_attendance",
  "female_attendance",
  "children_attendance",
  "first_timers",
  "new_converts",
  "holy_ghost_receivers",
  "active_members",
  "num_cells",
  "cell_meetings_held",
  "avg_cell_attendance",
  "active_cell_leaders",
  "num_outreaches",
  "souls_reached",
  "souls_won",
  "follow_ups",
  "programs_held",
  "special_events",
  "outreach_programs",
  "prayer_meetings",
] as const;

const MONEY_FIELDS = ["offering_amount", "partnership_amount", "special_giving"] as const;

function NewReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const today = new Date();
  const [form, setForm] = useState<any>({
    church_id: "",
    department_id: "",
    unit_id: "",
    reporting_period: "weekly",
    week_number: getISOWeek(today),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    report_date: format(today, "yyyy-MM-dd"),
    notes: "",
    ...Object.fromEntries(NUMERIC_FIELDS.map((k) => [k, 0])),
    ...Object.fromEntries(MONEY_FIELDS.map((k) => [k, 0])),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAllChurchOptions(),
      supabase.from("departments").select("id,name").order("name"),
      supabase.from("units").select("id,name").order("name"),
    ]).then(([c, d, u]) => {
      setChurches(c);
      setDepts((d.data ?? []) as any);
      setUnits((u.data ?? []) as any);
    });
  }, []);

  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });
  const updNum = (k: string, v: string) => setForm({ ...form, [k]: v === "" ? 0 : Number(v) });

  const save = async (asDraft: boolean) => {
    if (!user) return;
    setSaving(true);
    const payload = {
      ...form,
      submitted_by: user.id,
      status: asDraft ? "draft" : "submitted",
      submitted_at: asDraft ? null : new Date().toISOString(),
      church_id: form.church_id || null,
      department_id: form.department_id || null,
      unit_id: form.unit_id || null,
      week_number: form.week_number || null,
      month: form.month || null,
    };
    const { data, error } = await supabase.from("reports").insert(payload).select("id").single();
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Upload attachments
    for (const f of files) {
      const path = `${data.id}/${Date.now()}_${f.name}`;
      const up = await supabase.storage.from("report-attachments").upload(path, f);
      if (up.error) {
        toast.error(`Upload failed: ${f.name}`);
        continue;
      }
      await supabase.from("report_attachments").insert({
        report_id: data.id,
        uploaded_by: user.id,
        storage_path: path,
        file_name: f.name,
        file_type: f.type,
        file_size: f.size,
      });
    }

    await logAudit(asDraft ? "report.save_draft" : "report.submit", "report", data.id);

    // Notify admins (best-effort)
    if (!asDraft) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "main_admin");
      if (admins) {
        for (const a of admins) {
          await supabase
            .from("notifications")
            .insert({
              user_id: a.user_id,
              title: "New report submitted",
              body: "A report awaits your review.",
              type: "report",
              link: `/reports/${data.id}`,
            })
            .then(
              () => {},
              () => {},
            );
        }
      }
    }

    toast.success(asDraft ? "Saved as draft" : "Report submitted");
    navigate({ to: "/reports/$id", params: { id: data.id } });
  };

  const numField = (
    k: (typeof NUMERIC_FIELDS)[number] | (typeof MONEY_FIELDS)[number],
    label: string,
  ) => (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={form[k]} onChange={(e) => updNum(k, e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">New Report</h2>
          <p className="text-sm text-muted-foreground">
            Capture ministry activity and submit for review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={() => save(false)} disabled={saving}>
            <Send className="mr-2 h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Identify the church, department, unit and reporting period.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Church</Label>
            <Select value={form.church_id} onValueChange={(v) => upd("church_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select church" />
              </SelectTrigger>
              <SelectContent>
                {churches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Department</Label>
            <Select value={form.department_id} onValueChange={(v) => upd("department_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Unit</Label>
            <Select value={form.unit_id} onValueChange={(v) => upd("unit_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Reporting Period</Label>
            <Select value={form.reporting_period} onValueChange={(v) => upd("reporting_period", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Week #</Label>
            <Input
              type="number"
              min={1}
              max={53}
              value={form.week_number}
              onChange={(e) => updNum("week_number", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Month</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={form.month}
              onChange={(e) => updNum("month", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Year</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => updNum("year", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Report Date</Label>
            <Input
              type="date"
              value={form.report_date}
              onChange={(e) => upd("report_date", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="membership">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="cells">Cells</TabsTrigger>
          <TabsTrigger value="evangelism">Evangelism</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="membership">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-4">
              {numField("total_attendance", "Total Attendance")}
              {numField("male_attendance", "Male")}
              {numField("female_attendance", "Female")}
              {numField("children_attendance", "Children")}
              {numField("first_timers", "First Timers")}
              {numField("new_converts", "New Converts")}
              {numField("holy_ghost_receivers", "Holy Ghost Receivers")}
              {numField("active_members", "Active Members")}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cells">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-4">
              {numField("num_cells", "# Cells")}
              {numField("cell_meetings_held", "Cell Meetings Held")}
              {numField("avg_cell_attendance", "Avg Cell Attendance")}
              {numField("active_cell_leaders", "Active Cell Leaders")}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="evangelism">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-4">
              {numField("num_outreaches", "# Outreaches")}
              {numField("souls_reached", "Souls Reached")}
              {numField("souls_won", "Souls Won")}
              {numField("follow_ups", "Follow-Ups")}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finance">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              {numField("offering_amount", "Offering")}
              {numField("partnership_amount", "Partnership")}
              {numField("special_giving", "Special Giving")}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="programs">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-4">
              {numField("programs_held", "Programs Held")}
              {numField("special_events", "Special Events")}
              {numField("outreach_programs", "Outreach Programs")}
              {numField("prayer_meetings", "Prayer Meetings")}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attachments">
          <Card>
            <CardContent className="space-y-3 p-6">
              <Label>Supporting evidence (images, PDFs)</Label>
              <Input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>
              )}
              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => upd("notes", e.target.value)}
                  placeholder="Add context, highlights, prayer requests…"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
