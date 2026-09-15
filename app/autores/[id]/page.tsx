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

        const ratingMap =
          new Map(
            ratings.map(
              (item) => [
                item.book_slug,
                item,
              ]
            )
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

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Link
          href="/autores"
          className="inline-flex items-center gap-2 text-sm font-black text-[#7d7169] transition hover:text-[#b95016]"
        >
          ← Autores
        </Link>

        {loading ? (
          <div className="mt-8 rounded-[24px] border border-[#ddd5cf] bg-white p-7 text-[#8f8580]">
            Cargando perfil...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[24px] border border-[#e5c3c3] bg-white p-7 text-[#b24949]">
            {error}
          </div>
        ) : !author ? (
          <div className="mt-8 rounded-[24px] border border-[#ddd5cf] bg-white p-8 text-[#7c726b]">
            Perfil de autor no encontrado.
          </div>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-[34px] border-2 border-[#2f2925] bg-white shadow-[0_20px_50px_rgba(47,41,37,0.10)]">
              <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#e7d7c7] via-[#f4e9de] to-[#f0d1b7] p-8 md:p-10">
                  <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#d96822]/18 blur-3xl" />
                  <div className="absolute -bottom-20 left-[-24px] h-48 w-48 rounded-full bg-[#a96d3c]/12 blur-3xl" />
                  <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(92,60,39,0.55)_0.8px,transparent_0.8px)] [background-size:15px_15px]" />

                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/90 bg-white/88 text-4xl font-black text-[#8f4e25] shadow-[0_12px_34px_rgba(99,65,40,0.11)]">
                      {author.display_name
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#b95016]">
                      Autor de SEBORO
                    </p>

                    <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-5xl">
                      {author.display_name}
                    </h1>

                    {author.bio && (
                      <p className="mt-4 max-w-xl leading-7 text-[#6d625b]">
                        {author.bio}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {author.genres.map(
                        (genre) => (
                          <span
                            key={genre}
                            className="rounded-full border border-[#d8bda5] bg-white/82 px-3 py-1.5 text-xs font-bold text-[#7c5a43]"
                          >
                            {genre}
                          </span>
                        )
                      )}
                    </div>

                    {author.location_text && (
                      <p className="mt-5 text-sm font-semibold text-[#7b6f67]">
                        📍 {author.location_text}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-7 md:p-9">
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d8179]">
                        Perfil editorial
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        Trayectoria en SEBORO
                      </h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] border border-[#e6c6ae] bg-[#fff7f1] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#b95016]">
                          Publicadas
                        </p>
                        <p className="mt-2 text-3xl font-black text-[#7b3e18]">
                          {works.length}
                        </p>
                        <p className="mt-1 text-xs text-[#9b8e84]">
                          {works.length === 1
                            ? "obra publicada"
                            : "obras publicadas"}
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-[#d8d1e8] bg-[#faf8fd] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#5b3f8c]">
                          Comunidad
                        </p>
                        <p className="mt-2 text-3xl font-black text-[#5b3f8c]">
                          {author.follower_count}
                        </p>
                        <p className="mt-1 text-xs text-[#9b8e84]">
                          {author.follower_count === 1
                            ? "seguidor"
                            : "seguidores"}
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-[#dfd5b8] bg-[#fffaf0] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9c7b28]">
                          Valoración
                        </p>

                        {author.rating_count > 0 ? (
                          <>
                            <p className="mt-2 text-3xl font-black text-[#8e6a1d]">
                              ★ {author.rating_avg?.toFixed(1)}
                            </p>
                            <p className="mt-1 text-xs text-[#9b8e84]">
                              {author.rating_count} valoraciones
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="mt-2 text-lg font-black text-[#8e6a1d]">
                              Sin valoración
                            </p>
                            <p className="mt-1 text-xs text-[#9b8e84]">
                              Todavía no hay valoraciones públicas.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#ddd5cf] bg-white p-5 shadow-[0_8px_22px_rgba(62,45,34,0.035)]">
                      <div className="flex flex-wrap items-center gap-3">
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
                            className="rounded-full border border-[#d8c8bc] bg-[#faf8f6] px-5 py-2.5 text-sm font-black text-[#6d625b] transition hover:border-[#c09a7e] hover:text-[#9b4f1f]"
                          >
                            Sitio del autor ↗
                          </a>
                        )}
                      </div>

                      <p className="mt-4 max-w-2xl text-sm leading-6 text-[#8a8078]">
                        Sigue al autor para tenerlo presente dentro de tu experiencia de lectura en SEBORO.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-10 rounded-[30px] border border-[#ddd5cf] bg-white p-6 shadow-[0_10px_28px_rgba(62,45,34,0.04)] md:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
                    Publicaciones
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
                    Obras de {author.display_name}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#857a73]">
                    La obra publicada es el centro del perfil: explora sus historias, valoraciones y fichas editoriales.
                  </p>
                </div>
              </div>

              {works.length === 0 ? (
                <div className="mt-6 rounded-[22px] border border-[#ded7d1] bg-[#faf9f7] p-8 text-[#7d746e]">
                  Este autor todavía no tiene obras publicadas.
                </div>
              ) : (
                <div className="mt-6 flex gap-5 overflow-x-auto pb-5">
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
