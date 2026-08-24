"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SEBORO route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#0a0a0b] px-5 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          SEBORO
        </p>
        <h1 className="mt-3 text-3xl font-black">
          Algo salió mal
        </h1>
        <p className="mt-3 leading-7 text-zinc-400">
          La página encontró un error inesperado. Puedes intentar cargarla otra vez
          sin perder tu sesión.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-zinc-600">
            Referencia: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
          >
            Ir al inicio
          </Link>
          <Link
            href="/beta/feedback"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
          >
            Reportar problema
          </Link>
        </div>
      </div>
    </main>
  );
}
