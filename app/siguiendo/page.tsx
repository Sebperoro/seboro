"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import PublishedWorkCard from "@/components/PublishedWorkCard";
import {
  getFollowingOverview,
  type FollowingOverview,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/userBooks";

export default function FollowingPage() {
  const [data, setData] =
    useState<FollowingOverview>({
      authors: [],
      works: [],
    });

  const [loggedIn, setLoggedIn] =
    useState<boolean | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const user =
          await getCurrentUser();

        if (!active) return;

        setLoggedIn(Boolean(user));

        if (user) {
          setData(
            await getFollowingOverview()
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar lo que sigues."
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
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <section className="overflow-hidden rounded-[32px] border-2 border-[#2f2925] bg-white shadow-[0_20px_50px_rgba(47,41,37,0.09)]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#dcecef] via-[#edf5f6] to-[#f7f9f8] p-8 md:p-10">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#6fa0af]/18 blur-3xl" />
              <div className="absolute -bottom-24 left-[-40px] h-56 w-56 rounded-full bg-[#9ab5a3]/14 blur-3xl" />

              <div className="relative max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#428397]">
                  Tu selección
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">
                  Siguiendo
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-[#66757a] md:text-lg">
                  Autores y obras que decidiste mantener cerca.
                  Seguirlos no altera sus rankings: solo organiza tu propia experiencia.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-7 md:grid-cols-2 md:p-9 lg:grid-cols-1">
              <div className="rounded-[22px] border border-[#cfe0e7] bg-[#f3f9fb] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#428397]">
                  Autores
                </p>

                <p className="mt-2 text-3xl font-black text-[#315f6c]">
                  {data.authors.length}
                </p>

                <p className="mt-1 text-sm text-[#7f8d92]">
                  perfiles que sigues
                </p>
              </div>

              <div className="rounded-[22px] border border-[#d5dfd1] bg-[#f7faf5] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#4f7951]">
                  Obras
                </p>

                <p className="mt-2 text-3xl font-black text-[#3f6741]">
                  {data.works.length}
                </p>

                <p className="mt-1 text-sm text-[#7f8d82]">
                  historias que sigues
                </p>
              </div>

              <Link
                href="/notificaciones/configuracion"
                className="inline-flex w-fit rounded-full border border-[#d7cec8] bg-white px-5 py-2.5 text-sm font-black text-[#6f655f] transition hover:border-[#bfa895] hover:text-[#9a4b1c] md:col-span-2 lg:col-span-1"
              >
                Configurar avisos →
              </Link>
            </div>
          </div>
        </section>

        {loggedIn === false ? (
          <div className="mt-8 rounded-[26px] border border-[#ddd5cf] bg-white p-8 shadow-[0_8px_22px_rgba(62,45,34,0.035)]">
            <p className="text-xl font-black">
              Inicia sesión para seguir autores y obras.
            </p>

            <p className="mt-2 text-sm leading-6 text-[#81766f]">
              Cuando inicies sesión, este espacio reunirá todo lo que quieras volver a encontrar.
            </p>

            <Link
              href="/cuenta"
              className="mt-5 inline-flex rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#bd5718]"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : loading ? (
          <div className="mt-8 rounded-[24px] border border-[#ddd5cf] bg-white p-7 text-[#8f8580]">
            Cargando...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[24px] border border-[#e5c3c3] bg-white p-7 text-[#b24949]">
            {error}
          </div>
        ) : (
          <>
            <section className="mt-9 rounded-[30px] border border-[#d7e1e4] bg-white p-6 shadow-[0_8px_24px_rgba(62,45,34,0.035)] md:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#428397]">
                    Autores
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
                    Sigues a {data.authors.length}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817b76]">
                    Un acceso directo a las voces que quieres volver a encontrar.
                  </p>
                </div>

                <Link
                  href="/autores"
                  className="text-sm font-black text-[#6b7e85] transition hover:text-[#428397]"
                >
                  Descubrir autores →
                </Link>
              </div>

              {data.authors.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#dce4e7] bg-[#fafcfc] p-7 text-[#7f8a8f]">
                  Todavía no sigues a ningún autor.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.authors.map(
                    (author) => (
                      <Link
                        key={
                          author.author_id
                        }
                        href={`/autores/${author.author_id}`}
                        className="group rounded-[24px] border border-[#d8e2e5] bg-white p-5 transition hover:-translate-y-1 hover:border-[#a9c7d0] hover:shadow-[0_10px_24px_rgba(63,112,132,0.07)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#cddfe5] bg-[#f1f8fa] text-2xl font-black text-[#3e7280]">
                            {author.display_name
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          <span className="rounded-full border border-[#cfe0e7] bg-[#f6fafb] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#5d7e88]">
                            Siguiendo
                          </span>
                        </div>

                        <h3 className="mt-4 text-xl font-black">
                          {author.display_name}
                        </h3>

                        <p className="mt-2 text-sm text-[#8a8079]">
                          {author.published_count}{" "}
                          {author.published_count === 1
                            ? "publicación"
                            : "publicaciones"}{" "}
                          · {author.follower_count}{" "}
                          {author.follower_count === 1
                            ? "seguidor"
                            : "seguidores"}
                        </p>

                        {author.genres.length >
                          0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {author.genres
                              .slice(0, 3)
                              .map((genre) => (
                                <span
                                  key={genre}
                                  className="rounded-full border border-[#ddd5cf] bg-[#faf9f7] px-2.5 py-1 text-xs font-bold text-[#786e67]"
                                >
                                  {genre}
                                </span>
                              ))}
                          </div>
                        )}

                        <p className="mt-5 text-sm font-black text-[#428397]">
                          Ver perfil →
                        </p>
                      </Link>
                    )
                  )}
                </div>
              )}
            </section>

            <section className="mt-9 rounded-[30px] border border-[#d9e0d4] bg-white p-6 shadow-[0_8px_24px_rgba(62,45,34,0.035)] md:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4f7951]">
                    Obras
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
                    Sigues {data.works.length}{" "}
                    {data.works.length === 1
                      ? "obra"
                      : "obras"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817b76]">
                    Historias que quieres mantener a la vista y seguir cuando tengan novedades.
                  </p>
                </div>

                <Link
                  href="/descubre"
                  className="text-sm font-black text-[#607862] transition hover:text-[#397053]"
                >
                  Descubrir obras →
                </Link>
              </div>

              {data.works.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#dce3d7] bg-[#fbfcfa] p-7 text-[#7f897b]">
                  Usa “Seguir obra” para recibir sus próximos capítulos.
                </div>
              ) : (
                <div className="mt-5 flex gap-5 overflow-x-auto pb-4">
                  {data.works.map(
                    (work) => (
                      <PublishedWorkCard
                        key={work.id}
                        work={work}
                      />
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
