import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUserFromRequest,
  getMercadoPagoAccessToken,
} from "@/lib/payments/server";
import { logPaymentError, toSafePurchaseMessage } from "@/lib/payments/errors";

export const runtime = "nodejs";

function getPaymentSiteUrl() {
  const raw = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();

  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL no está configurado. Para Checkout Pro usa una URL pública HTTPS."
    );
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL no contiene una URL válida.");
  }

  const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

  if (url.protocol !== "https:" || localHostnames.has(url.hostname)) {
    throw new Error(
      "Mercado Pago no admite localhost en las URLs de retorno. Configura NEXT_PUBLIC_SITE_URL con una URL pública HTTPS de pruebas."
    );
  }

  return url.origin.replace(/\/$/, "");
}

function responseStatusFor(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("iniciar sesión") ||
    normalized.includes("sesión") ||
    normalized.includes("cuenta")
  ) {
    return 401;
  }

  if (
    normalized.includes("mercadopago_access_token") ||
    normalized.includes("next_public_site_url") ||
    normalized.includes("localhost")
  ) {
    return 503;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    const body = (await request.json().catch(() => null)) as
      | { slug?: string }
      | null;

    const slug = String(body?.slug || "").trim();

    if (!slug) {
      return NextResponse.json({ error: "Falta la obra." }, { status: 400 });
    }

    // Validamos la configuración ANTES de crear una compra pendiente.
    // Así, mientras Mercado Pago no entregue las credenciales o no exista
    // una URL pública HTTPS, no dejamos filas pendientes innecesarias.
    const accessToken = getMercadoPagoAccessToken();
    const siteUrl = getPaymentSiteUrl();

    const admin = getSupabaseAdminClient();

    const { data: work, error: workError } = await admin
      .from("works")
      .select("id, slug, author_id, title, price_mxn, publication_status")
      .eq("slug", slug)
      .eq("publication_status", "published")
      .maybeSingle();

    if (workError) throw new Error(workError.message);

    if (!work) {
      return NextResponse.json({ error: "Obra no encontrada." }, { status: 404 });
    }

    const price = Number(work.price_mxn || 0);

    if (price <= 0) {
      return NextResponse.json(
        { error: "Esta obra es gratuita. Usa Obtener en lugar de Comprar." },
        { status: 400 }
      );
    }

    if (work.author_id === user.id) {
      return NextResponse.json(
        { error: "El autor ya tiene acceso completo a su propia obra." },
        { status: 400 }
      );
    }

    const { data: alreadyPaid, error: paidError } = await admin
      .from("purchases")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("work_id", work.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();

    if (paidError) throw new Error(paidError.message);

    if (alreadyPaid) {
      return NextResponse.json({ alreadyPurchased: true });
    }

    const { data: purchase, error: purchaseError } = await admin
      .from("purchases")
      .insert({
        buyer_id: user.id,
        work_id: work.id,
        book_slug: work.slug,
        amount_mxn: price,
        currency: "MXN",
        status: "pending",
        provider: "mercadopago",
      })
      .select("*")
      .single();

    if (purchaseError) throw new Error(purchaseError.message);

    const resultBase = `${siteUrl}/compra/resultado?slug=${encodeURIComponent(
      work.slug
    )}`;

    const preferenceBody: Record<string, unknown> = {
      items: [
        {
          id: work.id,
          title: work.title,
          quantity: 1,
          currency_id: "MXN",
          unit_price: price,
        },
      ],
      payer: user.email ? { email: user.email } : undefined,
      external_reference: purchase.id,
      metadata: {
        purchase_id: purchase.id,
        work_id: work.id,
        buyer_id: user.id,
      },
      back_urls: {
        success: `${resultBase}&resultado=success`,
        pending: `${resultBase}&resultado=pending`,
        failure: `${resultBase}&resultado=failure`,
      },
      auto_return: "approved",
    };

    // Hasta que Mercado Pago nos permita configurar la clave secreta de
    // Webhooks, no anunciamos una notification_url. La página de regreso
    // seguirá verificando el pago directamente con Mercado Pago.
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
      preferenceBody.notification_url = `${siteUrl}/api/payments/mercadopago/webhook`;
    }

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(preferenceBody),
        cache: "no-store",
      }
    );

    const preference = (await mpResponse.json().catch(() => null)) as
      | {
          id?: string;
          init_point?: string;
          sandbox_init_point?: string;
          message?: string;
          error?: string;
        }
      | null;

    if (!mpResponse.ok || !preference?.id) {
      await admin
        .from("purchases")
        .update({
          status: "failed",
          provider_status:
            preference?.message || preference?.error || "preference_error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);

      throw new Error(
        preference?.message ||
          preference?.error ||
          "Mercado Pago no pudo crear la preferencia de pago."
      );
    }

    const { error: preferenceSaveError } = await admin
      .from("purchases")
      .update({
        provider_preference_id: preference.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);

    if (preferenceSaveError) {
      throw new Error(preferenceSaveError.message);
    }

    const useSandbox = process.env.MERCADOPAGO_USE_SANDBOX === "true";

    const checkoutUrl = useSandbox
      ? preference.sandbox_init_point || preference.init_point
      : preference.init_point;

    if (!checkoutUrl) {
      await admin
        .from("purchases")
        .update({
          status: "failed",
          provider_status: "missing_checkout_url",
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);

      throw new Error("Mercado Pago no devolvió una URL de checkout.");
    }

    return NextResponse.json({
      purchaseId: purchase.id,
      preferenceId: preference.id,
      checkoutUrl,
      sandbox: useSandbox,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar la compra.";

    logPaymentError("create", error);

    return NextResponse.json(
      { error: toSafePurchaseMessage(message) },
      { status: responseStatusFor(message) }
    );
  }
}
