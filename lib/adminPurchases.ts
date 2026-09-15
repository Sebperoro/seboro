import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AbandonedPurchaseBucket =
  | "no_payment_attempt"
  | "stuck_mp_pending";

export type AbandonedPurchase = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  work_id: string;
  book_slug: string;
  work_title: string;
  amount_mxn: number;
  provider_payment_id: string | null;
  provider_status: string | null;
  created_at: string;
  bucket: AbandonedPurchaseBucket;
  needs_manual_review: boolean;
};

export type ReconcileStuckResult = {
  purchaseId: string;
  newStatus: string | null;
  error: string | null;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

export async function getAbandonedPurchases(): Promise<
  AbandonedPurchase[]
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_get_abandoned_purchases"
  );

  if (error) throw new Error(error.message);

  return (data || []) as AbandonedPurchase[];
}

export async function cancelAbandonedPurchases(
  purchaseIds: string[]
): Promise<number> {
  if (purchaseIds.length === 0) return 0;

  const supabase = client();

  const { data, error } = await supabase.rpc(
    "admin_cancel_abandoned_purchases",
    { p_purchase_ids: purchaseIds }
  );

  if (error) throw new Error(error.message);

  return (data || []).length;
}

export async function reconcileStuckPurchases(
  purchaseIds: string[]
): Promise<{
  results: ReconcileStuckResult[];
  skippedIds: string[];
}> {
  if (purchaseIds.length === 0) {
    return { results: [], skippedIds: [] };
  }

  const supabase = client();

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("Debes iniciar sesión.");
  }

  const response = await fetch(
    "/api/admin/payments/mercadopago/reconcile-stuck",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ purchaseIds }),
    }
  );

  const body = (await response.json().catch(() => null)) as
    | {
        results?: ReconcileStuckResult[];
        skippedIds?: string[];
        error?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      body?.error || "No se pudo reconciliar con Mercado Pago."
    );
  }

  return {
    results: body?.results || [],
    skippedIds: body?.skippedIds || [],
  };
}
