"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import SaveButton from "@/components/SaveButton";
import FavoriteButton from "@/components/FavoriteButton";
import WorkFollowButton from "@/components/WorkFollowButton";
import PurchaseButton from "@/components/PurchaseButton";
import AcquireButton from "@/components/AcquireButton";
import ReaderFeedbackExtras from "@/components/ReaderFeedbackExtras";
import WorkCommunityPreview from "@/components/WorkCommunityPreview";
import InfoBadge from "@/components/InfoBadge";
import {
  getPublishedWorkBySlug,
  getPublishedWorks,
  getWorkCoverBackground,
  getWorkReadingStats,
  type PublicWorkBundle,
  type PublishedWork,
} from "@/lib/publishedWorks";
import PublishedWorkCard from "@/components/PublishedWorkCard";
import {
  getWorkAccess,
  type WorkAccess,
} from "@/lib/workAccess";
import {
  getCurrentUser,
  getUserBook,
} from "@/lib/userBooks";
import {
  getMyWorkRating,
  getPublicWorkRating,
  rateFinishedPublishedWork,
  type PublicWorkRating,
} from "@/lib/workRatings";

function serialStateLabel(
  state: PublicWorkBundle["work"]["serial_state"]
) {
  if (state === "paused") return "En pausa";
  if (state === "abandoned") return "Abandonada";
  if (state === "finished") return "Terminada";
  return "Activa";
}

function formatPublicDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function PublicWorkPage() {
  const params = useParams<{ slug: string }>();

  const [bundle, setBundle] =
    useState<PublicWorkBundle | null>(null);

  const [rating, setRating] =
    useState<PublicWorkRating | null>(null);

  const [myRating, setMyRating] =
    useState<number | null>(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] =
    useState<number | null>(null);
  const [access, setAccess] =
    useState<WorkAccess | null>(null);

  const [ownWork, setOwnWork] = useState(false);

  const [moreByAuthor, setMoreByAuthor] = useState<
    Array<PublishedWork & { author_name: string }>
  >([]);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coverOpen, setCoverOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getPublishedWorkBySlug(params.slug);

      setBundle(result);

      if (!result) return;

      const [summary, user, allPublished, workAccess] =
        await Promise.all([
          getPublicWorkRating(result.work.slug),
          getCurrentUser(),
          getPublishedWorks(),
          getWorkAccess(result.work.slug),
        ]);

      setAccess(workAccess);

      setMoreByAuthor(
        allPublished
          .filter(
            (work) =>
              work.author_id === result.work.author_id &&
              work.slug !== result.work.slug
          )
          .slice(0, 6)
      );

      setRating(summary);
      setLoggedIn(Boolean(user));

      if (user) {
        const [bookRow, own] =
          await Promise.all([
            getUserBook(result.work.slug),
            getMyWorkRating(result.work.slug),
          ]);

        setFinished(Boolean(bookRow?.finished));
        setProgress(
          typeof bookRow?.progress === "number"
            ? bookRow.progress
            : null
        );

        setMyRating(own);

        setOwnWork(
          user.id === result.work.author_id
        );
      } else {
        const rawProgress = localStorage.getItem(
          `seboro-progress:${result.work.slug}`
        );

        const localProgress =
          rawProgress === null
            ? null
            : Number(rawProgress);

        setProgress(
          localProgress !== null &&
            Number.isFinite(localProgress)
            ? localProgress
            : null
        );

        setFinished(
          localStorage.getItem(
            `seboro-finished:${result.work.slug}`
          ) === "true"
        );

        setMyRating(null);
        setOwnWork(false);
      }
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
    load();
  }, [params.slug]);

  useEffect(() => {
    if (!coverOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCoverOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [coverOpen]);

  async function rate(value: number) {
    if (!bundle) return;

    setRatingBusy(true);
    setRatingMessage("");

    try {
      const result =
        await rateFinishedPublishedWork(
          bundle.work.slug,
          value
        );

      setMyRating(value);

      setRating({
        book_slug: result.book_slug,
        rating_avg: result.rating_avg,
        rating_count: result.rating_count,
        ranking_score: result.ranking_score,
      });

      setRatingMessage(
        "Tu valoración quedó guardada."
      );
    } catch (err) {
      setRatingMessage(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la valoración."
      );
    } finally {
      setRatingBusy(false);
    }
  }

  const hasPublicRating =
    typeof rating?.rating_avg === "number" &&
    (rating?.rating_count || 0) > 0;

  const isPdf =
    bundle?.work.content_format === "pdf";

  const chapterCount =
    access?.totalChapters ??
    bundle?.chapters.length ??
    0;

  const pageCount =
    isPdf
      ? Math.max(
          0,
          Number(
            access?.totalPages ||
            bundle?.work.page_count ||
            0
          )
        )
      : 0;

  const readingStats = bundle
    ? getWorkReadingStats(bundle.chapters)
    : { wordCount: 0, readMinutes: 0 };

  const totalProgressUnits =
    isPdf
      ? pageCount
      : chapterCount;

  const safeProgress =
    progress === null ||
    totalProgressUnits <= 0
      ? null
      : Math.min(
          Math.max(0, progress),
          totalProgressUnits - 1
        );

  const fullAccess = Boolean(access?.fullAccess);

  const isFreeWork =
    Boolean(bundle) &&
    Number(bundle?.work.price_mxn || 0) <= 0;

  const lockedAccess =
    Boolean(bundle) &&
    !fullAccess;

  const sampleHref = bundle
    ? `/leer-publicado/${bundle.work.slug}?muestra=1`
    : "#";

  const readingHref =
    bundle &&
    safeProgress !== null &&
    !finished
      ? `/leer-publicado/${bundle.work.slug}?pagina=${safeProgress + 1}`
      : bundle
      ? `/leer-publicado/${bundle.work.slug}`
      : "#";

  const readingLabel =
    finished
      ? "Leer de nuevo"
      : safeProgress !== null
      ? "Continuar leyendo"
      : "Leer";

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto w-full max-w-[1360px] px-3 pb-16 pt-3 sm:px-5 md:px-6 md:pt-6">
        <Link
          href="/descubre"
          className="inline-flex items-center gap-2 text-sm font-black text-[#7d7169] transition hover:text-[#b95016]"
        >
          ← Catálogo
        </Link>

        {loading ? (
          <div className="mt-6 rounded-[24px] border border-[#ddd5cf] bg-white p-7 text-[#8f8580]">
            Cargando...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[24px] border border-[#e5c3c3] bg-white p-7 text-[#b24949]">
            {error}
          </div>
        ) : !bundle ? (
          <div className="mt-6 rounded-[24px] border border-[#ddd5cf] bg-white p-7 text-[#7d746e]">
            Obra no encontrada.
          </div>
        ) : (
          <>
            {/* =========================================================
                DETALLE DE OBRA · MÓVIL / TABLET
               ========================================================= */}
            <section className="mt-3 overflow-hidden rounded-[24px] border border-[#ded5ce] bg-white shadow-[0_14px_34px_rgba(62,45,34,0.06)] lg:hidden">
              <div className="bg-gradient-to-b from-[#f1ebe4] via-[#f8f5f1] to-white px-4 pb-5 pt-4">
                <button
                  type="button"
                  onClick={() => setCoverOpen(true)}
                  className="group relative mx-auto block aspect-[2/3] w-[45vw] min-w-[150px] max-w-[190px] overflow-hidden rounded-[18px] border border-white/90 text-left shadow-[0_18px_34px_rgba(67,42,27,0.18)] ring-1 ring-black/[0.04]"
                  style={{
                    background:
                      getWorkCoverBackground(
                        bundle.work
                      ),
                  }}
                  aria-label="Ver portada ampliada"
                >
                  <span className="absolute inset-x-3 bottom-3 rounded-full bg-black/65 px-3 py-1.5 text-center text-[9px] font-black text-white backdrop-blur">
                    Ver portada
                  </span>
                </button>

                <div className="mt-4 text-center">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <span className="rounded-full border border-[#ddd5cf] bg-white px-2.5 py-1 text-[9px] font-black text-[#655d57]">
                      {bundle.work.genre}
                    </span>

                    <span className="rounded-full border border-[#ddd5cf] bg-white px-2.5 py-1 text-[9px] font-black text-[#746a63]">
                      {bundle.work.work_status ===
                      "ongoing"
                        ? "En proceso"
                        : "Terminada"}
                    </span>

                    {isPdf && (
                      <span className="rounded-full border border-[#cfd7da] bg-[#f4f7f8] px-2.5 py-1 text-[9px] font-black text-[#617078]">
                        PDF
                      </span>
                    )}
                  </div>

                  <h1 className="mx-auto mt-2.5 max-w-[310px] text-[28px] font-black leading-[0.98] tracking-[-0.045em] text-[#29231f]">
                    {bundle.work.title}
                  </h1>

                  {bundle.work.subtitle && (
                    <p className="mx-auto mt-1.5 max-w-[310px] text-[13px] leading-5 text-[#7c716a]">
                      {bundle.work.subtitle}
                    </p>
                  )}

                  <p className="mt-2 text-[12px] text-[#7f756f]">
                    por{" "}
                    <Link
                      href={`/autores/${bundle.work.author_id}`}
                      className="font-black text-[#b95016] underline decoration-[#d9aa89] underline-offset-4"
                    >
                      {bundle.author_name}
                    </Link>
                  </p>

                  <div className="mt-2.5 flex min-h-[28px] items-center justify-center">
                    {hasPublicRating ? (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-full border border-[#e2d2ad] bg-[#fff9ed] px-3 py-1 text-sm font-black text-[#9b7625]">
                          ★ {rating?.rating_avg?.toFixed(1)}
                        </span>

                        <span className="text-[11px] font-semibold text-[#8d837d]">
                          {rating?.rating_count}{" "}
                          {rating?.rating_count === 1
                            ? "valoración"
                            : "valoraciones"}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 text-[#c7bdb5]"
                        role="img"
                        aria-label="Sin valoraciones todavía"
                      >
                        <span aria-hidden="true" className="tracking-[0.10em]">
                          ☆☆☆☆☆
                        </span>
                        <span className="text-[11px] font-semibold text-[#928881]">
                          Sin valoraciones
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 pb-5 pt-4">
                {/* CTA PRIMARIO */}
                {lockedAccess ? (
                  <div>
                    <div className="[&_button]:!min-h-12 [&_button]:!w-full [&_button]:!justify-center [&_button]:!rounded-[15px] [&_button]:!text-base [&_button]:!font-black">
                      {isFreeWork ? (
                        <AcquireButton
                          slug={bundle.work.slug}
                          loggedIn={loggedIn}
                          onAcquired={(nextAccess) => {
                            setAccess(nextAccess);
                            setFinished(false);
                          }}
                        />
                      ) : (
                        <PurchaseButton
                          slug={bundle.work.slug}
                          priceMxn={bundle.work.price_mxn}
                          loggedIn={loggedIn}
                        />
                      )}
                    </div>

                    {access?.canReadSample && (
                      <Link
                        href={sampleHref}
                        className="mx-auto mt-2.5 block w-fit text-sm font-black text-[#a6511d] underline decoration-[#d8a17d] underline-offset-4"
                      >
                        Leer muestra
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link
                    href={readingHref}
                    className="flex min-h-12 w-full items-center justify-center rounded-[15px] bg-[#d96822] px-5 py-3 text-center text-base font-black text-white shadow-[0_9px_22px_rgba(217,104,34,0.20)] transition hover:bg-[#be5717]"
                  >
                    {readingLabel}
                  </Link>
                )}

                {/* SINOPSIS */}
                <div className="mt-4 rounded-[17px] border border-[#e0d7d0] bg-[#fcfbf9] px-4 py-3.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#7a6d65]">
                    Sinopsis
                  </p>

                  <p className="mt-1.5 line-clamp-3 text-[13px] leading-5 text-[#625a55]">
                    {bundle.work.synopsis}
                  </p>

                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-xs font-black text-[#a6511d] underline decoration-[#d8a17d] underline-offset-4">
                      <span className="group-open:hidden">
                        Leer más
                      </span>
                      <span className="hidden group-open:inline">
                        Mostrar menos
                      </span>
                    </summary>

                    <p className="mt-2 text-[13px] leading-5 text-[#625a55]">
                      {bundle.work.synopsis}
                    </p>
                  </details>
                </div>

                {/* METADATA UNIFICADA */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <InfoBadge
                    icon="📚"
                    label={isPdf ? "Páginas" : "Capítulos"}
                    value={
                      isPdf
                        ? pageCount || "—"
                        : chapterCount
                    }
                  />

                  <InfoBadge
                    icon="⏱"
                    label={isPdf ? "Formato" : "Lectura"}
                    value={
                      isPdf
                        ? "PDF"
                        : `≈ ${readingStats.readMinutes} min`
                    }
                  />

                  <InfoBadge
                    icon="🌐"
                    label="Idioma"
                    value={bundle.work.language_code.toUpperCase()}
                  />

                  <InfoBadge
                    icon="🔞"
                    label="Edad"
                    value={bundle.work.age_rating}
                  />

                  <InfoBadge
                    icon={lockedAccess ? "📖" : "✍️"}
                    label={
                      isPdf
                        ? lockedAccess
                          ? "Muestra"
                          : "Páginas"
                        : lockedAccess
                        ? "Muestra"
                        : "Palabras"
                    }
                    value={
                      isPdf
                        ? lockedAccess
                          ? `${Math.min(
                              access?.samplePages || pageCount,
                              pageCount || access?.samplePages || 0
                            )} páginas`
                          : pageCount || "—"
                        : lockedAccess
                        ? `${Math.min(
                            access?.sampleChapters ||
                              bundle.chapters.length,
                            chapterCount
                          )} ${
                            Math.min(
                              access?.sampleChapters ||
                                bundle.chapters.length,
                              chapterCount
                            ) === 1
                              ? "capítulo"
                              : "capítulos"
                          }`
                        : readingStats.wordCount.toLocaleString(
                            "es-MX"
                          )
                    }
                  />

                  <InfoBadge
                    icon="💳"
                    label="Precio"
                    value={
                      bundle.work.price_mxn > 0
                        ? `$${bundle.work.price_mxn.toFixed(
                            0
                          )} MXN`
                        : "Gratis"
                    }
                  />
                </div>

                {isPdf && (
                  <div className="mt-3 rounded-[15px] border border-[#ded7d1] bg-[#fcfbf9] px-4 py-3">
                    <p className="text-xs leading-5 text-[#81766f]">
                      La maquetación, tipografías e imágenes se conservan como en el archivo original.
                    </p>
                  </div>
                )}

                {bundle.work.content_warnings.length >
                  0 && (
                  <div className="mt-3 rounded-[15px] border border-[#e5d3a9] bg-[#fff9eb] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9a7626]">
                      Advertencias de contenido
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-[#806d44]">
                      {bundle.work.content_warnings.join(
                        " · "
                      )}
                    </p>
                  </div>
                )}

                {safeProgress !== null &&
                  !finished &&
                  totalProgressUnits > 0 && (
                    <div className="mt-3 rounded-[15px] border border-[#d6e0e4] bg-[#f6fafb] px-4 py-3">
                      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-[#718087]">
                        <span>Tu progreso</span>
                        <span>
                          {isPdf
                            ? "Página"
                            : "Capítulo"}{" "}
                          {safeProgress + 1} de{" "}
                          {totalProgressUnits}
                        </span>
                      </div>

                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#dfe8eb]">
                        <div
                          className="h-full rounded-full bg-[#4e8596]"
                          style={{
                            width: `${Math.min(
                              100,
                              ((safeProgress + 1) /
                                totalProgressUnits) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                {bundle.work.work_status ===
                  "ongoing" && (
                  <div className="mt-3 rounded-[15px] border border-[#bdd7df] bg-[#f1f8fa] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#428397]">
                      Publicación seriada
                    </p>

                    <p className="mt-1.5 font-black text-[#315f6c]">
                      {serialStateLabel(
                        bundle.work.serial_state
                      )}
                    </p>

                    {bundle.work
                      .next_release_at && (
                      <p className="mt-1.5 text-xs text-[#6f7e84]">
                        Próximo capítulo:{" "}
                        <strong>
                          {formatPublicDate(
                            bundle.work
                              .next_release_at
                          )}
                        </strong>
                      </p>
                    )}

                    {bundle.work
                      .author_commitment && (
                      <p className="mt-2 text-xs leading-5 text-[#6f7e84]">
                        “
                        {
                          bundle.work
                            .author_commitment
                        }
                        ”
                      </p>
                    )}
                  </div>
                )}

                {/* TAGS */}
                {bundle.work.tags.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {bundle.work.tags.map((tag) => (
                      <span
                        key={tag}
                        className="shrink-0 rounded-full border border-[#ddd5cf] bg-white px-3 py-1 text-[11px] font-bold text-[#81766f]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* ACCIONES SECUNDARIAS */}
                <div className="mt-4 border-t border-[#eee5de] pt-4">
                  <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#9b9088]">
                    Guardar y conectar
                  </p>

                  <div className="grid grid-cols-2 gap-2 [&_button]:!min-h-10 [&_button]:!w-full [&_button]:!justify-center [&_button]:!rounded-[13px] [&_button]:!text-xs">
                    <SaveButton
                      slug={bundle.work.slug}
                    />

                    <FavoriteButton
                      slug={bundle.work.slug}
                    />
                  </div>

                  {!ownWork && (
                    <div className="mt-2 flex min-h-10 items-center justify-center rounded-[13px] border border-[#a8bea7] bg-[#f8fbf6] px-2 [&_*]:!m-0 [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!px-1 [&_button]:!py-0 [&_button]:!text-xs [&_button]:!font-black [&_button]:!text-[#405f43] [&_button]:!shadow-none">
                      <WorkFollowButton
                        workId={bundle.work.id}
                        authorId={bundle.work.author_id}
                      />
                    </div>
                  )}

                  {lockedAccess &&
                    access?.canReadSample && (
                    <p className="mt-3 text-center text-[11px] font-semibold leading-5 text-[#887b72]">
                      Muestra gratuita:{" "}
                      {isPdf
                        ? `${Math.min(
                            access.samplePages,
                            access.totalPages ||
                              access.samplePages
                          )} páginas`
                        : `${Math.min(
                            access.sampleChapters,
                            access.totalChapters ||
                              access.sampleChapters
                          )} ${
                            access.sampleChapters === 1
                              ? "capítulo"
                              : "capítulos"
                          }`}{" "}
                      antes de{" "}
                      {isFreeWork
                        ? "obtener la obra"
                        : "comprar"}.
                    </p>
                  )}

                  <Link
                    href="/biblioteca"
                    className="mx-auto mt-3 block w-fit text-xs font-semibold text-[#8a8079] underline underline-offset-4 transition hover:text-[#b95016]"
                  >
                    Ver en mi biblioteca
                  </Link>
                </div>
              </div>
            </section>

            {/* =========================================================
                DETALLE DE OBRA · ESCRITORIO
               ========================================================= */}
            <section className="mt-4 hidden overflow-hidden rounded-[30px] border border-[#ded5ce] bg-white shadow-[0_16px_38px_rgba(47,41,37,0.07)] lg:grid lg:grid-cols-[330px_minmax(0,1fr)]">
              <div className="relative overflow-hidden bg-gradient-to-b from-[#ded2be] via-[#e8d9c0] to-[#d6c9b4] p-6">
                <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#8b8b86]/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#a6a29c]/10 blur-3xl" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCoverOpen(true)}
                    className="group relative mx-auto block aspect-[2/3] w-full max-w-[300px] overflow-hidden rounded-[22px] border border-white/80 text-left shadow-[0_24px_46px_rgba(67,42,27,0.18)] ring-1 ring-black/[0.05] transition duration-200 hover:-translate-y-1"
                    style={{
                      background:
                        getWorkCoverBackground(
                          bundle.work
                        ),
                    }}
                    aria-label="Ver portada ampliada"
                  >
                    <span className="absolute inset-x-4 bottom-4 rounded-full bg-black/68 px-4 py-2 text-center text-xs font-black text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                      Ver portada
                    </span>
                  </button>

                  <div className="mx-auto mt-4 grid max-w-[300px] grid-cols-2 gap-2">
                    <div className="flex min-h-[46px] items-center gap-2 rounded-[12px] border border-[#ded7d1] bg-white px-2.5 py-2">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fff3e9] text-xs">
                        📚
                      </div>

                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-[#9a8d85]">
                          {isPdf ? "Páginas" : "Capítulos"}
                        </p>

                        <p className="mt-0.5 truncate text-xs font-black text-[#302a26]">
                          {isPdf
                            ? pageCount || "—"
                            : chapterCount}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-h-[46px] items-center gap-2 rounded-[12px] border border-[#ded7d1] bg-white px-2.5 py-2">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fff3e9] text-xs">
                        ⏱
                      </div>

                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-[#9a8d85]">
                          {isPdf ? "Formato" : "Lectura"}
                        </p>

                        <p className="mt-0.5 truncate text-xs font-black text-[#302a26]">
                          {isPdf
                            ? "PDF"
                            : `≈ ${readingStats.readMinutes} min`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {bundle.work.tags.length > 0 && (
                    <div className="mx-auto mt-4 flex max-w-[300px] flex-wrap gap-2">
                      {bundle.work.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#ddd5cf] bg-white px-3 py-1 text-xs font-bold text-[#81766f]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mx-auto mt-4 flex max-w-[300px] flex-col gap-2">
                    <div className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#ded5cc] bg-white px-3 [&_*]:!m-0 [&_button]:!w-full [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!px-1 [&_button]:!py-0 [&_button]:!text-sm [&_button]:!font-black [&_button]:!text-[#5f5650] [&_button]:!shadow-none">
                      <SaveButton
                        slug={bundle.work.slug}
                      />
                    </div>

                    <div className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#ded5cc] bg-white px-3 [&_*]:!m-0 [&_button]:!w-full [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!px-1 [&_button]:!py-0 [&_button]:!text-sm [&_button]:!font-black [&_button]:!text-[#5f5650] [&_button]:!shadow-none">
                      <FavoriteButton
                        slug={bundle.work.slug}
                      />
                    </div>

                    {!ownWork && (
                      <div className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#a8bea7] bg-[#f8fbf6] px-3 [&_*]:!m-0 [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!px-1 [&_button]:!py-0 [&_button]:!text-sm [&_button]:!font-black [&_button]:!text-[#405f43] [&_button]:!shadow-none">
                        <WorkFollowButton
                          workId={bundle.work.id}
                          authorId={bundle.work.author_id}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="max-w-[900px]">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#d7d7d2] bg-[#fafaf8] px-3 py-1 text-xs font-bold text-[#5f5f5a]">
                      {bundle.work.genre}
                    </span>

                    <span className="rounded-full border border-[#ddd5cf] bg-[#faf9f7] px-3 py-1 text-xs font-bold text-[#746a63]">
                      {bundle.work.work_status ===
                      "ongoing"
                        ? "En proceso"
                        : "Terminada"}
                    </span>

                    {isPdf && (
                      <span className="rounded-full border border-[#d7d7d2] bg-[#f5f4f1] px-3 py-1 text-xs font-black text-[#5f5f5a]">
                        PDF · Edición original
                      </span>
                    )}

                    {bundle.work.work_status ===
                      "ongoing" && (
                      <span className="rounded-full border border-[#bdd7df] bg-[#eef7fa] px-3 py-1 text-xs font-bold text-[#3f7484]">
                        {serialStateLabel(
                          bundle.work.serial_state
                        )}
                      </span>
                    )}

                    {finished && (
                      <span className="rounded-full border border-[#c9dbc8] bg-[#f2f8f1] px-3 py-1 text-xs font-bold text-[#4f7951]">
                        ✓ Terminada por ti
                      </span>
                    )}
                  </div>

                  <h1 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.05em]">
                    {bundle.work.title}
                  </h1>

                  {bundle.work.subtitle && (
                    <p className="mt-2 max-w-2xl text-lg leading-7 text-[#7c716a]">
                      {bundle.work.subtitle}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-[#7f756f]">
                    por{" "}
                    <Link
                      href={`/autores/${bundle.work.author_id}`}
                      className="font-black text-[#b95016] underline decoration-[#d9aa89] underline-offset-4 transition hover:text-[#934014]"
                    >
                      {bundle.author_name}
                    </Link>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {hasPublicRating ? (
                      <>
                        <span className="rounded-full border border-[#e2d2ad] bg-[#fff9ed] px-3 py-1 text-sm font-black text-[#9b7625]">
                          ★ {rating?.rating_avg?.toFixed(1)}
                        </span>

                        <span className="text-sm font-semibold text-[#8d837d]">
                          {rating?.rating_count}{" "}
                          {rating?.rating_count === 1
                            ? "valoración"
                            : "valoraciones"}
                        </span>
                      </>
                    ) : (
                      <div
                        className="flex items-center gap-2"
                        role="img"
                        aria-label="Sin valoraciones todavía"
                      >
                        <span
                          aria-hidden="true"
                          className="tracking-[0.10em] text-[#c7bdb5]"
                        >
                          ☆☆☆☆☆
                        </span>
                        <span className="text-sm font-semibold text-[#928881]">
                          Sin valoraciones
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 rounded-[18px] border border-[#e0d7d0] bg-[#fcfbf9] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5b5b57]">
                      Sinopsis
                    </p>

                    <p className="mt-2 max-w-3xl line-clamp-3 text-base leading-7 text-[#625a55]">
                      {bundle.work.synopsis}
                    </p>

                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-sm font-black text-[#a6511d] underline decoration-[#d8a17d] underline-offset-4">
                        <span className="group-open:hidden">
                          Leer más
                        </span>
                        <span className="hidden group-open:inline">
                          Mostrar menos
                        </span>
                      </summary>

                      <p className="mt-2 max-w-3xl text-base leading-7 text-[#625a55]">
                        {bundle.work.synopsis}
                      </p>
                    </details>
                  </div>

                  <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                    <InfoBadge
                      icon="🌐"
                      label="Idioma"
                      value={bundle.work.language_code.toUpperCase()}
                    />

                    <InfoBadge
                      icon="🔞"
                      label="Edad"
                      value={bundle.work.age_rating}
                    />

                    <InfoBadge
                      icon={lockedAccess ? "📖" : "✍️"}
                      label={
                        isPdf
                          ? lockedAccess
                            ? "Muestra"
                            : "Páginas"
                          : lockedAccess
                          ? "Muestra"
                          : "Palabras"
                      }
                      value={
                        isPdf
                          ? lockedAccess
                            ? `${Math.min(
                                access?.samplePages || pageCount,
                                pageCount || access?.samplePages || 0
                              )} páginas`
                            : pageCount || "—"
                          : lockedAccess
                          ? `${Math.min(
                              access?.sampleChapters ||
                                bundle.chapters.length,
                              chapterCount
                            )} ${
                              Math.min(
                                access?.sampleChapters ||
                                  bundle.chapters.length,
                                chapterCount
                              ) === 1
                                ? "capítulo"
                                : "capítulos"
                            }`
                          : readingStats.wordCount.toLocaleString(
                              "es-MX"
                            )
                      }
                    />

                    <InfoBadge
                      icon="💳"
                      label="Precio"
                      value={
                        bundle.work.price_mxn > 0
                          ? `$${bundle.work.price_mxn.toFixed(
                              0
                            )} MXN`
                          : "Gratis"
                      }
                    />
                  </div>

                  {bundle.work.content_warnings.length >
                    0 && (
                    <div className="mt-3 rounded-[16px] border border-[#e5d3a9] bg-[#fff9eb] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9a7626]">
                        Advertencias de contenido
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#806d44]">
                        {bundle.work.content_warnings.join(
                          " · "
                        )}
                      </p>
                    </div>
                  )}

                  {safeProgress !== null &&
                    !finished &&
                    totalProgressUnits > 0 && (
                      <div className="mt-2.5 max-w-xl rounded-[16px] border border-[#d6e0e4] bg-[#f6fafb] px-4 py-3">
                        <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#718087]">
                          <span>Tu progreso</span>
                          <span>
                            {isPdf
                              ? "Página"
                              : "Capítulo"}{" "}
                            {safeProgress + 1} de{" "}
                            {totalProgressUnits}
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe8eb]">
                          <div
                            className="h-full rounded-full bg-[#4e8596]"
                            style={{
                              width: `${Math.min(
                                100,
                                ((safeProgress + 1) /
                                  totalProgressUnits) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {bundle.work.work_status ===
                    "ongoing" && (
                    <div className="mt-2 rounded-[16px] border border-[#bdd7df] bg-[#f1f8fa] px-4 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#428397]">
                            Publicación seriada
                          </p>

                          <p className="mt-1.5 text-base font-black text-[#315f6c]">
                            {serialStateLabel(
                              bundle.work.serial_state
                            )}
                          </p>
                        </div>

                        {bundle.work
                          .next_release_at && (
                          <div className="text-right">
                            <p className="text-xs font-semibold text-[#809096]">
                              Próximo capítulo previsto
                            </p>

                            <p className="mt-1 text-sm font-black text-[#496f7a]">
                              {formatPublicDate(
                                bundle.work
                                  .next_release_at
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {bundle.work
                        .author_commitment && (
                        <p className="mt-2.5 text-sm leading-6 text-[#6f7e84]">
                          “
                          {
                            bundle.work
                              .author_commitment
                          }
                          ”
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTA DESKTOP */}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {lockedAccess ? (
                      <>
                        <div className="[&_button]:!min-h-[54px] [&_button]:!px-8 [&_button]:!py-3.5 [&_button]:!text-lg">
                          {isFreeWork ? (
                            <AcquireButton
                              slug={bundle.work.slug}
                              loggedIn={loggedIn}
                              onAcquired={(nextAccess) => {
                                setAccess(nextAccess);
                                setFinished(false);
                              }}
                            />
                          ) : (
                            <PurchaseButton
                              slug={bundle.work.slug}
                              priceMxn={bundle.work.price_mxn}
                              loggedIn={loggedIn}
                            />
                          )}
                        </div>

                        {access?.canReadSample && (
                          <Link
                            href={sampleHref}
                            className="flex min-h-[50px] items-center rounded-full border-2 border-[#d7a681] bg-[#fff8f2] px-6 py-3 text-sm font-black text-[#a6511d] transition hover:border-[#c87f4d] hover:bg-[#fff1e6]"
                          >
                            Leer muestra
                          </Link>
                        )}
                      </>
                    ) : (
                      <Link
                        href={readingHref}
                        className="flex min-h-[54px] items-center rounded-full bg-[#d96822] px-8 py-3.5 text-lg font-black text-white shadow-[0_10px_24px_rgba(217,104,34,0.20)] transition hover:bg-[#be5717]"
                      >
                        {readingLabel}
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 border-t border-[#eee5de] pt-4">
                    <Link
                      href="/biblioteca"
                      className="text-sm font-semibold text-[#8a8079] underline underline-offset-4 transition hover:text-[#b95016]"
                    >
                      Ver en mi biblioteca
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {coverOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
                onClick={() => setCoverOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label={`Portada ampliada de ${bundle.work.title}`}
              >
                <div
                  className="relative w-full max-w-[540px]"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  role="presentation"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCoverOpen(false)
                    }
                    className="absolute -right-2 -top-12 rounded-full border border-white/25 bg-black/60 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:bg-black/80"
                  >
                    ✕ Cerrar
                  </button>

                  <div
                    className="mx-auto aspect-[2/3] max-h-[82vh] w-full rounded-[24px] border border-white/20 shadow-2xl"
                    style={{
                      background:
                        getWorkCoverBackground(
                          bundle.work
                        ),
                    }}
                  />

                  <p className="mt-3 text-center text-xs font-semibold text-white/75">
                    {bundle.work.title}
                  </p>
                </div>
              </div>
            )}

            {/* LECTORES Y COMUNIDAD: después de conocer/obtener la obra */}
            <WorkCommunityPreview
              slug={bundle.work.slug}
              ratingAvg={
                hasPublicRating
                  ? rating?.rating_avg ?? null
                  : null
              }
              ratingCount={
                rating?.rating_count || 0
              }
            />

            <section className="mt-5 rounded-[20px] border border-[#ddd5cf] bg-white p-4 shadow-[0_8px_20px_rgba(62,45,34,0.03)] md:mt-8 md:rounded-[24px] md:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5b3f8c]">
                Autor
              </p>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">
                    {bundle.author_name}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#847a73]">
                    Consulta su perfil, sus demás publicaciones y síguelo para volver a encontrarlo.
                  </p>
                </div>

                <Link
                  href={`/autores/${bundle.work.author_id}`}
                  className="shrink-0 rounded-full border border-[#b79bde] bg-[#f4eefc] px-5 py-2.5 text-sm font-black text-[#4a3273] transition hover:border-[#9c7cc4] hover:bg-[#efe6fa] hover:text-[#4a3273]"
                >
                  Ver perfil del autor
                </Link>
              </div>
            </section>

            {!isPdf && (
              <section className="mt-5 rounded-[20px] border border-[#ddd5cf] bg-white p-4 shadow-[0_8px_20px_rgba(62,45,34,0.03)] md:mt-8 md:rounded-[24px] md:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#428397]">
                  Capítulos publicados
                </p>

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="mt-2 text-2xl font-black">
                    {bundle.chapters.length} capítulos
                  </h2>

                  <span className="text-xs font-semibold text-[#9a9089]">
                    Correcciones con historial versionado
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {bundle.chapters.map(
                    (chapter) => (
                      <Link
                        key={chapter.id}
                        href={`/leer-publicado/${bundle.work.slug}?capitulo=${chapter.chapter_number}`}
                        className="flex items-center justify-between rounded-[20px] border border-[#ddd5cf] bg-[#fcfbf9] p-4 transition hover:border-[#b8d1da] hover:bg-white"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8f9ca1]">
                            Capítulo{" "}
                            {
                              chapter.chapter_number
                            }
                          </p>

                          <p className="mt-1 font-black">
                            {chapter.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-[#ddd5cf] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8e837c]">
                            v
                            {
                              chapter.current_version
                            }
                          </span>

                          {chapter.current_version >
                            1 && (
                            <span className="hidden text-xs font-bold text-[#428397] sm:inline">
                              Corregido
                            </span>
                          )}

                          <span className="font-black text-[#7e746e]">
                            →
                          </span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </section>
            )}

            {moreByAuthor.length > 0 && (
              <section className="mt-5 rounded-[20px] border border-[#ddd5cf] bg-white p-4 shadow-[0_8px_20px_rgba(62,45,34,0.03)] md:mt-8 md:rounded-[24px] md:p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
                      Más del autor
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      También de{" "}
                      {bundle.author_name}
                    </h2>
                  </div>

                  <Link
                    href={`/autores/${bundle.work.author_id}`}
                    className="text-sm font-black text-[#7d736c] transition hover:text-[#b95016]"
                  >
                    Ver perfil
                  </Link>
                </div>

                <div className="mt-5 flex gap-5 overflow-x-auto pb-4">
                  {moreByAuthor.map(
                    (work) => (
                      <PublishedWorkCard
                        key={work.id}
                        work={work}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* VALORACIÓN PROPIA · al final y colapsable */}
            <details className="mt-5 rounded-[20px] border border-[#ddd5cf] bg-white shadow-[0_8px_20px_rgba(62,45,34,0.03)] md:mt-8 md:rounded-[24px]">
              <summary className="cursor-pointer list-none px-4 py-4 md:px-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9c7b28]">
                      Tu opinión
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      ¿Qué te pareció?
                    </h2>
                  </div>

                  <span className="rounded-full border border-[#e4dbd4] bg-[#faf8f6] px-3 py-1.5 text-xs font-black text-[#7a7069]">
                    Valorar / escribir crítica
                  </span>
                </div>
              </summary>

              <div className="border-t border-[#eee5de] px-4 pb-5 pt-4 md:px-5">
                {ownWork ? (
                  <p className="text-sm text-[#8c827b]">
                    El autor no puede valorar su propia obra.
                  </p>
                ) : !loggedIn ? (
                  <p className="text-sm text-[#8c827b]">
                    Inicia sesión y termina la obra para poder valorarla.
                  </p>
                ) : !finished ? (
                  <p className="text-sm text-[#8c827b]">
                    Termina la obra antes de dejar una valoración.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map(
                        (value) => (
                          <button
                            key={value}
                            onClick={() =>
                              rate(value)
                            }
                            disabled={
                              ratingBusy
                            }
                            aria-label={`${value} estrellas`}
                            className={`rounded-[14px] border px-4 py-3 text-2xl transition disabled:opacity-50 ${
                              (myRating || 0) >=
                              value
                                ? "border-[#d8bf83] bg-[#fff7e2] text-[#b48728]"
                                : "border-[#ddd5cf] bg-white text-[#c3bbb5] hover:border-[#d8bf83] hover:text-[#b48728]"
                            }`}
                          >
                            ★
                          </button>
                        )
                      )}
                    </div>

                    {myRating && (
                      <p className="mt-3 text-sm font-semibold text-[#8d837c]">
                        Tu valoración actual:{" "}
                        {myRating}/5
                      </p>
                    )}

                    {ratingMessage && (
                      <p className="mt-3 text-sm text-[#7d746e]">
                        {ratingMessage}
                      </p>
                    )}

                    <ReaderFeedbackExtras
                      slug={
                        bundle.work.slug
                      }
                    />
                  </>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
