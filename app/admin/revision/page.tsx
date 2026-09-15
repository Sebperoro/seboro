"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import TopNav from "@/components/TopNav";

import {
  getMyRole,
  getPendingHumanReviews,
} from "@/lib/moderation";

import {
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";

function workStatusLabel(
  work: PublishedWork
) {
  return work.work_status ===
    "ongoing"
    ? "En proceso"
    : "Terminada";
}

export default function AdminReviewPage() {
  const [
    role,
    setRole,
  ] =
    useState<string | null>(
      null
    );

  const [
    works,
    setWorks,
  ] =
    useState<PublishedWork[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentRole =
          await getMyRole();

        if (!active) {
          return;
        }

        setRole(
          currentRole
        );

        if (
          currentRole ===
          "admin"
        ) {
          const pending =
            await getPendingHumanReviews();

          if (active) {
            setWorks(
              pending
            );
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la revisión editorial."
          );
        }
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
        {/* VOLVER */}

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#b95016]"
        >
          ← Volver a administración
        </Link>

        {/* HERO */}

        <section className="mt-4 overflow-hidden rounded-[30px] border border-[#c9ddea] bg-gradient-to-br from-white via-[#fbfdff] to-[#eef6fb] px-6 py-7 shadow-[0_10px_30px_rgba(57,117,154,0.04)] md:px-8 md:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#39759a]">
                  SEBORO · CONTROL EDITORIAL
                </p>

                <span className="rounded-full border border-[#c9ddea] bg-white/80 px-3 py-1 text-[9px] font-black text-[#39759a]">
                  Revisión humana
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Revisión de obras
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#315f7b] md:text-base">
                Obras que ya superaron los requisitos técnicos y necesitan una decisión editorial humana antes de continuar hacia publicación.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#315f7b]">
                  Pendientes
                </p>

                <p className="mt-1 text-2xl font-black text-[#39759a]">
                  {
                    works.length
                  }
                </p>
              </div>

              <div className="rounded-[18px] border border-[#d6e4d9] bg-[#f3faf5] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#698071]">
                  Estado
                </p>

                <p className="mt-1 text-sm font-black text-[#397053]">
                  Editorial
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ACCESO RÁPIDO */}

        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e4ddd7] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6fb] text-sm font-black text-[#39759a]">
              ✦
            </div>

            <div>
              <p className="text-xs font-black">
                Flujo editorial
              </p>

              <p className="text-[10px] text-[#91867e]">
                Revisión humana y correcciones versionadas forman parte del mismo control editorial.
              </p>
            </div>
          </div>

          <Link
            href="/admin/correcciones"
            className="rounded-full border border-[#c9dfd1] bg-[#f5faf6] px-4 py-2 text-xs font-black text-[#397053] transition hover:bg-[#edf8f0]"
          >
            Correcciones versionadas →
          </Link>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
            {
              error
            }
          </div>
        )}

        {/* CONTENIDO */}

        {loading ? (
          <section className="mt-6 rounded-[24px] border border-[#e4ddd7] bg-white p-8">
            <div className="h-5 w-44 animate-pulse rounded-full bg-[#eee9e5]" />

            <div className="mt-5 space-y-3">
              <div className="h-28 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
              <div className="h-28 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
            </div>
          </section>
        ) : role !==
          "admin" ? (
          <section className="mt-6 rounded-[24px] border border-[#ead5aa] bg-[#fff9eb] p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff2cf] text-lg font-black text-[#8a682d]">
              !
            </div>

            <h2 className="mt-4 text-xl font-black">
              Acceso reservado
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#89785d]">
              Esta cuenta no tiene rol de administrador y no puede acceder a la revisión editorial.
            </p>
          </section>
        ) : (
          <>
            {/* COLA */}

            <section className="mt-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#39759a]">
                    Cola editorial
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Obras pendientes
                  </h2>

                  <p className="mt-1 text-sm text-[#8b8078]">
                    Revisa cada obra individualmente antes de aprobarla o solicitar cambios.
                  </p>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    works.length >
                    0
                      ? "border border-[#c9ddea] bg-[#eef6fb] text-[#39759a]"
                      : "border border-[#c9dfd1] bg-[#eef8f1] text-[#397053]"
                  }`}
                >
                  {works.length >
                  0
                    ? `${works.length} por revisar`
                    : "✓ Cola vacía"}
                </span>
              </div>

              {works.length ===
              0 ? (
                <div className="mt-5 rounded-[24px] border border-[#c9ddea] bg-white p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef6fb] text-lg font-black text-[#39759a]">
                    ✓
                  </div>

                  <h3 className="mt-4 text-lg font-black">
                    No hay obras pendientes
                  </h3>

                  <p className="mt-2 text-sm text-[#8c8179]">
                    La cola de revisión humana está al día.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {works.map(
                    (
                      work
                    ) => (
                      <Link
                        key={
                          work.id
                        }
                        href={`/admin/revision/${work.id}`}
                        className="group grid gap-5 rounded-[24px] border border-[#c9ddea] bg-white p-5 transition hover:-translate-y-[2px] hover:border-[#9fc1d5] hover:shadow-[0_12px_26px_rgba(57,117,154,0.07)] md:grid-cols-[90px_minmax(0,1fr)_auto] md:items-center"
                      >
                        <div
                          className="aspect-[2/3] w-[82px] rounded-[14px] border border-[#ddd6d0] shadow-[0_8px_18px_rgba(56,42,31,0.08)]"
                          style={{
                            background:
                              getWorkCoverBackground(
                                work
                              ),
                          }}
                        />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#c9ddea] bg-[#eef6fb] px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#39759a]">
                              Pendiente
                            </span>

                            <span className="rounded-full border border-[#e4ddd7] bg-[#f5f2ef] px-3 py-1 text-[9px] font-black text-[#7d7169]">
                              {
                                workStatusLabel(
                                  work
                                )
                              }
                            </span>
                          </div>

                          <h3 className="mt-3 truncate text-xl font-black tracking-[-0.025em] text-[#332b26]">
                            {
                              work.title
                            }
                          </h3>

                          {work.subtitle && (
                            <p className="mt-1 truncate text-sm font-semibold text-[#746a63]">
                              {
                                work.subtitle
                              }
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#90857d]">
                            <span>
                              <b className="text-[#655b54]">
                                {
                                  work.genre
                                }
                              </b>
                            </span>

                            <span>
                              {work.language_code.toUpperCase()}
                            </span>

                            <span>
                              {
                                work.age_rating
                              }
                            </span>

                            <span>
                              $
                              {
                                work.price_mxn
                              }{" "}
                              MXN
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#39759a] px-5 py-2.5 text-sm font-black text-white transition group-hover:bg-[#2d617f]">
                            Revisar
                            <span className="ml-2 inline-block transition group-hover:translate-x-1">
                              →
                            </span>
                          </span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              )}
            </section>

            {/* PRINCIPIO EDITORIAL */}

            <section className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[22px] border border-[#c9ddea] bg-[#eef6fb] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#39759a]">
                  Qué revisamos
                </p>

                <h3 className="mt-1 text-lg font-black">
                  Calidad antes de publicación
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[16px] bg-white p-4">
                    <span className="text-sm font-black text-[#39759a]">
                      01
                    </span>

                    <p className="mt-2 text-xs font-black">
                      Preparación
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-[#91867e]">
                      Estructura y contenido suficientes.
                    </p>
                  </div>

                  <div className="rounded-[16px] bg-white p-4">
                    <span className="text-sm font-black text-[#39759a]">
                      02
                    </span>

                    <p className="mt-2 text-xs font-black">
                      Presentación
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-[#91867e]">
                      Sinopsis, datos y claridad editorial.
                    </p>
                  </div>

                  <div className="rounded-[16px] bg-white p-4">
                    <span className="text-sm font-black text-[#39759a]">
                      03
                    </span>

                    <p className="mt-2 text-xs font-black">
                      Decisión
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-[#91867e]">
                      Aprobar o pedir cambios concretos.
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-[22px] border border-[#e4ddd7] border-l-4 border-l-[#b5a99d] bg-[#f5f2ef] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7d7169]">
                  Después de publicar
                </p>

                <h3 className="mt-1 text-xl font-black">
                  El control continúa
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#8a8078]">
                  Una obra publicada puede seguir recibiendo nuevos capítulos o correcciones. Las modificaciones protegidas pasan al sistema de versiones.
                </p>

                <Link
                  href="/admin/correcciones"
                  className="mt-5 inline-flex rounded-full border border-[#e4ddd7] bg-white px-4 py-2 text-xs font-black text-[#7d7169]"
                >
                  Ir a correcciones →
                </Link>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}