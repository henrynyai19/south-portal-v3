import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ churches: any[]; departments: any[]; units: any[]; reports: any[]; users: any[] }>({ churches: [], departments: [], units: [], reports: [], users: [] });

  useEffect(() => {
    if (!q.trim()) { setRes({ churches: [], departments: [], units: [], reports: [], users: [] }); return; }
    const t = setTimeout(async () => {
      const like = `%${q.trim()}%`;
      const [c, d, u, r, p] = await Promise.all([
        supabase.from("churches").select("id,name,location").ilike("name", like).limit(10),
        supabase.from("departments").select("id,name,description").ilike("name", like).limit(10),
        supabase.from("units").select("id,name, departments(name)").ilike("name", like).limit(10),
        supabase.from("reports").select("id, report_date, status, churches(name), departments(name)").or(`notes.ilike.${like}`).limit(10),
        supabase.from("profiles").select("id, full_name, email").or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
      ]);
      setRes({ churches: c.data ?? [], departments: d.data ?? [], units: u.data ?? [], reports: r.data ?? [], users: p.data ?? [] });
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Search</h2>
        <p className="text-sm text-muted-foreground">Find churches, departments, units, reports and users.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Type to search…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Churches" items={res.churches.map((x) => ({ id: x.id, primary: x.name, secondary: x.location, to: "/churches" as const }))} />
        <Section title="Departments" items={res.departments.map((x) => ({ id: x.id, primary: x.name, secondary: x.description, to: "/departments" as const }))} />
        <Section title="Units" items={res.units.map((x) => ({ id: x.id, primary: x.name, secondary: x.departments?.name, to: "/units" as const }))} />
        <Section title="Users" items={res.users.map((x) => ({ id: x.id, primary: x.full_name || x.email, secondary: x.email, to: "/users" as const }))} />
        <Section title="Reports" items={res.reports.map((x) => ({ id: x.id, primary: `${x.churches?.name ?? "—"} — ${x.departments?.name ?? "—"}`, secondary: `${x.status} · ${x.report_date}`, to: `/reports/${x.id}` }))} />
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: { id: string; primary: string; secondary?: string | null; to: string }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title} ({items.length})</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? <p className="text-xs text-muted-foreground">No matches.</p> : items.map((i) => (
          <Link key={i.id} to={i.to} className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
            <div className="truncate font-medium">{i.primary}</div>
            {i.secondary && <div className="truncate text-xs text-muted-foreground">{i.secondary}</div>}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
