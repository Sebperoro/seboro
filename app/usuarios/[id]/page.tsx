"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getPublicReaderActivity,
  getPublicReaderFavorites,
  getPublicReaderFinished,
  getPublicReaderHistory,
  getPublicReaderProfile,
  getPublicReaderReviews,
  type PublicReaderProfile,
  type ReaderActivityRow,
  type ReaderFavoriteRow,
  type ReaderFinishedRow,
  type ReaderHistoryRow,
  type ReaderReviewRow,
} from "@/lib/readerProfiles";
import {
  getReaderCatalog,
  type ReaderCatalogItem,
} from "@/lib/readerCatalog";

type Snapshot = {
  profile: PublicReaderProfile;
  favorites: ReaderFavoriteRow[];
  finished: ReaderFinishedRow[];
  history: ReaderHistoryRow[];
  reviews: ReaderReviewRow[];
  activity: ReaderActivityRow[];
  catalog: ReaderCatalogItem[];
};

const reactionLabel: Record<string, string> = {
  love: "❤️",
  moved: "😢",
  surprised: "😮",
  funny: "😂",
  annoyed: "😡",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(value));
}

export default function PublicReaderPage() {
  const params =
    useParams<{ id: string }>();

  const [snapshot, setSnapshot] =
    useState<Snapshot | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const profile =
          await getPublicReaderProfile(
            params.id
          );

        if (!profile) {
          if (active) {
            setSnapshot(null);
          }
          return;
        }

        const [
          favorites,
          finished,
          history,
          reviews,
          activity,
          catalog,
        ] = await Promise.all([
          getPublicReaderFavorites(
            params.id
          ),
          getPublicReaderFinished(
            params.id
          ),
          getPublicReaderHistory(
            params.id
          ),
          getPublicReaderReviews(
            params.id
          ),
          getPublicReaderActivity(
            params.id
          ),
          getReaderCatalog(),
        ]);

        if (active) {
          setSnapshot({
            profile,
            favorites,
            finished,
            history,
            reviews,
            activity,
            catalog,
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el perfil."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const itemMap = useMemo(
    () =>
      new Map(
        (snapshot?.catalog || []).map(
          (item) => [
            item.slug,
            item,
          ]
        )
      ),
    [snapshot?.catalog]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />
        <div className="mx-auto max-w-7xl px-5 py-12 text-zinc-500">
          Cargando perfil...
        </div>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-3xl font-black">
              Perfil no disponible
            </h1>

            <p className="mt-3 text-zinc-400">
              {error ||
                "Este perfil no existe o su propietario decidió mantenerlo privado."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    profile,
    favorites,
    finished,
    history,
    reviews,
    activity,
  } = snapshot;

  const favoriteItems = favorites
    .map((row) =>
      itemMap.get(row.book_slug)
    )
    .filter(Boolean) as ReaderCatalogItem[];

  const finishedItems = finished
    .map((row) => ({
      row,
      item: itemMap.get(
        row.book_slug
      ),
    }))
    .filter(
      (
        value
      ): value is {
        row: ReaderFinishedRow;
        item: ReaderCatalogItem;
      } => Boolean(value.item)
    );

  const historyItems = history
    .map((row) => ({
      row,
      item: itemMap.get(
        row.book_slug
      ),
    }))
    .filter(
      (
        value
      ): value is {
        row: ReaderHistoryRow;
        item: ReaderCatalogItem;
      } => Boolean(value.item)
    );

  const roleLabel =
    profile.role === "admin"
      ? "Administrador"
      : profile.role === "author"
      ? "Autor"
      : "Lector";

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-8 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-4xl font-black">
              {profile.display_name
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Perfil de lector
                </p>

                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  {roleLabel}
                </span>
              </div>

              <h1 className="mt-2 text-4xl font-black md:text-5xl">
                {profile.display_name}
              </h1>

              {profile.bio && (
                <p className="mt-4 max-w-3xl leading-7 text-zinc-300">
                  {profile.bio}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {profile.favorite_genres.map(
                  (genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
                    >
                      {genre}
                    </span>
                  )
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
                {profile.show_finished && (
                  <span>
                    <b className="text-white">
                      {profile.finished_count}
                    </b>{" "}
                    terminadas
                  </span>
                )}

                {profile.show_reviews && (
                  <span>
                    <b className="text-white">
                      {profile.review_count}
                    </b>{" "}
                    críticas
                  </span>
                )}

                {profile.show_favorites && (
                  <span>
                    <b className="text-white">
                      {profile.favorite_count}
                    </b>{" "}
                    favoritas
                  </span>
                )}

                {profile.show_activity && (
                  <span>
                    <b className="text-white">
                      {profile.community_count}
                    </b>{" "}
                    aportes en comunidad
                  </span>
                )}
              </div>

              {profile.role !== "reader" && (
                <Link
                  href={`/autores/${profile.user_id}`}
                  className="mt-6 inline-block rounded-full border border-violet-300/20 bg-violet-300/10 px-5 py-2.5 text-sm font-semibold text-violet-100"
                >
                  Ver perfil de autor
                </Link>
              )}
            </div>

            <div className="grid shrink-0 gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Lector
                </p>

                <p className="mt-2 text-xl font-bold">
                  {profile.reader_level}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Nivel{" "}
                  {profile.reader_level_number}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Crítico
                </p>

                <p className="mt-2 text-xl font-bold">
                  {profile.critic_level}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Nivel{" "}
                  {profile.critic_level_number}
                </p>
              </div>
            </div>
          </div>
        </section>

        {profile.show_favorites && (
          <section className="mt-10">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Favoritas
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Historias favoritas
            </h2>

            {favoriteItems.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-zinc-400">
                Todavía no hay favoritas públicas.
              </div>
            ) : (
              <div className="mt-5 flex gap-4 overflow-x-auto pb-4">
                {favoriteItems.map(
                  (item) => (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className="w-40 shrink-0"
                    >
                      <div
                        className="aspect-[2/3] rounded-2xl border border-white/10"
                        style={{
                          background:
                            item.cover,
                        }}
                      />

                      <p className="mt-3 line-clamp-2 font-bold">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {item.genre}
                      </p>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {profile.show_reviews && (
          <section className="mt-10">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Críticas
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Críticas recientes
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-zinc-400">
                Todavía no hay críticas públicas.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {reviews.map((review) => {
                  const item =
                    itemMap.get(
                      review.book_slug
                    );

                  return (
                    <article
                      key={`${review.book_slug}-${review.updated_at}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            {item?.title ||
                              review.book_slug}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {formatDate(
                              review.updated_at
                            )}
                          </p>
                        </div>

                        {review.rating && (
                          <span className="shrink-0 font-semibold text-amber-300">
                            ★{" "}
                            {review.rating}
                          </span>
                        )}
                      </div>

                      <p className="mt-4 whitespace-pre-wrap leading-7 text-zinc-300">
                        {review.review}
                      </p>

                      {review.reactions.length >
                        0 && (
                        <div className="mt-4 flex gap-2">
                          {review.reactions.map(
                            (reaction) => (
                              <span
                                key={reaction}
                                className="rounded-full border border-white/10 px-2.5 py-1 text-sm"
                              >
                                {reactionLabel[
                                  reaction
                                ] ||
                                  "•"}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {item && (
                        <Link
                          href={item.href}
                          className="mt-4 inline-block text-sm font-semibold underline"
                        >
                          Ver obra
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {profile.show_activity && (
          <section className="mt-10">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Comunidad
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Actividad reciente
            </h2>

            {activity.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-zinc-400">
                Todavía no hay actividad pública.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {activity
                  .slice(0, 8)
                  .map(
                    (
                      activityItem,
                      index
                    ) => {
                      const item =
                        itemMap.get(
                          activityItem.book_slug
                        );

                      return (
                        <Link
                          key={`${activityItem.activity_type}-${activityItem.created_at}-${index}`}
                          href={
                            item?.community_href ||
                            `/comunidad/${activityItem.book_slug}`
                          }
                          className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/25"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                              {activityItem.activity_type ===
                              "reply"
                                ? "Respondió en"
                                : "Publicó en"}{" "}
                              {item?.title ||
                                activityItem.book_slug}
                            </p>

                            <span className="text-xs text-zinc-600">
                              {formatDate(
                                activityItem.created_at
                              )}
                            </span>
                          </div>

                          <p className="mt-3 line-clamp-3 leading-6 text-zinc-400">
                            {
                              activityItem.body
                            }
                          </p>
                        </Link>
                      );
                    }
                  )}
              </div>
            )}
          </section>
        )}

        {profile.show_finished && (
          <section className="mt-10">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Lecturas
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Obras terminadas
            </h2>

            {finishedItems.length ===
            0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-zinc-400">
                Todavía no hay lecturas terminadas públicas.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {finishedItems
                  .slice(0, 9)
                  .map(
                    ({ row, item }) => (
                      <Link
                        key={item.slug}
                        href={item.href}
                        className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div
                          className="h-24 w-16 shrink-0 rounded-xl"
                          style={{
                            background:
                              item.cover,
                          }}
                        />

                        <div>
                          <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                            {item.genre}
                          </p>

                          <p className="mt-1 font-bold">
                            {item.title}
                          </p>

                          <p className="mt-2 text-xs text-zinc-600">
                            {formatDate(
                              row.updated_at
                            )}
                          </p>
                        </div>
                      </Link>
                    )
                  )}
              </div>
            )}
          </section>
        )}

        {profile.show_history && (
          <section className="mt-10">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Historial visible
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Lecturas recientes
            </h2>

            <div className="mt-5 flex flex-wrap gap-3">
              {historyItems.length ===
              0 ? (
                <p className="text-zinc-500">
                  Sin historial público.
                </p>
              ) : (
                historyItems
                  .slice(0, 10)
                  .map(
                    ({ row, item }) => (
                      <Link
                        key={`${item.slug}-${row.last_opened_at}`}
                        href={item.href}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300"
                      >
                        {item.title}
                      </Link>
                    )
                  )
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
