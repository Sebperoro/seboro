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

const CATEGORIES: Array<{
  id: BetaFeedbackCategory;
  label: string;
}> = [
  { id: "bug", label: "Algo no funciona" },
  { id: "usability", label: "Algo es confuso" },
  { id: "idea", label: "Idea o mejora" },
  { id: "content", label: "Problema con contenido" },
  { id: "other", label: "Otro" },
];

const SEVERITIES: Array<{
  id: BetaFeedbackSeverity;
  label: string;
}> = [
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

  const from =
    searchParams.get("from") || "";

  const [loggedIn, setLoggedIn] =
    useState<boolean | null>(null);

  const [category, setCategory] =
    useState<BetaFeedbackCategory>("bug");

  const [severity, setSeverity] =
    useState<BetaFeedbackSeverity>("medium");

  const [message, setMessage] =
    useState("");

  const [items, setItems] =
    useState<MyBetaFeedback[]>([]);

  const [busy, setBusy] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    try {
      const user =
        await getCurrentUser();

      setLoggedIn(Boolean(user));

      if (user) {
        setItems(
          await getMyBetaFeedback()
        );
      }
    } catch {
      setLoggedIn(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pagePath = useMemo(() => {
    if (from) {
      return from;
    }

    if (typeof document !== "undefined") {
      try {
        const ref =
          new URL(document.referrer);

        if (
          ref.origin ===
          window.location.origin
        ) {
          return (
            ref.pathname +
            ref.search
          );
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

      setSuccess(
        "Gracias. El feedback quedó registrado."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el feedback."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#25231f]">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b837b]">
          Beta SEBORO
        </p>

        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
          Enviar feedback
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-[#746d65]">
          Durante la beta queremos saber qué falla, qué confunde y qué debería mejorar.
          Los reportes de bloqueo se priorizan arriba de los demás.
        </p>

        {loggedIn === false ? (
          <div className="mt-8 rounded-[28px] border border-[#d8d2c8] bg-white p-8 shadow-[0_10px_30px_rgba(56,48,40,0.05)]">
            <p className="font-black text-[#3b3732]">
              Necesitas iniciar sesión para enviar feedback.
            </p>

            <Link
              href="/cuenta"
              className="mt-4 inline-block rounded-full bg-[#2f2d29] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1e1b]"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : loggedIn ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-[#d8d2c8] bg-white p-6 shadow-[0_10px_30px_rgba(56,48,40,0.04)]">
              <p className="text-sm font-black text-[#3b3732]">
                ¿Qué ocurrió?
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setCategory(item.id)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      category === item.id
                        ? "bg-[#2f2d29] text-white"
                        : "border border-[#d8d2c8] bg-[#faf8f5] text-[#625c55] hover:border-[#aaa096]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-sm font-black text-[#3b3732]">
                Impacto
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {SEVERITIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSeverity(item.id)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      severity === item.id
                        ? severity === "blocker"
                          ? "border border-[#e6b9b3] bg-[#fff1ef] text-[#a84f58]"
                          : "bg-[#2f2d29] text-white"
                        : "border border-[#d8d2c8] bg-[#faf8f5] text-[#625c55] hover:border-[#aaa096]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                maxLength={4000}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Cuéntanos qué hiciste, qué esperabas que pasara y qué pasó realmente."
                className="mt-6 min-h-52 w-full rounded-[18px] border border-[#d8d2c8] bg-[#fbfaf8] p-4 leading-7 text-[#34312d] outline-none transition placeholder:text-[#aaa39b] focus:border-[#aaa096] focus:bg-white"
              />

              {pagePath && (
                <p className="mt-3 text-xs font-semibold text-[#9a9188]">
                  Ruta relacionada:{" "}
                  {pagePath}
                </p>
              )}

              {error && (
                <div className="mt-4 rounded-[16px] border border-[#e5c3c3] bg-[#fff8f8] p-3 text-sm font-semibold text-[#a84f58]">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-[16px] border border-[#cbdcc9] bg-[#f6faf5] p-3 text-sm font-semibold text-[#4f7951]">
                  ✓ {success}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={
                  busy ||
                  message.trim().length < 5
                }
                className="mt-5 rounded-full bg-[#2f2d29] px-6 py-3 font-black text-white transition hover:bg-[#1f1e1b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? "Enviando..."
                  : "Enviar feedback"}
              </button>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b837b]">
                Tus reportes
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Historial · {items.length}
              </h2>

              {items.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-[#d8d2c8] bg-white p-6 text-[#8b837b] shadow-[0_10px_24px_rgba(56,48,40,0.035)]">
                  Todavía no has enviado feedback.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[22px] border border-[#d8d2c8] bg-white p-5 shadow-[0_8px_20px_rgba(56,48,40,0.03)]"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#d8d2c8] bg-[#faf8f5] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#746d65]">
                          {item.category}
                        </span>

                        <span className="rounded-full border border-[#d8d2c8] bg-[#faf8f5] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#746d65]">
                          {STATUS_LABELS[
                            item.status
                          ] ||
                            item.status}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#5f5550]">
                        {item.message}
                      </p>

                      {item.admin_note && (
                        <div className="mt-3 rounded-[14px] border border-[#e4ddd7] bg-[#faf9f7] p-3 text-sm text-[#746d65]">
                          <b className="text-[#3b3732]">
                            SEBORO:
                          </b>{" "}
                          {item.admin_note}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-[#8b837b]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d8d2c8] border-t-[#2f2d29]" />
            Cargando...
          </div>
        )}
      </div>
    </main>
  );
}