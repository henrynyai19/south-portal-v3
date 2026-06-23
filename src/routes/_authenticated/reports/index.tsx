import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown, Eye } from "lucide-react";
import { format } from "date-fns";
import { exportToExcel, exportReportsToPdf } from "@/lib/exporters";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsListPage,
});

interface Row { id: string; report_date: string; status: string; year: number; week_number: number | null; total_attendance: number; souls_won: number; offering_amount: number; churches: { name: string } | null; departments: { name: string } | null; units: { name: string } | null; profiles: { full_name: string; email: string } | null }

function ReportsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, report_date, status, year, week_number, total_attendance, souls_won, offering_amount, churches(name), departments(name), units(name), profiles!reports_submitted_by_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as any);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.churches?.name ?? "").toLowerCase().includes(s) || (r.departments?.name ?? "").toLowerCase().includes(s) || (r.units?.name ?? "").toLowerCase().includes(s) || (r.profiles?.full_name ?? "").toLowerCase().includes(s);
  }), [rows, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-sm text-muted-foreground">All submitted reports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filtered, "reports")}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => exportReportsToPdf(filtered)}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
          <Button asChild><Link to="/reports/new"><Plus className="mr-2 h-4 w-4" />New Report</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search church / department / submitter…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No reports found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Church</TableHead><TableHead>Department</TableHead><TableHead>Unit</TableHead><TableHead>Submitter</TableHead><TableHead>Attendance</TableHead><TableHead>Souls</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.report_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.churches?.name ?? "—"}</TableCell>
                    <TableCell>{r.departments?.name ?? "—"}</TableCell>
                    <TableCell>{r.units?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.profiles?.full_name ?? r.profiles?.email ?? "—"}</TableCell>
                    <TableCell>{r.total_attendance}</TableCell>
                    <TableCell>{r.souls_won}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost"><Link to="/reports/$id" params={{ id: r.id }}><Eye className="h-4 w-4" /></Link></Button>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-warning/20 text-warning-foreground",
    under_review: "bg-primary/15 text-primary",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <Badge className={(map[status] ?? "bg-muted") + " border-0 capitalize"}>{status.replace("_", " ")}</Badge>;
}
