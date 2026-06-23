import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
});

function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("audit_logs").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">Recent activity across the platform.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">No activity yet.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.created_at), "PPp")}</TableCell>
                  <TableCell className="text-sm">{r.profiles?.full_name ?? r.profiles?.email ?? "system"}</TableCell>
                  <TableCell><Badge variant="secondary" className="font-mono text-[11px]">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.entity_type ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
