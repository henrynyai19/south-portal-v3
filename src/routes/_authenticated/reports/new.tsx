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
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Plus, Save, Send, Trash2 } from "lucide-react";
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

type CustomField = {
  id: string;
  label: string;
  value: string;
  type: "text" | "number" | "money" | "date" | "long_text";
};

const createCustomField = (): CustomField => ({
  id: crypto.randomUUID(),
  label: "",
  value: "",
  type: "text",
});

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
    custom_fields: [createCustomField()],
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

  const updateCustomField = (id: string, patch: Partial<CustomField>) =>
    setForm({
      ...form,
      custom_fields: form.custom_fields.map((field: CustomField) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    });

  const addCustomField = () =>
    setForm({ ...form, custom_fields: [...form.custom_fields, createCustomField()] });

  const removeCustomField = (id: string) =>
    setForm({
      ...form,
      custom_fields:
        form.custom_fields.length > 1
          ? form.custom_fields.filter((field: CustomField) => field.id !== id)
          : [createCustomField()],
    });

  const save = async (asDraft: boolean) => {
    if (!user) return;
    setSaving(true);
    const customFields = (form.custom_fields as CustomField[])
      .map(({ id: _id, label, value, type }) => ({
        label: label.trim(),
        value: value.trim(),
        type,
      }))
      .filter((field) => field.label || field.value);

    const payload = {
      ...form,
      custom_fields: customFields,
      submitted_by: user.id,
      status: asDraft ? "draft" : "approved",
      submitted_at: asDraft ? null : new Date().toISOString(),
      approved_at: asDraft ? null : new Date().toISOString(),
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

    toast.success(asDraft ? "Saved as draft" : "Report submitted and published");
    navigate({ to: "/reports/$id", params: { id: data.id } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">New Report</h2>
          <p className="text-sm text-muted-foreground">
            Create a flexible department report with only the fields that matter for this submission.
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

      <Card>
        <CardHeader>
          <CardTitle>Custom Report Details</CardTitle>
          <CardDescription>
            Add the exact fields this department or unit needs. You can mix numbers, dates,
            currency, short text, and longer written updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.custom_fields.map((field: CustomField, index: number) => (
            <div
              key={field.id}
              className="glass-panel-soft grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_160px_1.5fr_auto]"
            >
              <div className="grid gap-1.5">
                <Label>Field name</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                  placeholder={index === 0 ? "e.g. Program summary" : "e.g. Number of attendees"}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) =>
                    updateCustomField(field.id, { type: value as CustomField["type"], value: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="money">Money</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="long_text">Long text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Value</Label>
                {field.type === "long_text" ? (
                  <Textarea
                    rows={3}
                    value={field.value}
                    onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                    placeholder="Enter the report detail"
                  />
                ) : (
                  <Input
                    type={
                      field.type === "number" || field.type === "money"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
                    min={field.type === "number" || field.type === "money" ? 0 : undefined}
                    step={field.type === "money" ? "0.01" : undefined}
                    value={field.value}
                    onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                    placeholder="Enter value"
                  />
                )}
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Remove custom field"
                  onClick={() => removeCustomField(field.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addCustomField}>
            <Plus className="mr-2 h-4 w-4" />
            Add another field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & Attachments</CardTitle>
          <CardDescription>Add supporting context and evidence where needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
              placeholder="Add context, highlights, prayer requests..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
