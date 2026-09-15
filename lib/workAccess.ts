"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type WorkAccess = {
  slug: string;
  workId: string;
  priceMxn: number;
  isFree: boolean;
  acquired: boolean;
  entitlementType: "free_claim" | "purchase" | null;
  fullAccess: boolean;
  purchased: boolean;
  ownWork: boolean;
  isAdmin: boolean;
  canObtain: boolean;
  sampleEnabled: boolean;
  sampleChapters: number;
  samplePages: number;
  sampleLevelBonusEnabled: boolean;
  totalChapters: number;
  totalPages: number;
  contentFormat: "native" | "epub" | "pdf";
  canReadSample: boolean;
};

function normalizeAccess(row: Record<string, unknown>): WorkAccess {
  const rawType = row.entitlement_type ? String(row.entitlement_type) : null;

  return {
    slug: String(row.slug || ""),
    workId: String(row.work_id || ""),
    priceMxn: Number(row.price_mxn || 0),
    isFree: Boolean(row.is_free),
    acquired: Boolean(row.acquired),
    entitlementType:
      rawType === "free_claim" || rawType === "purchase"
        ? rawType
        : null,
    fullAccess: Boolean(row.full_access),
    purchased: Boolean(row.purchased),
    ownWork: Boolean(row.own_work),
    isAdmin: Boolean(row.is_admin),
    canObtain: Boolean(row.can_obtain),
    sampleEnabled: Boolean(row.sample_enabled),
    sampleChapters: Math.max(0, Number(row.sample_chapters || 0)),
    samplePages: Math.max(0, Number(row.sample_pages || 0)),
    sampleLevelBonusEnabled: Boolean(row.sample_level_bonus_enabled),
    totalChapters: Math.max(0, Number(row.total_chapters || 0)),
    totalPages: Math.max(0, Number(row.total_pages || 0)),
    contentFormat: String(row.content_format || "native") as WorkAccess["contentFormat"],
    canReadSample: Boolean(row.can_read_sample),
  };
}

export async function getWorkAccess(slug: string): Promise<WorkAccess | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const { data, error } = await supabase.rpc("get_work_access", {
    p_slug: slug,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  return normalizeAccess(row as Record<string, unknown>);
}

export async function obtainFreeWork(slug: string): Promise<WorkAccess> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const { data, error } = await supabase.rpc("obtain_free_work", {
    p_slug: slug,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const refreshed = await getWorkAccess(slug);
    if (!refreshed) {
      throw new Error("No se pudo confirmar que la obra quedó en tu biblioteca.");
    }
    return refreshed;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("Supabase no confirmó la obtención de la obra.");
  }

  return normalizeAccess(row as Record<string, unknown>);
}
