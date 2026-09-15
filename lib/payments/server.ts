import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type MercadoPagoFeeDetail = {
  amount?: number;
  fee_payer?: string;
  type?: string;
};

export type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  metadata?: Record<string, unknown>;
  fee_details?: MercadoPagoFeeDetail[];
  transaction_details?: {
    net_received_amount?: number;
  };
};

export function getMercadoPagoAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  }
  return token;
}

export async function getAuthenticatedUserFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("Debes iniciar sesión.");
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("La sesión no es válida o ya expiró.");
  }

  return data.user;
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const data = (await response.json().catch(() => null)) as
    | MercadoPagoPayment
    | { message?: string }
    | null;

  if (!response.ok || !data) {
    const message =
      data && "message" in data && data.message
        ? String(data.message)
        : "Mercado Pago no devolvió el pago solicitado.";
    throw new Error(message);
  }

  return data as MercadoPagoPayment;
}

function mapPaymentStatus(status: string | undefined) {
  if (status === "approved") return "paid" as const;
  if (status === "refunded" || status === "charged_back") {
    return "refunded" as const;
  }
  if (status === "cancelled") return "cancelled" as const;
  if (status === "rejected") return "failed" as const;
  return "pending" as const;
}

// Suma fee_details[].amount (todos los conceptos que MP haya cobrado, no
// solo mercadopago_fee, por si algún pago llega a traer más de un tipo) y
// solo lo acepta si es plausible: positivo y estrictamente menor al monto
// bruto. Cualquier otro caso devuelve null y seboro_sync_author_earnings usa
// la estimación de respaldo — nunca se escribe un valor que pueda dejar
// author_earnings.net_amount_mxn en 0 o negativo.
function computeRealFeeMxn(
  payment: MercadoPagoPayment,
  amountMxn: number
): number | null {
  const feeDetails = Array.isArray(payment.fee_details)
    ? payment.fee_details
    : [];

  const feeSum = feeDetails.reduce(
    (sum, detail) => sum + Number(detail?.amount || 0),
    0
  );

  const rounded = Math.round(feeSum * 100) / 100;

  if (!Number.isFinite(rounded) || rounded <= 0 || rounded >= amountMxn) {
    return null;
  }

  return rounded;
}

export async function reconcileMercadoPagoPayment(
  paymentId: string,
  expectedBuyerId?: string
) {
  const payment = await fetchMercadoPagoPayment(paymentId);
  const purchaseId = String(
    payment.external_reference || payment.metadata?.purchase_id || ""
  ).trim();

  if (!purchaseId) {
    throw new Error("El pago no está vinculado a una compra de SEBORO.");
  }

  const admin = getSupabaseAdminClient();
  const { data: purchase, error: purchaseError } = await admin
    .from("purchases")
    .select("*")
    .eq("id", purchaseId)
    .maybeSingle();

  if (purchaseError) throw new Error(purchaseError.message);
  if (!purchase) throw new Error("La compra vinculada no existe en SEBORO.");

  if (expectedBuyerId && purchase.buyer_id !== expectedBuyerId) {
    throw new Error("Ese pago no pertenece a tu cuenta.");
  }

  const paidAmount = Number(payment.transaction_amount || 0);
  const expectedAmount = Number(purchase.amount_mxn || 0);
  const currency = String(payment.currency_id || "");

  if (Math.abs(paidAmount - expectedAmount) > 0.01 || currency !== "MXN") {
    throw new Error("El monto o la moneda del pago no coinciden con la compra.");
  }

  const status = mapPaymentStatus(payment.status);
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    status,
    provider_payment_id: String(payment.id || paymentId),
    provider_status: String(payment.status || "unknown"),
    updated_at: now,
  };

  if (status === "paid") {
    patch.paid_at = now;

    const realFee = computeRealFeeMxn(payment, expectedAmount);
    if (realFee !== null) {
      patch.mp_fee_real_mxn = realFee;
    }
  }
  if (status === "refunded") patch.refunded_at = now;

  const { data: updated, error: updateError } = await admin
    .from("purchases")
    .update(patch)
    .eq("id", purchaseId)
    .select("*")
    .single();

  if (updateError) throw new Error(updateError.message);

  return {
    purchase: updated,
    payment,
    status,
  };
}

export function verifyMercadoPagoWebhookSignature(request: Request, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET no está configurado.");
  }

  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";

  const parts = Object.fromEntries(
    signature
      .split(",")
      .map((part) => part.trim().split("=", 2))
      .filter((pair) => pair.length === 2)
  );

  const ts = parts.ts || "";
  const v1 = parts.v1 || "";

  if (!ts || !v1) return false;

  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId.toLowerCase()};`);
  if (requestId) manifestParts.push(`request-id:${requestId};`);
  manifestParts.push(`ts:${ts};`);

  const manifest = manifestParts.join("");

  const expected = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}
