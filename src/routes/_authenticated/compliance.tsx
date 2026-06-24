import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { fetchAllChurchOptions } from "@/lib/churches";

export const Route = createFileRoute("/_authenticated/compliance")({
  component: CompliancePage,
});

function CompliancePage() {
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchAllChurchOptions(),
      supabase
        .from("reports")
        .select("church_id, status, report_date, created_at")
        .gte("report_date", format(subDays(new Date(), 60), "yyyy-MM-dd")),
    ]).then(([c, r]) => {
      setChurches(c);
      setReports(r.data ?? []);
    });
  }, []);

  const summary = useMemo(() => {
    const total = reports.length;
    const submitted = reports.filter((r) => r.status !== "draft").length;
    const approved = reports.filter((r) => r.status === "approved").length;
    const pending = 0;
    const overdue = 0;
    return {
      total,
      submitted,
      approved,
      pending,
      overdue,
      rate: total ? Math.round((approved / total) * 100) : 0,
    };
  }, [reports]);

  const byChurch = useMemo(() => {
    return churches.map((c) => {
      const list = reports.filter((r) => r.church_id === c.id);
      const approved = list.filter((r) => r.status === "approved").length;
      const pending = 0;
      const overdue = 0;
      const latest = list.sort((a, b) => +new Date(b.report_date) - +new Date(a.report_date))[0];
      const rate = list.length ? Math.round((approved / list.length) * 100) : 0;
      return {
        name: c.name,
        total: list.length,
        approved,
        pending,
        overdue,
        rate,
        lastReport: latest?.report_date,
      };
    });
  }, [churches, reports]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reporting Compliance</h2>
        <p className="text-sm text-muted-foreground">Monitor reporting cadence across churches.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Tile label="Total Reports" value={summary.total} />
        <Tile label="Submitted" value={summary.submitted} color="text-success" />
        <Tile label="Pending Queue" value={summary.pending} color="text-warning-foreground" />
        <Tile label="Overdue Queue" value={summary.overdue} color="text-destructive" />
        <Tile label="Compliance" value={`${summary.rate}%`} color="text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Church</CardTitle>
          <CardDescription>Last 60 days</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Church</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Last Report</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byChurch.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.total}</TableCell>
                  <TableCell className="text-success">{c.approved}</TableCell>
                  <TableCell className="text-warning-foreground">{c.pending}</TableCell>
                  <TableCell className="text-destructive">{c.overdue}</TableCell>
                  <TableCell className="text-xs">
                    {c.lastReport ? format(new Date(c.lastReport), "PPP") : "—"}
                  </TableCell>
                  <TableCell>
                    {c.overdue > 0 ? (
                      <Badge className="border-0 bg-destructive/15 text-destructive">Overdue</Badge>
                    ) : c.pending > 0 ? (
                      <Badge className="border-0 bg-warning/20 text-warning-foreground">
                        Pending
                      </Badge>
                    ) : c.approved > 0 ? (
                      <Badge className="border-0 bg-success/15 text-success">On Track</Badge>
                    ) : (
                      <Badge variant="secondary">No Data</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${color ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
