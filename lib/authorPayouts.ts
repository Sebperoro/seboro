import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthorBalance = {
  author_id: string;
  author_name: string;
  available_mxn: number;
  pending_release_mxn: number;
  paid_total_mxn: number;
  next_release_at: string | null;
  flagged_count: number;
};

export type AuthorEarningStatus =
  | "pending_release"
  | "paid"
  | "voided"
  | "flagged_for_review";

export type AuthorEarningDetail = {
  id: string;
  purchase_id: string;
  work_id: string;
  book_slug: string;
  gross_amount_mxn: number;
  mp_fee_estimate_mxn: number;
  author_share_mxn: number;
  status: AuthorEarningStatus;
  available_at: string;
  payout_at: string | null;
  payout_by_admin_id: string | null;
  created_at: string;
};

export type PayoutProfile = {
  bank_name: string;
  clabe: string;
  account_holder_name: string;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

type SupabaseClientType = ReturnType<typeof client>;

async function getDisplayNames(
  supabase: SupabaseClientType,
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);

  if (error) throw new Error(error.message);

  return new Map(
    (data || []).map((row: Record<string, unknown>) => [
      String(row.user_id),
      String(row.display_name || "").trim(),
    ])
  );
}

async function getAuthorNames(
  supabase: SupabaseClientType,
  authorIds: string[]
): Promise<Map<string, string>> {
  if (authorIds.length === 0) return new Map();

  const [displayNameById, { data: authorProfiles, error: authorProfilesError }] =
    await Promise.all([
      getDisplayNames(supabase, authorIds),
      supabase
        .from("author_profiles")
        .select("user_id, pen_name")
        .in("user_id", authorIds),
    ]);

  if (authorProfilesError) throw new Error(authorProfilesError.message);

  const penNameById = new Map(
    (authorProfiles || []).map(
      (row: Record<string, unknown>) => [
        String(row.user_id),
        String(row.pen_name || "").trim(),
      ]
    )
  );

  const names = new Map<string, string>();
  for (const authorId of authorIds) {
    names.set(
      authorId,
      penNameById.get(authorId) || displayNameById.get(authorId) || "Autor"
    );
  }
  return names;
}

export async function getAdminAuthorBalances(): Promise<
  AuthorBalance[]
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_get_author_balances"
  );

  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<
    Omit<AuthorBalance, "author_name">
  >;

  if (rows.length === 0) return [];

  const authorNames = await getAuthorNames(
    supabase,
    rows.map((row) => row.author_id)
  );

  return rows.map((row) => ({
    author_id: row.author_id,
    author_name: authorNames.get(row.author_id) || "Autor",
    available_mxn: Number(row.available_mxn || 0),
    pending_release_mxn: Number(
      row.pending_release_mxn || 0
    ),
    paid_total_mxn: Number(row.paid_total_mxn || 0),
    next_release_at: row.next_release_at || null,
    flagged_count: Number(row.flagged_count || 0),
  }));
}

export type FlaggedEarning = {
  id: string;
  author_id: string;
  author_name: string;
  purchase_id: string;
  work_id: string;
  book_slug: string;
  gross_amount_mxn: number;
  author_share_mxn: number;
  created_at: string;
  resolved_at: string | null;
  resolved_by_admin_id: string | null;
  resolved_by_admin_name: string | null;
  resolution_note: string | null;
};

export async function getAdminFlaggedEarnings(
  includeResolved = false
): Promise<FlaggedEarning[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_get_flagged_earnings",
    { p_include_resolved: includeResolved }
  );

  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<{
    id: string;
    author_id: string;
    purchase_id: string;
    work_id: string;
    book_slug: string;
    gross_amount_mxn: number;
    author_share_mxn: number;
    created_at: string;
    resolved_at: string | null;
    resolved_by_admin_id: string | null;
    resolution_note: string | null;
  }>;

  if (rows.length === 0) return [];

  const authorIds = Array.from(
    new Set(rows.map((row) => row.author_id))
  );
  const adminIds = Array.from(
    new Set(
      rows
        .map((row) => row.resolved_by_admin_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [authorNames, adminNames] = await Promise.all([
    getAuthorNames(supabase, authorIds),
    getDisplayNames(supabase, adminIds),
  ]);

  return rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    author_name: authorNames.get(row.author_id) || "Autor",
    purchase_id: row.purchase_id,
    work_id: row.work_id,
    book_slug: row.book_slug,
    gross_amount_mxn: Number(row.gross_amount_mxn || 0),
    author_share_mxn: Number(row.author_share_mxn || 0),
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    resolved_by_admin_id: row.resolved_by_admin_id,
    resolved_by_admin_name: row.resolved_by_admin_id
      ? adminNames.get(row.resolved_by_admin_id) || "Admin"
      : null,
    resolution_note: row.resolution_note,
  }));
}

