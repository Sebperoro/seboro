"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PurchaseButton({
  slug,
  priceMxn,
  loggedIn,
}: {
  slug: string;
  priceMxn: number;
  loggedIn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setError("");

    if (!loggedIn) {
      window.location.href = `/cuenta?next=${encodeURIComponent(
        `/publicaciones/${slug}`
      )}`;
      return;
    }

    setBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase no está configurado.");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

      const response = await fetch("/api/payments/mercadopago/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug }),
      });

      const result = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; alreadyPurchased?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo iniciar la compra.");
      }

      if (result?.alreadyPurchased) {
        window.location.reload();
        return;
      }

      if (!result?.checkoutUrl) {
        throw new Error("No se recibió la URL de pago.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la compra.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className="rounded-full bg-[#d96822] px-6 py-3 font-black text-white shadow-[0_10px_24px_rgba(217,104,34,0.20)] transition hover:bg-[#be5717] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Preparando pago..." : `Comprar · $${Math.round(priceMxn)} MXN`}
      </button>

      {error && (
        <p className="max-w-xs text-xs font-semibold leading-5 text-[#a84f58]">
          {error}
        </p>
      )}
    </div>
  );
}
