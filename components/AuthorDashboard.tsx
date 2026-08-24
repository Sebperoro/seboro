"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { books } from "@/data/books";
import {
  completionRate,
  getActivityChange,
  getMyAuthorMetrics,
  getWorkState,
  type RealAuthorMetric,
  type WorkState,
} from "@/lib/authorMetrics";

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

export default function AuthorDashboard() {
  const [metrics, setMetrics] = useState<RealAuthorMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getMyAuthorMetrics();
        if (active) setMetrics(result);
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
  }, []);

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, metric) => {
        acc.readers += metric.readers;
        acc.reading += metric.reading_now;
        acc.finished += metric.finished;
        acc.purchases += metric.purchases;
        acc.posts += metric.community_posts;
        acc.replies += metric.community_replies;
        acc.reactions += metric.community_reactions;
        acc.reviews += metric.reviews;
        acc.ratingCount += metric.rating_count;
        acc.ratingSum += metric.average_rating * metric.rating_count;
        return acc;
      },
      {
        readers: 0,
        reading: 0,
        finished: 0,
        purchases: 0,
        posts: 0,
        replies: 0,
        reactions: 0,
        reviews: 0,
        ratingCount: 0,
        ratingSum: 0,
      }
    );
  }, [metrics]);

  const catalogRating =
    totals.ratingCount > 0 ? totals.ratingSum / totals.ratingCount : 0;

  const totalCommunity =
    totals.posts + totals.replies + totals.reactions;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-7 md:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Centro del creador
            </p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">
              Panel del autor
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Métricas privadas calculadas con actividad real de lectores,
              opiniones y comunidad.
            </p>
          </div>

          <Link
            href="/autor/configuracion"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-white/25"
          >
            Configurar identidad de autor
          </Link>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
          Calculando métricas reales...
        </div>
      ) : metrics.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-bold">Todavía no hay obras vinculadas</h2>
          <p className="mt-3 max-w-xl text-zinc-400">
            El panel solo muestra información de obras vinculadas a tu cuenta.
          </p>
          <Link
            href="/autor/configuracion"
            className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
          >
            Ir a configuración
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-zinc-500">Lectores registrados</p>
              <p className="mt-2 text-3xl font-black">{number(totals.readers)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Usuarios que han abierto o avanzado una obra
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-zinc-500">Obras terminadas</p>
              <p className="mt-2 text-3xl font-black">{number(totals.finished)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Finalizaciones registradas
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-zinc-500">Compras simuladas</p>
              <p className="mt-2 text-3xl font-black">{number(totals.purchases)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Aún no representan dinero real
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-zinc-500">Valoración media</p>
              <p className="mt-2 text-3xl font-black">
                {totals.ratingCount > 0 ? catalogRating.toFixed(2) : "—"}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {number(totals.ratingCount)} valoraciones
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Rendimiento
              </p>
              <h2 className="mt-2 text-2xl font-bold">Lectura</h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Leyendo ahora</span>
                  <b>{number(totals.reading)}</b>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Finalizaciones</span>
                  <b>{number(totals.finished)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Críticas escritas</span>
                  <b>{number(totals.reviews)}</b>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Economía
              </p>
              <h2 className="mt-2 text-2xl font-bold">Fase de simulación</h2>

              <p className="mt-5 text-4xl font-black">
                {number(totals.purchases)}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                compras registradas en el prototipo.
              </p>
              <p className="mt-5 text-xs leading-5 text-zinc-600">
                SEBORO todavía no calcula ingresos, comisiones ni saldo porque
                los pagos reales aún no están implementados.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Comunidad
              </p>
              <h2 className="mt-2 text-2xl font-bold">Interacciones reales</h2>

              <p className="mt-5 text-4xl font-black">{number(totalCommunity)}</p>
              <div className="mt-4 space-y-2 text-sm text-zinc-400">
                <p>{number(totals.posts)} publicaciones</p>
                <p>{number(totals.replies)} respuestas</p>
                <p>{number(totals.reactions)} reacciones</p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Tus obras
                </p>
                <h2 className="mt-2 text-2xl font-bold">Datos por obra</h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {metrics.map((metric) => {
                const book = books.find((item) => item.slug === metric.book_slug);
                const state = getWorkState(metric);
                const activityChange = getActivityChange(metric);

                return (
                  <article
                    key={metric.book_slug}
                    className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[92px_1fr_auto] md:items-center"
                  >
                    <div
                      className="h-32 w-[92px] rounded-xl bg-zinc-800"
                      style={book ? { background: book.cover } : undefined}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-bold">
                          {book?.title || metric.book_slug}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClass(
                            state
                          )}`}
                        >
                          {state}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-zinc-500">
                        {book ? `${book.status} · ${book.genre}` : metric.book_slug}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <span>
                          <b>{number(metric.readers)}</b>{" "}
                          <span className="text-zinc-500">lectores</span>
                        </span>
                        <span>
                          <b>{number(metric.finished)}</b>{" "}
                          <span className="text-zinc-500">terminaron</span>
                        </span>
                        <span>
                          <b>{completionRate(metric).toFixed(0)}%</b>{" "}
                          <span className="text-zinc-500">finalización</span>
                        </span>
                        <span>
                          <b>{number(metric.purchases)}</b>{" "}
                          <span className="text-zinc-500">compras simuladas</span>
                        </span>
                        <span>
                          <b>
                            {activityChange === null
                              ? "Nueva"
                              : `${activityChange >= 0 ? "+" : ""}${activityChange.toFixed(0)}%`}
                          </b>{" "}
                          <span className="text-zinc-500">actividad 30d</span>
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/autor/obra/${metric.book_slug}`}
                      className="rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-black"
                    >
                      Ver métricas
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
