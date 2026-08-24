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
  ).format(new Date(value));
}

function CorrectionCard({
  request,
  onChanged,
}: {
  request: PendingChapterCorrection;
  onChanged: () => Promise<void>;
}) {
  const [notes, setNotes] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
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

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            {request.request_type ===
            "restore"
              ? "Restauración"
              : "Corrección"}{" "}
            · capítulo{" "}
            {
              request.chapter_number
            }
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {request.work_title}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {request.author_name} ·
            base v
            {
              request.current_version
            }
          </p>
        </div>

        <Link
          href={`/publicaciones/${request.work_slug}`}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold"
        >
          Ver obra
        </Link>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-100/70">
          Motivo del autor
        </p>

        <p className="mt-2 leading-6 text-zinc-300">
          {request.change_note}
        </p>

        {request.restore_from_version && (
          <p className="mt-2 text-xs text-zinc-500">
            Solicita restaurar v
            {
              request.restore_from_version
            }
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-rose-300/10 bg-rose-300/[0.03] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Actual · v
            {
              request.current_version
            }
          </p>

          <h3 className="mt-2 font-bold">
            {request.current_title}
          </h3>

          <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-serif text-sm leading-6 text-zinc-400">
            {
              request.current_content
            }
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.03] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Propuesta · v
            {request.current_version +
              1}
          </p>

          <h3 className="mt-2 font-bold">
            {request.proposed_title}
          </h3>

          <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-serif text-sm leading-6 text-zinc-300">
            {
              request.proposed_content
            }
          </div>
        </section>
      </div>

      <textarea
        value={notes}
        maxLength={1000}
        onChange={(event) =>
          setNotes(
            event.target.value
          )
        }
        placeholder="Nota editorial para el autor (opcional al aprobar; recomendable al rechazar)."
        className="mt-5 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-zinc-600"
      />

      {error && (
        <p className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() =>
            decide("approved")
          }
          disabled={busy}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
        >
          Aprobar nueva versión
        </button>

        <button
          onClick={() =>
            decide("rejected")
          }
          disabled={busy}
          className="rounded-full border border-rose-300/20 px-5 py-2.5 text-sm font-semibold text-rose-200 disabled:opacity-40"
        >
          Rechazar
        </button>
      </div>
    </article>
  );
}

export default function AdminCorrectionsPage() {
  const [pending, setPending] =
    useState<
      PendingChapterCorrection[]
    >([]);

  const [recent, setRecent] =
    useState<
      RecentChapterVersion[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        queue,
        audit,
      ] = await Promise.all([
        getPendingChapterCorrections(),
        getRecentChapterVersions(),
      ]);

      setPending(queue);
      setRecent(audit);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el control editorial."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                SEBORO · control editorial
              </p>

              <h1 className="mt-2 text-4xl font-black">
                Correcciones versionadas
              </h1>

              <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
                Ninguna corrección reemplaza
                silenciosamente un capítulo.
                Compara la versión pública con
                la propuesta antes de aprobarla.
              </p>
            </div>

            <Link
              href="/admin/revision"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
            >
              Revisión de obras
            </Link>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-zinc-500">
              Cargando...
            </p>
          ) : (
            <>
              <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Cola
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Pendientes ·{" "}
                      {pending.length}
                    </h2>
                  </div>
                </div>

                {pending.length ===
                0 ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
                    No hay correcciones
                    pendientes.
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {pending.map(
                      (request) => (
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

              <section className="mt-12">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Auditoría
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Versiones aplicadas
                </h2>

                {recent.length ===
                0 ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
                    Aún no se han aplicado
                    correcciones versionadas.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {recent.map(
                      (version) => (
                        <article
                          key={
                            version.version_id
                          }
                          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <b>
                                {
                                  version.work_title
                                }
                              </b>

                              <span className="text-sm text-zinc-500">
                                · Cap.{" "}
                                {
                                  version.chapter_number
                                }{" "}
                                · v
                                {
                                  version.version_number
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-zinc-400">
                              {
                                version.change_note
                              }
                            </p>

                            <p className="mt-2 text-xs text-zinc-600">
                              {
                                version.author_name
                              }{" "}
                              ·{" "}
                              {formatDate(
                                version.created_at
                              )}
                            </p>
                          </div>

                          <Link
                            href={`/publicaciones/${version.work_slug}`}
                            className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold"
                          >
                            Ver obra
                          </Link>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </RoleGate>
  );
}
