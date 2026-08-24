"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import PublishedChapterVersionPanel from "@/components/PublishedChapterVersionPanel";
import {
  addChapter,
  deleteChapter,
  getMyWorkBundle,
  getWorkCoverBackground,
  getWorkReadingStats,
  publishMyWork,
  publishSerialChapter,
  removeMyWorkCover,
  submitMyWorkForReview,
  updateChapter,
  updateMyWork,
  uploadMyWorkCover,
  type AgeRating,
  type PublishedWork,
  type SerialState,
  type WorkChapter,
  type WorkReview,
  type WorkStatus,
} from "@/lib/publishedWorks";

function statusLabel(
  status: PublishedWork["publication_status"]
) {
  if (status === "draft") return "Borrador";
  if (status === "in_review")
    return "En revisión técnica";
  if (status === "human_review")
    return "Pendiente de revisión humana";
  if (status === "changes_requested")
    return "Requiere cambios";
  if (status === "approved")
    return "Aprobada";
  return "Publicada";
}

function ChapterEditor({
  chapter,
  locked,
  onChanged,
}: {
  chapter: WorkChapter;
  locked: boolean;
  onChanged: () => Promise<void>;
}) {
  const [title, setTitle] =
    useState(chapter.title);

  const [content, setContent] =
    useState(chapter.content);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function save() {
    setBusy(true);
    setMessage("");

    try {
      await updateChapter(
        chapter.id,
        {
          title,
          content,
        }
      );

      setMessage("Guardado");
      await onChanged();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage("");

    try {
      await deleteChapter(
        chapter.id
      );

      await onChanged();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Error"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Capítulo {chapter.chapter_number}
        </p>

        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
          chapter.chapter_status === "draft"
            ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
            : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
        }`}>
          {chapter.chapter_status === "draft"
            ? "Borrador"
            : `Publicado · v${chapter.current_version}`}
        </span>
      </div>

      <input
        value={title}
        onChange={(event) =>
          setTitle(
            event.target.value
          )
        }
        disabled={locked}
        className="mt-3 w-full bg-transparent text-xl font-bold outline-none disabled:opacity-60"
      />

      <textarea
        value={content}
        onChange={(event) =>
          setContent(
            event.target.value
          )
        }
        disabled={locked}
        className="mt-4 min-h-64 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-serif leading-7 outline-none disabled:opacity-60"
      />

      {!locked && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={
              busy ||
              !title.trim() ||
              !content.trim()
            }
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Guardar capítulo
          </button>

          <button
            onClick={remove}
            disabled={busy}
            className="rounded-full border border-rose-400/20 px-4 py-2 text-sm font-semibold text-rose-300"
          >
            Eliminar
          </button>

          {message && (
            <span className="text-sm text-zinc-400">
              {message}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export default function WorkEditorPage() {
  const params =
    useParams<{ id: string }>();

  const id = params.id;

  const [work, setWork] =
    useState<PublishedWork | null>(
      null
    );

  const [chapters, setChapters] =
    useState<WorkChapter[]>([]);

  const [
    latestReview,
    setLatestReview,
  ] =
    useState<WorkReview | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [
    coverBusy,
    setCoverBusy,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [subtitle, setSubtitle] =
    useState("");

  const [genre, setGenre] =
    useState("");

  const [tags, setTags] =
    useState("");

  const [synopsis, setSynopsis] =
    useState("");

  const [
    contentWarnings,
    setContentWarnings,
  ] = useState("");

  const [
    languageCode,
    setLanguageCode,
  ] = useState("es");

  const [
    ageRating,
    setAgeRating,
  ] =
    useState<AgeRating>(
      "Sin clasificar"
    );

  const [status, setStatus] =
    useState<WorkStatus>(
      "ongoing"
    );

  const [price, setPrice] =
    useState("0");

  const [serialState, setSerialState] =
    useState<SerialState>("active");
  const [releaseFrequency, setReleaseFrequency] =
    useState("14");
  const [nextReleaseAt, setNextReleaseAt] =
    useState("");
  const [completionTargetAt, setCompletionTargetAt] =
    useState("");
  const [authorCommitment, setAuthorCommitment] =
    useState("");

  const [
    newChapterTitle,
    setNewChapterTitle,
  ] = useState("");

  const [
    newChapterContent,
    setNewChapterContent,
  ] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const bundle =
        await getMyWorkBundle(id);

      if (!bundle) {
        setWork(null);
        setChapters([]);
        setLatestReview(null);
        return;
      }

      setWork(bundle.work);
      setChapters(
        bundle.chapters
      );
      setLatestReview(
        bundle.latestReview
      );

      setTitle(
        bundle.work.title
      );
      setSubtitle(
        bundle.work.subtitle
      );
      setGenre(
        bundle.work.genre
      );
      setTags(
        bundle.work.tags.join(
          ", "
        )
      );
      setSynopsis(
        bundle.work.synopsis
      );
      setContentWarnings(
        bundle.work.content_warnings.join(
          ", "
        )
      );
      setLanguageCode(
        bundle.work.language_code
      );
      setAgeRating(
        bundle.work.age_rating
      );
      setStatus(
        bundle.work.work_status
      );
      setPrice(
        String(
          bundle.work.price_mxn
        )
      );
      setSerialState(bundle.work.serial_state);
      setReleaseFrequency(String(bundle.work.release_frequency_days));
      setNextReleaseAt(bundle.work.next_release_at || "");
      setCompletionTargetAt(bundle.work.completion_target_at || "");
      setAuthorCommitment(bundle.work.author_commitment);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la obra."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [id]);

  const requiredChapters =
    status === "ongoing"
      ? 5
      : 1;

  const reviewLocked =
    useMemo(
      () =>
        work?.publication_status ===
          "in_review" ||
        work?.publication_status ===
          "human_review",
      [work]
    );

  const contentLocked =
    useMemo(
      () =>
        reviewLocked ||
        work?.publication_status ===
          "published",
      [reviewLocked, work]
    );

  const finishedPublished =
    work?.publication_status ===
      "published" &&
    work?.work_status ===
      "finished";

  const stats =
    getWorkReadingStats(
      chapters
    );

  const tagList = tags
    .split(",")
    .map((item) =>
      item.trim()
    )
    .filter(Boolean);

  const completenessChecks =
    [
      Boolean(
        work?.cover_url
      ),
      synopsis.trim().length >=
        100,
      tagList.length >= 2,
      ageRating !==
        "Sin clasificar",
      chapters.length >=
        requiredChapters,
    ];

  const completeness =
    Math.round(
      (completenessChecks.filter(
        Boolean
      ).length /
        completenessChecks.length) *
        100
    );

  async function saveMetadata() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const presentation = {
        subtitle:
          subtitle.trim(),
        tags:
          tags
            .split(",")
            .map((item) =>
              item.trim()
            )
            .filter(Boolean),
        content_warnings:
          contentWarnings
            .split(",")
            .map((item) =>
              item.trim()
            )
            .filter(Boolean),
        language_code:
          languageCode.trim() ||
          "es",
        age_rating:
          ageRating,
      };

      if (contentLocked) {
        await updateMyWork(
          id,
          presentation
        );
      } else {
        await updateMyWork(
          id,
          {
            ...presentation,
            title:
              title.trim(),
            genre:
              genre.trim(),
            synopsis:
              synopsis.trim(),
            work_status:
              status,
            price_mxn:
              Math.max(
                0,
                Number(
                  price
                ) || 0
              ),
          }
        );
      }

      setMessage(
        contentLocked
          ? "Presentación editorial guardada."
          : "Ficha guardada."
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadCover(
    file: File
  ) {
    setCoverBusy(true);
    setError("");
    setMessage("");

    try {
      await uploadMyWorkCover(
        id,
        file
      );

      setMessage(
        "Portada actualizada."
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo subir la portada."
      );
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCoverBusy(true);
    setError("");
    setMessage("");

    try {
      await removeMyWorkCover(
        id
      );

      setMessage(
        "Portada eliminada."
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la portada."
      );
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveSerialPlan() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await updateMyWork(id, {
        serial_state: serialState,
        release_frequency_days: Math.max(
          1,
          Number(releaseFrequency) || 14
        ),
        next_release_at: nextReleaseAt || null,
        completion_target_at: completionTargetAt || null,
        author_commitment: authorCommitment,
      });

      setMessage("Plan de publicación guardado.");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el plan."
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishChapterNow(chapterId: string) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await publishSerialChapter(chapterId);
      setMessage("Capítulo publicado y calendario actualizado.");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar el capítulo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function createChapter() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const nextNumber =
        chapters.length === 0
          ? 1
          : Math.max(
              ...chapters.map(
                (chapter) =>
                  chapter.chapter_number
              )
            ) + 1;

      await addChapter(
        id,
        nextNumber,
        newChapterTitle,
        newChapterContent
      );

      setNewChapterTitle("");
      setNewChapterContent("");

      setMessage(
        `Capítulo ${nextNumber} creado.`
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el capítulo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result =
        await submitMyWorkForReview(
          id
        );

      setMessage(
        result.result ===
          "human_review"
          ? "Superó la revisión técnica y fue enviada a revisión humana."
          : "La revisión técnica encontró cambios necesarios."
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar a revisión."
      );
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await publishMyWork(id);

      setMessage(
        "La obra ya está publicada en SEBORO."
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] p-10 text-white">
        Cargando obra...
      </main>
    );
  }

  if (!work) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] p-10 text-white">
        Esta obra no pertenece a tu cuenta.
      </main>
    );
  }

  const coverEditable =
    !reviewLocked;

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/autor/publicar"
            className="text-sm font-semibold text-zinc-400"
          >
            ← Volver a tus obras
          </Link>

          {work.publication_status ===
            "published" && (
            <Link
              href={`/publicaciones/${work.slug}`}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Ver publicación
            </Link>
          )}
        </div>

        <section className="mt-6 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[180px_1fr]">
          <div>
            <div
              className="aspect-[2/3] rounded-2xl border border-white/10 shadow-2xl"
              style={{
                background:
                  getWorkCoverBackground(
                    work
                  ),
              }}
            />

            <p className="mt-3 text-center text-xs text-zinc-600">
              JPG, PNG o WEBP · máx. 5 MB
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Estado editorial
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {work.title}
            </h1>

            {work.subtitle && (
              <p className="mt-2 text-lg text-zinc-400">
                {work.subtitle}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-300">
                {statusLabel(
                  work.publication_status
                )}
              </span>

              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {stats.wordCount.toLocaleString(
                  "es-MX"
                )}{" "}
                palabras
              </span>

              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                ≈ {stats.readMinutes} min
              </span>
            </div>

            <div className="mt-6 max-w-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  Ficha editorial
                </span>

                <span className="text-zinc-500">
                  {completeness}% completa
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${completeness}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Cuenta portada, sinopsis suficiente, al menos 2 etiquetas,
                clasificación de edad y estructura mínima de capítulos.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">
            ✓ {message}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Portada
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Imagen de la obra
              </h2>
            </div>

            {!coverEditable && (
              <span className="text-sm text-zinc-500">
                Bloqueada mientras está en revisión.
              </span>
            )}
          </div>

          {coverEditable && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">
                {coverBusy
                  ? "Subiendo..."
                  : work.cover_url
                  ? "Cambiar portada"
                  : "Subir portada"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={coverBusy}
                  className="hidden"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0];

                    if (file) {
                      uploadCover(file);
                    }

                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {work.cover_url && (
                <button
                  onClick={removeCover}
                  disabled={coverBusy}
                  className="rounded-full border border-rose-400/20 px-5 py-2.5 text-sm font-semibold text-rose-300 disabled:opacity-40"
                >
                  Quitar portada
                </button>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Ficha editorial
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Presentación de la obra
          </h2>

          {contentLocked && (
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              El contenido principal está bloqueado por el estado editorial,
              pero puedes actualizar portada, subtítulo, etiquetas,
              advertencias y clasificación cuando la obra no está en revisión.
            </p>
          )}

          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">
                  Título
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  disabled={contentLocked}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Género principal
                </label>

                <input
                  value={genre}
                  onChange={(event) =>
                    setGenre(
                      event.target.value
                    )
                  }
                  disabled={contentLocked}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Subtítulo
              </label>

              <input
                value={subtitle}
                maxLength={180}
                onChange={(event) =>
                  setSubtitle(
                    event.target.value
                  )
                }
                disabled={reviewLocked}
                placeholder="Opcional"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Etiquetas
              </label>

              <input
                value={tags}
                onChange={(event) =>
                  setTags(
                    event.target.value
                  )
                }
                disabled={reviewLocked}
                placeholder="isla, misterio psicológico, faro"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-zinc-600">
                Separa con comas. Máximo 8.
              </p>
            </div>

            <textarea
              value={synopsis}
              onChange={(event) =>
                setSynopsis(
                  event.target.value
                )
              }
              disabled={contentLocked}
              className="min-h-36 rounded-2xl border border-white/10 bg-black/20 p-4 disabled:opacity-50"
            />

            <div>
              <label className="text-sm font-semibold">
                Advertencias de contenido
              </label>

              <input
                value={contentWarnings}
                onChange={(event) =>
                  setContentWarnings(
                    event.target.value
                  )
                }
                disabled={reviewLocked}
                placeholder="violencia, duelo, lenguaje fuerte"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-zinc-600">
                Déjalo vacío si no aplica. Máximo 8.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">
                  Idioma
                </label>

                <select
                  value={languageCode}
                  onChange={(event) =>
                    setLanguageCode(
                      event.target.value
                    )
                  }
                  disabled={reviewLocked}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 disabled:opacity-50"
                >
                  <option value="es">
                    Español
                  </option>
                  <option value="en">
                    Inglés
                  </option>
                  <option value="ja">
                    Japonés
                  </option>
                  <option value="pt">
                    Portugués
                  </option>
                  <option value="fr">
                    Francés
                  </option>
                  <option value="other">
                    Otro
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Clasificación de edad
                </label>

                <select
                  value={ageRating}
                  onChange={(event) =>
                    setAgeRating(
                      event.target.value as AgeRating
                    )
                  }
                  disabled={reviewLocked}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 disabled:opacity-50"
                >
                  <option>
                    Sin clasificar
                  </option>
                  <option>
                    Todos
                  </option>
                  <option>13+</option>
                  <option>16+</option>
                  <option>18+</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as WorkStatus
                  )
                }
                disabled={
                  contentLocked ||
                  finishedPublished
                }
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 disabled:opacity-50"
              >
                <option value="ongoing">
                  En proceso
                </option>
                <option value="finished">
                  Terminada
                </option>
              </select>

              <input
                value={price}
                onChange={(event) =>
                  setPrice(
                    event.target.value.replace(
                      /[^0-9.]/g,
                      ""
                    )
                  )
                }
                disabled={contentLocked}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 disabled:opacity-50"
              />
            </div>

            {!reviewLocked && (
              <button
                onClick={saveMetadata}
                disabled={busy}
                className="w-fit rounded-full border border-white/10 px-5 py-2.5 font-semibold disabled:opacity-40"
              >
                {contentLocked
                  ? "Guardar presentación"
                  : "Guardar ficha"}
              </button>
            )}
          </div>
        </section>

        {work.work_status === "ongoing" && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Publicación seriada
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Ritmo y compromiso
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Estado</label>
                <select
                  value={serialState}
                  onChange={(event) =>
                    setSerialState(event.target.value as SerialState)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3"
                >
                  <option value="active">Activa</option>
                  <option value="paused">En pausa</option>
                  <option value="abandoned">Abandonada</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Frecuencia aproximada
                </label>
                <select
                  value={releaseFrequency}
                  onChange={(event) => setReleaseFrequency(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3"
                >
                  <option value="7">1 capítulo por semana</option>
                  <option value="14">2 capítulos al mes</option>
                  <option value="30">1 capítulo al mes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Próximo capítulo previsto
                </label>
                <input
                  type="date"
                  value={nextReleaseAt}
                  onChange={(event) => setNextReleaseAt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Meta de finalización
                </label>
                <input
                  type="date"
                  value={completionTargetAt}
                  onChange={(event) =>
                    setCompletionTargetAt(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3"
                />
              </div>
            </div>

            <textarea
              value={authorCommitment}
              maxLength={500}
              onChange={(event) => setAuthorCommitment(event.target.value)}
              placeholder="Ej. Publicaré aproximadamente dos capítulos al mes mientras la obra esté activa."
              className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none placeholder:text-zinc-600"
            />

            <button
              onClick={saveSerialPlan}
              disabled={busy}
              className="mt-4 rounded-full border border-white/10 px-5 py-2.5 font-semibold disabled:opacity-40"
            >
              Guardar plan de publicación
            </button>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Capítulos ·{" "}
              {chapters.length}
            </h2>

            <span className="text-sm text-zinc-500">
              Estructura:{" "}
              {chapters.length}/
              {requiredChapters}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {chapters.map((chapter) => (
              <div key={chapter.id}>
                <ChapterEditor
                  chapter={chapter}
                  locked={
                    reviewLocked ||
                    finishedPublished ||
                    (
                      work.publication_status === "published" &&
                      chapter.chapter_status === "published"
                    )
                  }
                  onChanged={refresh}
                />

                {work.publication_status === "published" &&
                  chapter.chapter_status === "published" && (
                    <PublishedChapterVersionPanel
                      chapter={chapter}
                      onChanged={refresh}
                    />
                  )}

                {work.publication_status === "published" &&
                  work.work_status === "ongoing" &&
                  chapter.chapter_status === "draft" && (
                    <button
                      onClick={() => publishChapterNow(chapter.id)}
                      disabled={busy}
                      className="mt-3 rounded-full bg-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-40"
                    >
                      Publicar capítulo
                    </button>
                  )}
              </div>
            ))}
          </div>

          {!reviewLocked &&
            !finishedPublished &&
            (
              work.publication_status !== "published" ||
              work.work_status === "ongoing"
            ) && (
              <div className="mt-6 rounded-3xl border border-dashed border-white/15 p-6">
                {work.publication_status === "published" && (
                  <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100/80">
                    Los capítulos nuevos se guardan como <b>borrador</b>.
                    No serán visibles hasta pulsar “Publicar capítulo”.
                  </div>
                )}

                <input
                  value={
                    newChapterTitle
                  }
                  onChange={(event) =>
                    setNewChapterTitle(
                      event.target.value
                    )
                  }
                  placeholder={`Título del capítulo ${
                    chapters.length +
                    1
                  }`}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                />

                <textarea
                  value={
                    newChapterContent
                  }
                  onChange={(event) =>
                    setNewChapterContent(
                      event.target.value
                    )
                  }
                  placeholder="Contenido del capítulo..."
                  className="mt-3 min-h-56 w-full rounded-2xl border border-white/10 bg-black/20 p-4"
                />

                <button
                  onClick={
                    createChapter
                  }
                  disabled={
                    busy ||
                    !newChapterTitle.trim() ||
                    !newChapterContent.trim()
                  }
                  className="mt-4 rounded-full bg-white px-5 py-2.5 font-semibold text-black disabled:opacity-40"
                >
                  Añadir capítulo
                </button>
              </div>
            )}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Revisión y publicación
          </p>

          {work.publication_status ===
          "published" ? (
            <>
              <h2 className="mt-2 text-2xl font-bold">
                Publicada
              </h2>

              <p className="mt-3 text-zinc-400">
                La obra ya está disponible para lectores. Puedes seguir
                actualizando su presentación y portada. Los capítulos ya
                publicados se corrigen mediante versiones revisadas.
              </p>
            </>
          ) : work.publication_status ===
            "human_review" ? (
            <>
              <h2 className="mt-2 text-2xl font-bold">
                Pendiente de revisión humana
              </h2>

              <p className="mt-3 max-w-2xl text-zinc-400">
                La obra superó los requisitos técnicos. Ahora un administrador
                debe revisarla antes de que pueda publicarse.
              </p>
            </>
          ) : work.publication_status ===
            "approved" ? (
            <>
              <h2 className="mt-2 text-2xl font-bold">
                Aprobada para publicar
              </h2>

              <p className="mt-3 text-zinc-400">
                La revisión humana fue aprobada. Ya puedes hacer pública la obra.
              </p>

              <button
                onClick={publish}
                disabled={busy}
                className="mt-5 rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
              >
                Publicar obra
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-bold">
                {work.publication_status ===
                "changes_requested"
                  ? "Requiere cambios"
                  : "Enviar a revisión"}
              </h2>

              {latestReview?.result ===
                "changes_requested" &&
                latestReview.issues.length >
                  0 && (
                  <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                    <p className="font-bold text-amber-100">
                      Cambios técnicos solicitados
                    </p>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100/80">
                      {latestReview.issues.map(
                        (issue) => (
                          <li key={issue}>
                            {issue}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {latestReview?.review_type ===
                "human" &&
                latestReview.result ===
                  "changes_requested" &&
                latestReview.notes && (
                  <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5">
                    <p className="font-bold text-sky-100">
                      Nota del revisor
                    </p>

                    <p className="mt-2 text-sm leading-6 text-sky-100/80">
                      {
                        latestReview.notes
                      }
                    </p>
                  </div>
                )}

              <button
                onClick={submitReview}
                disabled={busy}
                className="mt-5 rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
              >
                {busy
                  ? "Revisando..."
                  : "Enviar a revisión"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
