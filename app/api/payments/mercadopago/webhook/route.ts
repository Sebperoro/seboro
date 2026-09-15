import { NextResponse } from "next/server";
import {
  reconcileMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/payments/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      data?: { id?: string | number };
    };

    const type = String(url.searchParams.get("type") || body.type || "");
    const dataId = String(
      url.searchParams.get("data.id") || body.data?.id || ""
    ).trim();

    if (type !== "payment" || !dataId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (!verifyMercadoPagoWebhookSignature(request, dataId)) {
      return NextResponse.json({ error: "Firma de webhook inválida." }, { status: 401 });
    }

    await reconcileMercadoPagoPayment(dataId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("SEBORO Mercado Pago webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook no procesado." },
      { status: 500 }
    );
  }
}
