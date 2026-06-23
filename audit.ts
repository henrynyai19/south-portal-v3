import { supabase } from "@/integrations/supabase/client";

export async function logAudit(action: string, entity_type?: string, entity_id?: string, details?: Record<string, unknown>) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await supabase.from("audit_logs").insert({
      user_id: u.user.id,
      action,
      entity_type: entity_type ?? null,
      entity_id: entity_id ?? null,
      details: (details as never) ?? null,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}
