import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUserFromRequest,
  reconcileMercadoPagoPayment,
} from "@/lib/payments/server";
import { logPaymentError } from "@/lib/payments/errors";

export const runtime = "nodejs";

type ReconcileResult = {
  purchaseId: string;
  newStatus: string | null;
  error: string | null;
};

function responseStatusFor(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("iniciar sesión") ||
    normalized.includes("sesión")
  ) {
    return 401;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const admin = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    if (String(profile?.role || "") !== "admin") {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { purchaseIds?: unknown }
      | null;

    const purchaseIds = Array.isArray(body?.purchaseIds)
      ? body.purchaseIds.filter(
          (id): id is string =>
            typeof id === "string" && id.trim().length > 0
        )
      : [];

    if (purchaseIds.length === 0) {
      return NextResponse.json(
        { error: "No se especificaron compras." },
        { status: 400 }
      );
    }

    // Revalidamos el predicado completo del lado del servidor: solo se
    // reconcilian compras que sigan 'pending' y con un pago real de
    // Mercado Pago vinculado — ignoramos silenciosamente cualquier id que
    // ya no califique (por ejemplo, si otro admin ya la resolvió).
    const { data: purchases, error: purchasesError } = await admin
      .from("purchases")
      .select("id, provider_payment_id")
      .in("id", purchaseIds)
      .eq("status", "pending")
      .not("provider_payment_id", "is", null);

    if (purchasesError) throw new Error(purchasesError.message);

    const results: ReconcileResult[] = [];

    for (const purchase of purchases || []) {
      try {
        const { status } = await reconcileMercadoPagoPayment(
          String(purchase.provider_payment_id)
        );

        results.push({
          purchaseId: purchase.id,
          newStatus: status,
          error: null,
        });
      } catch (err) {
        logPaymentError("reconcile-stuck", err);

        results.push({
          purchaseId: purchase.id,
          newStatus: null,
          error:
            err instanceof Error
              ? err.message
              : "No se pudo reconciliar este pago.",
        });
      }
    }

    const consideredIds = new Set(
      (purchases || []).map((purchase) => purchase.id)
    );

    const skippedIds = purchaseIds.filter(
      (id) => !consideredIds.has(id)
    );

    return NextResponse.json({ results, skippedIds });
  } catch (error) {
    logPaymentError("reconcile-stuck", error);

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la solicitud.";

    return NextResponse.json(
      { error: message },
      { status: responseStatusFor(message) }
    );
  }
}
