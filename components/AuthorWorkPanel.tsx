"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import WorkStateBadge from "@/components/WorkStateBadge";

import {
  completionRate,
  getActivityChange,
  getMyAuthorMetric,
  getWorkState,
  purchaseRate,
  type RealAuthorMetric,
} from "@/lib/authorMetrics";

import {
  addChapter,
  getCoverRatioWarning,
  getImageAspectRatio,
  getMyWorkBundle,
  getMyWorks,
  getWorkCoverBackground,
  publishMyWork,
  publishSerialChapter,
  removeMyWorkCover,
  submitMyWorkForReview,
  updateChapter,
  updateMyWork,
  uploadMyWorkCover,
  type AgeRating,
  type PublishedWork,
  type WorkChapter,
  type WorkReview,
  type WorkStatus,
} from "@/lib/publishedWorks";

import {
  getChapterVersionHistory,
  getLatestChapterCorrectionRequest,
  submitChapterCorrection,
  type ChapterCorrectionRequest,
  type ChapterVersion,
} from "@/lib/chapterVersions";

type Tab =
  | "Resumen"
  | "Contenido"
  | "Detalles"
  | "Rendimiento"
  | "Comunidad"
  | "Publicación";

type WorkBundle = {
  work: PublishedWork;
  chapters: WorkChapter[];
  latestReview: WorkReview | null;
};

type ChapterEditorMode =
  | "new"
  | "edit"
  | "correct"
  | null;

function number(value: number) {
  return value.toLocaleString("es-MX");
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function splitList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
}

function publicationLabel(
  status: PublishedWork["publication_status"]
) {
  if (status === "published") {
    return "Publicada";
  }

  if (status === "approved") {
    return "Aprobada";
  }

  if (status === "human_review") {
    return "Revisión humana";
  }

  if (status === "in_review") {
    return "En revisión";
  }

  if (status === "changes_requested") {
    return "Cambios solicitados";
  }

  return "Borrador";
}

function publicationClass(
  status: PublishedWork["publication_status"]
) {
  if (status === "published") {
    return "border-[#a9d7b8] bg-[#edf8f0] text-[#267444]";
  }

  if (status === "approved") {
    return "border-[#b8d4ea] bg-[#eef6fc] text-[#347197]";
  }

  if (
    status === "in_review" ||
    status === "human_review"
  ) {
    return "border-[#e4ce9f] bg-[#fff8e7] text-[#87672e]";
  }

  if (status === "changes_requested") {
    return "border-[#ebb8b0] bg-[#fff1ef] text-[#a24b42]";
  }

  return "border-[#ded7d1] bg-[#f5f2ef] text-[#786f68]";
}

function chapterStatusLabel(
  chapter: WorkChapter
) {
  return chapter.chapter_status === "published"
    ? "Publicado"
    : "Borrador";
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(value));
}

