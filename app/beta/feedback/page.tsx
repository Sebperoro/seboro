"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { getCurrentUser } from "@/lib/userBooks";
import {
  getMyBetaFeedback,
  submitBetaFeedback,
  type BetaFeedbackCategory,
  type BetaFeedbackSeverity,
  type MyBetaFeedback,
} from "@/lib/betaFeedback";

const CATEGORIES: Array<{ id: BetaFeedbackCategory; label: string }> = [
  { id: "bug", label: "Algo no funciona" },
  { id: "usability", label: "Algo es confuso" },
  { id: "idea", label: "Idea o mejora" },
  { id: "content", label: "Problema con contenido" },
  { id: "other", label: "Otro" },
];

const SEVERITIES: Array<{ id: BetaFeedbackSeverity; label: string }> = [
  { id: "low", label: "Menor" },
  { id: "medium", label: "Normal" },
  { id: "high", label: "Importante" },
  { id: "blocker", label: "Me impide continuar" },
];

const STATUS_LABELS: Record<string, string> = {
  new: "Recibido",
  reviewing: "En revisión",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export default function BetaFeedbackPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [category, setCategory] = useState<BetaFeedbackCategory>("bug");
  const [severity, setSeverity] = useState<BetaFeedbackSeverity>("medium");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<MyBetaFeedback[]>([]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const user = await getCurrentUser();
      setLoggedIn(Boolean(user));

      if (user) {
        setItems(await getMyBetaFeedback());
      }
    } catch {
      setLoggedIn(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pagePath = useMemo(() => {
    if (from) return from;

    if (typeof document !== "undefined") {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          return ref.pathname + ref.search;
        }
      } catch {
        // Sin referrer útil.
      }
    }

    return "";
  }, [from]);

  async function submit() {
    setBusy(true);
    setSuccess("");
    setError("");

    try {
      await submitBetaFeedback({
        category,
        severity,
        message,
        pagePath,
      });

      setMessage("");
      setSuccess("Gracias. El feedback quedó registrado.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar el feedback."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Beta SEBORO
        </p>
        <h1 className="mt-2 text-4xl font-black">Enviar feedback</h1>
        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          Durante la beta queremos saber qué falla, qué confunde y qué debería mejorar.
          Los reportes de bloqueo se priorizan arriba de los demás.
        </p>

        {loggedIn === false ? (
          <div className="mt-8 rounded-3xl border border-white/10 p-8">
            <p className="font-bold">Necesitas iniciar sesión para enviar feedback.</p>
            <Link
              href="/cuenta"
              className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : loggedIn ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm font-bold">¿Qué ocurrió?</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCategory(item.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      category === item.id
                        ? "bg-white text-black"
                        : "border border-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-sm font-bold">Impacto</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SEVERITIES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSeverity(item.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      severity === item.id
                        ? severity === "blocker"
                          ? "bg-rose-200 text-rose-950"
                          : "bg-white text-black"
                        : "border border-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                maxLength={4000}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Cuéntanos qué hiciste, qué esperabas que pasara y qué pasó realmente."
                className="mt-6 min-h-52 w-full rounded-2xl border border-white/10 bg-black/20 p-4 leading-7 outline-none placeholder:text-zinc-600"
              />

              {pagePath && (
                <p className="mt-3 text-xs text-zinc-600">
                  Ruta relacionada: {pagePath}
                </p>
              )}

              {error && (
                <p className="mt-4 text-sm text-rose-300">{error}</p>
              )}
              {success && (
                <p className="mt-4 text-sm text-emerald-200">✓ {success}</p>
              )}

              <button
                onClick={submit}
                disabled={busy || message.trim().length < 5}
                className="mt-5 rounded-full bg-white px-6 py-3 font-bold text-black disabled:opacity-40"
              >
                {busy ? "Enviando..." : "Enviar feedback"}
              </button>
            </section>

            <section>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Tus reportes
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Historial · {items.length}
              </h2>

              {items.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-white/10 p-6 text-zinc-500">
                  Todavía no has enviado feedback.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400">
                          {item.category}
                        </span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400">
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-300">
                        {item.message}
                      </p>

                      {item.admin_note && (
                        <div className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-400">
                          <b>SEBORO:</b> {item.admin_note}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <p className="mt-8 text-zinc-500">Cargando...</p>
        )}
      </div>
    </main>
  );
}
