"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";

import {
  getPendingChapterCorrections,
  getRecentChapterVersions,
  reviewChapterCorrection,
  type PendingChapterCorrection,
  type RecentChapterVersion,
} from "@/lib/chapterVersions";

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function CorrectionCard({
  request,
  onChanged,
}: {
  request: PendingChapterCorrection;
  onChanged: () => Promise<void>;
}) {
  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function decide(
    decision:
      | "approved"
      | "rejected"
  ) {
    setBusy(true);
    setError("");

    try {
      await reviewChapterCorrection(
        request.request_id,
        decision,
        notes
      );

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la decisión."
      );
    } finally {
      setBusy(false);
    }
  }

  const nextVersion =
    request.current_version +
    1;

  return (
    <article className="overflow-hidden rounded-[26px] border border-[#e2d8d0] bg-white shadow-[0_10px_28px_rgba(64,43,29,0.04)]">
      {/* CABECERA */}

      <div className="border-b border-[#eee7e2] bg-[#fcfaf8] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#c6ded0] bg-[#eef8f1] px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#397053]">
                {request.request_type ===
                "restore"
                  ? "Restauración"
                  : "Corrección"}
              </span>

              <span className="rounded-full border border-[#dfd8d2] bg-white px-3 py-1 text-[9px] font-black text-[#776d66]">
                Capítulo{" "}
                {
                  request.chapter_number
                }
              </span>

              <span className="rounded-full border border-[#d5dfe6] bg-[#f5f9fb] px-3 py-1 text-[9px] font-black text-[#537488]">
                V
                {
                  request.current_version
                }{" "}
                → V
                {
                  nextVersion
                }
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#2e2722]">
              {
                request.work_title
              }
            </h2>

            <p className="mt-1 text-sm text-[#8d8279]">
              por{" "}
              <b className="text-[#665b53]">
                {
                  request.author_name
                }
              </b>
            </p>
          </div>

          <Link
            href={`/publicaciones/${request.work_slug}`}
            className="rounded-full border border-[#ddd5cf] bg-white px-4 py-2 text-xs font-black text-[#685e57] transition hover:border-[#d6a985] hover:text-[#b95016]"
          >
            Ver obra →
          </Link>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {/* MOTIVO */}

        <section className="rounded-[20px] border border-[#cbdde8] bg-[#f4f9fc] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f2f8] text-sm font-black text-[#39759a]">
              ✎
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#39759a]">
              Motivo del autor
            </p>
          </div>

          <p className="mt-3 text-sm leading-6 text-[#536875]">
            {
              request.change_note
            }
          </p>

          {request.restore_from_version && (
            <p className="mt-3 inline-flex rounded-full border border-[#c9dce7] bg-white px-3 py-1 text-[10px] font-black text-[#537488]">
              Solicita restaurar V
              {
                request.restore_from_version
              }
            </p>
          )}
        </section>

        {/* COMPARACIÓN */}

        <div className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8c8179]">
                Comparación editorial
              </p>

              <h3 className="mt-1 text-lg font-black">
                Versión pública vs. propuesta
              </h3>
            </div>

            <p className="text-xs text-[#998e86]">
              Revisa ambos textos antes de decidir.
            </p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* ACTUAL */}

            <section className="overflow-hidden rounded-[20px] border border-[#e7cfcb] bg-[#fff8f7]">
              <div className="border-b border-[#efdbd8] bg-[#fff3f1] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9e5c55]">
                      Versión pública actual
                    </p>

                    <p className="mt-1 text-sm font-black text-[#744841]">
                      V
                      {
                        request.current_version
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-[9px] font-black text-[#94615a]">
                    Visible ahora
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h4 className="font-black text-[#3d332f]">
                  {
                    request.current_title
                  }
                </h4>

                <div className="mt-3 max-h-[390px] overflow-y-auto whitespace-pre-wrap rounded-[14px] border border-[#efe3df] bg-white p-4 font-serif text-sm leading-7 text-[#5f5550]">
                  {
                    request.current_content
                  }
                </div>
              </div>
            </section>

            {/* PROPUESTA */}

            <section className="overflow-hidden rounded-[20px] border border-[#c6dfcf] bg-[#f7fcf8]">
              <div className="border-b border-[#d3e8da] bg-[#edf8f0] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#397053]">
                      Propuesta del autor
                    </p>

                    <p className="mt-1 text-sm font-black text-[#2f694c]">
                      V
                      {
                        nextVersion
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-[9px] font-black text-[#397053]">
                    Pendiente
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h4 className="font-black text-[#30483a]">
                  {
                    request.proposed_title
                  }
                </h4>

                <div className="mt-3 max-h-[390px] overflow-y-auto whitespace-pre-wrap rounded-[14px] border border-[#dbeadf] bg-white p-4 font-serif text-sm leading-7 text-[#4d6254]">
                  {
                    request.proposed_content
                  }
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* DECISIÓN */}

        <section className="mt-5 rounded-[20px] border border-[#e3ddd7] bg-[#faf9f7] p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                Decisión editorial
              </p>

              <h3 className="mt-1 text-lg font-black">
                Nota para el autor
              </h3>
            </div>

            <span className="text-[10px] font-bold text-[#9a9088]">
              {
                notes.length
              }
              /1000
            </span>
          </div>

          <textarea
            value={notes}
            maxLength={1000}
            onChange={(
              event
            ) =>
              setNotes(
                event.target.value
              )
            }
            placeholder="Opcional al aprobar. Recomendable si rechazas la corrección para explicar qué debe cambiar."
            className="mt-4 min-h-28 w-full resize-y rounded-[16px] border border-[#ddd6d0] bg-white p-4 text-sm leading-6 text-[#514841] outline-none placeholder:text-[#aaa099] focus:border-[#d39b73]"
          />

          {error && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {
                error
              }
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                decide(
                  "approved"
                )
              }
              disabled={busy}
              className="rounded-full bg-[#367b57] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2f6d4d] disabled:opacity-40"
            >
              {busy
                ? "Guardando..."
                : `Aprobar V${nextVersion}`}
            </button>

            <button
              type="button"
              onClick={() =>
                decide(
                  "rejected"
                )
              }
              disabled={busy}
              className="rounded-full border border-[#e3bdb7] bg-white px-5 py-2.5 text-sm font-black text-[#a24d43] transition hover:bg-[#fff3f1] disabled:opacity-40"
            >
              Rechazar corrección
            </button>

            <p className="text-[10px] leading-5 text-[#9a9088]">
              Aprobar convierte la propuesta en la nueva versión pública y conserva la anterior en el historial.
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}

export default function AdminCorrectionsPage() {
  const [
    pending,
    setPending,
  ] =
    useState<
      PendingChapterCorrection[]
    >([]);

  const [
    recent,
    setRecent,
  ] =
    useState<
      RecentChapterVersion[]
    >([]);

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

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        queue,
        audit,
      ] =
        await Promise.all([
          getPendingChapterCorrections(),
          getRecentChapterVersions(),
        ]);

      setPending(
        queue
      );

      setRecent(
        audit
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el control editorial."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RoleGate allow={["admin"]}>
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

          <section className="mt-4 overflow-hidden rounded-[30px] border border-[#c9dfd1] bg-gradient-to-br from-white via-[#fbfdfb] to-[#eef8f1] px-6 py-7 shadow-[0_10px_30px_rgba(53,102,74,0.04)] md:px-8 md:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#397053]">
                    SEBORO · CONTROL EDITORIAL
                  </p>

                  <span className="rounded-full border border-[#c7dfcf] bg-white/80 px-3 py-1 text-[9px] font-black text-[#397053]">
                    Versionado protegido
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Correcciones versionadas
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#748078] md:text-base">
                  Ningún capítulo publicado se sustituye silenciosamente. Compara la versión actual con la propuesta del autor antes de aprobar una nueva versión.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-[#ead5aa] bg-[#fff8e8] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#87672e]">
                    Pendientes
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#87672e]">
                    {
                      pending.length
                    }
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#d4e4d9] bg-white/85 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#6f8275]">
                    Aplicadas
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#397053]">
                    {
                      recent.length
                    }
                  </p>
                </div>
              </div>
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
            <div className="mt-5 rounded-[24px] border border-[#e4ddd7] bg-white p-8">
              <div className="h-5 w-40 animate-pulse rounded-full bg-[#eee9e5]" />

              <div className="mt-5 h-56 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
            </div>
          ) : (
            <>
              {/* PENDIENTES */}

              <section className="mt-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#397053]">
                      Cola editorial
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Correcciones pendientes
                    </h2>

                    <p className="mt-1 text-sm text-[#8b8078]">
                      Solicitudes que todavía necesitan una decisión administrativa.
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      pending.length >
                      0
                        ? "border border-[#ead5aa] bg-[#fff8e8] text-[#87672e]"
                        : "border border-[#c9dfd1] bg-[#eef8f1] text-[#397053]"
                    }`}
                  >
                    {pending.length >
                    0
                      ? `${pending.length} por revisar`
                      : "✓ Cola vacía"}
                  </span>
                </div>

                {pending.length ===
                0 ? (
                  <div className="mt-5 rounded-[24px] border border-[#d6e5db] bg-white p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8f1] text-lg font-black text-[#397053]">
                      ✓
                    </div>

                    <h3 className="mt-4 text-lg font-black">
                      Todo al día
                    </h3>

                    <p className="mt-2 text-sm text-[#8c8179]">
                      No hay correcciones pendientes de revisión.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {pending.map(
                      (
                        request
                      ) => (
                        <CorrectionCard
                          key={
                            request.request_id
                          }
                          request={
                            request
                          }
                          onChanged={
                            load
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>

              {/* HISTORIAL */}

              <section className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7d7169]">
                      Auditoría
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Versiones aplicadas
                    </h2>

                    <p className="mt-1 text-sm text-[#8b8078]">
                      Historial reciente de correcciones y restauraciones aprobadas.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#e4ddd7] bg-[#f5f2ef] px-4 py-2 text-xs font-black text-[#7d7169]">
                    {
                      recent.length
                    }{" "}
                    registradas
                  </span>
                </div>

                {recent.length ===
                0 ? (
                  <div className="mt-5 rounded-[24px] border border-[#e3ddd7] bg-white p-8">
                    <p className="font-black">
                      Todavía no hay versiones aplicadas.
                    </p>

                    <p className="mt-2 text-sm text-[#8b8078]">
                      Cuando apruebes una corrección, aparecerá aquí como parte del historial editorial.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e3ddd7] bg-white">
                    {recent.map(
                      (
                        version,
                        index
                      ) => (
                        <article
                          key={
                            version.version_id
                          }
                          className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
                            index <
                            recent.length -
                              1
                              ? "border-b border-[#eee7e2]"
                              : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef8f1] text-xs font-black text-[#397053]">
                                V
                                {
                                  version.version_number
                                }
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-[#3c342e]">
                                  {
                                    version.work_title
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] font-bold text-[#91867e]">
                                  Capítulo{" "}
                                  {
                                    version.chapter_number
                                  }
                                </p>
                              </div>
                            </div>

                            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#776d66]">
                              {
                                version.change_note
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#9a9088]">
                              <span>
                                por{" "}
                                <b>
                                  {
                                    version.author_name
                                  }
                                </b>
                              </span>

                              <span>
                                ·
                              </span>

                              <span>
                                {formatDate(
                                  version.created_at
                                )}
                              </span>

                              {version.change_type ===
                                "restore" && (
                                <>
                                  <span>
                                    ·
                                  </span>

                                  <span className="font-black text-[#397053]">
                                    Restauración
                                  </span>
                                </>
                              )}

                              {version.change_type ===
                                "correction" && (
                                <>
                                  <span>
                                    ·
                                  </span>

                                  <span className="font-black text-[#397053]">
                                    Corrección
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <Link
                            href={`/publicaciones/${version.work_slug}`}
                            className="shrink-0 rounded-full border border-[#ddd5cf] bg-white px-4 py-2 text-center text-xs font-black text-[#665c55] transition hover:border-[#d6a985] hover:text-[#b95016]"
                          >
                            Ver obra →
                          </Link>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>

              {/* PRINCIPIO */}

              <section className="mt-6 rounded-[22px] border border-[#e4ddd7] border-l-4 border-l-[#b5a99d] bg-[#f5f2ef] p-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e4ddd7] font-black text-[#5b5048]">
                    ↺
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                      Principio de SEBORO
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      Nunca borrar la historia editorial
                    </h3>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8a8078]">
                      Una corrección aprobada crea una nueva versión. La anterior continúa existiendo en el historial para proteger a lectores, autores y administración.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </RoleGate>
  );
}