import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "sexual"
  | "threats"
  | "personal_data"
  | "spoiler"
  | "other";

export type ReportTargetType = "post" | "reply";

export type PendingCommunityReport = {
  target_type: ReportTargetType;
  target_id: string;
  parent_post_id: string;
  book_slug: string;
  branch: string;
  content_user_id: string;
  display_name: string;
  body: string;
  report_count: number;
  reasons: ReportReason[];
  details: string[];
  oldest_report_at: string;
};

export type RecentModerationAction = {
  action_id: string;
  target_type: "post" | "reply" | "user";
  target_id: string;
  target_user_id: string | null;
  display_name: string;
  action:
    | "dismiss"
    | "hide"
    | "warn"
    | "hide_warn"
    | "restore"
    | "restrict"
    | "lift_restriction";
  reason: string;
  created_at: string;
  current_status: "visible" | "hidden" | null;
};

export type ActiveCommunityRestriction = {
  user_id: string;
  display_name: string;
  restricted_until: string;
  reason: string;
};

export type MyModerationWarning = {
  id: string;
  severity: "notice" | "warning" | "final";
  reason: string;
  target_type: "post" | "reply" | "user" | null;
  target_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
};

export type MyCommunityModerationStatus = {
  restriction: {
    restricted_until: string;
    reason: string;
  } | null;
  warnings: MyModerationWarning[];
};

function client() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  return supabase;
}

export async function submitCommunityReport(args: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
}) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "submit_community_report",
    {
      p_post_id:
        args.targetType === "post" ? args.targetId : null,
      p_reply_id:
        args.targetType === "reply" ? args.targetId : null,
      p_reason: args.reason,
      p_details: args.details.trim(),
    }
  );

  if (error) throw new Error(error.message);
  return data;
}

export async function getPendingCommunityReports(): Promise<
  PendingCommunityReport[]
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_pending_community_reports"
  );

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    ...row,
    report_count: Number(row.report_count || 0),
    details: Array.isArray(row.details) ? row.details : [],
  })) as PendingCommunityReport[];
}

export async function moderateCommunityTarget(
  targetType: ReportTargetType,
  targetId: string,
  action: "dismiss" | "hide" | "warn" | "hide_warn" | "restore",
  reason: string
) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_moderate_community_target",
    {
      p_target_type: targetType,
      p_target_id: targetId,
      p_action: action,
      p_reason: reason.trim(),
    }
  );

  if (error) throw new Error(error.message);
  return data;
}

export async function restrictCommunityUser(
  userId: string,
  hours: number,
  reason: string
) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_restrict_community_user",
    {
      p_user_id: userId,
      p_hours: hours,
      p_reason: reason.trim(),
    }
  );

  if (error) throw new Error(error.message);
  return data;
}

export async function liftCommunityRestriction(
  userId: string,
  reason = ""
) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_lift_community_restriction",
    {
      p_user_id: userId,
      p_reason: reason,
    }
  );

  if (error) throw new Error(error.message);
  return data;
}

export async function getRecentModerationActions(): Promise<
  RecentModerationAction[]
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_recent_community_moderation_actions"
  );

  if (error) throw new Error(error.message);
  return (data || []) as RecentModerationAction[];
}

export async function getActiveCommunityRestrictions(): Promise<
  ActiveCommunityRestriction[]
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_active_community_restrictions"
  );

  if (error) throw new Error(error.message);
  return (data || []) as ActiveCommunityRestriction[];
}

export async function getMyCommunityModerationStatus(): Promise<
  MyCommunityModerationStatus
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_my_community_moderation_status"
  );

  if (error) throw new Error(error.message);

  return {
    restriction: data?.restriction || null,
    warnings: Array.isArray(data?.warnings) ? data.warnings : [],
  };
}

export async function acknowledgeCommunityWarning(
  warningId: string
) {
  const supabase = client();

  const { error } = await supabase.rpc(
    "acknowledge_community_warning",
    { p_warning_id: warningId }
  );

  if (error) throw new Error(error.message);
}
