"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  getChapterVersionHistory,
  getLatestChapterCorrectionRequest,
  requestChapterVersionRestore,
  submitChapterCorrection,
  type ChapterCorrectionRequest,
  type ChapterVersion,
} from "@/lib/chapterVersions";
import type { WorkChapter } from "@/lib/publishedWorks";

function versionTypeLabel(
  type: ChapterVersion["change_type"]
) {
  if (type === "correction")
    return "Corrección";
  if (type === "restore")
    return "Restauración";
  if (type === "serial_publish")
    return "Publicación";
  return "Versión inicial";
}

function requestStatusLabel(
  request:
    ChapterCorrectionRequest
) {
  if (request.status === "pending")
    return "Pendiente de revisión";
  if (request.status === "approved")
    return "Aprobada";
  return "Rechazada";
}

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

export default function PublishedChapterVersionPanel({
  chapter,
  onChanged,
}: {
  chapter: WorkChapter;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [versions, setVersions] =
    useState<ChapterVersion[]>([]);

  const [
    latestRequest,
    setLatestRequest,
  ] =
    useState<ChapterCorrectionRequest | null>(
      null
    );

  const [title, setTitle] =
    useState(chapter.title);

  const [content, setContent] =
    useState(chapter.content);

  const [changeNote, setChangeNote] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const pending =
    latestRequest?.status ===
    "pending";

  useEffect(() => {
    setTitle(chapter.title);
    setContent(chapter.content);
  }, [
    chapter.title,
    chapter.content,
    chapter.current_version,
  ]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        history,
        request,
      ] = await Promise.all([
        getChapterVersionHistory(
          chapter.id
        ),
        getLatestChapterCorrectionRequest(
          chapter.id
        ),
      ]);

      setVersions(history);
      setLatestRequest(
        request
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el historial."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleOpen() {
    const next = !open;
    setOpen(next);

    if (next) {
      await load();
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await submitChapterCorrection(
        chapter.id,
        {
          title,
          content,
          changeNote,
        }
      );

      setEditing(false);
      setChangeNote("");
      setMessage(
        "Corrección enviada a revisión editorial."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la corrección."
      );
    } finally {
      setBusy(false);
    }
  }

  async function restore(
    versionNumber: number
  ) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await requestChapterVersionRestore(
        chapter.id,
        versionNumber,
        `Restaurar la versión ${versionNumber}`
      );

      setMessage(
        `Restauración de v${versionNumber} enviada a revisión.`
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo solicitar la restauración."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-2xl border border-sky-300/15 bg-sky-300/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-100/70">
            Edición versionada
          </p>

          <p className="mt-1 text-sm text-zinc-300">
            Versión vigente{" "}
            <b>
              v{chapter.current_version}
            </b>
            {chapter.last_correction_at
              ? " · corregida"
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              setEditing(
                (value) =>
                  !value
              )
            }
            disabled={Boolean(pending)}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Solicitar corrección
          </button>

          <button
            onClick={toggleOpen}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold"
          >
            {open
              ? "Ocultar historial"
              : "Historial"}
          </button>
        </div>
      </div>

      {latestRequest && (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm ${
            latestRequest.status ===
            "pending"
              ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
              : latestRequest.status ===
                "rejected"
              ? "border-rose-300/20 bg-rose-300/10 text-rose-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          <b>
            Última solicitud:{" "}
            {requestStatusLabel(
              latestRequest
            )}
          </b>

          <p className="mt-1 opacity-80">
            {latestRequest.change_note}
          </p>

          {latestRequest.admin_notes && (
            <p className="mt-2 border-t border-current/10 pt-2">
              <b>
                Nota editorial:
              </b>{" "}
              {
                latestRequest.admin_notes
              }
            </p>
          )}
        </div>
      )}

      {editing && !pending && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="font-bold">
            Proponer nueva versión
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            La versión actual seguirá visible
            hasta que un administrador apruebe
            esta corrección.
          </p>

          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-semibold outline-none"
          />

          <textarea
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value
              )
            }
            className="mt-3 min-h-64 w-full rounded-xl border border-white/10 bg-black/30 p-4 font-serif leading-7 outline-none"
          />

          <textarea
            value={changeNote}
            maxLength={500}
            onChange={(event) =>
              setChangeNote(
                event.target.value
              )
            }
            placeholder="Describe el cambio. Ej. Corregí una fecha contradictoria y dos errores ortográficos."
            className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-4 text-sm outline-none placeholder:text-zinc-600"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={submit}
              disabled={
                busy ||
                !title.trim() ||
                content.trim().length <
                  80 ||
                changeNote.trim().length <
                  5
              }
              className="rounded-full bg-sky-100 px-5 py-2.5 text-sm font-semibold text-sky-950 disabled:opacity-40"
            >
              {busy
                ? "Enviando..."
                : "Enviar a revisión"}
            </button>

            <button
              onClick={() => {
                setEditing(false);
                setTitle(
                  chapter.title
                );
                setContent(
                  chapter.content
                );
                setChangeNote("");
              }}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="mt-4 text-sm text-emerald-200">
          ✓ {message}
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-rose-300">
          {error}
        </p>
      )}

      {open && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <h4 className="font-bold">
            Historial de versiones
          </h4>

          {loading ? (
            <p className="mt-3 text-sm text-zinc-500">
              Cargando historial...
            </p>
          ) : versions.length ===
            0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Todavía no hay versiones
              registradas.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {versions.map(
                (version) => (
                  <article
                    key={version.id}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <b>
                            v
                            {
                              version.version_number
                            }
                          </b>

                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                            {versionTypeLabel(
                              version.change_type
                            )}
                          </span>

                          {version.is_current && (
                            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                              VIGENTE
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm font-semibold">
                          {
                            version.title
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {formatDate(
                            version.created_at
                          )}
                        </p>
                      </div>

                      {!version.is_current &&
                        !pending && (
                        <button
                          onClick={() =>
                            restore(
                              version.version_number
                            )
                          }
                          disabled={busy}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                        >
                          Solicitar restaurar
                        </button>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {
                        version.change_note
                      }
                    </p>

                    {version.restored_from_version && (
                      <p className="mt-2 text-xs text-zinc-600">
                        Restaurada desde
                        v
                        {
                          version.restored_from_version
                        }
                      </p>
                    )}

                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-zinc-500">
                        Ver contenido de esta
                        versión
                      </summary>

                      <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 font-serif text-sm leading-6 text-zinc-400">
                        {
                          version.content
                        }
                      </div>
                    </details>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
