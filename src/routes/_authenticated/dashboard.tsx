import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  FileText,
  Network,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { useAuth } from "@/lib/auth";
import { getVisibleAssignmentScope } from "@/lib/assignments";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface Stats {
  churches: number;
  departments: number;
  units: number;
  users: number;
  totalReports: number;
  approved: number;
}

interface MonthlyRow {
  month: string;
  churches_reporting: number;
}

function DashboardPage() {
  const { user, isAdmin, isSubAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const visibleScope =
        isSubAdmin && !isAdmin && user
          ? await getVisibleAssignmentScope(user.id)
          : null;
      const [c, d, u, p, r, app, rep] = await Promise.all([
        isAdmin
          ? supabase.from("churches").select("id", { count: "exact", head: true })
          : Promise.resolve({ count: 0 }),
        visibleScope
          ? Promise.resolve({ count: visibleScope.departmentIds.length })
          : supabase.from("departments").select("id", { count: "exact", head: true }),
        visibleScope
          ? Promise.resolve({ count: visibleScope.unitIds.length })
          : supabase.from("units").select("id", { count: "exact", head: true }),
        isAdmin
          ? supabase.from("profiles").select("id", { count: "exact", head: true })
          : Promise.resolve({ count: 0 }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("reports")
          .select(
            "id, report_date, status, churches(name), departments(name)",
          )
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const totalReports = r.count ?? 0;
      const approved = app.count ?? 0;
      setStats({
        churches: c.count ?? 0,
        departments: d.count ?? 0,
        units: u.count ?? 0,
        users: p.count ?? 0,
        totalReports,
        approved,
      });
      setRecent((rep.data ?? []) as any[]);

      // Last 6 months church reporting trend
      const since = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const { data: trendRows } = await supabase
        .from("reports")
        .select("report_date, church_id")
        .gte("report_date", since)
        .neq("status", "draft");

      const buckets = new Map<string, MonthlyRow>();
      const reportingChurchesByMonth = new Map<string, Set<string>>();
      for (let i = 5; i >= 0; i--) {
        const m = startOfMonth(subMonths(new Date(), i));
        const key = format(m, "yyyy-MM");
        buckets.set(key, {
          month: format(m, "MMM"),
          churches_reporting: 0,
        });
        reportingChurchesByMonth.set(key, new Set());
      }
      (trendRows ?? []).forEach((row: any) => {
        const key = format(new Date(row.report_date), "yyyy-MM");
        if (!row.church_id) return;
        reportingChurchesByMonth.get(key)?.add(row.church_id);
      });
      reportingChurchesByMonth.forEach((churchIds, key) => {
        const bucket = buckets.get(key);
        if (bucket) bucket.churches_reporting = churchIds.size;
      });
      setMonthly(Array.from(buckets.values()));

      setLoading(false);
    };
    load();
  }, [user?.id, isAdmin, isSubAdmin]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading dashboard…</div>;
  if (!stats) return null;

  const cards = [
    {
      label: "Total Churches",
      value: stats.churches,
      to: "/churches",
      icon: Building2,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Departments",
      value: stats.departments,
      to: "/departments",
      icon: Network,
      accent: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Units",
      value: stats.units,
      to: "/units",
      icon: Network,
      accent: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      label: "Total Users",
      value: stats.users,
      to: "/users",
      icon: Users,
      accent: "text-gold-foreground",
      bg: "bg-gold/20",
    },
    {
      label: "Reports Submitted",
      value: stats.totalReports,
      to: "/reports",
      icon: FileText,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Published Reports",
      value: stats.approved,
      to: "/reports",
      icon: CheckCircle2,
      accent: "text-success",
      bg: "bg-success/15",
    },
  ].filter((card) => isAdmin || !["Total Churches", "Total Users"].includes(card.label));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Overview of churches, departments and reporting activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to} aria-label={`Open ${c.label}`}>
              <Card className="cursor-pointer shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-within:ring-2 focus-within:ring-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">{c.value}</p>
                    </div>
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.bg}`}>
                      <Icon className={`h-5 w-5 ${c.accent}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Church Reporting Trend</CardTitle>
          <CardDescription>Unique churches that submitted reports each month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer initialDimension={{ width: 1024, height: 256 }}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(value: any) => [
                    Number(value).toLocaleString(),
                    "Churches Reporting",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="churches_reporting"
                  name="Churches Reporting"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Latest reporting activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  to="/reports/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between gap-4 py-3 transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label={`Open report from ${r.churches?.name ?? "unknown church"}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.churches?.name ?? "—"} <span className="text-muted-foreground">·</span>{" "}
                      {r.departments?.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.report_date), "PPP")} · Report submitted
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: string; cls: string }> = {
    draft: { v: "Draft", cls: "bg-muted text-muted-foreground" },
    submitted: { v: "Submitted", cls: "bg-warning/20 text-warning-foreground" },
    under_review: { v: "Under Review", cls: "bg-primary/15 text-primary" },
    approved: { v: "Published", cls: "bg-success/15 text-success" },
    rejected: { v: "Rejected", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? { v: status, cls: "bg-muted" };
  return <Badge className={m.cls + " border-0"}>{m.v}</Badge>;
}
