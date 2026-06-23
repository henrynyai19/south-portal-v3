import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FileDown, TrendingUp, Users, Heart } from "lucide-react";
import { exportAnalyticsToPdf, exportToExcel } from "@/lib/exporters";
import { format, subDays } from "date-fns";
import { fetchAllChurchOptions } from "@/lib/churches";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function AnalyticsPage() {
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({
    church: "all",
    dept: "all",
    from: format(subDays(new Date(), 90), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchAllChurchOptions(),
      supabase.from("departments").select("id,name").order("name"),
    ]).then(([c, d]) => {
      setChurches(c);
      setDepts((d.data ?? []) as any);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      let q = supabase
        .from("reports")
        .select("*, churches(name), departments(name)")
        .eq("status", "approved")
        .gte("report_date", filters.from)
        .lte("report_date", filters.to);
      if (filters.church !== "all") q = q.eq("church_id", filters.church);
      if (filters.dept !== "all") q = q.eq("department_id", filters.dept);
      const { data } = await q;
      setRows(data ?? []);
    };
    load();
  }, [filters]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          attendance: acc.attendance + (r.total_attendance || 0),
          souls_won: acc.souls_won + (r.souls_won || 0),
          new_converts: acc.new_converts + (r.new_converts || 0),
          first_timers: acc.first_timers + (r.first_timers || 0),
          offering: acc.offering + Number(r.offering_amount || 0),
        }),
        { attendance: 0, souls_won: 0, new_converts: 0, first_timers: 0, offering: 0 },
      ),
    [rows],
  );

  const conversionRate = totals.first_timers
    ? Math.round((totals.new_converts / totals.first_timers) * 100)
    : 0;

  const byChurch = useMemo(() => {
    const m = new Map<
      string,
      { name: string; attendance: number; souls: number; reports: number }
    >();
    rows.forEach((r) => {
      const name = r.churches?.name ?? "—";
      const cur = m.get(name) ?? { name, attendance: 0, souls: 0, reports: 0 };
      cur.attendance += r.total_attendance || 0;
      cur.souls += r.souls_won || 0;
      cur.reports += 1;
      m.set(name, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.attendance - a.attendance);
  }, [rows]);

  const byDept = useMemo(() => {
    const m = new Map<string, { name: string; value: number }>();
    rows.forEach((r) => {
      const name = r.departments?.name ?? "—";
      const cur = m.get(name) ?? { name, value: 0 };
      cur.value += r.total_attendance || 0;
      m.set(name, cur);
    });
    return Array.from(m.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [rows]);

  const trend = useMemo(() => {
    const m = new Map<string, { date: string; attendance: number; souls: number }>();
    rows.forEach((r) => {
      const k = format(new Date(r.report_date), "MMM d");
      const cur = m.get(k) ?? { date: k, attendance: 0, souls: 0 };
      cur.attendance += r.total_attendance || 0;
      cur.souls += r.souls_won || 0;
      m.set(k, cur);
    });
    return Array.from(m.values()).slice(-20);
  }, [rows]);

  const exportPdf = () => {
    exportAnalyticsToPdf("Analytics Report", [
      {
        heading: "Summary",
        columns: ["Metric", "Value"],
        rows: [
          ["Total Attendance", totals.attendance],
          ["Souls Won", totals.souls_won],
          ["New Converts", totals.new_converts],
          ["Conversion Rate", `${conversionRate}%`],
          ["Total Offering", totals.offering.toLocaleString()],
        ],
      },
      {
        heading: "By Church",
        columns: ["Church", "Attendance", "Souls", "Reports"],
        rows: byChurch.map((c) => [c.name, c.attendance, c.souls, c.reports]),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Data-driven insights across the South Group.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToExcel(rows, "analytics")}>
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Church</Label>
            <Select
              value={filters.church}
              onValueChange={(v) => setFilters({ ...filters, church: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All churches</SelectItem>
                {churches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Department</Label>
            <Select value={filters.dept} onValueChange={(v) => setFilters({ ...filters, dept: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Attendance" value={totals.attendance.toLocaleString()} icon={Users} />
        <Kpi label="Souls Won" value={totals.souls_won.toLocaleString()} icon={Heart} />
        <Kpi label="New Converts" value={totals.new_converts.toLocaleString()} icon={TrendingUp} />
        <Kpi label="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Across selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="souls"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Department</CardTitle>
            <CardDescription>Attendance share</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byDept} dataKey="value" nameKey="name" outerRadius={100} label>
                    {byDept.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Church</CardTitle>
          <CardDescription>Attendance, souls won, reports submitted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={byChurch}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="attendance" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="souls" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
