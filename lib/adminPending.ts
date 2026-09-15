"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type PendingAuthorApplication = {
  id: string;
  created_at: string | null;
};

export async function getPendingAuthorApplications(): Promise<
  PendingAuthorApplication[]
> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("author_applications")
    .select("id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as PendingAuthorApplication[];
}

export async function getPendingAuthorApplicationCount(): Promise<number> {
  const rows = await getPendingAuthorApplications();
  return rows.length;
}
