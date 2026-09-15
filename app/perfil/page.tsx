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
      <main className="min-h-screen bg-[#f6f3ef] text-[#2b2521]">
        <TopNav />
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="rounded-[28px] border border-[#e4ddd7] bg-white p-8">
            <div className="h-5 w-40 animate-pulse rounded-full bg-[#eee9e5]" />
            <div className="mt-5 h-48 animate-pulse rounded-[24px] bg-[#f6f2ef]" />
          </div>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-[#f6f3ef] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-5xl px-5 py-14 md:px-8">
          <div className="grid overflow-hidden rounded-[30px] border border-[#ded6cf] bg-white shadow-[0_18px_45px_rgba(62,45,34,0.06)] md:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-[#24201d] p-8 text-white md:p-10">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5b3f8c]">
                SEBORO · PERFIL
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.045em]">
                Tu identidad de lector vive aquí.
              </h1>

              <p className="mt-4 text-sm leading-7 text-[#6f6876]">
                Niveles, favoritas, críticas y actividad se sincronizan con tu cuenta.
              </p>
            </div>

            <div className="p-8 md:p-10">
              <h2 className="text-2xl font-black">
                Inicia sesión para continuar
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#81766e]">
                Tu perfil se construye a partir de tu actividad real dentro de SEBORO.
              </p>

              <Link
                href="/cuenta"
                className="mt-6 inline-flex rounded-[16px] bg-[#d96822] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#b95016]"
              >
                Ir a mi cuenta
              </Link>

              {error && (
                <p className="mt-5 text-sm font-bold text-[#a34d43]">
                  {error}
                </p>
              )}
            </div>
          </div>
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
          (counts.get(item.genre) || 0) + 1
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
    <main className="min-h-screen bg-[#f6f3ef] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-8">
        {/* Perfil con composición distinta: identidad a la izquierda,
            niveles y métricas a la derecha. */}
        <section className="grid overflow-hidden rounded-[32px] border-2 border-[#2f2925] bg-white shadow-[0_20px_50px_rgba(47,41,37,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#ddd5ef] via-[#f2ecfa] to-[#dcecf1] p-8 text-[#2b2521] md:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#9c86c7]/30 blur-3xl" />

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5b3f8c]">
                SEBORO · PERFIL DEL LECTOR
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
                {p.display_name}
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#6f6876]">
                {snapshot.profile.bio ||
                  "Tu identidad como lector, tus niveles y tu actividad en SEBORO."}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/usuarios/${snapshot.accountId}`}
                  className="rounded-[15px] bg-[#d96822] px-5 py-3 text-sm font-black text-white transition hover:bg-[#be5717]"
                >
                  Ver perfil público
                </Link>

                <Link
                  href="/perfil/editar"
                  className="rounded-[15px] border border-[#cfc4e1] bg-white/85 px-5 py-3 text-sm font-black text-[#4a3273] transition hover:bg-white"
                >
                  Editar perfil
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
            <div className="rounded-[22px] border border-[#ebcdb8] bg-[#fff7f1] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#b95016]">
                Lector
              </p>

              <p className="mt-2 text-2xl font-black">
                {p.reader_level}
              </p>

              <p className="mt-1 text-sm text-[#8a8078]">
                Nivel {p.reader_level_number}
              </p>
            </div>

            <div className="rounded-[22px] border border-[#d9d1e8] bg-[#faf8fd] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#5b3f8c]">
                Crítico
              </p>

              <p className="mt-2 text-2xl font-black">
                {p.critic_level}
              </p>

              <p className="mt-1 text-sm text-[#8a8078]">
                Nivel {p.critic_level_number}
              </p>
            </div>

            <div className="rounded-[22px] border border-[#bdd7df] bg-[#eef7fa] p-5 md:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#428397]">
                Huella de lectura
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    className="rounded-[16px] border border-[#dce9ed] bg-white p-3"
                  >
                    <p className="text-xs text-[#7f8d92]">
                      {label}
                    </p>

                    <p className="mt-1 text-xl font-black text-[#315f6c]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-[#ded7d1] bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91867e]">
              Afinidad
            </p>

            <p className="mt-2 text-xl font-black">
              {favoriteGenre}
            </p>

            <p className="mt-1 text-sm text-[#91867e]">
              Género más explorado
            </p>
          </div>

          <div className="rounded-[22px] border border-[#ded7d1] bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91867e]">
              Recorrido
            </p>

            <p className="mt-2 text-xl font-black">
              {history.length} obras
            </p>

            <p className="mt-1 text-sm text-[#91867e]">
              Historial de lectura
            </p>
          </div>

          <div className="rounded-[22px] border border-[#ded7d1] bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91867e]">
              Privacidad
            </p>

            <p className="mt-2 text-xl font-black">
              {snapshot.profile.is_public
                ? "Visible"
                : "Privado"}
            </p>

            <p className="mt-1 text-sm text-[#91867e]">
              Estado del perfil público
            </p>
          </div>
        </section>

        {/* Favoritas: portadas dominantes para diferenciar el perfil */}
        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#d9d0c9] bg-white shadow-[0_8px_22px_rgba(62,45,34,0.035)]">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eee8e3] px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d96822]">
                Favoritas
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Historias que te representan
              </h2>
            </div>

            <Link
              href="/descubre"
              className="text-sm font-black text-[#b95016]"
            >
              Descubrir más →
            </Link>
          </div>

          {favoriteItems.length === 0 ? (
            <div className="p-8 text-sm text-[#81766e]">
              En las publicaciones reales puedes usar el botón ♡ Favorita.
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto p-6">
              {favoriteItems.map(
                (item) => (
                  <Link
                    key={item.slug}
                    href={item.href}
                    className="w-40 shrink-0"
                  >
                    <div
                      className="aspect-[2/3] rounded-[18px] border border-[#e2d9d2] shadow-[0_8px_20px_rgba(62,45,34,0.08)]"
                      style={{
                        background:
                          item.cover,
                      }}
                    />

                    <p className="mt-3 line-clamp-2 font-black">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-[#91867e]">
                      {item.genre}
                    </p>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-[#ded7d1] bg-white p-6 shadow-[0_8px_22px_rgba(62,45,34,0.035)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5b3f8c]">
              Críticas
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Tus críticas recientes
            </h2>

            {recentReviews.length === 0 ? (
              <div className="mt-5 rounded-[18px] border border-dashed border-[#ddd6d0] bg-[#faf8f6] p-6 text-sm text-[#81766e]">
                Cuando escribas una crítica, aparecerá aquí.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
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
                        className="rounded-[18px] border border-[#e4ddd7] bg-[#fcfaf8] p-5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black">
                            {item?.title ||
                              feedback.book_slug}
                          </p>

                          {feedback.rating && (
                            <span className="text-sm font-black text-[#b8862f]">
                              ★ {feedback.rating}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#81766e]">
                          {feedback.review}
                        </p>

                        {item && (
                          <Link
                            href={item.href}
                            className="mt-4 inline-block text-sm font-black text-[#4a3273]"
                          >
                            Ver obra →
                          </Link>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#ded7d1] bg-white p-6 shadow-[0_8px_22px_rgba(62,45,34,0.035)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#397053]">
              Terminadas
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Últimas lecturas completadas
            </h2>

            <div className="mt-5 space-y-3">
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
                      className="flex gap-4 rounded-[18px] border border-[#e4ddd7] bg-[#fcfaf8] p-4 transition hover:border-[#cdddcf]"
                    >
                      <div
                        className="h-24 w-16 shrink-0 rounded-[12px]"
                        style={{
                          background:
                            item.cover,
                        }}
                      />

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#91867e]">
                          {item.genre}
                        </p>

                        <p className="mt-1 font-black">
                          {item.title}
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#397053]">
                          ✓ Terminada
                        </p>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