function formatVersionDate(
  value: string
) {
  if (!value) {
    return "Fecha no disponible";
  }

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

function ActivityComparison({
  current,
  previous,
  change,
}: {
  current: number;
  previous: number;
  change: number | null;
}) {
  const max = Math.max(
    current,
    previous,
    1
  );

  const currentWidth =
    Math.max(
      4,
      (current / max) * 100
    );

  const previousWidth =
    Math.max(
      4,
      (previous / max) * 100
    );

  return (
    <article className="rounded-[22px] border border-[#e3ddd7] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#7c8791]">
            Actividad real
          </p>

          <h3 className="mt-1 text-lg font-black text-[#39322d]">
            Últimos 30 días
          </h3>

          <p className="mt-1 text-xs text-[#948980]">
            Comparado con los 30 días anteriores
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1.5 text-xs font-black ${
            change === null
              ? "bg-[#eef6fc] text-[#347197]"
              : change >= 0
              ? "bg-[#edf8f0] text-[#2e7547]"
              : "bg-[#fff1ef] text-[#a34d43]"
          }`}
        >
          {change === null
            ? "Actividad nueva"
            : `${
                change >= 0
                  ? "↗ +"
                  : "↘ −"
              }${Math.abs(
                change
              ).toFixed(1)}%`}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#625a54]">
              Últimos 30 días
            </span>

            <b className="text-[#347197]">
              {number(current)}
            </b>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#edf0f2]">
            <div
              className="h-full rounded-full bg-[#4c91bf]"
              style={{
                width: `${currentWidth}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#867c75]">
              30 días anteriores
            </span>

            <b className="text-[#756d67]">
              {number(previous)}
            </b>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#edf0f2]">
            <div
              className="h-full rounded-full bg-[#aab3ba]"
              style={{
                width: `${previousWidth}%`,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  description?: string;
  icon: string;
  tone?:
    | "neutral"
    | "blue"
    | "green"
    | "purple"
    | "orange";
}) {
  const tones = {
    neutral: {
      bg: "#f5f3f1",
      color: "#6f655e",
    },

    blue: {
      bg: "#eef6fc",
      color: "#347197",
    },

    green: {
      bg: "#edf8f0",
      color: "#2f7950",
    },

    purple: {
      bg: "#f5f1fb",
      color: "#6d54a2",
    },

    orange: {
      bg: "#fff0e5",
      color: "#bc591d",
    },
  };

  const selected =
    tones[tone];

  return (
    <article className="rounded-[20px] border border-[#e5ddd7] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91867d]">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#342d28]">
            {value}
          </p>
        </div>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black"
          style={{
            background:
              selected.bg,
            color:
              selected.color,
          }}
        >
          {icon}
        </div>
      </div>

      {description && (
        <p className="mt-2 text-[10px] leading-4 text-[#91877f]">
          {description}
        </p>
      )}
    </article>
  );
}

export default function AuthorWorkPanel({
  slug,
}: {
  slug: string;
}) {
  const editorRef =
    useRef<HTMLElement | null>(
      null
    );

  const [
    bundle,
    setBundle,
  ] =
    useState<WorkBundle | null>(
      null
    );

  const [
    metric,
    setMetric,
  ] =
    useState<RealAuthorMetric | null>(
      null
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

  const [
    notFound,
    setNotFound,
  ] =
    useState(false);

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "Resumen"
    );

  /*
   * DETALLES
   */

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    subtitle,
    setSubtitle,
  ] =
    useState("");

  const [
    genre,
    setGenre,
  ] =
    useState("");

  const [
    synopsis,
    setSynopsis,
  ] =
    useState("");

  const [
    price,
    setPrice,
  ] =
    useState("");

  const [
    tags,
    setTags,
  ] =
    useState("");

  const [
    warnings,
    setWarnings,
  ] =
    useState("");

  const [
    languageCode,
    setLanguageCode,
  ] =
    useState("es");

  const [
    ageRating,
    setAgeRating,
  ] =
    useState<AgeRating>(
      "Sin clasificar"
    );

  const [
    workStatus,
    setWorkStatus,
  ] =
    useState<WorkStatus>(
      "ongoing"
    );

  const [
    commitment,
    setCommitment,
  ] =
    useState("");

  const [
    frequencyDays,
    setFrequencyDays,
  ] =
    useState("14");

  const [
    savingDetails,
    setSavingDetails,
  ] =
    useState(false);

  const [
    detailMessage,
    setDetailMessage,
  ] =
    useState("");

  const [
    detailError,
    setDetailError,
  ] =
    useState("");

  /*
   * PORTADA
   */

  const [
    coverBusy,
    setCoverBusy,
  ] =
    useState(false);

  const [
    coverMessage,
    setCoverMessage,
  ] =
    useState("");

  const [
    coverError,
    setCoverError,
  ] =
    useState("");

  const [
    coverRatioWarning,
    setCoverRatioWarning,
  ] =
    useState("");

  /*
   * CAPÍTULOS
   */

  const [
    chapterEditor,
    setChapterEditor,
  ] =
    useState<ChapterEditorMode>(
      null
    );

  const [
    editingChapterId,
    setEditingChapterId,
  ] =
    useState<string | null>(
      null
    );

  const [
    chapterTitle,
    setChapterTitle,
  ] =
    useState("");

  const [
    chapterContent,
    setChapterContent,
  ] =
    useState("");

  const [
    correctionNote,
    setCorrectionNote,
  ] =
    useState("");

  const [
    chapterBusy,
    setChapterBusy,
  ] =
    useState(false);

  const [
    chapterMessage,
    setChapterMessage,
  ] =
    useState("");

  const [
    chapterError,
    setChapterError,
  ] =
    useState("");

  /*
   * SOLICITUDES DE CORRECCIÓN
   */

  const [
    correctionRequests,
    setCorrectionRequests,
  ] =
    useState<
      Record<
        string,
        ChapterCorrectionRequest | null
      >
    >({});

  /*
   * HISTORIAL DE VERSIONES
   */

  const [
    historyChapterId,
    setHistoryChapterId,
  ] =
    useState<string | null>(
      null
    );

  const [
    historyVersions,
    setHistoryVersions,
  ] =
    useState<ChapterVersion[]>(
      []
    );

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(false);

  const [
    historyError,
    setHistoryError,
  ] =
    useState("");

  const [
    expandedVersion,
    setExpandedVersion,
  ] =
    useState<number | null>(
      null
    );

  /*
   * PUBLICACIÓN
   */

  const [
    publicationBusy,
    setPublicationBusy,
  ] =
    useState(false);

  const [
    publicationMessage,
    setPublicationMessage,
  ] =
    useState("");

  const [
    publicationError,
    setPublicationError,
  ] =
    useState("");

  function loadForm(
    work: PublishedWork
  ) {
    setTitle(
      work.title
    );

    setSubtitle(
      work.subtitle
    );

    setGenre(
      work.genre
    );

    setSynopsis(
      work.synopsis
    );

    setPrice(
      String(
        work.price_mxn
      )
    );

    setTags(
      work.tags.join(
        ", "
      )
    );

    setWarnings(
      work.content_warnings.join(
        ", "
      )
    );

    setLanguageCode(
      work.language_code
    );

    setAgeRating(
      work.age_rating
    );

    setWorkStatus(
      work.work_status
    );

    setCommitment(
      work.author_commitment
    );

    setFrequencyDays(
      String(
        work.release_frequency_days
      )
    );
  }

  async function refreshCorrectionRequests(
    chapters: WorkChapter[]
  ) {
    const published =
      chapters.filter(
        (chapter) =>
          chapter.chapter_status ===
          "published"
      );

    if (
      published.length === 0
    ) {
      setCorrectionRequests(
        {}
      );

      return;
    }

    const rows =
      await Promise.all(
        published.map(
          async (
            chapter
          ) => {
            try {
              const request =
                await getLatestChapterCorrectionRequest(
                  chapter.id
                );

              return [
                chapter.id,
                request,
              ] as const;
            } catch {
              return [
                chapter.id,
                null,
              ] as const;
            }
          }
        )
      );

    setCorrectionRequests(
      Object.fromEntries(
        rows
      )
    );
  }

  async function refreshWork(
    workId: string
  ) {
    const fresh =
      await getMyWorkBundle(
        workId
      );

    if (!fresh) {
      throw new Error(
        "No se pudo volver a cargar la obra."
      );
    }

    setBundle(
      fresh
    );

    loadForm(
      fresh.work
    );

    await refreshCorrectionRequests(
      fresh.chapters
    );

    try {
      const freshMetric =
        await getMyAuthorMetric(
          fresh.work.slug
        );

      setMetric(
        freshMetric
      );
    } catch {
      /*
       * Las métricas nunca deben bloquear
       * la administración de la obra.
       */
    }

    return fresh;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setNotFound(false);

      try {
        const myWorks =
          await getMyWorks();

        const target =
          myWorks.find(
            (item) =>
              item.slug === slug
          );

        if (!target) {
          if (active) {
            setNotFound(
              true
            );
          }

          return;
        }

        const [
          workBundle,
          workMetric,
        ] =
          await Promise.all([
            getMyWorkBundle(
              target.id
            ),

            getMyAuthorMetric(
              target.slug
            ).catch(
              () => null
            ),
          ]);

        if (!active) {
          return;
        }

        if (!workBundle) {
          setNotFound(
            true
          );

          return;
        }

        setBundle(
          workBundle
        );

        setMetric(
          workMetric
        );

        loadForm(
          workBundle.work
        );

        await refreshCorrectionRequests(
          workBundle.chapters
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la obra."
        );
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
  }, [slug]);

  /*
   * AUTO-SCROLL AL EDITOR
   */

  useEffect(() => {
    if (!chapterEditor) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          editorRef.current?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
        },
        80
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    chapterEditor,
    editingChapterId,
  ]);

  const work =
    bundle?.work ||
    null;

  const chapters =
    bundle?.chapters ||
    [];

  const latestReview =
    bundle?.latestReview ||
    null;

  const state =
    useMemo(
      () =>
        metric
          ? getWorkState(
              metric
            )
          : "En reposo",
      [metric]
    );

  const activityChange =
    useMemo(
      () =>
        metric
          ? getActivityChange(
              metric
            )
          : null,
      [metric]
    );

  const readers =
    metric?.readers ||
    0;

  const readingNow =
    metric?.reading_now ||
    0;

  const finished =
    metric?.finished ||
    0;

  const purchases =
    metric?.purchases ||
    0;

  const saves =
    metric?.saves ||
    0;

  const ratingCount =
    metric?.rating_count ||
    0;

  const averageRating =
    metric?.average_rating ||
    0;

  const reviews =
    metric?.reviews ||
    0;

  const communityPosts =
    metric?.community_posts ||
    0;

  const communityReplies =
    metric?.community_replies ||
    0;

  const communityReactions =
    metric?.community_reactions ||
    0;

  const completion =
    metric
      ? completionRate(
          metric
        )
      : 0;

  const conversion =
    metric
      ? purchaseRate(
          metric
        )
      : 0;

  const interactions =
    communityPosts +
    communityReplies +
    communityReactions;

  const isPublished =
    work?.publication_status ===
    "published";

  const isFinished =
    work?.work_status ===
    "finished";

  const canAddChapter =
    Boolean(
      work &&
        !(
          isPublished &&
          isFinished
        )
    );

  function canEditChapter(
    chapter: WorkChapter
  ) {
    if (!isPublished) {
      return true;
    }

    return (
      chapter.chapter_status ===
      "draft"
    );
  }

  function resetChapterEditor() {
    setChapterEditor(
      null
    );

    setEditingChapterId(
      null
    );

    setChapterTitle(
      ""
    );

    setChapterContent(
      ""
    );

    setCorrectionNote(
      ""
    );

    setChapterError(
      ""
    );
  }

  function startNewChapter() {
    setChapterMessage(
      ""
    );

    setChapterError(
      ""
    );

    setEditingChapterId(
      null
    );

    setChapterTitle(
      ""
    );

    setChapterContent(
      ""
    );

    setCorrectionNote(
      ""
    );

    setChapterEditor(
      "new"
    );
  }

  function startEditChapter(
    chapter: WorkChapter
  ) {
    setChapterMessage(
      ""
    );

    setChapterError(
      ""
    );

    setEditingChapterId(
      chapter.id
    );

    setChapterTitle(
      chapter.title
    );

    setChapterContent(
      chapter.content
    );

    setCorrectionNote(
      ""
    );

    setChapterEditor(
      "edit"
    );
  }

  function startCorrection(
    chapter: WorkChapter
  ) {
    const request =
      correctionRequests[
        chapter.id
      ];

    if (
      request?.status ===
      "pending"
    ) {
      setChapterMessage(
        ""
      );

      setChapterError(
        "Este capítulo ya tiene una corrección pendiente de revisión."
      );

      return;
    }

    setChapterMessage(
      ""
    );

    setChapterError(
      ""
    );

    setEditingChapterId(
      chapter.id
    );

    setChapterTitle(
      chapter.title
    );

    setChapterContent(
      chapter.content
    );

    setCorrectionNote(
      ""
    );

    setChapterEditor(
      "correct"
    );
  }

  async function saveChapter() {
    if (!work) {
      return;
    }

    if (
      !chapterTitle.trim()
    ) {
      setChapterError(
        "El capítulo necesita un título."
      );

      return;
    }

    if (
      !chapterContent.trim()
    ) {
      setChapterError(
        "El capítulo no puede estar vacío."
      );

      return;
    }

    if (
      chapterEditor ===
        "correct" &&
      !correctionNote.trim()
    ) {
      setChapterError(
        "Explica brevemente qué cambiaste y por qué."
      );

      return;
    }

    setChapterBusy(
      true
    );

    setChapterError(
      ""
    );

    setChapterMessage(
      ""
    );

    try {
      if (
        chapterEditor ===
        "new"
      ) {
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
          work.id,
          nextNumber,
          chapterTitle,
          chapterContent
        );

        await refreshWork(
          work.id
        );

        setChapterMessage(
          isPublished
            ? "✓ Capítulo creado como borrador. Puedes revisarlo antes de publicarlo."
            : "✓ Capítulo añadido correctamente."
        );
      } else if (
        chapterEditor ===
          "edit" &&
        editingChapterId
      ) {
        await updateChapter(
          editingChapterId,
          {
            title:
              chapterTitle,

            content:
              chapterContent,
          }
        );

        await refreshWork(
          work.id
        );

        setChapterMessage(
          "✓ Borrador actualizado correctamente."
        );
      } else if (
        chapterEditor ===
          "correct" &&
        editingChapterId
      ) {
        await submitChapterCorrection(
          editingChapterId,
          {
            title:
              chapterTitle.trim(),

            content:
              chapterContent.trim(),

            changeNote:
              correctionNote.trim(),
          }
        );

        await refreshWork(
          work.id
        );

        setChapterMessage(
          "✓ Corrección enviada a revisión. La versión pública actual permanece sin cambios hasta que SEBORO la apruebe."
        );
      }

      resetChapterEditor();
    } catch (err) {
      setChapterError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el capítulo."
      );
    } finally {
      setChapterBusy(
        false
      );
    }
  }

  async function publishDraftChapter(
    chapter: WorkChapter
  ) {
    if (!work) {
      return;
    }

    setChapterBusy(
      true
    );

    setChapterError(
      ""
    );

    setChapterMessage(
      ""
    );

    try {
      await publishSerialChapter(
        chapter.id
      );

      await refreshWork(
        work.id
      );

      setChapterMessage(
        `✓ Capítulo ${chapter.chapter_number} publicado correctamente.`
      );
    } catch (err) {
      setChapterError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar el capítulo."
      );
    } finally {
      setChapterBusy(
        false
      );
    }
  }

  async function toggleHistory(
    chapter: WorkChapter
  ) {
    if (
      historyChapterId ===
      chapter.id
    ) {
      setHistoryChapterId(
        null
      );

      setHistoryVersions(
        []
      );

      setHistoryError(
        ""
      );

      setExpandedVersion(
        null
      );

      return;
    }

    setHistoryChapterId(
      chapter.id
    );

    setHistoryVersions(
      []
    );

    setHistoryError(
      ""
    );

    setExpandedVersion(
      null
    );

    setHistoryLoading(
      true
    );

    try {
      const versions =
        await getChapterVersionHistory(
          chapter.id
        );

      setHistoryVersions(
        versions
      );
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el historial."
      );
    } finally {
      setHistoryLoading(
        false
      );
    }
  }

  async function saveDetails() {
    if (!work) {
      return;
    }

    if (
      !title.trim()
    ) {
      setDetailError(
        "La obra necesita un título."
      );

      return;
    }

    if (
      !genre.trim()
    ) {
      setDetailError(
        "La obra necesita un género."
      );

      return;
    }

    if (
      !synopsis.trim()
    ) {
      setDetailError(
        "La sinopsis no puede quedar vacía."
      );

      return;
    }

    const numericPrice =
      Number(price);

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      setDetailError(
        "Escribe un precio válido."
      );

      return;
    }

    const numericFrequency =
      Math.max(
        1,
        Math.round(
          Number(
            frequencyDays
          ) || 14
        )
      );

    setSavingDetails(
      true
    );

    setDetailMessage(
      ""
    );

    setDetailError(
      ""
    );

    try {
      const updated =
        await updateMyWork(
          work.id,
          {
            title:
              title.trim(),

            subtitle:
              subtitle.trim(),

            genre:
              genre.trim(),

            synopsis:
              synopsis.trim(),

            price_mxn:
              numericPrice,

            tags:
              splitList(
                tags
              ),

            content_warnings:
              splitList(
                warnings
              ),

            language_code:
              languageCode.trim() ||
              "es",

            age_rating:
              ageRating,

            work_status:
              isPublished
                ? work.work_status
                : workStatus,

            author_commitment:
              commitment.trim(),

            release_frequency_days:
              numericFrequency,
          }
        );

      setBundle(
        (current) =>
          current
            ? {
                ...current,
                work:
                  updated,
              }
            : current
      );

      loadForm(
        updated
      );

      setDetailMessage(
        "✓ Cambios guardados realmente en SEBORO."
      );
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios."
      );
    } finally {
      setSavingDetails(
        false
      );
    }
  }

  async function changeCover(
    file:
      | File
      | undefined
  ) {
    if (
      !work ||
      !file
    ) {
      return;
    }

    setCoverBusy(
      true
    );

    setCoverMessage(
      ""
    );

    setCoverError(
      ""
    );

    try {
      const updated =
        await uploadMyWorkCover(
          work.id,
          file
        );

      setBundle(
        (current) =>
          current
            ? {
                ...current,
                work:
                  updated,
              }
            : current
      );

      setCoverMessage(
        "✓ Portada actualizada correctamente."
      );
    } catch (err) {
      setCoverError(
        err instanceof Error
          ? err.message
          : "No se pudo subir la portada."
      );
    } finally {
      setCoverBusy(
        false
      );
    }
  }

  async function removeCover() {
    if (
      !work ||
      !work.cover_url
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Quieres eliminar la portada actual?"
      );

    if (!confirmed) {
      return;
    }

    setCoverBusy(
      true
    );

    setCoverMessage(
      ""
    );

    setCoverError(
      ""
    );

    setCoverRatioWarning(
      ""
    );

    try {
      const updated =
        await removeMyWorkCover(
          work.id
        );

      setBundle(
        (current) =>
          current
            ? {
                ...current,
                work:
                  updated,
              }
            : current
      );

      setCoverMessage(
        "✓ Portada eliminada."
      );
    } catch (err) {
      setCoverError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la portada."
      );
    } finally {
      setCoverBusy(
        false
      );
    }
  }

  async function submitForReview() {
    if (!work) {
      return;
    }

    setPublicationBusy(
      true
    );

    setPublicationMessage(
      ""
    );

    setPublicationError(
      ""
    );

    try {
      const result =
        await submitMyWorkForReview(
          work.id
        );

      await refreshWork(
        work.id
      );

      if (
        result.result ===
        "changes_requested"
      ) {
        setPublicationMessage(
          `La revisión automática encontró ${result.issues.length} punto(s) que debes corregir.`
        );
      } else {
        setPublicationMessage(
          "✓ La obra pasó a revisión humana."
        );
      }
    } catch (err) {
      setPublicationError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la obra a revisión."
      );
    } finally {
      setPublicationBusy(
        false
      );
    }
  }

  async function publishWork() {
    if (!work) {
      return;
    }

    setPublicationBusy(
      true
    );

    setPublicationMessage(
      ""
    );

    setPublicationError(
      ""
    );

    try {
      const updated =
        await publishMyWork(
          work.id
        );

      await refreshWork(
        updated.id
      );

      setPublicationMessage(
        "✓ La obra ya está publicada en SEBORO."
      );
    } catch (err) {
      setPublicationError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar la obra."
      );
    } finally {
      setPublicationBusy(
        false
      );
    }
  }

  const tabs: {
    id: Tab;
    icon: string;
  }[] = [
    {
      id: "Resumen",
      icon: "⌂",
    },

    {
      id: "Contenido",
      icon: "▤",
    },

    {
      id: "Detalles",
      icon: "✎",
    },

    {
      id: "Rendimiento",
      icon: "⌁",
    },

    {
      id: "Comunidad",
      icon: "💬",
    },

    {
      id: "Publicación",
      icon: "✓",
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <Link
          href="/autor"
          className="text-sm font-bold text-[#8a7d74]"
        >
          ← Volver al panel del autor
        </Link>

        <div className="mt-5 h-44 animate-pulse rounded-[26px] border border-[#e6ddd6] bg-white" />

        <div className="mt-5 h-16 animate-pulse rounded-[22px] border border-[#e6ddd6] bg-white" />

        <div className="mt-5 h-96 animate-pulse rounded-[26px] border border-[#e6ddd6] bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <Link
          href="/autor"
          className="text-sm font-bold text-[#8a7d74]"
        >
          ← Volver al panel del autor
        </Link>

        <div className="mt-5 rounded-[22px] border border-[#efc2ba] bg-[#fff3f1] p-6">
          <p className="font-black text-[#a34d43]">
            No se pudo cargar la obra
          </p>

          <p className="mt-2 text-sm text-[#9c6058]">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (
    notFound ||
    !work
  ) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <Link
          href="/autor"
          className="text-sm font-bold text-[#8a7d74]"
        >
          ← Volver al panel del autor
        </Link>

        <div className="mt-5 rounded-[24px] border border-[#e5d6ca] bg-white p-8">
          <h1 className="text-2xl font-black">
            Obra no encontrada
          </h1>

          <p className="mt-2 text-sm text-[#8b8078]">
            Esta obra no pertenece a la cuenta de autor abierta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
      <Link
        href="/autor"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#857970] transition hover:text-[#b95016]"
      >
        ← Volver al panel del autor
      </Link>

      {/* CABECERA */}

      <section className="mt-4 overflow-hidden rounded-[28px] border border-[#e4c6b0] bg-gradient-to-br from-white via-[#fffaf6] to-[#fff0e5] p-5 shadow-[0_10px_30px_rgba(91,60,37,0.04)] md:p-6">
        <div className="grid gap-5 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center">
          <div
            className="aspect-[2/3] w-[112px] rounded-[15px] border border-[#ded4cc] shadow-[0_10px_24px_rgba(61,43,30,0.12)]"
            style={{
              background:
                getWorkCoverBackground(
                  work
                ),
            }}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <WorkStateBadge
                state={state}
                activityChange={
                  activityChange
                }
              />

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${publicationClass(
                  work.publication_status
                )}`}
              >
                {publicationLabel(
                  work.publication_status
                )}
              </span>

              <span className="rounded-full border border-[#b8d9c3] bg-[#edf8f0] px-3 py-1.5 text-[10px] font-black text-[#34724b]">
                ✓ Obra real
              </span>
            </div>

            <h1 className="mt-3 truncate text-3xl font-black tracking-[-0.04em] text-[#2d2622] md:text-4xl">
              {work.title}
            </h1>

            {work.subtitle && (
              <p className="mt-1 text-sm font-bold text-[#756a62]">
                {work.subtitle}
              </p>
            )}

            <p className="mt-2 text-sm font-semibold text-[#8d8179]">
              {work.genre}
              {" · "}
              {chapters.length}
              {" "}
              {chapters.length === 1
                ? "capítulo"
                : "capítulos"}
              {" · "}
              {isFinished
                ? "Terminada"
                : "En proceso"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:flex-col">
            {isPublished ? (
              <>
                <Link
                  href={`/publicaciones/${work.slug}`}
                  className="rounded-full border border-[#ddd3cb] bg-white px-4 py-2.5 text-center text-xs font-black text-[#62584f]"
                >
                  Ver página pública
                </Link>

                <Link
                  href={`/comunidad/${work.slug}`}
                  className="rounded-full border border-[#dbe1e5] bg-[#f8fafb] px-4 py-2.5 text-center text-xs font-black text-[#5e6e79]"
                >
                  Ver comunidad
                </Link>
              </>
            ) : (
              <span className="rounded-full border border-[#e4ddd7] bg-[#f5f3f1] px-4 py-2.5 text-center text-xs font-black text-[#aaa099]">
                Aún no publicada
              </span>
            )}
          </div>
        </div>
      </section>

      {/* PESTAÑAS */}

      <section className="mt-5 overflow-hidden rounded-[22px] border border-[#e5d8cf] bg-white">
        <div className="flex overflow-x-auto px-2">
          {tabs.map(
            (item) => {
              const active =
                tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setTab(item.id)
                  }
                  className={`relative flex shrink-0 items-center gap-2 px-4 py-4 text-sm transition ${
                    active
                      ? "font-black text-[#302923]"
                      : "font-semibold text-[#887c74]"
                  }`}
                >
                  <span className="text-xs">
                    {item.icon}
                  </span>

                  {item.id}

                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-[#d96822]" />
                  )}
                </button>
              );
            }
          )}
        </div>
      </section>

      <section className="mt-5 min-h-[500px] rounded-[28px] border border-[#e7dcd4] bg-[#fbfaf9] p-5 shadow-[0_8px_26px_rgba(93,62,39,0.03)] md:p-6">
        {/* RESUMEN */}

        {tab ===
          "Resumen" && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a46c48]">
              Resumen
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Panorama de esta obra
            </h2>

            <p className="mt-1 text-sm text-[#8b8078]">
              Estado, lectores y acciones importantes de{" "}
              <b>{work.title}</b>.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <WorkStateBadge
                state={state}
                activityChange={
                  activityChange
                }
                variant="hero"
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Lectores"
                  value={number(
                    readers
                  )}
                  icon="👥"
                  tone="blue"
                />

                <StatCard
                  label="Leyendo ahora"
                  value={number(
                    readingNow
                  )}
                  icon="◉"
                  tone="purple"
                />

                <StatCard
                  label="Finalización"
                  value={`${completion.toFixed(
                    0
                  )}%`}
                  icon="✓"
                  tone="green"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Compras"
                value={number(
                  purchases
                )}
                description={
                  metric
                    ? `${conversion.toFixed(
                        1
                      )}% de lectores`
                    : "Sin datos todavía"
                }
                icon="$"
                tone="green"
              />

              <StatCard
                label="Guardados"
                value={number(
                  saves
                )}
                icon="♡"
                tone="purple"
              />

              <StatCard
                label="Valoración"
                value={
                  ratingCount > 0
                    ? averageRating.toFixed(
                        2
                      )
                    : "—"
                }
                description={`${number(
                  ratingCount
                )} valoraciones`}
                icon="★"
                tone="orange"
              />

              <StatCard
                label="Interacciones"
                value={number(
                  interactions
                )}
                icon="💬"
                tone="blue"
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() =>
                  setTab(
                    "Contenido"
                  )
                }
                className="rounded-[20px] border border-[#e4ddd7] bg-white p-5 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e5] text-[#b95016]">
                  ▤
                </div>

                <p className="mt-4 text-sm font-black">
                  Gestionar contenido
                </p>

                <p className="mt-1 text-xs text-[#8d8279]">
                  Añade, edita y corrige capítulos.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTab(
                    "Detalles"
                  )
                }
                className="rounded-[20px] border border-[#e4ddd7] bg-white p-5 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6fc] text-[#347197]">
                  ✎
                </div>

                <p className="mt-4 text-sm font-black">
                  Editar obra
                </p>

                <p className="mt-1 text-xs text-[#8d8279]">
                  Portada, título, sinopsis y más.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTab(
                    "Rendimiento"
                  )
                }
                className="rounded-[20px] border border-[#e4ddd7] bg-white p-5 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf8f0] text-[#2f7950]">
                  ⌁
                </div>

                <p className="mt-4 text-sm font-black">
                  Estadísticas
                </p>

                <p className="mt-1 text-xs text-[#8d8279]">
                  Rendimiento de esta historia.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTab(
                    "Publicación"
                  )
                }
                className="rounded-[20px] border border-[#e4ddd7] bg-white p-5 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f1fb] text-[#6d54a2]">
                  ✓
                </div>

                <p className="mt-4 text-sm font-black">
                  Publicación
                </p>

                <p className="mt-1 text-xs text-[#8d8279]">
                  Revisión y estado editorial.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* CONTENIDO */}

        {tab ===
          "Contenido" && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a46c48]">
                  Contenido
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Capítulos de la obra
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Administra el contenido real guardado en SEBORO.
                </p>
              </div>

              {canAddChapter ? (
                <button
                  type="button"
                  onClick={
                    startNewChapter
                  }
                  className="rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white"
                >
                  + Añadir capítulo
                </button>
              ) : (
                <span className="rounded-full border border-[#e1cba8] bg-[#fff8ea] px-4 py-2 text-xs font-black text-[#87652e]">
                  Obra terminada
                </span>
              )}
            </div>

            {chapterMessage && (
              <div className="mt-4 rounded-[16px] border border-[#bcdcc7] bg-[#edf8f0] p-4 text-sm font-black text-[#34724b]">
                {chapterMessage}
              </div>
            )}

            {chapterError && (
              <div className="mt-4 rounded-[16px] border border-[#efc1b9] bg-[#fff3f1] p-4 text-sm font-bold text-[#a34d43]">
                {chapterError}
              </div>
            )}

            {/* EDITOR */}

            {chapterEditor && (
              <article
                ref={editorRef}
                className={`mt-5 scroll-mt-28 rounded-[22px] border bg-white p-5 ${
                  chapterEditor ===
                  "correct"
                    ? "border-[#cfc0e8]"
                    : "border-[#d8c1b0]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                          chapterEditor ===
                          "correct"
                            ? "text-[#6d54a2]"
                            : "text-[#a46c48]"
                        }`}
                      >
                        {chapterEditor ===
                        "new"
                          ? "Nuevo capítulo"
                          : chapterEditor ===
                            "correct"
                          ? "Nueva corrección"
                          : "Editar borrador"}
                      </p>

                      {chapterEditor ===
                        "correct" && (
                        <span className="rounded-full bg-[#f5f1fb] px-2.5 py-1 text-[9px] font-black text-[#6d54a2]">
                          Corrección protegida
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 text-lg font-black">
                      {chapterEditor ===
                      "new"
                        ? "Escribe el siguiente capítulo"
                        : chapterEditor ===
                          "correct"
                        ? "Corregir capítulo publicado"
                        : "Modificar borrador"}
                    </h3>

                    {chapterEditor ===
                      "correct" && (
                      <p className="mt-2 max-w-2xl text-xs leading-5 text-[#81758c]">
                        Tus cambios no sustituirán inmediatamente la versión pública. La corrección será enviada a revisión y la versión actual seguirá disponible hasta que SEBORO la apruebe.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      resetChapterEditor
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e3ddd7] bg-white"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Título del capítulo
                  </label>

                  <input
                    value={
                      chapterTitle
                    }
                    onChange={(
                      event
                    ) =>
                      setChapterTitle(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-[15px] border border-[#dfd8d2] bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#d69b72]"
                    placeholder="Ej. La puerta entreabierta"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Texto
                  </label>

                  <textarea
                    value={
                      chapterContent
                    }
                    onChange={(
                      event
                    ) =>
                      setChapterContent(
                        event.target.value
                      )
                    }
                    className="mt-2 min-h-[320px] w-full resize-y rounded-[18px] border border-[#dfd8d2] bg-white p-5 font-serif text-[16px] leading-7 outline-none focus:border-[#d69b72]"
                    placeholder="Escribe aquí el contenido del capítulo..."
                  />
                </div>

                {chapterEditor ===
                  "correct" && (
                  <div className="mt-4 rounded-[18px] border border-[#ddd2ee] bg-[#faf8fd] p-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6d54a2]">
                      Motivo de la corrección
                    </label>

                    <p className="mt-1 text-xs leading-5 text-[#887c91]">
                      Explica brevemente qué modificaste. Esta nota ayudará durante la revisión y quedará asociada al historial de versiones.
                    </p>

                    <textarea
                      value={
                        correctionNote
                      }
                      onChange={(
                        event
                      ) =>
                        setCorrectionNote(
                          event.target.value
                        )
                      }
                      maxLength={
                        500
                      }
                      className="mt-3 min-h-[95px] w-full resize-y rounded-[15px] border border-[#d8cce9] bg-white p-4 text-sm leading-6 outline-none focus:border-[#9376bd]"
                      placeholder="Ej. Corregí errores de redacción y aclaré el último párrafo sin modificar los acontecimientos del capítulo."
                    />

                    <div className="mt-2 flex justify-end">
                      <span className="text-[10px] font-bold text-[#9b90a2]">
                        {
                          correctionNote.length
                        }
                        /500
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#91867e]">
                    {chapterContent
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .length.toLocaleString(
                        "es-MX"
                      )}{" "}
                    palabras
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        resetChapterEditor
                      }
                      className="rounded-full border border-[#ddd5cf] bg-white px-4 py-2.5 text-sm font-bold text-[#756b64]"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={
                        saveChapter
                      }
                      disabled={
                        chapterBusy
                      }
                      className={`rounded-full px-5 py-2.5 text-sm font-black text-white disabled:opacity-50 ${
                        chapterEditor ===
                        "correct"
                          ? "bg-[#7657a5]"
                          : "bg-[#d96822]"
                      }`}
                    >
                      {chapterBusy
                        ? chapterEditor ===
                          "correct"
                          ? "Enviando..."
                          : "Guardando..."
                        : chapterEditor ===
                          "new"
                        ? "Crear capítulo"
                        : chapterEditor ===
                          "correct"
                        ? "Enviar corrección a revisión"
                        : "Guardar capítulo"}
                    </button>
                  </div>
                </div>
              </article>
            )}

            <div className="mt-5 overflow-hidden rounded-[22px] border border-[#e4ddd7] bg-white">
              <div className="border-b border-[#eee7e2] bg-[#fcfaf8] px-5 py-4">
                <p className="text-sm font-black">
                  {chapters.length}
                  {" "}
                  {chapters.length ===
                  1
                    ? "capítulo"
                    : "capítulos"}
                </p>
              </div>

              {chapters.length ===
              0 ? (
                <div className="p-8 text-center">
                  <p className="font-black">
                    Todavía no hay capítulos.
                  </p>

                  <p className="mt-2 text-sm text-[#91867e]">
                    Añade el primer capítulo de esta obra.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#eee7e2]">
                  {chapters.map(
                    (chapter) => {
                      const editable =
                        canEditChapter(
                          chapter
                        );

                      const canPublishDraft =
                        isPublished &&
                        !isFinished &&
                        chapter.chapter_status ===
                          "draft";

                      const isPublicChapter =
                        chapter.chapter_status ===
                        "published";

                      const historyOpen =
                        historyChapterId ===
                        chapter.id;

                      const latestCorrection =
                        correctionRequests[
                          chapter.id
                        ] ||
                        null;

                      const correctionPending =
                        latestCorrection?.status ===
                        "pending";

                      return (
                        <div
                          key={chapter.id}
                        >
                          <div className="grid gap-4 px-5 py-4 md:grid-cols-[48px_minmax(0,1fr)_auto] md:items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f5f3f1] text-xs font-black">
                              {chapter.chapter_number}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">
                                {chapter.title}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                    isPublicChapter
                                      ? "bg-[#edf8f0] text-[#34724b]"
                                      : "bg-[#eef6fc] text-[#347197]"
                                  }`}
                                >
                                  {chapterStatusLabel(
                                    chapter
                                  )}
                                </span>

                                <span className="text-[10px] font-bold text-[#958a82]">
                                  V
                                  {chapter.current_version}
                                </span>

                                {chapter.last_correction_at && (
                                  <span className="rounded-full bg-[#f5f1fb] px-2 py-1 text-[9px] font-black text-[#6d54a2]">
                                    ✓ Corregido
                                  </span>
                                )}

                                {correctionPending && (
                                  <span className="rounded-full border border-[#e6d6a8] bg-[#fff8e8] px-2 py-1 text-[9px] font-black text-[#8a682d]">
                                    ⏳ Corrección pendiente
                                  </span>
                                )}

                                {latestCorrection?.status ===
                                  "rejected" && (
                                  <span className="rounded-full border border-[#efc2ba] bg-[#fff2ef] px-2 py-1 text-[9px] font-black text-[#a34d43]">
                                    Corrección rechazada
                                  </span>
                                )}

                                <span className="text-[10px] text-[#958a82]">
                                  {chapter.content
                                    .trim()
                                    .split(
                                      /\s+/
                                    )
                                    .filter(
                                      Boolean
                                    )
                                    .length.toLocaleString(
                                      "es-MX"
                                    )}{" "}
                                  palabras
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {editable && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditChapter(
                                      chapter
                                    )
                                  }
                                  className="rounded-full border border-[#d7dfe5] bg-[#f8fafb] px-4 py-2 text-xs font-black text-[#536d7f]"
                                >
                                  Editar
                                </button>
                              )}

                              {canPublishDraft && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    publishDraftChapter(
                                      chapter
                                    )
                                  }
                                  disabled={
                                    chapterBusy
                                  }
                                  className="rounded-full bg-[#2f855a] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                                >
                                  Publicar capítulo
                                </button>
                              )}

                              {isPublicChapter && (
                                <>
                                  {correctionPending ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="cursor-not-allowed rounded-full border border-[#e6d6a8] bg-[#fff8e8] px-4 py-2 text-xs font-black text-[#8a682d]"
                                    >
                                      ⏳ En revisión
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startCorrection(
                                          chapter
                                        )
                                      }
                                      className="rounded-full border border-[#cfc0e8] bg-[#f7f4fc] px-4 py-2 text-xs font-black text-[#6d54a2]"
                                    >
                                      ✎ Corregir
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleHistory(
                                        chapter
                                      )
                                    }
                                    className={`rounded-full border px-4 py-2 text-xs font-black ${
                                      historyOpen
                                        ? "border-[#b8c9d6] bg-[#eef5f9] text-[#45697f]"
                                        : "border-[#ddd7d2] bg-white text-[#786f68]"
                                    }`}
                                  >
                                    {historyOpen
                                      ? "Cerrar historial"
                                      : "Historial"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {correctionPending && (
                            <div className="border-t border-[#efe7d1] bg-[#fffcf5] px-5 py-4 md:pl-[84px]">
                              <div className="max-w-3xl rounded-[15px] border border-[#ead9ae] bg-[#fff9e9] p-4">
                                <p className="text-xs font-black text-[#806126]">
                                  Corrección pendiente de revisión
                                </p>

                                <p className="mt-1 text-xs leading-5 text-[#89775a]">
                                  La versión pública sigue siendo{" "}
                                  <b>
                                    V
                                    {chapter.current_version}
                                  </b>
                                  . Los cambios propuestos solo se publicarán si la corrección es aprobada.
                                </p>

                                {latestCorrection?.change_note && (
                                  <div className="mt-3 rounded-[12px] bg-white/70 p-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9a814f]">
                                      Motivo enviado
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-[#77694f]">
                                      {
                                        latestCorrection.change_note
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* HISTORIAL */}

                          {historyOpen && (
                            <div className="border-t border-[#eee7e2] bg-[#faf9fc] px-5 py-5 md:pl-[84px]">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6d54a2]">
                                    Historial de versiones
                                  </p>

                                  <p className="mt-1 text-sm font-black text-[#433a34]">
                                    {chapter.title}
                                  </p>
                                </div>

                                <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-[#81766e]">
                                  Versión actual V{chapter.current_version}
                                </span>
                              </div>

                              {historyLoading && (
                                <div className="mt-4 rounded-[14px] bg-white p-4 text-xs font-semibold text-[#8a817a]">
                                  Cargando historial...
                                </div>
                              )}

                              {historyError && (
                                <div className="mt-4 rounded-[14px] border border-[#efc1b9] bg-[#fff3f1] p-4 text-xs font-bold text-[#a34d43]">
                                  {historyError}
                                </div>
                              )}

                              {!historyLoading &&
                                !historyError &&
                                historyVersions.length === 0 && (
                                  <div className="mt-4 rounded-[14px] border border-[#e3ddd7] bg-white p-4">
                                    <p className="text-xs font-black text-[#665c54]">
                                      Todavía no existe historial archivado.
                                    </p>

                                    <p className="mt-1 text-[10px] leading-5 text-[#91867e]">
                                      Cuando una corrección sea aprobada, las versiones anteriores aparecerán aquí.
                                    </p>
                                  </div>
                                )}

                              {!historyLoading &&
                                historyVersions.length >
                                  0 && (
                                  <div className="mt-4 space-y-2">
                                    {historyVersions.map(
                                      (version) => {
                                        const expanded =
                                          expandedVersion ===
                                          version.version_number;

                                        const current =
                                          version.version_number ===
                                          chapter.current_version;

                                        return (
                                          <article
                                            key={
                                              version.id ||
                                              version.version_number
                                            }
                                            className={`overflow-hidden rounded-[16px] border bg-white ${
                                              current
                                                ? "border-[#b9ddc5]"
                                                : "border-[#e3ddd7]"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedVersion(
                                                  expanded
                                                    ? null
                                                    : version.version_number
                                                )
                                              }
                                              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                                            >
                                              <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-sm font-black text-[#403832]">
                                                    Versión{" "}
                                                    {
                                                      version.version_number
                                                    }
                                                  </span>

                                                  {current && (
                                                    <span className="rounded-full bg-[#edf8f0] px-2 py-1 text-[9px] font-black text-[#34724b]">
                                                      Actual
                                                    </span>
                                                  )}

                                                  {version.change_type ===
                                                    "correction" && (
                                                    <span className="rounded-full bg-[#f5f1fb] px-2 py-1 text-[9px] font-black text-[#6d54a2]">
                                                      Corrección
                                                    </span>
                                                  )}

                                                  {version.change_type ===
                                                    "restore" && (
                                                    <span className="rounded-full bg-[#eef6fc] px-2 py-1 text-[9px] font-black text-[#347197]">
                                                      Restaurada
                                                    </span>
                                                  )}
                                                </div>

                                                <p className="mt-1 text-[10px] text-[#958a82]">
                                                  {formatVersionDate(
                                                    version.created_at
                                                  )}
                                                </p>
                                              </div>

                                              <span className="text-sm font-black text-[#756b64]">
                                                {expanded
                                                  ? "−"
                                                  : "+"}
                                              </span>
                                            </button>

                                            {expanded && (
                                              <div className="border-t border-[#eee7e2] px-4 py-4">
                                                {version.change_note && (
                                                  <div className="mb-3 rounded-[12px] bg-[#faf8fd] p-3">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6d54a2]">
                                                      Nota del cambio
                                                    </p>

                                                    <p className="mt-1 text-xs leading-5 text-[#81758c]">
                                                      {
                                                        version.change_note
                                                      }
                                                    </p>
                                                  </div>
                                                )}

                                                <p className="text-sm font-black text-[#403832]">
                                                  {
                                                    version.title
                                                  }
                                                </p>

                                                <div className="mt-3 max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-[14px] bg-[#f8f7f6] p-4 font-serif text-sm leading-6 text-[#554c46]">
                                                  {
                                                    version.content
                                                  }
                                                </div>
                                              </div>
                                            )}
                                          </article>
                                        );
                                      }
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {isPublished && (
              <div className="mt-4 rounded-[18px] border border-[#d8cce9] bg-[#f8f5fc] p-4">
                <p className="text-xs font-black text-[#6d54a2]">
                  ✓ Correcciones protegidas activas
                </p>

                <p className="mt-1 text-xs leading-5 text-[#81758c]">
                  Los capítulos publicados no se sobrescriben directamente. El autor propone una corrección, SEBORO la revisa y únicamente después de ser aprobada se convierte en una nueva versión pública.
                </p>
              </div>
            )}
          </div>
        )}

        {/* DETALLES */}

        {tab ===
          "Detalles" && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#347197]">
              Detalles
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Editar información de la obra
            </h2>

            <p className="mt-1 text-sm text-[#8b8078]">
              Los cambios de esta pantalla se guardan realmente en SEBORO.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-[235px_minmax(0,1fr)]">
              <article className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#91867d]">
                  Portada
                </p>

                <div
                  className="mx-auto mt-4 aspect-[2/3] w-[145px] rounded-[15px] border border-[#ddd3cb] shadow-[0_8px_18px_rgba(61,43,30,0.1)]"
                  style={{
                    background:
                      getWorkCoverBackground(
                        work
                      ),
                  }}
                />

                <label className="mt-4 block cursor-pointer rounded-full bg-[#347197] px-4 py-2.5 text-center text-xs font-black text-white">
                  {coverBusy
                    ? "Subiendo..."
                    : "Cambiar portada"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={
                      coverBusy
                    }
                    className="hidden"
                    onChange={(
                      event
                    ) => {
                      const file =
                        event.target.files?.[0];

                      event.target.value =
                        "";

                      if (!file) return;

                      setCoverRatioWarning(
                        ""
                      );

                      getImageAspectRatio(
                        file
                      )
                        .then(
                          (
                            ratio
                          ) => {
                            setCoverRatioWarning(
                              getCoverRatioWarning(
                                ratio
                              ) ||
                                ""
                            );
                          }
                        )
                        .catch(
                          () => {}
                        );

                      changeCover(
                        file
                      );
                    }}
                  />
                </label>

                {work.cover_url && (
                  <button
                    type="button"
                    disabled={
                      coverBusy
                    }
                    onClick={
                      removeCover
                    }
                    className="mt-2 w-full rounded-full border border-[#ecc7c1] bg-[#fff5f3] px-4 py-2 text-xs font-bold text-[#a45247]"
                  >
                    Eliminar portada
                  </button>
                )}

                <p className="mt-3 text-[10px] text-[#9a9089]">
                  JPG, PNG o WEBP · recomendado 2:3 · hasta 5 MB
                </p>

                {coverRatioWarning && (
                  <p className="mt-2 text-xs font-bold text-[#a3702f]">
                    {coverRatioWarning}
                  </p>
                )}

                {coverMessage && (
                  <p className="mt-3 text-xs font-bold text-[#34724b]">
                    {coverMessage}
                  </p>
                )}

                {coverError && (
                  <p className="mt-3 text-xs font-bold text-[#a34d43]">
                    {coverError}
                  </p>
                )}
              </article>

              <article className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Título
                    </label>

                    <input
                      value={title}
                      onChange={(
                        event
                      ) =>
                        setTitle(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-[15px] border border-[#e0dad4] px-4 py-3 text-sm font-bold outline-none focus:border-[#80a7c0]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Subtítulo
                    </label>

                    <input
                      value={subtitle}
                      onChange={(
                        event
                      ) =>
                        setSubtitle(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-[15px] border border-[#e0dad4] px-4 py-3 text-sm outline-none focus:border-[#80a7c0]"
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Género
                    </label>

                    <input
                      value={genre}
                      onChange={(
                        event
                      ) =>
                        setGenre(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-[15px] border border-[#e0dad4] px-4 py-3 text-sm outline-none focus:border-[#80a7c0]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Precio
                    </label>

                    <div className="mt-2 flex items-center rounded-[15px] border border-[#e0dad4] px-4 focus-within:border-[#79a58a]">
                      <span className="font-black">
                        $
                      </span>

                      <input
                        value={price}
                        onChange={(
                          event
                        ) =>
                          setPrice(
                            event.target.value.replace(
                              /[^0-9.]/g,
                              ""
                            )
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-black outline-none"
                      />

                      <span className="text-xs text-[#938981]">
                        MXN
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Idioma
                    </label>

                    <select
                      value={languageCode}
                      onChange={(
                        event
                      ) =>
                        setLanguageCode(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-[15px] border border-[#e0dad4] bg-white px-4 py-3 text-sm"
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

                      <option value="fr">
                        Francés
                      </option>

                      <option value="pt">
                        Portugués
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Clasificación
                    </label>

                    <select
                      value={ageRating}
                      onChange={(
                        event
                      ) =>
                        setAgeRating(
                          event.target.value as AgeRating
                        )
                      }
                      className="mt-2 w-full rounded-[15px] border border-[#e0dad4] bg-white px-4 py-3 text-sm"
                    >
                      <option value="Sin clasificar">
                        Sin clasificar
                      </option>

                      <option value="Todos">
                        Todos
                      </option>

                      <option value="13+">
                        13+
                      </option>

                      <option value="16+">
                        16+
                      </option>

                      <option value="18+">
                        18+
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Etiquetas
                  </label>

                  <input
                    value={tags}
                    onChange={(
                      event
                    ) =>
                      setTags(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-[15px] border border-[#e0dad4] px-4 py-3 text-sm outline-none"
                    placeholder="fantasía, misterio, romance..."
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Advertencias de contenido
                  </label>

                  <input
                    value={warnings}
                    onChange={(
                      event
                    ) =>
                      setWarnings(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-[15px] border border-[#e0dad4] px-4 py-3 text-sm outline-none"
                    placeholder="violencia, lenguaje fuerte..."
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Sinopsis
                  </label>

                  <textarea
                    value={synopsis}
                    onChange={(
                      event
                    ) =>
                      setSynopsis(
                        event.target.value
                      )
                    }
                    className="mt-2 min-h-40 w-full resize-y rounded-[17px] border border-[#e0dad4] p-4 text-sm leading-6 outline-none focus:border-[#80a7c0]"
                  />
                </div>

                {!isPublished && (
                  <div className="mt-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                      Estado de la historia
                    </label>

                    <select
                      value={workStatus}
                      onChange={(
                        event
                      ) =>
                        setWorkStatus(
                          event.target.value as WorkStatus
                        )
                      }
                      className="mt-2 w-full rounded-[15px] border border-[#e0dad4] bg-white px-4 py-3 text-sm"
                    >
                      <option value="ongoing">
                        En proceso
                      </option>

                      <option value="finished">
                        Terminada
                      </option>
                    </select>
                  </div>
                )}

                {work.work_status ===
                  "ongoing" && (
                  <div className="mt-5 rounded-[18px] border border-[#dce6df] bg-[#f8fbf9] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#668273]">
                      Obra seriada
                    </p>

                    <div className="mt-3">
                      <label className="text-xs font-bold">
                        Frecuencia aproximada entre capítulos
                      </label>

                      <div className="mt-2 flex max-w-[220px] items-center rounded-[14px] border border-[#dce3df] bg-white px-3">
                        <input
                          value={
                            frequencyDays
                          }
                          onChange={(
                            event
                          ) =>
                            setFrequencyDays(
                              event.target.value.replace(
                                /[^0-9]/g,
                                ""
                              )
                            )
                          }
                          className="min-w-0 flex-1 py-3 text-sm font-black outline-none"
                        />

                        <span className="text-xs text-[#8c8178]">
                          días
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-xs font-bold">
                        Compromiso del autor
                      </label>

                      <textarea
                        value={commitment}
                        onChange={(
                          event
                        ) =>
                          setCommitment(
                            event.target.value
                          )
                        }
                        maxLength={500}
                        className="mt-2 min-h-24 w-full rounded-[15px] border border-[#dce3df] bg-white p-3 text-sm outline-none"
                        placeholder="Ej. Publicaré un capítulo aproximadamente cada dos semanas."
                      />
                    </div>
                  </div>
                )}

                {detailError && (
                  <div className="mt-4 rounded-[15px] border border-[#efc1b9] bg-[#fff3f1] p-3 text-xs font-bold text-[#a34d43]">
                    {detailError}
                  </div>
                )}

                {detailMessage && (
                  <div className="mt-4 rounded-[15px] border border-[#bcdcc7] bg-[#edf8f0] p-3 text-xs font-black text-[#34724b]">
                    {detailMessage}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={
                      saveDetails
                    }
                    disabled={
                      savingDetails
                    }
                    className="rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
                  >
                    {savingDetails
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>

                  <p className="text-[10px] text-[#9b9189]">
                    La URL conserva su slug aunque cambies el título.
                  </p>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* RENDIMIENTO */}

        {tab ===
          "Rendimiento" && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#2f7950]">
                  Rendimiento
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Estadísticas de{" "}
                  {work.title}
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Únicamente datos de esta obra.
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
                  metric
                    ? "border-[#cfe4d5] bg-[#edf8f0] text-[#34724b]"
                    : "border-[#ddd7d2] bg-[#f4f2f0] text-[#81766e]"
                }`}
              >
                {metric
                  ? "✓ Datos reales"
                  : "Sin actividad todavía"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Lectores"
                value={number(
                  readers
                )}
                icon="👥"
                tone="blue"
              />

              <StatCard
                label="Leyendo ahora"
                value={number(
                  readingNow
                )}
                icon="◉"
                tone="purple"
              />

              <StatCard
                label="Finalizaron"
                value={number(
                  finished
                )}
                icon="✓"
                tone="green"
              />

              <StatCard
                label="Finalización"
                value={`${completion.toFixed(
                  1
                )}%`}
                icon="%"
                tone="green"
              />

              <StatCard
                label="Guardados"
                value={number(
                  saves
                )}
                icon="♡"
                tone="purple"
              />

              <StatCard
                label="Compras"
                value={number(
                  purchases
                )}
                description={
                  metric
                    ? `${conversion.toFixed(
                        1
                      )}% conversión`
                    : "Sin actividad"
                }
                icon="$"
                tone="green"
              />

              <StatCard
                label="Valoración"
                value={
                  ratingCount > 0
                    ? averageRating.toFixed(
                        2
                      )
                    : "—"
                }
                icon="★"
                tone="orange"
              />

              <StatCard
                label="Valoraciones"
                value={number(
                  ratingCount
                )}
                icon="#"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <ActivityComparison
                current={
                  metric?.activity_30d ||
                  0
                }
                previous={
                  metric?.activity_prev_30d ||
                  0
                }
                change={
                  activityChange
                }
              />

              <WorkStateBadge
                state={state}
                activityChange={
                  activityChange
                }
                variant="hero"
              />
            </div>

            <article className="mt-4 overflow-hidden rounded-[22px] border border-[#e4ddd7] bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee7e2] px-5 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#64748b]">
                    Próxima métrica
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    Retención por capítulo
                  </h3>

                  <p className="mt-1 text-xs text-[#91867e]">
                    Nos permitirá descubrir dónde los lectores continúan o abandonan.
                  </p>
                </div>

                <span className="rounded-full bg-[#f2f0ee] px-3 py-1.5 text-[9px] font-black text-[#81766e]">
                  Aún sin telemetría
                </span>
              </div>

              {chapters.map(
                (chapter) => (
                  <div
                    key={
                      chapter.id
                    }
                    className="grid gap-3 border-b border-[#eee7e2] px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_170px] sm:items-center"
                  >
                    <p className="text-sm font-black">
                      Capítulo{" "}
                      {
                        chapter.chapter_number
                      }
                      {" · "}
                      {
                        chapter.title
                      }
                    </p>

                    <div className="h-2 rounded-full bg-[#ece9e6]" />
                  </div>
                )
              )}
            </article>
          </div>
        )}

        {/* COMUNIDAD */}

        {tab ===
          "Comunidad" && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#6d54a2]">
                  Comunidad
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Conversaciones sobre esta obra
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Todo lo relacionado específicamente con{" "}
                  <b>{work.title}</b>.
                </p>
              </div>

              {isPublished && (
                <Link
                  href={`/comunidad/${work.slug}`}
                  className="rounded-full border border-[#cfc0e8] bg-[#f7f4fc] px-4 py-2.5 text-sm font-black text-[#6d54a2]"
                >
                  Abrir comunidad →
                </Link>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Publicaciones"
                value={number(
                  communityPosts
                )}
                icon="💬"
                tone="blue"
              />

              <StatCard
                label="Respuestas"
                value={number(
                  communityReplies
                )}
                icon="↩"
                tone="blue"
              />

              <StatCard
                label="Reacciones"
                value={number(
                  communityReactions
                )}
                icon="♥"
                tone="purple"
              />

              <StatCard
                label="Críticas"
                value={number(
                  reviews
                )}
                icon="✎"
                tone="orange"
              />
            </div>
          </div>
        )}

        {/* PUBLICACIÓN */}

        {tab ===
          "Publicación" && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#64748b]">
              Publicación
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Estado editorial
            </h2>

            <p className="mt-1 text-sm text-[#8b8078]">
              Envía la obra a revisión y publica cuando haya sido aprobada.
            </p>

            {publicationMessage && (
              <div className="mt-4 rounded-[16px] border border-[#bcdcc7] bg-[#edf8f0] p-4 text-sm font-black text-[#34724b]">
                {publicationMessage}
              </div>
            )}

            {publicationError && (
              <div className="mt-4 rounded-[16px] border border-[#efc1b9] bg-[#fff3f1] p-4 text-sm font-bold text-[#a34d43]">
                {publicationError}
              </div>
            )}

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
              <article className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#91867d]">
                  Estado actual
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${publicationClass(
                    work.publication_status
                  )}`}
                >
                  {publicationLabel(
                    work.publication_status
                  )}
                </span>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[#eee7e2] pb-3">
                    <span className="text-[#867b73]">
                      Obra
                    </span>

                    <b>
                      {isFinished
                        ? "Terminada"
                        : "En proceso"}
                    </b>
                  </div>

                  <div className="flex justify-between border-b border-[#eee7e2] pb-3">
                    <span className="text-[#867b73]">
                      Capítulos
                    </span>

                    <b>
                      {chapters.length}
                    </b>
                  </div>

                  <div className="flex justify-between border-b border-[#eee7e2] pb-3">
                    <span className="text-[#867b73]">
                      Precio
                    </span>

                    <b>
                      {money(
                        work.price_mxn
                      )}
                    </b>
                  </div>

                  <div className="flex justify-between border-b border-[#eee7e2] pb-3">
                    <span className="text-[#867b73]">
                      Enviada
                    </span>

                    <b>
                      {formatDate(
                        work.submitted_at
                      )}
                    </b>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#867b73]">
                      Publicada
                    </span>

                    <b>
                      {formatDate(
                        work.published_at
                      )}
                    </b>
                  </div>
                </div>

                <div className="mt-5">
                  {(
                    work.publication_status ===
                      "draft" ||
                    work.publication_status ===
                      "changes_requested"
                  ) && (
                    <button
                      type="button"
                      onClick={
                        submitForReview
                      }
                      disabled={
                        publicationBusy
                      }
                      className="w-full rounded-full bg-[#d96822] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      {publicationBusy
                        ? "Enviando..."
                        : "Enviar a revisión"}
                    </button>
                  )}

                  {work.publication_status ===
                    "approved" && (
                    <button
                      type="button"
                      onClick={
                        publishWork
                      }
                      disabled={
                        publicationBusy
                      }
                      className="w-full rounded-full bg-[#2f855a] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      {publicationBusy
                        ? "Publicando..."
                        : "Publicar obra"}
                    </button>
                  )}

                  {(
                    work.publication_status ===
                      "in_review" ||
                    work.publication_status ===
                      "human_review"
                  ) && (
                    <div className="rounded-[15px] bg-[#fff8e7] p-4 text-center text-xs font-black text-[#87672e]">
                      La obra está siendo revisada.
                    </div>
                  )}

                  {work.publication_status ===
                    "published" && (
                    <div className="rounded-[15px] bg-[#edf8f0] p-4 text-center text-xs font-black text-[#34724b]">
                      ✓ Esta obra está publicada.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#64748b]">
                  Última revisión
                </p>

                {latestReview ? (
                  <>
                    <h3 className="mt-2 text-xl font-black">
                      {latestReview.result ===
                      "approved"
                        ? "Aprobada"
                        : latestReview.result ===
                          "changes_requested"
                        ? "Cambios solicitados"
                        : "En revisión"}
                    </h3>

                    <p className="mt-2 text-xs text-[#91867e]">
                      Enviada{" "}
                      {formatDate(
                        latestReview.submitted_at
                      )}
                    </p>

                    {latestReview.notes && (
                      <div className="mt-4 rounded-[16px] bg-[#f7f5f3] p-4">
                        <p className="text-[10px] font-black uppercase text-[#8b817a]">
                          Notas
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#756b64]">
                          {latestReview.notes}
                        </p>
                      </div>
                    )}

                    {latestReview.issues.length >
                      0 && (
                      <div className="mt-4">
                        <p className="text-xs font-black">
                          Puntos a corregir
                        </p>

                        <div className="mt-2 space-y-2">
                          {latestReview.issues.map(
                            (
                              issue,
                              index
                            ) => (
                              <div
                                key={index}
                                className="rounded-[14px] border border-[#efcfc9] bg-[#fff5f2] px-4 py-3 text-xs font-semibold text-[#945348]"
                              >
                                {issue}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4 rounded-[17px] bg-[#f6f4f2] p-4">
                    <p className="text-sm font-black">
                      Sin revisión todavía
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#8d8279]">
                      Cuando envíes la obra, aquí aparecerá el resultado de la revisión.
                    </p>
                  </div>
                )}
              </article>
            </div>

            <article className="mt-4 rounded-[22px] border border-[#d8cce9] bg-[#faf8fd] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6d54a2]">
                Versiones
              </p>

              <h3 className="mt-1 text-lg font-black">
                Correcciones después de publicar
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#81758c]">
                Los capítulos publicados pueden recibir correcciones sin borrar versiones anteriores. La nueva versión solo se hace pública después de que la solicitud haya sido aprobada.
              </p>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}