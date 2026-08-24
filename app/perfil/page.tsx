"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getAllUserBooks,
  getCurrentUser,
  type UserBookRow,
} from "@/lib/userBooks";
import {
  getAllUserFeedback,
  type UserFeedbackRow,
} from "@/lib/userFeedback";
import {
  getMyFavorites,
  getMyReaderProfile,
  getPublicReaderProfile,
  type EditableReaderProfile,
  type PublicReaderProfile,
  type ReaderFavoriteRow,
} from "@/lib/readerProfiles";
import {
  getReaderCatalog,
  type ReaderCatalogItem,
} from "@/lib/readerCatalog";

type Snapshot = {
  accountId: string;
  profile: EditableReaderProfile;
  publicProfile: PublicReaderProfile;
  rows: UserBookRow[];
  feedback: UserFeedbackRow[];
  favorites: ReaderFavoriteRow[];
  catalog: ReaderCatalogItem[];
};

export default function PerfilPage() {
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
        const user = await getCurrentUser();

        if (!user) {
          if (active) setSnapshot(null);
          return;
        }

        const profile =
          await getMyReaderProfile();

        if (!profile) {
          throw new Error(
            "No se pudo cargar tu perfil."
          );
        }

        const [
          publicProfile,
          rows,
          feedback,
          favorites,
          catalog,
        ] = await Promise.all([
          getPublicReaderProfile(user.id),
          getAllUserBooks(),
          getAllUserFeedback(),
          getMyFavorites(),
          getReaderCatalog(),
        ]);

        if (!publicProfile) {
          throw new Error(
            "No se pudo calcular tu perfil."
          );
        }

        if (active) {
          setSnapshot({
            accountId: user.id,
            profile,
            publicProfile,
            rows: rows || [],
            feedback: feedback || [],
            favorites,
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
        if (active) setLoading(false);
      }
    }

    load();

    window.addEventListener(
      "seboro-profile-updated",
      load
    );

    window.addEventListener(
      "seboro-library-updated",
      load
    );

    return () => {
      active = false;

      window.removeEventListener(
        "seboro-profile-updated",
        load
      );

      window.removeEventListener(
        "seboro-library-updated",
        load
      );
    };
  }, []);

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

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-3xl font-black">
              Tu perfil de lector
            </h1>

            <p className="mt-3 text-zinc-400">
              Inicia sesión para sincronizar
              niveles, favoritas, críticas y
              privacidad.
            </p>

            <Link
              href="/cuenta"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-semibold text-black"
            >
              Ir a mi cuenta
            </Link>
          </div>

          {error && (
            <p className="mt-4 text-rose-300">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const finished = snapshot.rows.filter(
    (row) => row.finished
  );

  const history = [...snapshot.rows]
    .filter(
      (row) => Boolean(row.last_opened_at)
    )
    .sort(
      (a, b) =>
        new Date(
          b.last_opened_at || 0
        ).getTime() -
        new Date(
          a.last_opened_at || 0
        ).getTime()
    );

  const recentReviews =
    snapshot.feedback
      .filter(
        (item) =>
          Boolean(item.review?.trim())
      )
      .slice(0, 4);

  const favoriteItems =
    snapshot.favorites
      .map((row) =>
        itemMap.get(row.book_slug)
      )
      .filter(Boolean) as ReaderCatalogItem[];

  const favoriteGenre = (() => {
    const counts = new Map<
      string,
      number
    >();

    for (const row of history) {
      const item = itemMap.get(
        row.book_slug
      );

      if (item) {
        counts.set(
          item.genre,
          (counts.get(item.genre) ||
            0) + 1
        );
      }
    }

    return (
      [...counts.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] ||
      "Aún por descubrir"
    );
  })();

  const p = snapshot.publicProfile;

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-8 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Perfil del lector
              </p>

              <h1 className="mt-2 text-4xl font-black md:text-5xl">
                {p.display_name}
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
                {snapshot.profile.bio ||
                  "Tu identidad como lector, tus niveles y tu actividad en SEBORO."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/usuarios/${snapshot.accountId}`}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
                >
                  Ver perfil público
                </Link>

                <Link
                  href="/perfil/editar"
                  className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                >
                  Editar perfil y privacidad
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Lector
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {p.reader_level}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Nivel {p.reader_level_number}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Crítico
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {p.critic_level}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Nivel {p.critic_level_number}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Terminadas", p.finished_count],
            ["Valoraciones", p.rating_count],
            ["Críticas", p.review_count],
            ["Reacciones", p.reaction_count],
            ["Favoritas", p.favorite_count],
            ["Comunidad", p.community_count],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-sm text-zinc-500">
                {label}
              </p>

              <p className="mt-2 text-3xl font-black">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">
              Género más explorado
            </p>

            <p className="mt-2 text-xl font-bold">
              {favoriteGenre}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">
              Historial
            </p>

            <p className="mt-2 text-xl font-bold">
              {history.length} obras
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">
              Perfil público
            </p>

            <p className="mt-2 text-xl font-bold">
              {snapshot.profile.is_public
                ? "Visible"
                : "Privado"}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Favoritas
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Historias que marcaste
              </h2>
            </div>

            <Link
              href="/descubre"
              className="text-sm text-zinc-400"
            >
              Descubrir más
            </Link>
          </div>

          {favoriteItems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
              En las publicaciones reales
              puedes usar el botón ♡ Favorita.
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

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Críticas
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Tus críticas recientes
          </h2>

          {recentReviews.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
              Cuando escribas una crítica,
              aparecerá aquí.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {recentReviews.map(
                (feedback) => {
                  const item =
                    itemMap.get(
                      feedback.book_slug
                    );

                  return (
                    <article
                      key={
                        feedback.book_slug
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">
                          {item?.title ||
                            feedback.book_slug}
                        </p>

                        {feedback.rating && (
                          <span className="text-sm font-semibold text-amber-300">
                            ★{" "}
                            {
                              feedback.rating
                            }
                          </span>
                        )}
                      </div>

                      <p className="mt-3 line-clamp-4 leading-6 text-zinc-400">
                        {feedback.review}
                      </p>

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
                }
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Terminadas
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Últimas lecturas completadas
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {finished
              .slice(0, 6)
              .map((row) => {
                const item =
                  itemMap.get(
                    row.book_slug
                  );

                if (!item) return null;

                return (
                  <Link
                    key={row.book_slug}
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

                      <p className="mt-2 text-sm text-zinc-500">
                        ✓ Terminada
                      </p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
      </div>
    </main>
  );
}
