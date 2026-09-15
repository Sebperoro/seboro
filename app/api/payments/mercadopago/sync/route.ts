import { NextResponse } from "next/server";
import {
  getAuthenticatedUserFromRequest,
  reconcileMercadoPagoPayment,
} from "@/lib/payments/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const body = (await request.json().catch(() => null)) as
      | { paymentId?: string | number }
      | null;

    const paymentId = String(body?.paymentId || "").trim();
    if (!paymentId) {
      return NextResponse.json({ error: "Falta el identificador del pago." }, { status: 400 });
    }

    const result = await reconcileMercadoPagoPayment(paymentId, user.id);

    return NextResponse.json({
      status: result.status,
      paid: result.status === "paid",
      slug: result.purchase.book_slug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo verificar el pago.";
    const status = message.includes("sesión") || message.includes("cuenta") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
