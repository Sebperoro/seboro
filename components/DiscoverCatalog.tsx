"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { books } from "@/data/books";
import {
  getPublishedWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";
import { getPublicWorkRatings } from "@/lib/workRatings";

type Sort =
  | "relevancia"
  | "rating"
  | "precio-asc"
  | "precio-desc"
  | "titulo";

type SourceFilter =
  | "Todos"
  | "Autores SEBORO"
  | "Demostración";

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
  source: "prototype" | "published";
  publishedAt: string | null;
};

function prototypeItems(): CatalogItem[] {
  return books.map((book) => ({
    id: `prototype-${book.slug}`,
    slug: book.slug,
    title: book.title,
    author: book.author,
    authorId: null,
    genre: book.genre,
    synopsis: book.synopsis,
    tags: [],
    status:
      book.status as
        | "Terminada"
        | "En proceso",
    price: book.price,
    cover: book.cover,
    rating: book.rating,
    rankingScore: null,
    href: `/obra/${book.slug}`,
    source: "prototype",
    publishedAt: null,
  }));
}

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
    price: Number(
      work.price_mxn || 0
    ),
    cover: getWorkCoverBackground(work),
    rating:
      typeof work.rating_avg ===
      "number"
        ? work.rating_avg
        : null,
    rankingScore:
      typeof work.ranking_score ===
      "number"
        ? work.ranking_score
        : null,
    href: `/publicaciones/${work.slug}`,
    source: "published",
    publishedAt: work.published_at,
  }));
}

export default function DiscoverCatalog() {
  const [query, setQuery] =
    useState("");

  const [genre, setGenre] =
    useState("Todos");

  const [status, setStatus] =
    useState("Todos");

  const [source, setSource] =
    useState<SourceFilter>("Autores SEBORO");

  const [sort, setSort] =
    useState<Sort>("relevancia");

  const [published, setPublished] =
    useState<CatalogItem[]>([]);

  const [loadingReal, setLoadingReal] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [works, ratings] =
          await Promise.all([
            getPublishedWorks(),
            getPublicWorkRatings(),
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
              ratingMap.get(
                work.slug
              )?.rating_avg ?? null,
            ranking_score:
              ratingMap.get(
                work.slug
              )?.ranking_score ??
              null,
          })
        );

        if (active) {
          setPublished(
            realItems(merged)
          );
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
  }, []);

  const allItems = useMemo(
    () => [
      ...published,
      ...prototypeItems(),
    ],
    [published]
  );

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

  const results = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

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

        const matchesSource =
          source === "Todos" ||
          (source ===
            "Autores SEBORO" &&
            item.source ===
              "published") ||
          (source ===
            "Demostración" &&
            item.source ===
              "prototype");

        return (
          matchesQuery &&
          matchesGenre &&
          matchesStatus &&
          matchesSource
        );
      });

    return [...filtered].sort(
      (a, b) => {
        if (sort === "rating") {
          if (
            source === "Todos" &&
            a.source !== b.source
          ) {
            return a.source ===
              "published"
              ? -1
              : 1;
          }

          const scoreA =
            a.source === "published"
              ? a.rankingScore ?? -1
              : a.rating ?? -1;

          const scoreB =
            b.source === "published"
              ? b.rankingScore ?? -1
              : b.rating ?? -1;

          return scoreB - scoreA;
        }

        if (
          sort === "precio-asc"
        ) {
          return a.price - b.price;
        }

        if (
          sort === "precio-desc"
        ) {
          return b.price - a.price;
        }

        if (sort === "titulo") {
          return a.title.localeCompare(
            b.title,
            "es"
          );
        }

        if (
          a.source !== b.source
        ) {
          return a.source ===
            "published"
            ? -1
            : 1;
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
    query,
    genre,
    status,
    source,
    sort,
  ]);

  return (
    <>
      <section
        id="buscar"
        className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6"
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto_auto]">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Buscar
            </label>

            <input
              autoFocus
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Título, autor, género o palabra..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Catálogo
            </label>

            <select
              value={source}
              onChange={(event) =>
                setSource(
                  event.target
                    .value as SourceFilter
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
            >
              <option>
                Todos
              </option>
              <option>
                Autores SEBORO
              </option>
              <option>
                Demostración
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Género
            </label>

            <select
              value={genre}
              onChange={(event) =>
                setGenre(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
            >
              {genres.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Estado
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
            >
              <option>Todos</option>
              <option>Terminada</option>
              <option>En proceso</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Ordenar
            </label>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as Sort
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white"
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
      </section>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Catálogo
            </p>

            {!loadingReal &&
              published.length >
                0 && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                  {
                    published.length
                  }{" "}
                  obras reales
                </span>
              )}
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            {results.length}{" "}
            {results.length === 1
              ? "resultado"
              : "resultados"}
          </h2>
        </div>

        {(query ||
          genre !== "Todos" ||
          status !== "Todos" ||
          source !== "Todos" ||
          sort !==
            "relevancia") && (
          <button
            onClick={() => {
              setQuery("");
              setGenre("Todos");
              setStatus("Todos");
              setSource("Autores SEBORO");
              setSort("relevancia");
            }}
            className="text-sm font-semibold text-zinc-400 underline hover:text-white"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loadingReal && (
        <p className="mt-3 text-sm text-zinc-600">
          Sincronizando
          publicaciones reales...
        </p>
      )}

      {results.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
          No encontramos una obra con
          esos filtros.
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-white/25"
            >
              <Link
                href={item.href}
                className="block"
              >
                <div
                  className="aspect-[2/3] rounded-2xl"
                  style={{
                    background:
                      item.cover,
                  }}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {item.genre}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                      item.source ===
                      "published"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.04] text-zinc-500"
                    }`}
                  >
                    {item.source ===
                    "published"
                      ? "SEBORO"
                      : "Muestra"}
                  </span>
                </div>

                <h3 className="mt-2 text-xl font-bold">
                  {item.title}
                </h3>
              </Link>

              {item.authorId ? (
                <Link
                  href={`/autores/${item.authorId}`}
                  className="mt-1 block text-sm text-zinc-500 hover:text-white"
                >
                  {item.author}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">
                  {item.author}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-400">
                  {item.price > 0
                    ? `$${item.price.toFixed(
                        0
                      )} MXN`
                    : "Gratis"}
                </span>

                {item.rating !==
                null ? (
                  <span className="font-semibold text-amber-300">
                    ★{" "}
                    {item.rating.toFixed(
                      1
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-600">
                    Sin valorar
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-zinc-600">
                {item.status}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
