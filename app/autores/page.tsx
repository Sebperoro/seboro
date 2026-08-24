"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getPublicAuthors,
  type PublicAuthorProfile,
} from "@/lib/authorProfiles";

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<
    PublicAuthorProfile[]
  >([]);
  const [query, setQuery] = useState("");
  const [genre, setGenre] =
    useState("Todos");
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getPublicAuthors();

        if (active) {
          setAuthors(
            result.filter(
              (author) =>
                author.published_count > 0
            )
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
  }, []);

  const genres = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(
          authors.flatMap(
            (author) => author.genres
          )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    ],
    [authors]
  );

  const results = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    return authors
      .filter((author) => {
        const matchesQuery =
          !normalized ||
          author.display_name
            .toLowerCase()
            .includes(normalized) ||
          author.bio
            .toLowerCase()
            .includes(normalized) ||
          author.genres.some((item) =>
            item
              .toLowerCase()
              .includes(normalized)
          );

        const matchesGenre =
          genre === "Todos" ||
          author.genres.includes(genre);

        return (
          matchesQuery && matchesGenre
        );
      })
      .sort((a, b) => {
        if (
          a.follower_count !==
          b.follower_count
        ) {
          return (
            b.follower_count -
            a.follower_count
          );
        }

        if (
          a.rating_count !==
          b.rating_count
        ) {
          return (
            b.rating_count -
            a.rating_count
          );
        }

        return (
          b.published_count -
          a.published_count
        );
      });
  }, [authors, query, genre]);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Creadores
        </p>

        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Autores de SEBORO
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Descubre quién está detrás de cada obra,
          consulta sus publicaciones y sigue a los
          autores que quieras volver a encontrar.
        </p>

        <section className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[1fr_260px]">
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Buscar autor
            </label>

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Nombre, biografía o género..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Género
            </label>

            <select
              value={genre}
              onChange={(event) =>
                setGenre(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3"
            >
              {genres.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">
            {loading
              ? "Cargando..."
              : `${results.length} ${
                  results.length === 1
                    ? "autor"
                    : "autores"
                }`}
          </h2>
        </div>

        {!loading && results.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
            No encontramos autores con esos filtros.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((author) => (
              <Link
                key={author.author_id}
                href={`/autores/${author.author_id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/25"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-2xl font-black">
                    {author.display_name
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  {author.rating_count >
                    0 && (
                    <span className="text-sm font-semibold text-amber-300">
                      ★{" "}
                      {author.rating_avg?.toFixed(
                        1
                      )}
                    </span>
                  )}
                </div>

                <h3 className="mt-5 text-2xl font-bold">
                  {author.display_name}
                </h3>

                <p className="mt-3 line-clamp-3 min-h-[72px] leading-6 text-zinc-400">
                  {author.bio ||
                    "Autor de SEBORO."}
                </p>

                {author.genres.length >
                  0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {author.genres
                      .slice(0, 4)
                      .map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400"
                        >
                          {item}
                        </span>
                      ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
                  <span>
                    {author.published_count}{" "}
                    {author.published_count === 1
                      ? "obra publicada"
                      : "obras publicadas"}
                  </span>

                  <span>
                    {author.follower_count}{" "}
                    {author.follower_count === 1
                      ? "seguidor"
                      : "seguidores"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