export async function resolveFlaggedEarnings(
  earningIds: string[],
  resolutionNote: string
): Promise<number> {
  if (earningIds.length === 0) return 0;

  const note = resolutionNote.trim();
  if (!note) throw new Error("Ingresa una nota de resolución.");

  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_resolve_flagged_earning",
    { p_earning_ids: earningIds, p_resolution_note: note }
  );

  if (error) throw new Error(error.message);

  return (data || []).length;
}

export async function getAdminAuthorEarningsDetail(
  authorId: string
): Promise<AuthorEarningDetail[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_get_author_earnings_detail",
    { p_author_id: authorId }
  );

  if (error) throw new Error(error.message);

  return (data || []) as AuthorEarningDetail[];
}

export async function getAdminPayoutProfile(
  authorId: string
): Promise<PayoutProfile | null> {
  const supabase = client();

  const { data, error } = await supabase
    .from("author_payout_profiles")
    .select("bank_name, clabe, account_holder_name")
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    bank_name: String(data.bank_name || ""),
    clabe: String(data.clabe || ""),
    account_holder_name: String(
      data.account_holder_name || ""
    ),
  };
}

export async function markEarningsPaid(
  earningIds: string[]
): Promise<AuthorEarningDetail[]> {
  if (earningIds.length === 0) return [];

  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_mark_earnings_paid",
    { p_earning_ids: earningIds }
  );

  if (error) throw new Error(error.message);

  return (data || []) as AuthorEarningDetail[];
}

export type AuthorEarningsSummary = {
  available_mxn: number;
  pending_release_mxn: number;
  paid_total_mxn: number;
  next_release_at: string | null;
};

export type AuthorEarningsHistoryItem = {
  id: string;
  work_id: string;
  book_slug: string;
  author_share_mxn: number;
  status: AuthorEarningStatus;
  available_at: string;
  payout_at: string | null;
  created_at: string;
};

export async function getMyAuthorEarningsSummary(): Promise<AuthorEarningsSummary> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_my_author_earnings_summary"
  );

  if (error) throw new Error(error.message);

  const row = (data || {}) as Record<string, unknown>;

  return {
    available_mxn: Number(row.available_mxn || 0),
    pending_release_mxn: Number(
      row.pending_release_mxn || 0
    ),
    paid_total_mxn: Number(row.paid_total_mxn || 0),
    next_release_at:
      (row.next_release_at as string) || null,
  };
}

export async function getMyAuthorEarningsHistory(
  limit = 30
): Promise<AuthorEarningsHistoryItem[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_my_author_earnings_history",
    { p_limit: limit }
  );

  if (error) throw new Error(error.message);

  return (data || []) as AuthorEarningsHistoryItem[];
}

export async function getMyPayoutProfile(): Promise<PayoutProfile | null> {
  const supabase = client();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("author_payout_profiles")
    .select("bank_name, clabe, account_holder_name")
    .eq("author_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    bank_name: String(data.bank_name || ""),
    clabe: String(data.clabe || ""),
    account_holder_name: String(
      data.account_holder_name || ""
    ),
  };
}

export function isValidClabe(value: string): boolean {
  if (!/^\d{18}$/.test(value)) return false;

  const weights = [3, 7, 1];
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    sum += (Number(value[i]) * weights[i % 3]) % 10;
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === Number(value[17]);
}

export async function upsertMyPayoutProfile(input: {
  bankName: string;
  clabe: string;
  accountHolderName: string;
}): Promise<PayoutProfile> {
  const bankName = input.bankName.trim();
  const clabe = input.clabe.trim();
  const accountHolderName = input.accountHolderName.trim();

  if (!bankName) {
    throw new Error("Ingresa el nombre del banco.");
  }

  if (!isValidClabe(clabe)) {
    throw new Error(
      "La CLABE no es válida. Revisa que tenga 18 dígitos y el dígito verificador correcto."
    );
  }

  if (!accountHolderName) {
    throw new Error(
      "Ingresa el nombre del titular de la cuenta."
    );
  }

  const supabase = client();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) throw new Error("No autenticado.");

  const { data, error } = await supabase
    .from("author_payout_profiles")
    .upsert(
      {
        author_id: userId,
        bank_name: bankName,
        clabe,
        account_holder_name: accountHolderName,
      },
      { onConflict: "author_id" }
    )
    .select("bank_name, clabe, account_holder_name")
    .single();

  if (error) throw new Error(error.message);

  return {
    bank_name: String(data.bank_name || ""),
    clabe: String(data.clabe || ""),
    account_holder_name: String(
      data.account_holder_name || ""
    ),
  };
}
