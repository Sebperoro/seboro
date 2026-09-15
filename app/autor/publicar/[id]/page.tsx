"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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
  getCoverRatioWarning,
  getImageAspectRatio,
  getMyWorkBundle,
  getWorkCoverBackground,
  getWorkReadingStats,
  getMyWorkManuscriptUrl,
  publishMyWork,
  publishSerialChapter,
  removeMyWorkCover,
  removeMyWorkManuscript,
  submitMyWorkForReview,
  updateChapter,
  updateMyWork,
  uploadMyWorkCover,
  uploadMyWorkManuscript,
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

function statusBadgeClass(
  status: PublishedWork["publication_status"]
) {
  if (status === "draft")
    return "border-[#e4ddd7] bg-[#f5f2ef] text-[#7d7169]";
  if (status === "in_review")
    return "border-[#c7e0e6] bg-[#eef8fa] text-[#366c7b]";
  if (status === "human_review")
    return "border-[#c9ddea] bg-[#eef6fb] text-[#39759a]";
  if (status === "changes_requested")
    return "border-[#ead5aa] bg-[#fffaf0] text-[#8a682d]";
  if (status === "approved")
    return "border-[#c5dfcf] bg-[#eef8f1] text-[#397053]";
  return "border-[#ecd2bf] bg-[#fff7f1] text-[#b85a1e]";
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
    <article className="rounded-[24px] border border-[#e4ddd7] bg-white p-5 shadow-[0_8px_24px_rgba(64,43,29,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#91867e]">
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
        className="mt-4 min-h-64 w-full rounded-[18px] border border-[#ddd6d0] bg-[#fffefd] p-4 font-serif leading-7 text-[#403934] outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
            className="rounded-full bg-[#d96822] px-4 py-2 text-sm font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
          >
            Guardar capítulo
          </button>

          <button
            onClick={remove}
            disabled={busy}
            className="rounded-full border border-[#efc1b9] bg-[#fff7f5] px-4 py-2 text-sm font-black text-[#a34d43] transition hover:bg-[#fff0ed]"
          >
            Eliminar
          </button>

          {message && (
            <span className="text-sm text-[#7f756e]">
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
  const searchParams = useSearchParams();
  const startMode = searchParams.get("inicio");

  const [editorMode, setEditorMode] =
    useState<"manuscrito" | "nativo">(
      startMode === "manuscrito"
        ? "manuscrito"
        : "nativo"
    );

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

  const [coverRatioWarning, setCoverRatioWarning] = useState("");

  const [coverUploadNotice, setCoverUploadNotice] = useState(
    searchParams.get("coverError") === "1"
  );

  const [
    manuscriptBusy,
    setManuscriptBusy,
  ] = useState(false);

  const [
    manuscriptPreviewUrl,
    setManuscriptPreviewUrl,
  ] = useState<string | null>(null);

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

  const [
    manuscriptChapterCount,
    setManuscriptChapterCount,
  ] = useState("");

  const [sampleEnabled, setSampleEnabled] =
    useState(true);
  const [sampleChapters, setSampleChapters] =
    useState("1");
  const [samplePages, setSamplePages] =
    useState("10");
  const [sampleLevelBonusEnabled, setSampleLevelBonusEnabled] =
    useState(false);

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
      setManuscriptChapterCount(
        bundle.work.manuscript_chapter_count === null
          ? ""
          : String(bundle.work.manuscript_chapter_count)
      );
      setSampleEnabled(bundle.work.sample_enabled);
      setSampleChapters(String(bundle.work.sample_chapters));
      setSamplePages(String(bundle.work.sample_pages));
      setSampleLevelBonusEnabled(bundle.work.sample_level_bonus_enabled);
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

  useEffect(() => {
    if (startMode === "manuscrito") {
      setEditorMode("manuscrito");
    } else if (startMode === "nativo") {
      setEditorMode("nativo");
    }
  }, [startMode]);

  const isPdf =
    work?.content_format === "pdf";

  const pageCount =
    isPdf
      ? Math.max(
          0,
          Number(
            work?.page_count || 0
          )
        )
      : 0;

  const pdfReady =
    Boolean(
      isPdf &&
      work?.source_file_path &&
      work?.processing_status === "ready" &&
      pageCount > 0
    );

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
      isPdf
        ? (
            pdfReady &&
            (
              status !== "ongoing" ||
              Number(manuscriptChapterCount) >= 5
            )
          )
        : chapters.length >=
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
      const commerce = {
        sample_enabled: sampleEnabled,
        sample_chapters: Math.max(0, Math.min(50, Number(sampleChapters) || 0)),
        sample_pages: Math.max(0, Math.min(200, Number(samplePages) || 0)),
        sample_level_bonus_enabled: sampleLevelBonusEnabled,
        ...(work?.content_format === "pdf"
          ? {
              manuscript_chapter_count:
                manuscriptChapterCount.trim() === ""
                  ? null
                  : Math.max(
                      0,
                      Math.round(Number(manuscriptChapterCount) || 0)
                    ),
            }
          : {}),
      };

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
          {
            ...presentation,
            ...commerce,
          }
        );
      } else {
        await updateMyWork(
          id,
          {
            ...presentation,
            ...commerce,
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

      setCoverUploadNotice(false);

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
    setCoverRatioWarning("");

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

  function formatBytes(value: number | null) {
    if (!value || value <= 0) return "—";

    if (value < 1024 * 1024) {
      return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function uploadManuscript(file: File) {
    setManuscriptBusy(true);
    setError("");
    setMessage("");

    try {
      const updated = await uploadMyWorkManuscript(id, file);

      setManuscriptPreviewUrl(null);

      setMessage(
        updated.content_format === "pdf"
          ? "PDF subido correctamente. Conservaremos su diseño fijo."
          : "EPUB subido correctamente. Quedó preparado para procesamiento."
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo subir el manuscrito."
      );
    } finally {
      setManuscriptBusy(false);
    }
  }

  async function removeManuscript() {
    setManuscriptBusy(true);
    setError("");
    setMessage("");

    try {
      await removeMyWorkManuscript(id);
      setManuscriptPreviewUrl(null);
      setMessage("Manuscrito eliminado. La obra volvió al modo nativo.");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el manuscrito."
      );
    } finally {
      setManuscriptBusy(false);
    }
  }

  async function previewManuscript() {
    setManuscriptBusy(true);
    setError("");

    try {
      const url = await getMyWorkManuscriptUrl(id, 3600);

      if (!url) {
        throw new Error("Esta obra todavía no tiene un manuscrito.");
      }

      setManuscriptPreviewUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir la vista previa."
      );
    } finally {
      setManuscriptBusy(false);
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
      <main className="min-h-screen bg-[#faf9f7] p-10 text-[#2b2521]">
        Cargando obra...
      </main>
    );
  }

  if (!work) {
    return (
      <main className="min-h-screen bg-[#faf9f7] p-10 text-[#2b2521]">
        Esta obra no pertenece a tu cuenta.
      </main>
    );
  }

  const coverEditable =
    !reviewLocked;

  const manuscriptMode =
    work.content_format !== "native" ||
    editorMode === "manuscrito";

  const manuscriptEditable =
    !reviewLocked &&
    work.publication_status !== "published";

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto w-full max-w-[1380px] px-4 py-8 sm:px-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/autor/publicar"
            className="text-sm font-black text-[#877a72] transition hover:text-[#d96822]"
          >
            ← Volver a tus obras
          </Link>

          {work.publication_status ===
            "published" && (
            <Link
              href={`/publicaciones/${work.slug}`}
              className="rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#b95016]"
            >
              Ver publicación
            </Link>
          )}
        </div>

        <section className="mt-6 grid gap-6 rounded-[28px] border border-[#e4ddd7] bg-white p-6 shadow-[0_10px_30px_rgba(64,43,29,0.04)] md:grid-cols-[180px_1fr]">
          <div>
            <div
              className="aspect-[2/3] rounded-[20px] border border-[#e4ddd7] shadow-[0_14px_30px_rgba(41,31,24,0.14)]"
              style={{
                background:
                  getWorkCoverBackground(
                    work
                  ),
              }}
            />

            <p className="mt-3 text-center text-xs text-[#aaa099]">
              JPG, PNG o WEBP · máx. 5 MB
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
              Estado editorial
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {work.title}
            </h1>

            {work.subtitle && (
              <p className="mt-2 text-lg text-[#746a63]">
                {work.subtitle}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusBadgeClass(
                  work.publication_status
                )}`}
              >
                {statusLabel(
                  work.publication_status
                )}
              </span>

              <span className="rounded-full border border-[#e4ddd7] bg-[#faf9f7] px-3 py-1 text-xs text-[#756c65]">
                {isPdf
                  ? `${pageCount || "—"} páginas`
                  : `${stats.wordCount.toLocaleString(
                      "es-MX"
                    )} palabras`}
              </span>

              <span className="rounded-full border border-[#e4ddd7] bg-[#faf9f7] px-3 py-1 text-xs text-[#756c65]">
                {isPdf
                  ? "PDF · diseño fijo"
                  : `≈ ${stats.readMinutes} min`}
              </span>
            </div>

            <div className="mt-6 max-w-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  Ficha editorial
                </span>

                <span className="text-[#91867e]">
                  {completeness}% completa
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#efe9e4]">
                <div
                  className="h-full rounded-full bg-[#d96822]"
                  style={{
                    width: `${completeness}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-[#aaa099]">
                {isPdf
                  ? status === "ongoing"
                    ? "Cuenta portada, sinopsis suficiente, al menos 2 etiquetas, clasificación de edad, un PDF listo y al menos 5 capítulos declarados."
                    : "Cuenta portada, sinopsis suficiente, al menos 2 etiquetas, clasificación de edad y un PDF procesado y listo."
                  : "Cuenta portada, sinopsis suficiente, al menos 2 etiquetas, clasificación de edad y estructura mínima de capítulos."}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-[#a34d43]">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-[18px] border border-[#c5dfcf] bg-[#eef8f1] p-4 text-[#397053]">
            ✓ {message}
          </div>
        )}

        <section className="mt-8 rounded-[24px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
                Portada
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Imagen de la obra
              </h2>
            </div>

            {!coverEditable && (
              <span className="text-sm text-[#91867e]">
                Bloqueada mientras está en revisión.
              </span>
            )}
          </div>

          {coverUploadNotice && (
            <div className="mt-4 rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] p-4 text-sm font-semibold text-[#8a682d]">
              Tu obra se creó correctamente. Solo la portada no se pudo subir
              automáticamente — puedes intentarlo de nuevo aquí abajo.
            </div>
          )}

          {coverEditable && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#b95016]">
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

                    event.currentTarget.value = "";

                    if (!file) return;

                    setCoverRatioWarning("");

                    getImageAspectRatio(file)
                      .then((ratio) => {
                        setCoverRatioWarning(
                          getCoverRatioWarning(ratio) || ""
                        );
                      })
                      .catch(() => {});

                    uploadCover(file);
                  }}
                />
              </label>

              {work.cover_url && (
                <button
                  onClick={removeCover}
                  disabled={coverBusy}
                  className="rounded-full border border-[#efc1b9] bg-[#fff7f5] px-5 py-2.5 text-sm font-black text-[#a34d43] transition hover:bg-[#fff0ed] disabled:opacity-40"
                >
                  Quitar portada
                </button>
              )}
            </div>
          )}

          {coverEditable && (
            <p className="mt-3 text-xs text-[#9a9089]">
              JPG, PNG o WEBP · recomendado 2:3 · hasta 5 MB
            </p>
          )}

          {coverRatioWarning && (
            <p className="mt-2 text-xs font-semibold text-[#a3702f]">
              {coverRatioWarning}
            </p>
          )}
        </section>

        {work.content_format === "native" &&
          !reviewLocked &&
          work.publication_status !== "published" && (
          <section className="mt-8 rounded-[24px] border border-[#e4ddd7] bg-white p-5 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
              Forma de trabajo
            </p>

            <h2 className="mt-2 text-xl font-bold">
              ¿Cómo quieres continuar esta obra?
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f756e]">
              Puedes escribir por capítulos dentro de SEBORO o subir un PDF/EPUB como manuscrito principal.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditorMode("manuscrito")}
                className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${
                  editorMode === "manuscrito"
                    ? "border-[#d96822] bg-[#d96822] text-white"
                    : "border-[#ddd6d0] bg-white text-[#665d57] hover:border-[#d3b39d]"
                }`}
              >
                Subir PDF o EPUB
              </button>

              <button
                type="button"
                onClick={() => setEditorMode("nativo")}
                className={`rounded-full border px-5 py-2.5 text-sm font-black transition ${
                  editorMode === "nativo"
                    ? "border-[#2f2d29] bg-[#2f2d29] text-white"
                    : "border-[#ddd6d0] bg-white text-[#665d57] hover:border-[#bdb3ac]"
                }`}
              >
                Editar por capítulos
              </button>
            </div>
          </section>
        )}

        {manuscriptMode && (
          <section className="mt-8 rounded-[24px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
                  Manuscrito
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Archivo principal de la obra
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7f756e]">
                  PDF conserva la maquetación original. EPUB se usará para una
                  lectura adaptable que SEBORO convertirá a experiencia tipo libro.
                </p>
              </div>

              <span className="rounded-full border border-[#e4ddd7] bg-[#faf9f7] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#756c65]">
                {work.content_format === "pdf"
                  ? "PDF · diseño fijo"
                  : work.content_format === "epub"
                  ? "EPUB · adaptable"
                  : "Sin manuscrito"}
              </span>
            </div>

            {work.source_file_path ? (
              <div className="mt-6 rounded-[20px] border border-[#ddd6d0] bg-[#fffdfa] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#3f3934]">
                      {work.source_file_name || "Manuscrito"}
                    </p>

                    <p className="mt-1 text-xs text-[#91867e]">
                      {formatBytes(work.source_file_size)}
                      {" · "}
                      {work.content_format.toUpperCase()}
                      {work.page_count
                        ? ` · ${work.page_count} páginas`
                        : ""}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-[#756c65]">
                      Estado:{" "}
                      {work.processing_status === "ready"
                        ? "Listo"
                        : work.processing_status === "processing"
                        ? "Procesando"
                        : work.processing_status === "pending"
                        ? "Pendiente de procesamiento"
                        : work.processing_status === "error"
                        ? "Error de procesamiento"
                        : "Sin procesamiento"}
                    </p>

                    {work.processing_error && (
                      <p className="mt-2 text-sm text-[#a34d43]">
                        {work.processing_error}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={previewManuscript}
                      disabled={manuscriptBusy}
                      className="rounded-full border border-[#d8cec6] bg-white px-4 py-2 text-sm font-black text-[#5f5751] transition hover:border-[#bdaea2] disabled:opacity-40"
                    >
                      Vista previa
                    </button>

                    {manuscriptEditable && (
                      <>
                        <label className="cursor-pointer rounded-full bg-[#d96822] px-4 py-2 text-sm font-black text-white transition hover:bg-[#b95016]">
                          {manuscriptBusy
                            ? "Procesando..."
                            : "Reemplazar"}

                          <input
                            type="file"
                            accept=".pdf,.epub,application/pdf,application/epub+zip"
                            disabled={manuscriptBusy}
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                uploadManuscript(file);
                              }

                              event.currentTarget.value = "";
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={removeManuscript}
                          disabled={manuscriptBusy}
                          className="rounded-full border border-[#efc1b9] bg-[#fff7f5] px-4 py-2 text-sm font-black text-[#a34d43] transition hover:bg-[#fff0ed] disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[22px] border border-dashed border-[#d8c8bc] bg-[#fffdfa] p-6">
                <p className="font-black text-[#3f3934]">
                  Sube tu manuscrito
                </p>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f756e]">
                  Aceptamos PDF y EPUB de hasta 50 MB. El archivo original se
                  guarda de forma privada.
                </p>

                {manuscriptEditable && (
                  <label className="mt-5 inline-flex cursor-pointer rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#b95016]">
                    {manuscriptBusy
                      ? "Subiendo..."
                      : "Seleccionar PDF o EPUB"}

                    <input
                      type="file"
                      accept=".pdf,.epub,application/pdf,application/epub+zip"
                      disabled={manuscriptBusy}
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          uploadManuscript(file);
                        }

                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {work.content_format === "pdf" &&
              status === "ongoing" && (
              <div className="mt-6 rounded-[20px] border border-[#ead5aa] bg-[#fffaf0] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8a682d]">
                  Obra en proceso
                </p>

                <h3 className="mt-1 text-lg font-black text-[#6f582f]">
                  Capítulos disponibles actualmente
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#806f52]">
                  SEBORO no puede detectar de forma fiable los capítulos dentro
                  de un PDF. Indica cuántos capítulos completos contiene el
                  manuscrito que acabas de subir. Las obras en proceso necesitan
                  al menos 5 antes de enviarse a revisión.
                </p>

                <div className="mt-4 flex max-w-sm items-center gap-3">
                  <input
                    value={manuscriptChapterCount}
                    onChange={(event) =>
                      setManuscriptChapterCount(
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    inputMode="numeric"
                    disabled={reviewLocked}
                    placeholder="Ej. 5"
                    className="w-32 rounded-[14px] border border-[#d8c79f] bg-white px-4 py-3 text-lg font-black outline-none focus:border-[#b58a42] disabled:opacity-60"
                  />

                  <span className="text-sm font-semibold text-[#806f52]">
                    {Number(manuscriptChapterCount) >= 5
                      ? "✓ Cumple el mínimo"
                      : `${Math.max(
                          0,
                          5 - (Number(manuscriptChapterCount) || 0)
                        )} por completar`}
                  </span>
                </div>

                <p className="mt-3 text-xs text-[#9a865f]">
                  Guarda la ficha después de indicar el número.
                </p>
              </div>
            )}

            {manuscriptPreviewUrl && (
              <p className="mt-3 text-xs text-[#aaa099]">
                La vista previa usa un enlace privado temporal.
              </p>
            )}
          </section>
        )}

        <section className="mt-8 rounded-[24px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
            Ficha editorial
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Presentación de la obra
          </h2>

          {contentLocked && (
            <p className="mt-3 text-sm leading-6 text-[#91867e]">
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
              />

              <p className="mt-2 text-xs text-[#aaa099]">
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
              className="min-h-36 rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] p-4 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
              />

              <p className="mt-2 text-xs text-[#aaa099]">
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                className="rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
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
                className="rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none focus:border-[#d6a985] disabled:bg-[#f4f1ee] disabled:opacity-70"
              />
            </div>

            <div className="rounded-[20px] border border-[#d9e5d9] bg-[#f8fbf6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#55765a]">
                    Muestra gratuita
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#344c38]">
                    Deja que prueben la obra antes de comprarla
                  </h3>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-[#718074]">
                    Solo afecta a obras de pago. Una obra gratuita siempre queda disponible completa.
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#bfd0bf] bg-white px-3 py-2 text-xs font-black text-[#456849]">
                  <input
                    type="checkbox"
                    checked={sampleEnabled}
                    onChange={(event) => setSampleEnabled(event.target.checked)}
                    disabled={reviewLocked}
                    className="h-4 w-4 accent-[#4f7951]"
                  />
                  Activar muestra
                </label>
              </div>

              {sampleEnabled && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {work.content_format === "pdf" ? (
                    <label className="text-sm font-semibold text-[#4d5c50]">
                      Páginas de muestra
                      <input
                        value={samplePages}
                        onChange={(event) =>
                          setSamplePages(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        disabled={reviewLocked}
                        inputMode="numeric"
                        className="mt-2 w-full rounded-[14px] border border-[#cdd9cd] bg-white px-4 py-3 outline-none focus:border-[#7fa181] disabled:opacity-60"
                      />
                    </label>
                  ) : (
                    <label className="text-sm font-semibold text-[#4d5c50]">
                      Capítulos de muestra
                      <input
                        value={sampleChapters}
                        onChange={(event) =>
                          setSampleChapters(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        disabled={reviewLocked}
                        inputMode="numeric"
                        className="mt-2 w-full rounded-[14px] border border-[#cdd9cd] bg-white px-4 py-3 outline-none focus:border-[#7fa181] disabled:opacity-60"
                      />
                    </label>
                  )}

                  <label className="flex items-center gap-3 rounded-[14px] border border-[#cdd9cd] bg-white px-4 py-3 text-sm font-semibold text-[#4d5c50]">
                    <input
                      type="checkbox"
                      checked={sampleLevelBonusEnabled}
                      onChange={(event) => setSampleLevelBonusEnabled(event.target.checked)}
                      disabled={reviewLocked}
                      className="h-4 w-4 accent-[#4f7951]"
                    />
                    <span>
                      Permitir ampliación futura por nivel de lector
                      <span className="mt-0.5 block text-[11px] font-medium text-[#849087]">
                        Queda preparado; los niveles se activarán en un bloque posterior.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>

            {!reviewLocked && (
              <button
                onClick={saveMetadata}
                disabled={busy}
                className="w-fit rounded-full bg-[#d96822] px-5 py-2.5 font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
              >
                {contentLocked
                  ? "Guardar presentación"
                  : "Guardar ficha"}
              </button>
            )}
          </div>
        </section>

        {work.work_status === "ongoing" &&
          work.content_format === "native" && (
          <section className="mt-8 rounded-[24px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985]"
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985]"
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985]"
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
                  className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985]"
                />
              </div>
            </div>

            <textarea
              value={authorCommitment}
              maxLength={500}
              onChange={(event) => setAuthorCommitment(event.target.value)}
              placeholder="Ej. Publicaré aproximadamente dos capítulos al mes mientras la obra esté activa."
              className="mt-4 min-h-28 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] p-4 outline-none placeholder:text-[#aaa099] focus:border-[#d6a985]"
            />

            <button
              onClick={saveSerialPlan}
              disabled={busy}
              className="mt-4 rounded-full bg-[#d96822] px-5 py-2.5 font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
            >
              Guardar plan de publicación
            </button>
          </section>
        )}

        {!manuscriptMode ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Capítulos ·{" "}
                {chapters.length}
              </h2>

            <span className="text-sm text-[#91867e]">
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
                      className="mt-3 rounded-full bg-[#397053] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2f6048] disabled:opacity-40"
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
              <div className="mt-6 rounded-[24px] border border-dashed border-[#d8c8bc] bg-[#fffdfa] p-6">
                {work.publication_status === "published" && (
                  <div className="mb-5 rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] p-4 text-sm text-[#806f52]">
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
                  className="w-full rounded-[16px] border border-[#ddd6d0] bg-white px-4 py-3 outline-none focus:border-[#d6a985]"
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
                  className="mt-3 min-h-56 w-full rounded-[16px] border border-[#ddd6d0] bg-white p-4 outline-none focus:border-[#d6a985]"
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
                  className="mt-4 rounded-full bg-[#d96822] px-5 py-2.5 font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
                >
                  Añadir capítulo
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-8 rounded-[24px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
              Contenido
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Contenido administrado por manuscrito
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7f756e]">
              Esta obra no necesita que copies capítulos manualmente aquí.
              El archivo subido será la fuente principal del contenido.
            </p>

            {work.content_format === "epub" && (
              <div className="mt-5 rounded-[18px] border border-[#e4ddd7] bg-[#faf9f7] p-4 text-sm leading-6 text-[#7f756e]">
                El siguiente bloque de implementación procesará el EPUB para
                detectar su estructura y preparar capítulos/páginas automáticamente.
              </div>
            )}

            {work.content_format === "pdf" && (
              <div className="mt-5 rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] p-4 text-sm leading-6 text-[#806f52]">
                <p className="font-black text-[#6f582f]">
                  PDF · {pageCount || "—"} páginas · diseño fijo
                </p>
                <p className="mt-1">
                  El PDF conservará sus páginas y maquetación original. No se
                  convertirá en capítulos editables dentro de SEBORO.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="mt-10 rounded-[24px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.03)]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91867e]">
            Revisión y publicación
          </p>

          {work.publication_status ===
          "published" ? (
            <>
              <h2 className="mt-2 text-2xl font-bold">
                Publicada
              </h2>

              <p className="mt-3 text-[#7f756e]">
                {isPdf
                  ? "La obra ya está disponible para lectores. Puedes seguir actualizando su presentación y portada; el PDF publicado conserva su edición original."
                  : "La obra ya está disponible para lectores. Puedes seguir actualizando su presentación y portada. Los capítulos ya publicados se corrigen mediante versiones revisadas."}
              </p>
            </>
          ) : work.publication_status ===
            "human_review" ? (
            <>
              <h2 className="mt-2 text-2xl font-bold">
                Pendiente de revisión humana
              </h2>

              <p className="mt-3 max-w-2xl text-[#7f756e]">
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

              <p className="mt-3 text-[#7f756e]">
                La revisión humana fue aprobada. Ya puedes hacer pública la obra.
              </p>

              <button
                onClick={publish}
                disabled={busy}
                className="mt-5 rounded-full bg-[#d96822] px-6 py-3 font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
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
                  <div className="mt-5 rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] p-5">
                    <p className="font-bold text-[#8a682d]">
                      Cambios técnicos solicitados
                    </p>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#806f52]">
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
                  <div className="mt-5 rounded-[18px] border border-[#c9ddea] bg-[#eef6fb] p-5">
                    <p className="font-bold text-[#39759a]">
                      Nota del revisor
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#315f7b]">
                      {
                        latestReview.notes
                      }
                    </p>
                  </div>
                )}

              <button
                onClick={submitReview}
                disabled={busy}
                className="mt-5 rounded-full bg-[#d96822] px-6 py-3 font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
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

