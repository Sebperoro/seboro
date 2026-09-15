"use client";

import { useState } from "react";
import { obtainFreeWork, type WorkAccess } from "@/lib/workAccess";

export default function AcquireButton({
  slug,
  loggedIn,
  onAcquired,
}: {
  slug: string;
  loggedIn: boolean;
  onAcquired?: (access: WorkAccess) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function acquire() {
    setError("");

    if (!loggedIn) {
      window.location.href = `/cuenta?next=${encodeURIComponent(
        `/publicaciones/${slug}`
      )}`;
      return;
    }

    setBusy(true);

    try {
      const nextAccess = await obtainFreeWork(slug);
      onAcquired?.(nextAccess);
      window.dispatchEvent(new Event("seboro-library-updated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo obtener la obra."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={acquire}
        disabled={busy}
        className="rounded-full bg-[#d96822] px-6 py-3 font-black text-white shadow-[0_10px_24px_rgba(217,104,34,0.20)] transition hover:bg-[#be5717] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Añadiendo..." : "Obtener"}
      </button>

      {error && (
        <p className="max-w-xs text-xs font-semibold leading-5 text-[#a84f58]">
          {error}
        </p>
      )}
    </div>
  );
}
