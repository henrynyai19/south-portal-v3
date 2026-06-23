import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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

export const Route = createFileRoute("/_authenticated/departments")({
  component: DepartmentsPage,
});

interface Dept {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

function DepartmentsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Dept[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const load = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    setRows((data ?? []) as Dept[]);
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setOpen(true);
  };
  const openEdit = (d: Dept) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code ?? "", description: d.description ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("departments").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logAudit("department.update", "department", editing.id, payload);
    } else {
      const { data, error } = await supabase
        .from("departments")
        .insert(payload)
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      await logAudit("department.create", "department", data.id, payload);
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (d: Dept) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    const { error } = await supabase.from("departments").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    await logAudit("department.delete", "department", d.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Departments</h2>
          <p className="text-sm text-muted-foreground">Ministry departments across the group.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit" : "New"} Department</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No departments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.code ?? "—"}</TableCell>
                    <TableCell className="max-w-md truncate">{d.description ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(d)}>
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
