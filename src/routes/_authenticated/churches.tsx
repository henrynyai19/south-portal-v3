import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { fetchAllChurches, type Church } from "@/lib/churches";

export const Route = createFileRoute("/_authenticated/churches")({
  component: ChurchesPage,
});

function ChurchesPage() {
  const { user, isAdmin, isSubAdmin } = useAuth();
  const canManageChurches = isAdmin || isSubAdmin;
  const [rows, setRows] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Church | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    region: "South Group",
    location: "",
    pastor_name: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchAllChurches());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load churches");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", code: "", region: "South Group", location: "", pastor_name: "" });
    setOpen(true);
  };
  const openEdit = (c: Church) => {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code ?? "",
      region: c.region ?? "",
      location: c.location ?? "",
      pastor_name: c.pastor_name ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      region: form.region.trim() || null,
      location: form.location.trim() || null,
      pastor_name: form.pastor_name.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("churches").update(payload).eq("id", editing.id);
        if (error) throw error;
        await logAudit("church.update", "church", editing.id, payload);
        toast.success("Church updated");
      } else {
        const createPayload = {
          ...payload,
          created_by: user?.id ?? null,
        };
        const { data, error } = await supabase
          .from("churches")
          .insert(createPayload)
          .select("id")
          .single();
        if (error) throw error;
        await logAudit("church.create", "church", data.id, createPayload);
        toast.success("Church created");
      }
      setOpen(false);
      await load();
    } catch (error) {
      console.error("Could not save church", error);
      toast.error(getChurchSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Church) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    const { error } = await supabase.from("churches").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAudit("church.delete", "church", c.id);
    toast.success("Deleted");
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Churches</h2>
          <p className="text-sm text-muted-foreground">
            Manage churches in the South Group region.
          </p>
        </div>
        {canManageChurches && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Add Church
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit" : "New"} Church</DialogTitle>
                <DialogDescription>Fill in church details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Field label="Name *">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Code">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. SC-01"
                  />
                </Field>
                <Field label="Region">
                  <Input
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </Field>
                <Field label="Pastor">
                  <Input
                    value={form.pastor_name}
                    onChange={(e) => setForm({ ...form, pastor_name: e.target.value })}
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading churches…</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No churches yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Pastor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.code ?? "—"}</TableCell>
                    <TableCell>{c.region ?? "—"}</TableCell>
                    <TableCell>{c.location ?? "—"}</TableCell>
                    <TableCell>{c.pastor_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {canManageChurches && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getChurchSaveError(error: unknown) {
  if (!error || typeof error !== "object") return "Could not save church";

  const maybeError = error as { code?: string; message?: string; details?: string };
  const message = maybeError.message ?? "";
  const details = maybeError.details ?? "";
  const combined = `${message} ${details}`.toLowerCase();

  if (maybeError.code === "23505" && combined.includes("churches_name_key")) {
    return "A church with this name already exists.";
  }
  if (maybeError.code === "23505" && combined.includes("churches_code_key")) {
    return "A church with this code already exists. Use a different code or leave it blank.";
  }
  if (combined.includes("row-level security")) {
    return "Your account does not have permission to save churches. Please use a main admin or sub-admin account.";
  }
  if (message) return message;

  return "Could not save church";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
