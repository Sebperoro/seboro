"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import RandomDiscoveryButton from "@/components/RandomDiscoveryButton";
import {
  getPublishedWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";
import { getPublicWorkRatings } from "@/lib/workRatings";
import {
  getPublicAuthors,
  type PublicAuthorProfile,
} from "@/lib/authorProfiles";

type Sort =
  | "relevancia"
  | "rating"
  | "precio-asc"
  | "precio-desc"
  | "titulo";

type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorId: string | null;
  genre: string;
  synopsis: string;
  tags: string[];
  status: "Terminada" | "En proceso";
  price: number;
  cover: string;
  rating: number | null;
  rankingScore: number | null;
  href: string;
  publishedAt: string | null;
};

function realItems(
  works: Array<
    PublishedWork & {
      author_name: string;
      rating_avg?: number | null;
      ranking_score?: number | null;
    }
  >
): CatalogItem[] {
  return works.map((work) => ({
    id: `published-${work.id}`,
    slug: work.slug,
    title: work.title,
    author: work.author_name,
    authorId: work.author_id,
    genre: work.genre,
    synopsis: work.synopsis,
    tags: work.tags,
    status:
      work.work_status === "finished"
        ? "Terminada"
        : "En proceso",
    price: Number(work.price_mxn || 0),
    cover: getWorkCoverBackground(work),
    rating:
      typeof work.rating_avg === "number"
        ? work.rating_avg
        : null,
    rankingScore:
      typeof work.ranking_score === "number"
        ? work.ranking_score
        : null,
    href: `/publicaciones/${work.slug}`,
    publishedAt: work.published_at,
  }));
}

