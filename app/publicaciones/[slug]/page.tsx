"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import SaveButton from "@/components/SaveButton";
import FavoriteButton from "@/components/FavoriteButton";
import WorkFollowButton from "@/components/WorkFollowButton";
import ReaderFeedbackExtras from "@/components/ReaderFeedbackExtras";
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

  const [ownWork, setOwnWork] = useState(false);

  const [moreByAuthor, setMoreByAuthor] = useState<
    Array<PublishedWork & { author_name: string }>
  >([]);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getPublishedWorkBySlug(params.slug);

      setBundle(result);

      if (!result) return;

      const [summary, user, allPublished] =
        await Promise.all([
          getPublicWorkRating(result.work.slug),
          getCurrentUser(),
          getPublishedWorks(),
        ]);

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

  const chapterCount =
    bundle?.chapters.length || 0;

  const readingStats = bundle
    ? getWorkReadingStats(bundle.chapters)
    : { wordCount: 0, readMinutes: 0 };

  const safeProgress =
    progress === null
      ? null
      : Math.min(
          Math.max(0, progress),
          Math.max(0, chapterCount - 1)
        );

  const readingHref =
    bundle && safeProgress !== null && !finished
      ? `/leer-publicado/${bundle.work.slug}?capitulo=${
          safeProgress + 1
        }`
      : bundle
      ? `/leer-publicado/${bundle.work.slug}`
      : "#";

  const readingLabel =
    finished
      ? "Leer de nuevo"
      : safeProgress !== null
      ? `Continuar · capítulo ${safeProgress + 1}`
      : "Leer desde el capítulo 1";

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <Link
          href="/descubre"
          className="text-sm font-semibold text-zinc-400"
        >
          ← Catálogo
        </Link>

        {loading ? (
          <div className="mt-8 text-zinc-500">
            Cargando...
          </div>
        ) : error ? (
          <div className="mt-8 text-rose-300">
            {error}
          </div>
        ) : !bundle ? (
          <div className="mt-8">
            Obra no encontrada.
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-8 md:grid-cols-[260px_1fr]">
              <div
                className="aspect-[2/3] rounded-3xl shadow-2xl ring-1 ring-white/10"
                style={{
                  background:
                    getWorkCoverBackground(
                      bundle.work
                    ),
                }}
              />

              <div className="self-center">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                    {bundle.work.genre}
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                    {bundle.work.work_status ===
                    "ongoing"
                      ? "En proceso"
                      : "Terminada"}
                  </span>

                  {bundle.work.work_status === "ongoing" && (
                    <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
                      {serialStateLabel(bundle.work.serial_state)}
                    </span>
                  )}

                  {finished && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      ✓ Terminada por ti
                    </span>
                  )}
                </div>

                <h1 className="mt-5 text-4xl font-black md:text-6xl">
                  {bundle.work.title}
                </h1>

                {bundle.work.subtitle && (
                  <p className="mt-2 max-w-2xl text-xl text-zinc-400">
                    {bundle.work.subtitle}
                  </p>
                )}

                <p className="mt-3 text-lg text-zinc-400">
                  por{" "}
                  <Link
                    href={`/autores/${bundle.work.author_id}`}
                    className="font-semibold text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
                  >
                    {bundle.author_name}
                  </Link>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {hasPublicRating ? (
                    <>
                      <span className="text-lg font-bold text-amber-300">
                        ★{" "}
                        {rating?.rating_avg?.toFixed(
                          1
                        )}
                      </span>

                      <span className="text-sm text-zinc-500">
                        {rating?.rating_count}{" "}
                        {rating?.rating_count === 1
                          ? "valoración"
                          : "valoraciones"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-zinc-500">
                      Todavía sin valoraciones
                    </span>
                  )}
                </div>

                <p className="mt-6 max-w-2xl leading-7 text-zinc-300">
                  {bundle.work.synopsis}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {bundle.work.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-zinc-500">Idioma</p>
                    <p className="mt-1 font-semibold">
                      {bundle.work.language_code.toUpperCase()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-zinc-500">Edad</p>
                    <p className="mt-1 font-semibold">
                      {bundle.work.age_rating}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-zinc-500">Palabras</p>
                    <p className="mt-1 font-semibold">
                      {readingStats.wordCount.toLocaleString("es-MX")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-zinc-500">Lectura</p>
                    <p className="mt-1 font-semibold">
                      ≈ {readingStats.readMinutes} min
                    </p>
                  </div>
                </div>

                {bundle.work.content_warnings.length > 0 && (
                  <div className="mt-5 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-100">
                      Advertencias de contenido
                    </p>

                    <p className="mt-2 text-sm leading-6 text-amber-100/80">
                      {bundle.work.content_warnings.join(" · ")}
                    </p>
                  </div>
                )}

                {safeProgress !== null &&
                  !finished &&
                  chapterCount > 0 && (
                    <div className="mt-6 max-w-md">
                      <div className="flex items-center justify-between text-sm text-zinc-500">
                        <span>Tu progreso</span>
                        <span>
                          Capítulo{" "}
                          {safeProgress + 1} de{" "}
                          {chapterCount}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{
                            width: `${Math.min(
                              100,
                              ((safeProgress + 1) /
                                chapterCount) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                {bundle.work.work_status === "ongoing" && (
                  <div className="mt-5 max-w-2xl rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-100">
                          Publicación seriada
                        </p>
                        <p className="mt-2 font-semibold">
                          {serialStateLabel(bundle.work.serial_state)}
                        </p>
                      </div>

                      {bundle.work.next_release_at && (
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">
                            Próximo capítulo previsto
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {formatPublicDate(bundle.work.next_release_at)}
                          </p>
                        </div>
                      )}
                    </div>

                    {bundle.work.author_commitment && (
                      <p className="mt-4 text-sm leading-6 text-zinc-400">
                        “{bundle.work.author_commitment}”
                      </p>
                    )}

                    <p className="mt-4 border-t border-sky-300/10 pt-4 text-xs text-zinc-500">
                      Sigue esta obra para recibir un aviso cuando publique un capítulo nuevo.
                    </p>
                  </div>
                )}

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href={readingHref}
                    className="rounded-full bg-white px-6 py-3 font-semibold text-black"
                  >
                    {readingLabel}
                  </Link>

                  <SaveButton
                    slug={bundle.work.slug}
                  />

                  <FavoriteButton
                    slug={bundle.work.slug}
                  />

                  <WorkFollowButton
                    workId={bundle.work.id}
                    authorId={bundle.work.author_id}
                  />

                  <Link
                    href={`/comunidad/${bundle.work.slug}`}
                    className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04]"
                  >
                    Comunidad
                  </Link>

                  <span className="ml-1 font-bold">
                    {bundle.work.price_mxn > 0
                      ? `$${bundle.work.price_mxn.toFixed(
                          0
                        )} MXN`
                      : "Gratis"}
                  </span>
                </div>

                <Link
                  href="/biblioteca"
                  className="mt-4 inline-block text-sm text-zinc-500 underline hover:text-white"
                >
                  Ver en mi biblioteca
                </Link>
              </div>
            </section>

            <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Valoración de lectores
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                ¿Qué te pareció?
              </h2>

              {ownWork ? (
                <p className="mt-3 text-sm text-zinc-500">
                  El autor no puede valorar su propia
                  obra.
                </p>
              ) : !loggedIn ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Inicia sesión y termina la obra para
                  poder valorarla.
                </p>
              ) : !finished ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Termina la obra antes de dejar una
                  valoración.
                </p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map(
                      (value) => (
                        <button
                          key={value}
                          onClick={() => rate(value)}
                          disabled={ratingBusy}
                          aria-label={`${value} estrellas`}
                          className={`rounded-xl border px-4 py-3 text-2xl transition disabled:opacity-50 ${
                            (myRating || 0) >= value
                              ? "border-amber-300/30 bg-amber-300/10 text-amber-300"
                              : "border-white/10 text-zinc-600 hover:text-amber-300"
                          }`}
                        >
                          ★
                        </button>
                      )
                    )}
                  </div>

                  {myRating && (
                    <p className="mt-3 text-sm text-zinc-500">
                      Tu valoración actual:{" "}
                      {myRating}/5
                    </p>
                  )}

                  {ratingMessage && (
                    <p className="mt-3 text-sm text-zinc-400">
                      {ratingMessage}
                    </p>
                  )}

                  <ReaderFeedbackExtras
                    slug={bundle.work.slug}
                  />
                </>
              )}
            </section>

            <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Autor
              </p>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {bundle.author_name}
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    Consulta su perfil, sus demás publicaciones y síguelo para volver a encontrarlo.
                  </p>
                </div>

                <Link
                  href={`/autores/${bundle.work.author_id}`}
                  className="shrink-0 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                >
                  Ver perfil del autor
                </Link>
              </div>
            </section>

            <section className="mt-12">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Capítulos publicados
              </p>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="mt-2 text-2xl font-bold">
                  {bundle.chapters.length} capítulos
                </h2>

                <span className="text-xs text-zinc-600">
                  Correcciones con historial versionado
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {bundle.chapters.map((chapter) => (
                  <Link
                    key={chapter.id}
                    href={`/leer-publicado/${bundle.work.slug}?capitulo=${chapter.chapter_number}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/25"
                  >
                    <div>
                      <p className="text-xs text-zinc-500">
                        Capítulo{" "}
                        {chapter.chapter_number}
                      </p>

                      <p className="mt-1 font-semibold">
                        {chapter.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        v{chapter.current_version}
                      </span>

                      {chapter.current_version > 1 && (
                        <span className="hidden text-xs text-sky-300 sm:inline">
                          Corregido
                        </span>
                      )}

                      <span>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {moreByAuthor.length > 0 && (
              <section className="mt-12">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Más del autor
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      También de {bundle.author_name}
                    </h2>
                  </div>

                  <Link
                    href={`/autores/${bundle.work.author_id}`}
                    className="text-sm text-zinc-400 hover:text-white"
                  >
                    Ver perfil
                  </Link>
                </div>

                <div className="mt-5 flex gap-5 overflow-x-auto pb-4">
                  {moreByAuthor.map((work) => (
                    <PublishedWorkCard
                      key={work.id}
                      work={work}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
