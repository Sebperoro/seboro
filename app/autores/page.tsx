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

  const featured = results.slice(0, 2);
  const directory = results.slice(2);

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <section className="overflow-hidden rounded-[34px] border-2 border-[#2f2925] bg-white shadow-[0_20px_50px_rgba(47,41,37,0.10)]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#ead4bf] via-[#f7e8da] to-[#f2d4bd] p-8 md:p-10">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d96822]/17 blur-3xl" />
              <div className="absolute -bottom-24 left-[-40px] h-56 w-56 rounded-full bg-[#9a6744]/12 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(89,57,36,0.5)_0.8px,transparent_0.8px)] [background-size:15px_15px]" />

              <div className="relative max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b95016]">
                  Creadores
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">
                  Autores de SEBORO
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-[#6f6259] md:text-lg">
                  Descubre quién está detrás de cada obra,
                  consulta sus publicaciones y sigue a los
                  autores que quieras volver a encontrar.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-7 md:grid-cols-2 md:p-9 lg:grid-cols-1">
              <div className="rounded-[22px] border border-[#d8d1e8] bg-[#faf8fd] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#5b3f8c]">
                  Directorio
                </p>
                <p className="mt-2 text-3xl font-black text-[#5b3f8c]">
                  {authors.length}
                </p>
                <p className="mt-1 text-sm text-[#8d837d]">
                  autores con obra publicada
                </p>
              </div>

              <div className="rounded-[22px] border border-[#cfe0e7] bg-[#f1f8fa] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#428397]">
                  Explora
                </p>
                <p className="mt-2 text-lg font-black text-[#315f6c]">
                  Por nombre o género
                </p>
                <p className="mt-1 text-sm leading-6 text-[#7c8b91]">
                  Encuentra voces nuevas sin perder de vista a las que ya conoces.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-[26px] border border-[#d9d0c9] bg-white p-5 shadow-[0_8px_24px_rgba(62,45,34,0.035)] md:grid-cols-[1fr_260px]">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8e8178]">
              Buscar autor
            </label>

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Nombre, biografía o género..."
              className="mt-2 w-full rounded-[18px] border border-[#ddd5cf] bg-[#faf9f7] px-4 py-3.5 text-[#2b2521] outline-none transition placeholder:text-[#aaa09a] focus:border-[#c99876] focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8e8178]">
              Género
            </label>

            <select
              value={genre}
              onChange={(event) =>
                setGenre(event.target.value)
              }
              className="mt-2 w-full rounded-[18px] border border-[#ddd5cf] bg-[#faf9f7] px-4 py-3.5 text-[#2b2521] outline-none transition focus:border-[#c99876] focus:bg-white"
            >
              {genres.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="mt-9 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
              Resultados
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
              {loading
                ? "Cargando..."
                : `${results.length} ${
                    results.length === 1
                      ? "autor"
                      : "autores"
                  }`}
            </h2>
          </div>
        </div>

        {!loading && results.length === 0 ? (
          <div className="mt-5 rounded-[26px] border border-[#ddd5cf] bg-white p-8 text-[#7b716a]">
            No encontramos autores con esos filtros.
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mt-5 grid gap-5 lg:grid-cols-2">
                {featured.map(
                  (author, index) => (
                    <Link
                      key={
                        author.author_id
                      }
                      href={`/autores/${author.author_id}`}
                      className={`group relative overflow-hidden rounded-[30px] border p-7 transition hover:-translate-y-1 ${
                        index === 0
                          ? "border-[#d8bda5] bg-gradient-to-br from-[#f7e9dc] via-[#fffaf6] to-[#f2d6bf]"
                          : "border-[#cfdde3] bg-gradient-to-br from-[#eef6f8] via-white to-[#e6f0f4]"
                      }`}
                    >
                      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/60 blur-3xl" />

                      <div className="relative flex items-start justify-between gap-4">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-[20px] border bg-white/85 text-2xl font-black shadow-[0_8px_22px_rgba(62,45,34,0.06)] ${
                            index === 0
                              ? "border-[#d9bea9] text-[#8f4e25]"
                              : "border-[#c8dbe2] text-[#3f7180]"
                          }`}
                        >
                          {author.display_name
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        {author.rating_count >
                          0 && (
                          <span className="rounded-full border border-[#e4d6b4] bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#9c7b28]">
                            ★{" "}
                            {author.rating_avg?.toFixed(
                              1
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="relative mt-5 text-3xl font-black tracking-[-0.03em]">
                        {author.display_name}
                      </h3>

                      <p className="relative mt-3 line-clamp-3 min-h-[72px] max-w-xl leading-7 text-[#70655e]">
                        {author.bio ||
                          "Autor de SEBORO."}
                      </p>

                      {author.genres.length >
                        0 && (
                        <div className="relative mt-4 flex flex-wrap gap-2">
                          {author.genres
                            .slice(0, 4)
                            .map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-[#d8d0ca] bg-white/75 px-2.5 py-1 text-xs font-bold text-[#756a62]"
                              >
                                {item}
                              </span>
                            ))}
                        </div>
                      )}

                      <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[0.07] pt-4 text-sm font-semibold text-[#786e67]">
                        <span>
                          {
                            author.published_count
                          }{" "}
                          {author.published_count ===
                          1
                            ? "obra publicada"
                            : "obras publicadas"}
                        </span>

                        <span>
                          {
                            author.follower_count
                          }{" "}
                          {author.follower_count ===
                          1
                            ? "seguidor"
                            : "seguidores"}
                        </span>
                      </div>

                      <p className="relative mt-5 text-sm font-black text-[#b95016]">
                        Ver perfil →
                      </p>
                    </Link>
                  )
                )}
              </section>
            )}

            {directory.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8e8178]">
                      Directorio general
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      Más autores
                    </h3>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {directory.map(
                    (author) => (
                      <Link
                        key={
                          author.author_id
                        }
                        href={`/autores/${author.author_id}`}
                        className="group rounded-[26px] border border-[#ddd5cf] bg-white p-6 transition hover:-translate-y-1 hover:border-[#c8a890] hover:shadow-[0_12px_28px_rgba(62,45,34,0.06)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#ded6d0] bg-[#faf8f6] text-2xl font-black text-[#6e625b]">
                            {author.display_name
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          {author.rating_count >
                            0 && (
                            <span className="text-sm font-black text-[#9c7b28]">
                              ★{" "}
                              {author.rating_avg?.toFixed(
                                1
                              )}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-5 text-2xl font-black">
                          {author.display_name}
                        </h3>

                        <p className="mt-3 line-clamp-3 min-h-[72px] leading-6 text-[#786f69]">
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
                                  className="rounded-full border border-[#ddd5cf] bg-[#faf9f7] px-2.5 py-1 text-xs font-bold text-[#776d66]"
                                >
                                  {item}
                                </span>
                              ))}
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#8b817a]">
                          <span>
                            {
                              author.published_count
                            }{" "}
                            {author.published_count ===
                            1
                              ? "obra publicada"
                              : "obras publicadas"}
                          </span>

                          <span>
                            {
                              author.follower_count
                            }{" "}
                            {author.follower_count ===
                            1
                              ? "seguidor"
                              : "seguidores"}
                          </span>
                        </div>

                        <p className="mt-5 text-sm font-black text-[#b95016]">
                          Ver perfil →
                        </p>
                      </Link>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
