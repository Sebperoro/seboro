"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, getUserBook, patchUserBook } from "@/lib/userBooks";

const PURCHASED_KEY = "seboro-purchased";

function readLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PURCHASED_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function PurchaseButton({
  slug,
  price,
}: {
  slug: string;
  price: number;
}) {
  const [purchased, setPurchased] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const user = await getCurrentUser();
      if (!active) return;

      setLoggedIn(Boolean(user));

      if (user) {
        const row = await getUserBook(slug);
        if (active) setPurchased(Boolean(row?.purchased));
      } else {
        setPurchased(readLocal().includes(slug));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  async function purchase() {
    if (purchased || busy) return;

    const accepted = window.confirm(
      `Esta es una compra simulada del prototipo de SEBORO por $${price} MXN. No se realizará ningún cobro real. ¿Continuar?`
    );
    if (!accepted) return;

    if (!loggedIn) {
      const current = readLocal();
      const next = current.includes(slug) ? current : [...current, slug];
      localStorage.setItem(PURCHASED_KEY, JSON.stringify(next));
      setPurchased(true);
      window.dispatchEvent(new Event("seboro-library-updated"));
      return;
    }

    setBusy(true);
    const ok = await patchUserBook(slug, { purchased: true });
    if (ok) setPurchased(true);
    setBusy(false);
  }

  if (price <= 0) {
    return (
      <span className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-black">
        Gratis
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={purchase}
        disabled={purchased || busy || loggedIn === null}
        className={`rounded-full px-6 py-3 font-semibold transition disabled:opacity-70 ${
          purchased ? "bg-emerald-400 text-black" : "bg-white text-black"
        }`}
      >
        {purchased ? "✓ Comprada" : `Comprar · $${price} MXN`}
      </button>

      {loggedIn === false && (
        <Link href="/cuenta" className="text-xs text-zinc-500 underline">
          Sincronizar
        </Link>
      )}
    </div>
  );
}
