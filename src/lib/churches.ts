import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Church = Database["public"]["Tables"]["churches"]["Row"];
export type ChurchOption = Pick<Church, "id" | "name">;

const PAGE_SIZE = 500;

export async function fetchAllChurches(): Promise<Church[]> {
  const churches: Church[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("churches")
      .select("*")
      .order("name")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data ?? [];
    churches.push(...page);
    if (page.length < PAGE_SIZE) return churches;
  }
}

export async function fetchAllChurchOptions(): Promise<ChurchOption[]> {
  const churches: ChurchOption[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("churches")
      .select("id,name")
      .order("name")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data ?? [];
    churches.push(...page);
    if (page.length < PAGE_SIZE) return churches;
  }
}
