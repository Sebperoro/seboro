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
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Tu selección
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Siguiendo
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              Autores y obras de los que
              quieres volver a saber. Esto
              no altera sus rankings.
            </p>
          </div>

          <Link
            href="/notificaciones/configuracion"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
          >
            Configurar avisos
          </Link>
        </div>

        {loggedIn === false ? (
          <div className="mt-8 rounded-3xl border border-white/10 p-8">
            <p className="font-bold">
              Inicia sesión para seguir
              autores y obras.
            </p>
          </div>
        ) : loading ? (
          <p className="mt-8 text-zinc-500">
            Cargando...
          </p>
        ) : error ? (
          <p className="mt-8 text-rose-300">
            {error}
          </p>
        ) : (
          <>
            <section className="mt-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Autores
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Sigues a{" "}
                    {data.authors.length}
                  </h2>
                </div>

                <Link
                  href="/autores"
                  className="text-sm text-zinc-500 hover:text-white"
                >
                  Descubrir autores
                </Link>
              </div>

              {data.authors.length ===
              0 ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-zinc-500">
                  Todavía no sigues a
                  ningún autor.
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
                        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/25"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-black text-black">
                          {author.display_name
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <h3 className="mt-4 text-xl font-bold">
                          {
                            author.display_name
                          }
                        </h3>

                        <p className="mt-2 text-sm text-zinc-500">
                          {
                            author.published_count
                          }{" "}
                          publicaciones ·{" "}
                          {
                            author.follower_count
                          }{" "}
                          seguidores
                        </p>

                        {author.genres.length >
                          0 && (
                          <p className="mt-3 text-sm text-zinc-400">
                            {author.genres
                              .slice(0, 3)
                              .join(" · ")}
                          </p>
                        )}
                      </Link>
                    )
                  )}
                </div>
              )}
            </section>

            <section className="mt-12">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Obras
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Sigues{" "}
                    {data.works.length}{" "}
                    obras
                  </h2>
                </div>

                <Link
                  href="/descubre"
                  className="text-sm text-zinc-500 hover:text-white"
                >
                  Descubrir obras
                </Link>
              </div>

              {data.works.length ===
              0 ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-zinc-500">
                  Usa “Seguir obra” para
                  recibir sus próximos
                  capítulos.
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
