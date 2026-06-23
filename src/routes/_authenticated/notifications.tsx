import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  };
  const markAll = async () => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-sm text-muted-foreground">Updates on reports, approvals, and deadlines.</p>
        </div>
        <Button variant="outline" onClick={markAll}><Check className="mr-2 h-4 w-4" />Mark all read</Button>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : rows.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 ${!n.is_read ? "bg-primary/5" : ""}`}>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Bell className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <div className="mt-2 flex items-center gap-2">
                  {n.link && <Button asChild size="sm" variant="link" className="h-auto p-0"><Link to={n.link}>View</Link></Button>}
                  {!n.is_read && <Button size="sm" variant="ghost" className="h-7" onClick={() => markRead(n.id)}>Mark read</Button>}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
