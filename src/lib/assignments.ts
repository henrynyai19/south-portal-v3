import { supabase } from "@/integrations/supabase/client";

type Assignment = {
  scope: "church" | "department" | "unit";
  church_id: string | null;
  department_id: string | null;
  unit_id: string | null;
};

export type VisibleAssignmentScope = {
  departmentIds: string[];
  unitIds: string[];
};

export async function getVisibleAssignmentScope(userId: string): Promise<VisibleAssignmentScope> {
  const { data: assignments, error } = await supabase
    .from("user_assignments")
    .select("scope, church_id, department_id, unit_id")
    .eq("user_id", userId);

  if (error) throw error;

  const churchIds = new Set<string>();
  const departmentIds = new Set<string>();
  const unitIds = new Set<string>();

  for (const assignment of (assignments ?? []) as Assignment[]) {
    if (assignment.scope === "church" && assignment.church_id) {
      churchIds.add(assignment.church_id);
    }
    if (assignment.scope === "department" && assignment.department_id) {
      departmentIds.add(assignment.department_id);
    }
    if (assignment.scope === "unit" && assignment.unit_id) {
      unitIds.add(assignment.unit_id);
    }
  }

  const unitQueries = [];
  if (unitIds.size > 0) {
    unitQueries.push(
      supabase
        .from("units")
        .select("id, department_id")
        .in("id", Array.from(unitIds)),
    );
  }
  if (departmentIds.size > 0) {
    unitQueries.push(
      supabase
        .from("units")
        .select("id, department_id")
        .in("department_id", Array.from(departmentIds)),
    );
  }
  if (churchIds.size > 0) {
    unitQueries.push(
      supabase
        .from("units")
        .select("id, department_id")
        .in("church_id", Array.from(churchIds)),
    );
  }

  const unitResults = await Promise.all(unitQueries);
  for (const result of unitResults) {
    if (result.error) throw result.error;
    for (const unit of result.data ?? []) {
      unitIds.add(unit.id);
      if (unit.department_id) departmentIds.add(unit.department_id);
    }
  }

  return {
    departmentIds: Array.from(departmentIds),
    unitIds: Array.from(unitIds),
  };
}
