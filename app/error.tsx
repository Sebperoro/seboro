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
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-5 text-[#25231f]">
      <div className="w-full max-w-xl rounded-[28px] border border-[#d8d2c8] bg-white p-8 text-center shadow-[0_10px_30px_rgba(56,48,40,0.05)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b837b]">
          SEBORO
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">
          Algo salió mal
        </h1>

        <p className="mt-3 leading-7 text-[#746d65]">
          La página encontró un error inesperado. Puedes intentar cargarla otra vez sin perder tu sesión.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs font-semibold text-[#aaa39b]">
            Referencia: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-[#2f2d29] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1e1b]"
          >
            Intentar de nuevo
          </button>

          <Link
            href="/"
            className="rounded-full border border-[#cfc7bd] bg-white px-5 py-2.5 text-sm font-black text-[#57514b] transition hover:border-[#aaa096] hover:text-[#2d2a26]"
          >
            Ir al inicio
          </Link>

          <Link
            href="/beta/feedback"
            className="rounded-full border border-[#cfc7bd] bg-[#faf8f5] px-5 py-2.5 text-sm font-black text-[#57514b] transition hover:border-[#aaa096] hover:text-[#2d2a26]"
          >
            Reportar problema
          </Link>
        </div>
      </div>
    </main>
  );
}