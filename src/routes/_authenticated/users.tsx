import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { fetchAllChurchOptions } from "@/lib/churches";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  phone: string | null;
  roles: AppRole[];
  assignments: {
    scope: string;
    church_id: string | null;
    department_id: string | null;
    unit_id: string | null;
  }[];
}

function UsersPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<UserRow | null>(null);
  const [roleSel, setRoleSel] = useState<AppRole>("submitter");
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [assignChurch, setAssignChurch] = useState("");
  const [assignDept, setAssignDept] = useState("");
  const [assignUnit, setAssignUnit] = useState("");

  const load = async () => {
    const [profiles, allRoles, allAssign, c, d, u] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,phone,is_active")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_assignments").select("user_id, scope, church_id, department_id, unit_id"),
      fetchAllChurchOptions(),
      supabase.from("departments").select("id,name").order("name"),
      supabase.from("units").select("id,name").order("name"),
    ]);
    const roleMap = new Map<string, AppRole[]>();
    (allRoles.data ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const assignMap = new Map<string, any[]>();
    (allAssign.data ?? []).forEach((a: any) => {
      const arr = assignMap.get(a.user_id) ?? [];
      arr.push(a);
      assignMap.set(a.user_id, arr);
    });
    setRows(
      (profiles.data ?? []).map((p: any) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
        assignments: assignMap.get(p.id) ?? [],
      })),
    );
    setChurches(c);
    setDepts((d.data ?? []) as any);
    setUnits((u.data ?? []) as any);
  };
  useEffect(() => {
    load();
  }, []);

  if (!isAdmin)
    return <p className="text-sm text-muted-foreground">Only Main Admin can manage users.</p>;

  const openManage = (u: UserRow) => {
    setActive(u);
    setRoleSel(u.roles[0] ?? "submitter");
    setAssignChurch("");
    setAssignDept("");
    setAssignUnit("");
    setOpen(true);
  };

  const setRole = async () => {
    if (!active) return;
    // Replace roles atomically: delete then insert
    await supabase.from("user_roles").delete().eq("user_id", active.id);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: active.id, role: roleSel });
    if (error) return toast.error(error.message);
    await logAudit("user.set_role", "user", active.id, { role: roleSel });
    toast.success("Role updated");
    load();
  };

  const addAssignment = async () => {
    if (!active) return;
    let scope: "church" | "department" | "unit" | null = null;
    const payload: any = { user_id: active.id };
    if (assignUnit) {
      scope = "unit";
      payload.unit_id = assignUnit;
    } else if (assignDept) {
      scope = "department";
      payload.department_id = assignDept;
    } else if (assignChurch) {
      scope = "church";
      payload.church_id = assignChurch;
    }
    if (!scope) return toast.error("Pick a church, department or unit");
    payload.scope = scope;
    const { error } = await supabase.from("user_assignments").insert(payload);
    if (error) return toast.error(error.message);
    await logAudit("user.assign", "user", active.id, payload);
    toast.success("Assignment added");
    setAssignChurch("");
    setAssignDept("");
    setAssignUnit("");
    load();
  };

  const toggleActive = async (u: UserRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !u.is_active })
      .eq("id", u.id);
    if (error) return toast.error(error.message);
    await logAudit("user.toggle_active", "user", u.id, { is_active: !u.is_active });
    load();
  };

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage roles and assignments for portal users.
          </p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.roles[0] ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {u.assignments.length} assigned
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge className="bg-success/20 text-success border-0">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                        {u.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openManage(u)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Manage
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage {active?.full_name || active?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                <Select value={roleSel} onValueChange={(v) => setRoleSel(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_admin">Main Admin</SelectItem>
                    <SelectItem value="sub_admin">Sub Admin</SelectItem>
                    <SelectItem value="submitter">Report Submitter</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={setRole}>Apply</Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border p-3">
              <Label className="text-sm font-semibold">
                Add Assignment (Sub Admin / Submitter scope)
              </Label>
              <div className="grid gap-2 md:grid-cols-3">
                <Select value={assignChurch} onValueChange={setAssignChurch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Church" />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assignDept} onValueChange={setAssignDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {depts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assignUnit} onValueChange={setAssignUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
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
              <Button size="sm" onClick={addAssignment}>
                Add assignment
              </Button>
              <p className="text-xs text-muted-foreground">
                Most specific selection wins (Unit &gt; Department &gt; Church).
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Current Assignments</Label>
              <ul className="mt-2 space-y-1 text-sm">
                {(active?.assignments ?? []).length === 0 && (
                  <li className="text-muted-foreground">None</li>
                )}
                {(active?.assignments ?? []).map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded border px-2 py-1"
                  >
                    <span className="text-xs">
                      {a.scope}:{" "}
                      {a.unit_id
                        ? units.find((x) => x.id === a.unit_id)?.name
                        : a.department_id
                          ? depts.find((x) => x.id === a.department_id)?.name
                          : churches.find((x) => x.id === a.church_id)?.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
