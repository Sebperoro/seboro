"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getWorkAccess } from "@/lib/workAccess";
import { logPaymentError, toSafePurchaseMessage } from "@/lib/payments/errors";

export default function PurchaseResultPage() {
  const search = useSearchParams();
  const slug = String(search.get("slug") || "");
  const paymentId = String(search.get("payment_id") || search.get("collection_id") || "");
  const result = String(search.get("resultado") || search.get("status") || "pending");

  const [state, setState] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [message, setMessage] = useState("Verificando el pago...");

  useEffect(() => {
    let active = true;

    async function verify() {
      try {
        if (!slug) throw new Error("No se pudo identificar la obra.");

        if (paymentId) {
          const supabase = getSupabaseBrowserClient();
          if (!supabase) throw new Error("Supabase no está configurado.");

          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token) throw new Error("Inicia sesión para verificar tu compra.");

          const response = await fetch("/api/payments/mercadopago/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentId }),
          });

          const payload = (await response.json().catch(() => null)) as
            | { paid?: boolean; status?: string; error?: string }
            | null;

          if (!response.ok) {
            throw new Error(payload?.error || "No se pudo verificar el pago.");
          }
        }

        const access = await getWorkAccess(slug);
        if (!active) return;

        if (access?.fullAccess && access.priceMxn > 0) {
          setState("paid");
          setMessage("Pago confirmado. La obra ya está desbloqueada en tu cuenta.");
          window.dispatchEvent(new Event("seboro-library-updated"));
          return;
        }

        if (result === "failure" || result === "rejected" || result === "cancelled") {
          setState("failed");
          setMessage("El pago no se completó. No se hizo ningún desbloqueo.");
          return;
        }

        setState("pending");
        setMessage("El pago todavía está pendiente de confirmación. Puedes volver a revisar en unos segundos.");
      } catch (error) {
        if (!active) return;
        setState("failed");

        logPaymentError("compra-resultado", error);

        const message =
          error instanceof Error ? error.message : "No se pudo verificar la compra.";
        setMessage(toSafePurchaseMessage(message));
      }
    }

    verify();
    return () => {
      active = false;
    };
  }, [paymentId, result, slug]);

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <section className="mx-auto max-w-2xl px-5 py-16">
        <div className="rounded-[28px] border border-[#ded6cf] bg-white p-7 shadow-[0_16px_36px_rgba(47,41,37,0.07)] md:p-9">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a8d85]">
            Compra SEBORO
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            {state === "paid"
              ? "Compra confirmada"
              : state === "pending"
              ? "Pago pendiente"
              : state === "checking"
              ? "Verificando pago"
              : "No se pudo confirmar"}
          </h1>

          <p className="mt-4 leading-7 text-[#756b64]">{message}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            {slug && (
              <Link
                href={`/publicaciones/${slug}`}
                className="rounded-full bg-[#d96822] px-5 py-3 text-sm font-black text-white transition hover:bg-[#be5717]"
              >
                Volver a la obra
              </Link>
            )}

            <Link
              href="/biblioteca"
              className="rounded-full border border-[#d9c8bc] bg-white px-5 py-3 text-sm font-black text-[#665d57]"
            >
              Mi biblioteca
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
