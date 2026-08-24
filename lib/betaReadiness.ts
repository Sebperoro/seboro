import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type BetaAuditCheck = {
  section: string;
  check_key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "info";
  detail: string;
  blocking: boolean;
};

export type BetaChecklistItem = {
  check_key: string;
  label: string;
  description: string;
  blocking: boolean;
  completed: boolean;
  note: string;
  updated_at: string;
};

function client() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

export async function getBetaReadinessAudit(): Promise<BetaAuditCheck[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_beta_readiness_audit"
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BetaAuditCheck[];
}

export async function getBetaLaunchChecklist(): Promise<BetaChecklistItem[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_beta_launch_checklist"
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BetaChecklistItem[];
}

export async function updateBetaCheck(
  checkKey: string,
  completed: boolean,
  note: string
) {
  const supabase = client();

  const { error } = await supabase.rpc(
    "admin_update_beta_check",
    {
      p_check_key: checkKey,
      p_completed: completed,
      p_note: note.trim(),
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}
