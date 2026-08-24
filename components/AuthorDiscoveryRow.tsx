"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getPublicAuthors,
  type PublicAuthorProfile,
} from "@/lib/authorProfiles";

export default function AuthorDiscoveryRow() {
  const [authors, setAuthors] = useState<
    PublicAuthorProfile[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getPublicAuthors();

        const visible = result
          .filter(
            (author) =>
              author.published_count > 0
          )
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
          })
          .slice(0, 8);

        if (active) setAuthors(visible);
      } catch {
        if (active) setAuthors([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  if (!loading && authors.length === 0) {
    return null;
  }

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">
              Autores para descubrir
            </h2>

            <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
              Identidad real
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            Perfiles públicos conectados con sus obras.
          </p>
        </div>

        <Link
          href="/autores"
          className="text-sm text-zinc-400 hover:text-white"
        >
          Ver autores
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-40 w-64 shrink-0 animate-pulse rounded-3xl bg-white/[0.04]"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {authors.map((author) => (
            <Link
              key={author.author_id}
              href={`/autores/${author.author_id}`}
              className="w-64 shrink-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-white/25"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xl font-black">
                {author.display_name
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <h3 className="mt-4 truncate text-lg font-bold">
                {author.display_name}
              </h3>

              <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-500">
                {author.bio ||
                  "Autor de SEBORO"}
              </p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>
                  {author.published_count}{" "}
                  {author.published_count === 1
                    ? "obra"
                    : "obras"}
                </span>

                {author.rating_count > 0 && (
                  <span className="text-amber-300">
                    ★{" "}
                    {author.rating_avg?.toFixed(
                      1
                    )}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