export default function DiscoverCatalog() {
  const searchParams = useSearchParams();
  const previewMode = searchParams.get("preview") === "1";

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [sort, setSort] =
    useState<Sort>("relevancia");
  const [published, setPublished] =
    useState<CatalogItem[]>([]);
  const [authors, setAuthors] =
    useState<PublicAuthorProfile[]>([]);
  const [searchFocused, setSearchFocused] =
    useState(false);
  const [loadingReal, setLoadingReal] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [works, ratings, authorProfiles] =
          await Promise.all([
            getPublishedWorks({ includeTest: previewMode }),
            getPublicWorkRatings(),
            getPublicAuthors().catch(() => []),
          ]);

        const ratingMap = new Map(
          ratings.map((item) => [
            item.book_slug,
            item,
          ])
        );

        const merged = works.map(
          (work) => ({
            ...work,
            rating_avg:
              ratingMap.get(work.slug)?.rating_avg ??
              null,
            ranking_score:
              ratingMap.get(work.slug)?.ranking_score ??
              null,
          })
        );

        if (active) {
          setPublished(realItems(merged));
          setAuthors(authorProfiles);
        }
      } catch {
        if (active) {
          setPublished([]);
        }
      } finally {
        if (active) {
          setLoadingReal(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [previewMode]);

  const allItems = published;

  const genres = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(
          allItems.map(
            (item) => item.genre
          )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    ],
    [allItems]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const authorSuggestions = useMemo(() => {
    if (normalizedQuery.length < 2) return [];

    const profileMatches = authors
      .filter((author) =>
        author.display_name.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 5);

    if (profileMatches.length > 0) {
      return profileMatches;
    }

    const seen = new Set<string>();

    return published
      .filter(
        (item) =>
          item.authorId &&
          item.author.toLowerCase().includes(normalizedQuery)
      )
      .filter((item) => {
        if (!item.authorId || seen.has(item.authorId)) {
          return false;
        }
        seen.add(item.authorId);
        return true;
      })
      .slice(0, 5)
      .map((item) => ({
        author_id: item.authorId!,
        display_name: item.author,
        bio: "",
        genres: [],
        website_url: null,
        location_text: null,
        published_count: 0,
        follower_count: 0,
        rating_avg: null,
        rating_count: 0,
      }));
  }, [authors, published, normalizedQuery]);

  const workSuggestions = useMemo(() => {
    if (normalizedQuery.length < 2) return [];

    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.author.toLowerCase().includes(normalizedQuery) ||
          item.genre.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6);
  }, [allItems, normalizedQuery]);

  const showSuggestions =
    searchFocused &&
    normalizedQuery.length >= 2 &&
    (authorSuggestions.length > 0 || workSuggestions.length > 0);

  const results = useMemo(() => {
    const normalized = normalizedQuery;

    const filtered =
      allItems.filter((item) => {
        const matchesQuery =
          !normalized ||
          item.title
            .toLowerCase()
            .includes(normalized) ||
          item.author
            .toLowerCase()
            .includes(normalized) ||
          item.genre
            .toLowerCase()
            .includes(normalized) ||
          item.synopsis
            .toLowerCase()
            .includes(normalized) ||
          item.tags.some((tag) =>
            tag.toLowerCase().includes(normalized)
          );

        const matchesGenre =
          genre === "Todos" ||
          item.genre === genre;

        const matchesStatus =
          status === "Todos" ||
          item.status === status;

        return (
          matchesQuery &&
          matchesGenre &&
          matchesStatus
        );
      });

    return [...filtered].sort(
      (a, b) => {
        if (sort === "rating") {
          const scoreA = a.rankingScore ?? -1;
          const scoreB = b.rankingScore ?? -1;

          return scoreB - scoreA;
        }

        if (sort === "precio-asc") {
          return a.price - b.price;
        }

        if (sort === "precio-desc") {
          return b.price - a.price;
        }

        if (sort === "titulo") {
          return a.title.localeCompare(
            b.title,
            "es"
          );
        }

        if (
          a.publishedAt &&
          b.publishedAt
        ) {
          return (
            new Date(
              b.publishedAt
            ).getTime() -
            new Date(
              a.publishedAt
            ).getTime()
          );
        }

        return 0;
      }
    );
  }, [
    allItems,
    normalizedQuery,
    genre,
    status,
    sort,
  ]);

  const hasFilters =
    Boolean(query) ||
    genre !== "Todos" ||
    status !== "Todos" ||
    sort !== "relevancia";

  return (
    <>
      {/* Búsqueda primero */}
      <section
        id="buscar"
        className="rounded-[22px] border border-[#cfd9df] bg-white p-4 shadow-[0_14px_34px_rgba(70,82,90,0.07)] md:rounded-[28px] md:p-6"
      >
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a55f31]">
                Buscar
              </p>

              {previewMode && (
                <span className="rounded-full border border-[#e4c97c] bg-[#fff8d9] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#8b6b08]">
                  Vista previa QA
                </span>
              )}
            </div>

            <h1 className="mt-1 text-[26px] font-black leading-[1.02] tracking-[-0.035em] md:text-3xl">
              ¿Qué te gustaría encontrar?
            </h1>

            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(
                    () => setSearchFocused(false),
                    160
                  );
                }}
                autoComplete="off"
                placeholder="Título, autor, género o palabra..."
                className="mt-3 w-full rounded-[15px] border border-[#d5c8bb] bg-[#fffdfa] px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#b98e69] md:mt-4 md:rounded-[18px] md:px-5 md:py-4 md:text-base"
              />

              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[22px] border border-[#d8d3ce] bg-white shadow-[0_18px_45px_rgba(47,41,37,0.16)]">
                  {authorSuggestions.length > 0 && (
                    <div className="border-b border-[#eee8e3] p-2">
                      <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9a8d84]">
                        Autores
                      </p>

                      {authorSuggestions.map((author) => (
                        <Link
                          key={author.author_id}
                          href={`/autores/${author.author_id}`}
                          className="flex items-center justify-between rounded-[14px] px-3 py-2.5 transition hover:bg-[#fff6ef]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-black text-[#2b2521]">
                              {author.display_name}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8d8179]">
                              Autor
                              {author.published_count > 0
                                ? ` · ${author.published_count} ${author.published_count === 1 ? "obra publicada" : "obras publicadas"}`
                                : ""}
                            </p>
                          </div>

                          <span className="ml-3 text-sm font-black text-[#b95016]">
                            Ver →
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {workSuggestions.length > 0 && (
                    <div className="p-2">
                      <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9a8d84]">
                        Obras
                      </p>

                      {workSuggestions.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition hover:bg-[#fff6ef]"
                        >
                          <div
                            className="h-14 w-10 shrink-0 rounded-[8px] border border-[#e0d8d1] bg-[#eee]"
                            style={{ background: item.cover }}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black text-[#2b2521]">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-[#8d8179]">
                              {item.author} · {item.genre}
                            </p>
                          </div>

                          <span className="text-sm font-black text-[#b95016]">
                            Ver →
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#687881]">
                Género
              </label>

              <select
                value={genre}
                onChange={(event) =>
                  setGenre(event.target.value)
                }
                className="mt-1.5 w-full rounded-[13px] border border-[#cfd9df] bg-[#f3f6f8] px-3 py-2.5 text-[12px] font-bold text-[#46545b] md:mt-2 md:rounded-[15px] md:px-4 md:py-3 md:text-sm"
              >
                {genres.map((item) => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#687881]">
                Estado
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="mt-1.5 w-full rounded-[13px] border border-[#cfd9df] bg-[#f3f6f8] px-3 py-2.5 text-[12px] font-bold text-[#46545b] md:mt-2 md:rounded-[15px] md:px-4 md:py-3 md:text-sm"
              >
                <option>Todos</option>
                <option>Terminada</option>
                <option>En proceso</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#687881]">
                Ordenar
              </label>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value as Sort
                  )
                }
                className="mt-1.5 w-full rounded-[13px] border border-[#cfd9df] bg-[#f3f6f8] px-3 py-2.5 text-[12px] font-bold text-[#46545b] md:mt-2 md:rounded-[15px] md:px-4 md:py-3 md:text-sm"
              >
                <option value="relevancia">
                  Relevancia
                </option>
                <option value="rating">
                  Mejor valoradas
                </option>
                <option value="precio-asc">
                  Menor precio
                </option>
                <option value="precio-desc">
                  Mayor precio
                </option>
                <option value="titulo">
                  Título A–Z
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Bloque editorial después de filtros */}
      <section className="mt-4 grid gap-3 md:mt-6 md:gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-[#cba681] bg-[#ead4bf] p-5 shadow-[0_16px_36px_rgba(137,96,61,0.12)] md:rounded-[30px] md:p-10">
          <div className="absolute -right-16 top-8 h-64 w-64 rounded-full border border-[#cda783]" />
          <div className="absolute right-5 top-28 h-28 w-28 rounded-full bg-[#d9b48f]" />

          <div className="relative flex min-h-[250px] flex-col justify-between md:min-h-[390px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9b5427]">
                SEBORO · DESCUBRE
              </p>

              <h2 className="mt-3 max-w-2xl text-[34px] font-black leading-[0.98] tracking-[-0.05em] md:mt-4 md:text-6xl">
                Encuentra algo que no estabas buscando.
              </h2>

              <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#6f5847] md:mt-5 md:text-base md:leading-7">
                Explora por género, autor, valoración o precio. Y cuando no quieras decidir,
                deja que SEBORO elija por ti.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5 md:mt-8 md:gap-3">
              <RandomDiscoveryButton />

              <a
                href="#catalogo"
                className="rounded-[15px] border border-[#b98f69] bg-white/80 px-5 py-3 text-sm font-black text-[#724c32] transition hover:bg-white"
              >
                Ver resultados ↓
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:gap-5">
          <div className="rounded-[20px] border border-[#cfc3df] bg-[#ece4f5] p-4 shadow-[0_10px_24px_rgba(100,76,132,0.08)] md:rounded-[26px] md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5b3f8c]">
              Explora
            </p>

            <h3 className="mt-1.5 text-xl font-black md:mt-2 md:text-2xl">
              Autores SEBORO
            </h3>

            <p className="mt-2 text-[13px] leading-5 text-[#74687f] md:mt-3 md:text-sm md:leading-6">
              Descubre obras publicadas por autores reales dentro de la plataforma.
            </p>
          </div>

          <div className="rounded-[20px] border border-[#b8d0dc] bg-[#dcebf2] p-4 shadow-[0_10px_24px_rgba(70,110,128,0.09)] md:rounded-[26px] md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4f7e8c]">
              Filtra
            </p>

            <h3 className="mt-1.5 text-xl font-black md:mt-2 md:text-2xl">
              Por vibra y contexto
            </h3>

            <p className="mt-2 text-[13px] leading-5 text-[#607985] md:mt-3 md:text-sm md:leading-6">
              Combina género, estado, precio, valoración y palabras clave.
            </p>
          </div>

          <div className="rounded-[20px] border border-[#b8d0dc] bg-[#dcebf2] p-4 shadow-[0_10px_24px_rgba(70,110,128,0.09)] md:rounded-[26px] md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4f7e8c]">
              Catálogo editorial
            </p>

            <h3 className="mt-1.5 text-lg font-black md:mt-2 md:text-xl">
              Menos rígido, más curioso.
            </h3>

            <p className="mt-2 text-[13px] leading-5 text-[#607985] md:mt-3 md:text-sm md:leading-6">
              No solo encontrar “lo mejor”, sino abrir espacio para historias nuevas y menos obvias.
            </p>
          </div>
        </div>
      </section>

      <section id="catalogo" className="mt-6 md:mt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#4f7e8c]">
                Catálogo
              </p>
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
              {results.length}{" "}
              {results.length === 1
                ? "resultado"
                : "resultados"}
            </h2>

            {loadingReal && (
              <p className="mt-2 text-sm text-[#91867e]">
                Sincronizando publicaciones reales...
              </p>
            )}
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setQuery("");
                setGenre("Todos");
                setStatus("Todos");
                setSort("relevancia");
              }}
              className="w-fit rounded-full border border-[#ddd6d0] bg-white px-4 py-2 text-xs font-black text-[#776b63] transition hover:bg-[#faf8f6]"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="mt-5 rounded-[26px] border border-dashed border-[#d8dce1] bg-[#fafafa] p-10 text-center">
            <p className="text-lg font-black">
              No encontramos una obra con esos filtros.
            </p>

            <p className="mt-2 text-sm text-[#91867e]">
              Prueba con otro género, autor o palabra clave.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-[18px] border border-[#d8d3ce] bg-white shadow-[0_9px_26px_rgba(65,54,46,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(65,54,46,0.10)] md:rounded-[24px]"
              >
                <Link
                  href={item.href}
                  className="block"
                >
                  <div className="relative">
                    <div
                      className="aspect-[2/3]"
                      style={{
                        background: item.cover,
                      }}
                    />
                  </div>

                  <div className="p-3 md:p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a9088]">
                      {item.genre}
                    </p>

                    <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-[1.12] tracking-[-0.02em] md:text-xl">
                      {item.title}
                    </h3>
                  </div>
                </Link>

                <div className="px-3 pb-3 md:px-4 md:pb-4">
                  {item.authorId ? (
                    <Link
                      href={`/autores/${item.authorId}`}
                      className="block truncate text-[12px] font-bold text-[#6d7780] transition hover:text-[#2b2521] md:text-sm"
                    >
                      {item.author}
                    </Link>
                  ) : (
                    <p className="truncate text-[12px] text-[#7f756e] md:text-sm">
                      {item.author}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#eee9e5] pt-2.5 text-[12px] md:mt-4 md:gap-3 md:pt-3 md:text-sm">
                    <span className="font-bold text-[#625851]">
                      {item.price > 0
                        ? `$${item.price.toFixed(0)} MXN`
                        : "Gratis"}
                    </span>

                    {item.rating !== null ? (
                      <span className="font-black text-[#b8862f]">
                        ★ {item.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#aaa099]">
                        Sin valorar
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 md:mt-3 md:gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        item.status === "Terminada"
                          ? "bg-[#eef8f1] text-[#397053]"
                          : "bg-[#eef3f5] text-[#4f7e8c]"
                      }`}
                    >
                      {item.status}
                    </span>

                    <Link
                      href={item.href}
                      className="text-[10px] font-black text-[#a55f31] md:text-xs"
                    >
                      Ver obra →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
