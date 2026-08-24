import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type BetaFeedbackCategory =
  | "bug"
  | "usability"
  | "idea"
  | "content"
  | "other";

export type BetaFeedbackSeverity =
  | "low"
  | "medium"
  | "high"
  | "blocker";

export type BetaFeedbackStatus =
  | "new"
  | "reviewing"
  | "resolved"
  | "closed";

export type MyBetaFeedback = {
  id: string;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  message: string;
  page_path: string;
  status: BetaFeedbackStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

export type AdminBetaFeedback = MyBetaFeedback & {
  user_id: string;
  display_name: string;
};

function client() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

export async function submitBetaFeedback(args: {
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  message: string;
  pagePath: string;
}) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "submit_beta_feedback",
    {
      p_category: args.category,
      p_severity: args.severity,
      p_message: args.message.trim(),
      p_page_path: args.pagePath,
    }
  );

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyBetaFeedback(): Promise<MyBetaFeedback[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_my_beta_feedback"
  );

  if (error) throw new Error(error.message);
  return (data || []) as MyBetaFeedback[];
}

export async function getBetaFeedbackAdmin(): Promise<AdminBetaFeedback[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_beta_feedback_admin"
  );

  if (error) throw new Error(error.message);
  return (data || []) as AdminBetaFeedback[];
}

export async function adminUpdateBetaFeedback(
  feedbackId: string,
  status: BetaFeedbackStatus,
  adminNote: string
) {
  const supabase = client();

  const { error } = await supabase.rpc(
    "admin_update_beta_feedback",
    {
      p_feedback_id: feedbackId,
      p_status: status,
      p_admin_note: adminNote.trim(),
    }
  );

  if (error) throw new Error(error.message);
}
