"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Book } from "@/data/books";
import {
  completionRate,
  getActivityChange,
  getMyAuthorMetric,
  getWorkState,
  purchaseRate,
  type RealAuthorMetric,
  type WorkState,
} from "@/lib/authorMetrics";

type Tab = "Rendimiento" | "Economía" | "Comunidad" | "Administrar";

function stateClass(state: WorkState) {
  if (state === "Creciendo") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (state === "Disminuyendo") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  if (state === "En reposo") {
    return "border-zinc-500/20 bg-zinc-500/10 text-zinc-400";
  }
  return "border-sky-400/20 bg-sky-400/10 text-sky-300";
}

function number(value: number) {
  return value.toLocaleString("es-MX");
}

function ComparisonBars({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const max = Math.max(current, previous, 1);

  return (
    <div className="mt-7 grid grid-cols-2 gap-4">
      <div className="rounded-2xl bg-black/20 p-5">
        <div className="flex h-40 items-end">
          <div
            className="w-full rounded-t-xl bg-white"
            style={{ height: `${Math.max(5, (current / max) * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold">Últimos 30 días</p>
        <p className="mt-1 text-2xl font-black">{number(current)}</p>
      </div>

      <div className="rounded-2xl bg-black/20 p-5">
        <div className="flex h-40 items-end">
          <div
            className="w-full rounded-t-xl bg-zinc-600"
            style={{ height: `${Math.max(5, (previous / max) * 100)}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold">30 días anteriores</p>
        <p className="mt-1 text-2xl font-black">{number(previous)}</p>
      </div>
    </div>
  );
}

export default function AuthorWorkPanel({ book }: { book: Book }) {
  const [metric, setMetric] = useState<RealAuthorMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<Tab>("Rendimiento");
  const [price, setPrice] = useState(String(book.price));
  const [synopsis, setSynopsis] = useState(book.synopsis);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedPrice = localStorage.getItem(`seboro-author-price:${book.slug}`);
    const storedSynopsis = localStorage.getItem(
      `seboro-author-synopsis:${book.slug}`
    );

    if (storedPrice) setPrice(storedPrice);
    if (storedSynopsis) setSynopsis(storedSynopsis);
  }, [book.slug]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getMyAuthorMetric(book.slug);
        if (active) setMetric(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las métricas."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [book.slug]);

  const state = useMemo(
    () => (metric ? getWorkState(metric) : "En reposo"),
    [metric]
  );

  const activityChange = useMemo(
    () => (metric ? getActivityChange(metric) : 0),
    [metric]
  );

  function saveAdmin() {
    localStorage.setItem(`seboro-author-price:${book.slug}`, price);
    localStorage.setItem(`seboro-author-synopsis:${book.slug}`, synopsis);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  const tabs: Tab[] = ["Rendimiento", "Economía", "Comunidad", "Administrar"];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link href="/autor" className="text-sm font-semibold text-zinc-400">
          ← Volver al panel del autor
        </Link>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
          Calculando métricas reales...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link href="/autor" className="text-sm font-semibold text-zinc-400">
          ← Volver al panel del autor
        </Link>
        <div className="mt-6 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6 text-rose-200">
          {error}
        </div>
      </div>
    );
  }

  if (!metric) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link href="/autor" className="text-sm font-semibold text-zinc-400">
          ← Volver al panel del autor
        </Link>
        <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
          Esta obra no está vinculada a tu cuenta de autor.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <Link href="/autor" className="text-sm font-semibold text-zinc-400 hover:text-white">
        ← Volver al panel del autor
      </Link>

      <section className="mt-5 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[160px_1fr] md:p-7">
        <div
          className="aspect-[2/3] w-full rounded-2xl"
          style={{ background: book.cover }}
        />

        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${stateClass(
                state
              )}`}
            >
              {state}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
              {book.status}
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Datos reales
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black md:text-5xl">{book.title}</h1>
          <p className="mt-2 text-zinc-500">
            {book.genre} · {book.chapters.length} capítulos
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/obra/${book.slug}`}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold"
            >
              Ver página pública
            </Link>
            <Link
              href={`/comunidad/${book.slug}`}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold"
            >
              Ver comunidad
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Lectores", number(metric.readers)],
          ["Leyendo", number(metric.reading_now)],
          ["Terminadas", number(metric.finished)],
          ["Compras", number(metric.purchases)],
          [
            "Valoración",
            metric.rating_count > 0 ? metric.average_rating.toFixed(2) : "—",
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item
                ? "bg-white text-black"
                : "border border-white/10 text-zinc-300 hover:border-white/25"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Rendimiento" && (
        <section className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Actividad
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Últimos 30 días vs. periodo anterior
                </h2>
              </div>

              <span
                className={`text-sm font-bold ${
                  activityChange === null || activityChange >= 0
                    ? "text-emerald-300"
                    : "text-rose-300"
                }`}
              >
                {activityChange === null
                  ? "Actividad nueva"
                  : `${activityChange >= 0 ? "↑" : "↓"} ${Math.abs(
                      activityChange
                    ).toFixed(1)}%`}
              </span>
            </div>

            <ComparisonBars
              current={metric.activity_30d}
              previous={metric.activity_prev_30d}
            />

            <p className="mt-5 text-xs leading-5 text-zinc-600">
              Esta señal combina actividad reciente de lectura, opiniones y
              comunidad. En esta etapa es un indicador provisional, no un
              algoritmo definitivo de visibilidad.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Rendimiento
            </p>
            <h2 className="mt-2 text-2xl font-bold">{state}</h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between border-b border-white/10 pb-4">
                <span className="text-zinc-400">Tasa de finalización</span>
                <b>{completionRate(metric).toFixed(1)}%</b>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-4">
                <span className="text-zinc-400">Guardados</span>
                <b>{number(metric.saves)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Valoraciones</span>
                <b>{number(metric.rating_count)}</b>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "Economía" && (
        <section className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Compras
            </p>
            <h2 className="mt-2 text-2xl font-bold">Conversión simulada</h2>

            <p className="mt-6 text-5xl font-black">{number(metric.purchases)}</p>
            <p className="mt-2 text-sm text-zinc-400">
              compras marcadas en el prototipo
            </p>

            <div className="mt-6 flex justify-between border-t border-white/10 pt-5">
              <span className="text-zinc-400">Compras / lectores</span>
              <b>{purchaseRate(metric).toFixed(1)}%</b>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Dinero real
            </p>
            <h2 className="mt-2 text-2xl font-bold">Todavía no conectado</h2>

            <p className="mt-5 leading-7 text-zinc-400">
              El precio visible de esta obra es ${book.price} MXN, pero SEBORO
              todavía no procesa pagos reales. Por eso este panel no inventa
              ingresos, comisiones ni saldo disponible.
            </p>
          </div>
        </section>
      )}

      {tab === "Comunidad" && (
        <section className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Publicaciones", metric.community_posts],
            ["Respuestas", metric.community_replies],
            ["Reacciones", metric.community_reactions],
            ["Críticas", metric.reviews],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-4xl font-black">{number(Number(value))}</p>
            </div>
          ))}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:col-span-2 xl:col-span-4">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Opiniones
            </p>
            <h2 className="mt-2 text-2xl font-bold">Respuesta de lectores</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-5">
                <p className="text-sm text-zinc-500">Valoración media</p>
                <p className="mt-2 text-3xl font-black">
                  {metric.rating_count > 0
                    ? metric.average_rating.toFixed(2)
                    : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-5">
                <p className="text-sm text-zinc-500">Valoraciones</p>
                <p className="mt-2 text-3xl font-black">
                  {number(metric.rating_count)}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-5">
                <p className="text-sm text-zinc-500">Críticas escritas</p>
                <p className="mt-2 text-3xl font-black">
                  {number(metric.reviews)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "Administrar" && (
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Administración
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Datos editables del prototipo
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Esta sección sigue siendo local por ahora. La convertiremos a datos
            reales cuando construyamos el flujo de publicación de obras.
          </p>

          <div className="mt-7 grid gap-6 lg:grid-cols-[220px_1fr]">
            <div>
              <label className="text-sm font-semibold">Precio</label>
              <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/20 px-4">
                <span className="text-zinc-500">$</span>
                <input
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="w-full bg-transparent px-2 py-3 outline-none"
                />
                <span className="text-zinc-500">MXN</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Sinopsis</label>
              <textarea
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                className="mt-2 min-h-36 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
              />
            </div>
          </div>

          <button
            onClick={saveAdmin}
            className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
          >
            Guardar cambios locales
          </button>

          {saved && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-300">
              ✓ Cambios guardados en este navegador.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
