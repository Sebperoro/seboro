"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import TopNav from "@/components/TopNav";

import {
  getPendingAuthorApplications,
  reviewAuthorApplication,
} from "@/lib/authorApplications";

type PendingApplication = Awaited<
  ReturnType<
    typeof getPendingAuthorApplications
  >
>[number];

export default function AdminAutoresPage() {
  const [
    applications,
    setApplications,
  ] =
    useState<
      PendingApplication[]
    >([]);

  const [
    notes,
    setNotes,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busyId,
    setBusyId,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setApplications(
        await getPendingAuthorApplications()
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las solicitudes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(
    application: PendingApplication,
    decision:
      | "approved"
      | "rejected"
  ) {
    setBusyId(
      application.id
    );

    setError("");

    try {
      await reviewAuthorApplication(
        application.id,
        decision,
        notes[
          application.id
        ] || ""
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la decisión."
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#39759a]"
        >
          ← Volver a administración
        </Link>

        {/* HERO */}

        <section className="mt-4 overflow-hidden rounded-[30px] border border-[#c9ddea] bg-gradient-to-br from-white via-[#fbfdff] to-[#eef6fb] px-6 py-7 shadow-[0_10px_30px_rgba(57,117,154,0.04)] md:px-8 md:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#315f7b]">
                  SEBORO · GESTIÓN DE CREADORES
                </p>

                <span className="rounded-full border border-[#c9ddea] bg-white/80 px-3 py-1 text-[9px] font-black text-[#39759a]">
                  Acceso de autor
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Solicitudes de autor
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#315f7b] md:text-base">
                Revisa quién solicita activar las herramientas de publicación de SEBORO antes de convertir su cuenta de lector en cuenta de autor.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#315f7b]">
                  Pendientes
                </p>

                <p className="mt-1 text-2xl font-black text-[#39759a]">
                  {
                    applications.length
                  }
                </p>
              </div>

              <div className="rounded-[18px] border border-[#d6e4d9] bg-[#f3faf5] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#698071]">
                  Resultado
                </p>

                <p className="mt-1 text-sm font-black text-[#397053]">
                  Rol de autor
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INFO */}

        <section className="mt-5 rounded-[20px] border border-[#e4ddd7] bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6fb] text-sm font-black text-[#39759a]">
                ✎
              </div>

              <div>
                <p className="text-xs font-black">
                  Qué significa aprobar
                </p>

                <p className="text-[10px] leading-5 text-[#91867e]">
                  La cuenta pasa de lector a autor y obtiene acceso a las herramientas de publicación.
                </p>
              </div>
            </div>

            <span className="rounded-full border border-[#c9ddea] bg-[#eef6fb] px-4 py-2 text-[10px] font-black text-[#39759a]">
              Decisión manual
            </span>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
            {
              error
            }
          </div>
        )}

        {loading ? (
          <section className="mt-6 rounded-[24px] border border-[#e4ddd7] bg-white p-8">
            <div className="h-5 w-48 animate-pulse rounded-full bg-[#eee9e5]" />

            <div className="mt-5 h-64 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
          </section>
        ) : applications.length ===
          0 ? (
          <section className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#315f7b]">
                  Cola de solicitudes
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Autores pendientes
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Solicitudes que necesitan revisión administrativa.
                </p>
              </div>

              <span className="rounded-full border border-[#c9dfd1] bg-[#eef8f1] px-4 py-2 text-xs font-black text-[#397053]">
                ✓ Cola vacía
              </span>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#c9ddea] bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef6fb] text-lg font-black text-[#39759a]">
                ✓
              </div>

              <h3 className="mt-4 text-lg font-black">
                No hay solicitudes pendientes
              </h3>

              <p className="mt-2 text-sm text-[#8c8179]">
                Todas las solicitudes de autor han sido revisadas.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#315f7b]">
                  Cola de solicitudes
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Autores pendientes
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Revisa la motivación y experiencia antes de decidir.
                </p>
              </div>

              <span className="rounded-full border border-[#c9ddea] bg-[#eef6fb] px-4 py-2 text-xs font-black text-[#39759a]">
                {
                  applications.length
                }{" "}
                por revisar
              </span>
            </div>

            <div className="mt-5 space-y-5">
              {applications.map(
                (
                  application
                ) => {
                  const applicationNotes =
                    notes[
                      application.id
                    ] || "";

                  const busy =
                    busyId ===
                    application.id;

                  return (
                    <article
                      key={
                        application.id
                      }
                      className="overflow-hidden rounded-[26px] border border-[#c9ddea] bg-white shadow-[0_10px_28px_rgba(57,117,154,0.04)]"
                    >
                      {/* CABECERA */}

                      <div className="border-b border-[#c9ddea] bg-[#eef6fb] px-5 py-5 md:px-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-[#c9ddea] bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#39759a]">
                                Solicitud pendiente
                              </span>

                              <span className="rounded-full border border-[#e1dbd6] bg-white px-3 py-1 text-[9px] font-black text-[#81766e]">
                                Lector → Autor
                              </span>
                            </div>

                            <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">
                              {
                                application.pen_name
                              }
                            </h3>

                            <p className="mt-1 text-sm text-[#8a8078]">
                              cuenta:{" "}
                              <b className="text-[#60564f]">
                                {
                                  application.display_name
                                }
                              </b>
                            </p>
                          </div>

                          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef6fb] text-xl font-black text-[#39759a]">
                            ✎
                          </div>
                        </div>
                      </div>

                      <div className="p-5 md:p-6">
                        {/* CONTENIDO */}

                        <div className="grid gap-4 lg:grid-cols-2">
                          <section className="rounded-[20px] border border-[#c9ddea] bg-[#eef6fb] p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#39759a]">
                              Motivación
                            </p>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#315f7b]">
                              {
                                application.motivation
                              }
                            </p>
                          </section>

                          <section className="rounded-[20px] border border-[#e4ddd7] bg-[#f5f2ef] p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                              Experiencia
                            </p>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#62717a]">
                              {application.experience ||
                                "No indicó experiencia previa."}
                            </p>
                          </section>
                        </div>

                        {/* NOTAS */}

                        <section className="mt-5 rounded-[20px] border border-[#e3ddd7] bg-[#faf9f7] p-4 md:p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                                Nota administrativa
                              </p>

                              <p className="mt-1 text-xs text-[#91867e]">
                                Opcional al aprobar; recomendable si rechazas.
                              </p>
                            </div>

                            <span className="text-[10px] font-bold text-[#9a9088]">
                              {
                                applicationNotes.length
                              }
                              /1000
                            </span>
                          </div>

                          <textarea
                            value={
                              applicationNotes
                            }
                            maxLength={
                              1000
                            }
                            onChange={(
                              event
                            ) =>
                              setNotes(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [application.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Ej. Tu solicitud fue aprobada. Ya puedes comenzar a preparar tus obras para publicación."
                            className="mt-4 min-h-28 w-full resize-y rounded-[16px] border border-[#ddd6d0] bg-white p-4 text-sm leading-6 outline-none placeholder:text-[#aaa099] focus:border-[#a58fc6]"
                          />
                        </section>

                        {/* DECISIÓN */}

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              decide(
                                application,
                                "approved"
                              )
                            }
                            disabled={
                              busy
                            }
                            className="group rounded-[20px] border border-[#bcdac6] bg-[#eef8f1] p-5 text-left transition hover:border-[#8fc3a0] hover:bg-[#e8f5ec] disabled:opacity-40"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-[#397053]">
                                ✓
                              </div>

                              <span className="text-sm font-black text-[#397053] transition group-hover:translate-x-1">
                                →
                              </span>
                            </div>

                            <p className="mt-4 text-base font-black text-[#315e46]">
                              Aprobar como autor
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[#668071]">
                              La cuenta recibirá acceso a publicación y herramientas de autor.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              decide(
                                application,
                                "rejected"
                              )
                            }
                            disabled={
                              busy
                            }
                            className="group rounded-[20px] border border-[#ebc2bd] bg-[#fff4f2] p-5 text-left transition hover:border-[#d89d95] hover:bg-[#ffefec] disabled:opacity-40"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-[#a24d43]">
                                ×
                              </div>

                              <span className="text-sm font-black text-[#a24d43] transition group-hover:translate-x-1">
                                →
                              </span>
                            </div>

                            <p className="mt-4 text-base font-black text-[#8d443c]">
                              Rechazar solicitud
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[#92655f]">
                              La cuenta seguirá siendo lector y recibirá la nota administrativa.
                            </p>
                          </button>
                        </div>

                        {busy && (
                          <div className="mt-4 rounded-[15px] border border-[#c9ddea] bg-[#eef6fb] p-4 text-center text-xs font-black text-[#39759a]">
                            Guardando decisión...
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* PRINCIPIO */}

        <section className="mt-7 rounded-[22px] border border-[#e4ddd7] border-l-4 border-l-[#b5a99d] bg-[#f5f2ef] p-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e4ddd7] font-black text-[#5b5048]">
              ✎
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                Acceso de creador
              </p>

              <h3 className="mt-1 text-xl font-black">
                Ser autor es un permiso, no una ventaja de ranking
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8a8078]">
                Aprobar una solicitud habilita herramientas de publicación. No concede exposición especial ni altera cómo se descubren o posicionan las obras dentro de SEBORO.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}