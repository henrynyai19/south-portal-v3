import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { fetchAllChurchOptions } from "@/lib/churches";

export const Route = createFileRoute("/_authenticated/units")({
  component: UnitsPage,
});

interface Unit {
  id: string;
  name: string;
  code: string | null;
  church_id: string | null;
  department_id: string;
  leader_name: string | null;
  churches?: { name: string } | null;
  departments?: { name: string } | null;
}

function UnitsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Unit[]>([]);
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    church_id: "",
    department_id: "",
    leader_name: "",
  });

  const load = async () => {
    const [u, c, d] = await Promise.all([
      supabase.from("units").select("*, churches(name), departments(name)").order("name"),
      fetchAllChurchOptions(),
      supabase.from("departments").select("id,name").order("name"),
    ]);
    setRows((u.data ?? []) as Unit[]);
    setChurches(c);
    setDepts((d.data ?? []) as { id: string; name: string }[]);
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", code: "", church_id: "", department_id: "", leader_name: "" });
    setOpen(true);
  };
  const openEdit = (u: Unit) => {
    setEditing(u);
    setForm({
      name: u.name,
      code: u.code ?? "",
      church_id: u.church_id ?? "",
      department_id: u.department_id,
      leader_name: u.leader_name ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.department_id)
      return toast.error("Name and department required");
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      church_id: form.church_id || null,
      department_id: form.department_id,
      leader_name: form.leader_name.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("units").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logAudit("unit.update", "unit", editing.id, payload);
    } else {
      const { data, error } = await supabase.from("units").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      await logAudit("unit.create", "unit", data.id, payload);
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (u: Unit) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    const { error } = await supabase.from("units").delete().eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAudit("unit.delete", "unit", u.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Units</h2>
          <p className="text-sm text-muted-foreground">
            Cells, teams and groups within departments.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit" : "New"} Unit</DialogTitle>
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
                  <Label>Department *</Label>
                  <Select
                    value={form.department_id}
                    onValueChange={(v) => setForm({ ...form, department_id: v })}
                  >
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
                  <Label>Church</Label>
                  <Select
                    value={form.church_id}
                    onValueChange={(v) => setForm({ ...form, church_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select church (optional)" />
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
                  <Label>Leader</Label>
                  <Input
                    value={form.leader_name}
                    onChange={(e) => setForm({ ...form, leader_name: e.target.value })}
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
            <p className="py-12 text-center text-sm text-muted-foreground">No units yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Church</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.departments?.name ?? "—"}</TableCell>
                    <TableCell>{u.churches?.name ?? "—"}</TableCell>
                    <TableCell>{u.leader_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(u)}>
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
