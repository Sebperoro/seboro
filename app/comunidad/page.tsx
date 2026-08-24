"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import { books } from "@/data/books";
import {
  getPublishedWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";

type PublishedWithAuthor =
  PublishedWork & {
    author_name: string;
  };

export default function CommunityHomePage() {
  const [published, setPublished] =
    useState<PublishedWithAuthor[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getPublishedWorks();

        if (active) {
          setPublished(result);
        }
      } catch {
        if (active) {
          setPublished([]);
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

  const staticBooks = useMemo(
    () => books,
    []
  );

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          SEBORO · comunidad
        </p>

        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Conversaciones por obra
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Cada obra tiene su propio espacio para
          comentarios, preguntas al autor y críticas.
        </p>

        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">
              Publicaciones reales
            </h2>

            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
              Autores SEBORO
            </span>
          </div>

          {loading ? (
            <div className="mt-5 text-zinc-500">
              Cargando publicaciones...
            </div>
          ) : published.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-zinc-400">
              Todavía no hay publicaciones reales.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {published.map((work) => (
                <Link
                  key={work.id}
                  href={`/comunidad/${work.slug}`}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-white/25"
                >
                  <div
                    className="aspect-[2/3] rounded-2xl"
                    style={{
                      background:
                        getWorkCoverBackground(
                          work
                        ),
                    }}
                  />

                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {work.genre}
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {work.title}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    {work.author_name}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-zinc-300">
                    Abrir comunidad →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Catálogo del prototipo
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {staticBooks.map((book) => (
              <Link
                key={book.slug}
                href={`/comunidad/${book.slug}`}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-white/25"
              >
                <div
                  className="aspect-[2/3] rounded-2xl"
                  style={{
                    background:
                      book.cover,
                  }}
                />

                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-zinc-500">
                  {book.genre}
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  {book.title}
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  {book.author}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
