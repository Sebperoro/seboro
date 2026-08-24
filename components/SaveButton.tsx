"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, getUserBook, patchUserBook } from "@/lib/userBooks";

const SAVED_KEY = "seboro-saved";

function readLocalSaved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function SaveButton({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);
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
        if (active) setSaved(Boolean(row?.saved));
      } else {
        setSaved(readLocalSaved().includes(slug));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  async function toggleSaved() {
    if (busy) return;

    if (!loggedIn) {
      const current = readLocalSaved();
      const next = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];

      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setSaved(next.includes(slug));
      window.dispatchEvent(new Event("seboro-library-updated"));
      return;
    }

    setBusy(true);
    const next = !saved;
    const ok = await patchUserBook(slug, { saved: next });
    if (ok) setSaved(next);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSaved}
        disabled={busy || loggedIn === null}
        className={`rounded-full px-6 py-3 font-semibold transition disabled:opacity-50 ${
          saved
            ? "bg-emerald-400 text-black"
            : "border border-white/15 text-white hover:border-white/30"
        }`}
      >
        {saved ? "✓ Guardada" : "Guardar"}
      </button>

      {loggedIn === false && (
        <Link href="/cuenta" className="text-xs text-zinc-500 underline">
          Sincronizar
        </Link>
      )}
    </div>
  );
}
