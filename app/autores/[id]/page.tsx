"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import FollowAuthorButton from "@/components/FollowAuthorButton";
import PublishedWorkCard, {
  type RatedPublishedWork,
} from "@/components/PublishedWorkCard";
import {
  getPublicAuthorById,
  type PublicAuthorProfile,
} from "@/lib/authorProfiles";
import { getPublishedWorks } from "@/lib/publishedWorks";
import { getPublicWorkRatings } from "@/lib/workRatings";

export default function PublicAuthorPage() {
  const params = useParams<{ id: string }>();

  const [author, setAuthor] =
    useState<PublicAuthorProfile | null>(null);

  const [works, setWorks] = useState<
    RatedPublishedWork[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const refreshAuthor = useCallback(
    async () => {
      const result =
        await getPublicAuthorById(
          params.id
        );

      setAuthor(result);
    },
    [params.id]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [
          authorResult,
          published,
          ratings,
        ] = await Promise.all([
          getPublicAuthorById(
            params.id
          ),
          getPublishedWorks(),
          getPublicWorkRatings(),
        ]);

        if (!active) return;

        setAuthor(authorResult);

        const ratingMap = new Map(
          ratings.map((item) => [
            item.book_slug,
            item,
          ])
        );

        setWorks(
          published
            .filter(
              (work) =>
                work.author_id ===
                params.id
            )
            .map((work) => {
              const rating =
                ratingMap.get(
                  work.slug
                );

              return {
                ...work,
                rating_avg:
                  rating?.rating_avg ??
                  null,
                rating_count:
                  rating?.rating_count ??
                  0,
                ranking_score:
                  rating?.ranking_score ??
                  null,
              };
            })
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el autor."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link
          href="/autores"
          className="text-sm font-semibold text-zinc-400 hover:text-white"
        >
          ← Autores
        </Link>

        {loading ? (
          <div className="mt-8 text-zinc-500">
            Cargando perfil...
          </div>
        ) : error ? (
          <div className="mt-8 text-rose-300">
            {error}
          </div>
        ) : !author ? (
          <div className="mt-8 rounded-3xl border border-white/10 p-8">
            Perfil de autor no encontrado.
          </div>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-7 md:p-10">
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-4xl font-black">
                  {author.display_name
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Autor de SEBORO
                  </p>

                  <h1 className="mt-2 text-4xl font-black md:text-5xl">
                    {author.display_name}
                  </h1>

                  {author.bio && (
                    <p className="mt-4 max-w-3xl leading-7 text-zinc-300">
                      {author.bio}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {author.genres.map(
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
                    <span>
                      <b className="text-white">
                        {
                          author.published_count
                        }
                      </b>{" "}
                      {author.published_count ===
                      1
                        ? "obra publicada"
                        : "obras publicadas"}
                    </span>

                    <span>
                      <b className="text-white">
                        {
                          author.follower_count
                        }
                      </b>{" "}
                      {author.follower_count ===
                      1
                        ? "seguidor"
                        : "seguidores"}
                    </span>

                    {author.rating_count >
                      0 && (
                      <span>
                        <b className="text-amber-300">
                          ★{" "}
                          {author.rating_avg?.toFixed(
                            1
                          )}
                        </b>{" "}
                        ·{" "}
                        {
                          author.rating_count
                        }{" "}
                        valoraciones
                      </span>
                    )}

                    {author.location_text && (
                      <span>
                        📍{" "}
                        {
                          author.location_text
                        }
                      </span>
                    )}
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <FollowAuthorButton
                      authorId={
                        author.author_id
                      }
                      onChanged={
                        refreshAuthor
                      }
                    />

                    {author.website_url && (
                      <a
                        href={
                          author.website_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                      >
                        Sitio del autor ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-12">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Publicaciones
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Obras de{" "}
                    {author.display_name}
                  </h2>
                </div>
              </div>

              {works.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
                  Este autor todavía no
                  tiene obras publicadas.
                </div>
              ) : (
                <div className="mt-5 flex gap-5 overflow-x-auto pb-5">
                  {works.map(
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
