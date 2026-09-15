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
      <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
        <TopNav />
        <div className="mx-auto max-w-7xl px-5 py-12 text-[#8f8580]">
          Cargando perfil...
        </div>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="rounded-3xl border border-[#e3ddd7] bg-white p-8">
            <h1 className="text-3xl font-black">
              Perfil no disponible
            </h1>

            <p className="mt-3 text-[#766d68]">
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
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <section className="grid overflow-hidden rounded-[32px] border-2 border-[#2f2925] bg-white shadow-[0_20px_50px_rgba(47,41,37,0.12)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#ddd5ef] via-[#f2ecfa] to-[#dcecf1] p-8 md:p-10">
            <div className="absolute left-[30%] top-[8%] h-36 w-36 rounded-full bg-white/55 blur-3xl" />
            <div className="absolute right-[8%] bottom-[12%] h-40 w-40 rounded-full bg-[#c3e1e9]/45 blur-3xl" />
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#9c86c7]/34 blur-3xl" />
            <div className="absolute -bottom-24 left-[-40px] h-56 w-56 rounded-full bg-[#74a9b9]/28 blur-3xl" />

            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white bg-white/88 text-4xl font-black text-[#5d536f] shadow-[0_12px_34px_rgba(84,71,107,0.14)]">
                {profile.display_name
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a3273]">
                  Perfil de lector
                </p>

                <span className="rounded-full border border-[#c9bddf] bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#6f6284]">
                  {roleLabel}
                </span>
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-5xl">
                {profile.display_name}
              </h1>

              {profile.bio && (
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#6f6876]">
                  {profile.bio}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {profile.favorite_genres.map(
                  (genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-[#cfc4e1] bg-white/88 px-3 py-1.5 text-xs font-bold text-[#6d617c]"
                    >
                      {genre}
                    </span>
                  )
                )}
              </div>

              {profile.role !== "reader" && (
                <Link
                  href={`/autores/${profile.user_id}`}
                  className="mt-6 inline-flex rounded-[15px] border border-[#b79bde] bg-[#f4eefc] px-5 py-3 text-sm font-black text-[#4a3273] shadow-[0_6px_18px_rgba(104,76,153,0.08)] transition hover:border-[#9c7cc4] hover:bg-[#efe6fa] hover:text-[#4a3273]"
                >
                  Ver perfil de autor →
                </Link>
              )}
            </div>
          </div>

          <div className="p-7 md:p-9">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#e6b68f] bg-[#fff0e4] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#b95016]">
                  Lector
                </p>

                <p className="mt-2 text-2xl font-black">
                  {profile.reader_level}
                </p>

                <p className="mt-1 text-sm text-[#8a8078]">
                  Nivel {profile.reader_level_number}
                </p>
              </div>

              <div className="rounded-[22px] border border-[#cdbfe2] bg-[#f3ecfb] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#4a3273]">
                  Crítico
                </p>

                <p className="mt-2 text-2xl font-black">
                  {profile.critic_level}
                </p>

                <p className="mt-1 text-sm text-[#8a8078]">
                  Nivel {profile.critic_level_number}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-[#bdd7df] bg-[#eef7fa] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#428397]">
                Actividad visible
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {profile.show_finished && (
                  <div className="rounded-[16px] border border-[#cfe1e7] bg-white p-3">
                    <p className="text-xs text-[#7f8d92]">Terminadas</p>
                    <p className="mt-1 text-xl font-black text-[#2f6675]">
                      {profile.finished_count}
                    </p>
                  </div>
                )}

                {profile.show_ratings && (
                  <div className="rounded-[16px] border border-[#cfe1e7] bg-white p-3">
                    <p className="text-xs text-[#7f8d92]">Valoraciones</p>
                    <p className="mt-1 text-xl font-black text-[#2f6675]">
                      {profile.rating_count}
                    </p>
                  </div>
                )}

                {profile.show_reviews && (
                  <div className="rounded-[16px] border border-[#cfe1e7] bg-white p-3">
                    <p className="text-xs text-[#7f8d92]">Críticas</p>
                    <p className="mt-1 text-xl font-black text-[#2f6675]">
                      {profile.review_count}
                    </p>
                  </div>
                )}

                {profile.show_reactions && (
                  <div className="rounded-[16px] border border-[#cfe1e7] bg-white p-3">
                    <p className="text-xs text-[#7f8d92]">Reacciones</p>
                    <p className="mt-1 text-xl font-black text-[#2f6675]">
                      {profile.reaction_count}
                    </p>
                  </div>
                )}

                {profile.show_favorites && (
                  <div className="rounded-[16px] border border-[#cfe1e7] bg-white p-3">
                    <p className="text-xs text-[#7f8d92]">Favoritas</p>
                    <p className="mt-1 text-xl font-black text-[#2f6675]">
                      {profile.favorite_count}
                    </p>
                  </div>
                )}

                {profile.show_activity && (
                  <div className="rounded-[16px] border border-[#cfe1e7] bg-white p-3">
                    <p className="text-xs text-[#7f8d92]">Comunidad</p>
                    <p className="mt-1 text-xl font-black text-[#2f6675]">
                      {profile.community_count}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {profile.show_favorites && (
          <section className="mt-9 rounded-[28px] border border-[#ded7d1] bg-white p-6 shadow-[0_8px_22px_rgba(62,45,34,0.035)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
              Favoritas
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Historias favoritas
            </h2>

            {favoriteItems.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[#e3ddd7] bg-white p-7 text-[#766d68]">
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
                        className="aspect-[2/3] rounded-[18px] border border-[#ded7d1] shadow-[0_8px_20px_rgba(62,45,34,0.08)]"
                        style={{
                          background:
                            item.cover,
                        }}
                      />

                      <p className="mt-3 line-clamp-2 font-bold">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-[#8f8580]">
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
          <section className="mt-9 rounded-[28px] border border-[#d2c7e2] bg-white p-6 shadow-[0_8px_22px_rgba(91,72,122,0.035)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a3273]">
              Críticas
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Críticas recientes
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[#e3ddd7] bg-white p-7 text-[#766d68]">
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
                      className="rounded-[18px] border border-[#e4ddd7] bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold">
                            {item?.title ||
                              review.book_slug}
                          </p>

                          <p className="mt-1 text-xs text-[#aaa099]">
                            {formatDate(
                              review.updated_at
                            )}
                          </p>
                        </div>

                        {review.rating && (
                          <span className="shrink-0 font-semibold text-[#b8862f]">
                            ★{" "}
                            {review.rating}
                          </span>
                        )}
                      </div>

                      <p className="mt-4 whitespace-pre-wrap leading-7 text-[#5f5753]">
                        {review.review}
                      </p>

                      {review.reactions.length >
                        0 && (
                        <div className="mt-4 flex gap-2">
                          {review.reactions.map(
                            (reaction) => (
                              <span
                                key={reaction}
                                className="rounded-full border border-[#e3ddd7] px-2.5 py-1 text-sm"
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
          <section className="mt-9 rounded-[28px] border border-[#bfd5de] bg-white p-6 shadow-[0_8px_22px_rgba(63,112,132,0.035)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#428397]">
              Comunidad
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Actividad reciente
            </h2>

            {activity.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[#e3ddd7] bg-white p-7 text-[#766d68]">
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
                          className="block rounded-[18px] border border-[#d9e2e6] bg-white p-5 transition hover:border-[#9fc3cf]"
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

                            <span className="text-xs text-[#aaa099]">
                              {formatDate(
                                activityItem.created_at
                              )}
                            </span>
                          </div>

                          <p className="mt-3 line-clamp-3 leading-6 text-[#766d68]">
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
          <section className="mt-9 rounded-[28px] border border-[#cfd8bf] bg-white p-6 shadow-[0_8px_22px_rgba(97,117,61,0.03)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#397053]">
              Lecturas
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Obras terminadas
            </h2>

            {finishedItems.length ===
            0 ? (
              <div className="mt-5 rounded-2xl border border-[#e3ddd7] bg-white p-7 text-[#766d68]">
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
                        className="flex gap-4 rounded-[18px] border border-[#dde2d6] bg-white p-4 transition hover:border-[#b9c6a5]"
                      >
                        <div
                          className="h-24 w-16 shrink-0 rounded-xl"
                          style={{
                            background:
                              item.cover,
                          }}
                        />

                        <div>
                          <p className="text-xs uppercase tracking-[0.15em] text-[#8f8580]">
                            {item.genre}
                          </p>

                          <p className="mt-1 font-bold">
                            {item.title}
                          </p>

                          <p className="mt-2 text-xs text-[#aaa099]">
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
          <section className="mt-9 rounded-[28px] border border-[#ded7d1] bg-white p-6 shadow-[0_8px_22px_rgba(62,45,34,0.035)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f8580]">
              Historial visible
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Lecturas recientes
            </h2>

            <div className="mt-5 flex flex-wrap gap-3">
              {historyItems.length ===
              0 ? (
                <p className="text-[#8f8580]">
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
                        className="rounded-full border border-[#d8d1e6] bg-[#faf8fd] px-4 py-2 text-sm font-bold text-[#6d617c]"
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
