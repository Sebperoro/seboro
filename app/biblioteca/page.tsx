"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { books } from "@/data/books";
import {
  getAllUserBooks,
  getCurrentUser,
  type UserBookRow,
} from "@/lib/userBooks";
import {
  getPublishedLibraryCatalog,
  type PublishedLibraryItem,
} from "@/lib/libraryCatalog";

type Tab =
  | "Leyendo"
  | "Guardadas"
  | "Terminadas"
  | "Compradas"
  | "Historial";

type Snapshot = {
  rows: UserBookRow[];
  loggedIn: boolean;
  email: string | null;
};

type LibraryDisplayItem = {
  slug: string;
  title: string;
  author: string;
  genre: string;
  cover: string;
  chapterCount: number;
  href: string;
  readerHref: string;
  real: boolean;
};

const EMPTY: Snapshot = {
  rows: [],
  loggedIn: false,
  email: null,
};

function readArray(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function getLocalTrackedSlugs(): string[] {
  const slugs = new Set<string>([
    ...readArray("seboro-saved"),
    ...readArray("seboro-finished"),
    ...readArray("seboro-purchased"),
    ...readArray("seboro-history"),
  ]);

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (key.startsWith("seboro-progress:")) {
      slugs.add(key.replace("seboro-progress:", ""));
    }

    if (key.startsWith("seboro-finished:")) {
      slugs.add(key.replace("seboro-finished:", ""));
    }
  }

  return [...slugs];
}

function localSnapshot(): UserBookRow[] {
  const saved = readArray("seboro-saved");
  const finishedLegacy = readArray("seboro-finished");
  const purchased = readArray("seboro-purchased");
  const history = readArray("seboro-history");

  return getLocalTrackedSlugs().map((slug) => {
    const rawProgress = localStorage.getItem(`seboro-progress:${slug}`);
    const parsedProgress =
      rawProgress === null ? null : Number(rawProgress);

    const finished =
      finishedLegacy.includes(slug) ||
      localStorage.getItem(`seboro-finished:${slug}`) === "true";

    return {
      user_id: "local",
      book_slug: slug,
      saved: saved.includes(slug),
      progress:
        parsedProgress !== null && Number.isFinite(parsedProgress)
          ? parsedProgress
          : null,
      finished,
      purchased: purchased.includes(slug),
      last_opened_at: history.includes(slug)
        ? new Date(
            Date.now() - history.indexOf(slug) * 1000
          ).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };
  });
}

function staticCatalog(): LibraryDisplayItem[] {
  return books.map((book) => ({
    slug: book.slug,
    title: book.title,
    author: book.author,
    genre: book.genre,
    cover: book.cover,
    chapterCount: book.chapters.length,
    href: `/obra/${book.slug}`,
    readerHref: `/leer/${book.slug}`,
    real: false,
  }));
}

function realCatalog(
  items: PublishedLibraryItem[]
): LibraryDisplayItem[] {
  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    author: item.author,
    genre: item.genre,
    cover: item.cover,
    chapterCount: item.chapter_count,
    href: item.href,
    readerHref: item.reader_href,
    real: true,
  }));
}

function BookList({
  rows,
  catalog,
  emptyText,
  showContinue = false,
}: {
  rows: UserBookRow[];
  catalog: LibraryDisplayItem[];
  emptyText: string;
  showContinue?: boolean;
}) {
  const itemMap = new Map(
    catalog.map((item) => [item.slug, item])
  );

  const items = rows
    .map((row) => ({
      row,
      item: itemMap.get(row.book_slug),
    }))
    .filter(
      (
        value
      ): value is {
        row: UserBookRow;
        item: LibraryDisplayItem;
      } => Boolean(value.item)
    );

  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {items.map(({ row, item }) => {
        const currentChapter =
          typeof row.progress === "number"
            ? Math.min(
                row.progress + 1,
                Math.max(1, item.chapterCount)
              )
            : null;

        return (
          <article
            key={item.slug}
            className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div
              className="h-28 w-20 shrink-0 rounded-xl border border-white/10"
              style={{ background: item.cover }}
            />

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  {item.genre}
                </p>

                {item.real && (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                    Publicación real
                  </span>
                )}
              </div>

              <h3 className="mt-1 truncate text-lg font-bold">
                {item.title}
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                {item.author}
              </p>

              {currentChapter !== null && item.chapterCount > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-zinc-500">
                    Capítulo {currentChapter} de {item.chapterCount}
                  </p>

                  {!row.finished && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              4,
                              (currentChapter / item.chapterCount) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {row.finished && (
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  ✓ Terminada
                </p>
              )}

              <div className="mt-4">
                <Link
                  href={
                    showContinue
                      ? item.readerHref
                      : item.href
                  }
                  className="text-sm font-semibold underline"
                >
                  {showContinue
                    ? "Continuar leyendo"
                    : "Ver obra"}
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function BibliotecaPage() {
  const [activeTab, setActiveTab] =
    useState<Tab>("Leyendo");

  const [snapshot, setSnapshot] =
    useState<Snapshot>(EMPTY);

  const [published, setPublished] =
    useState<PublishedLibraryItem[]>([]);

  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const [user, publishedCatalog] =
        await Promise.all([
          getCurrentUser(),
          getPublishedLibraryCatalog(),
        ]);

      setPublished(publishedCatalog);

      if (user) {
        const rows = (await getAllUserBooks()) || [];

        setSnapshot({
          rows,
          loggedIn: true,
          email: user.email || null,
        });
      } else {
        setSnapshot({
          rows: localSnapshot(),
          loggedIn: false,
          email: null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    window.addEventListener(
      "seboro-library-updated",
      refresh
    );

    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(
        "seboro-library-updated",
        refresh
      );

      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const catalog = useMemo(
    () => [
      ...realCatalog(published),
      ...staticCatalog(),
    ],
    [published]
  );

  const reading = useMemo(
    () =>
      snapshot.rows.filter(
        (row) =>
          typeof row.progress === "number" &&
          !row.finished
      ),
    [snapshot.rows]
  );

  const history = useMemo(
    () =>
      [...snapshot.rows]
        .filter((row) => Boolean(row.last_opened_at))
        .sort(
          (a, b) =>
            new Date(
              b.last_opened_at || 0
            ).getTime() -
            new Date(
              a.last_opened_at || 0
            ).getTime()
        ),
    [snapshot.rows]
  );

  const tabs: Tab[] = [
    "Leyendo",
    "Guardadas",
    "Terminadas",
    "Compradas",
    "Historial",
  ];

  const currentRows =
    activeTab === "Leyendo"
      ? reading
      : activeTab === "Guardadas"
      ? snapshot.rows.filter((row) => row.saved)
      : activeTab === "Terminadas"
      ? snapshot.rows.filter(
          (row) => row.finished
        )
      : activeTab === "Compradas"
      ? snapshot.rows.filter(
          (row) => row.purchased
        )
      : history;

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          Tu espacio
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Biblioteca
        </h1>

        <div
          className={`mt-6 rounded-2xl border p-4 text-sm ${
            snapshot.loggedIn
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          }`}
        >
          {snapshot.loggedIn ? (
            <>
              ✓ Biblioteca sincronizada con{" "}
              <b>{snapshot.email || "tu cuenta"}</b>.
              Ahora incluye tanto obras del prototipo como
              publicaciones reales de autores.
            </>
          ) : (
            <>
              Esta biblioteca usa datos locales del
              navegador.{" "}
              <Link
                href="/cuenta"
                className="font-bold underline"
              >
                Inicia sesión
              </Link>{" "}
              para sincronizarla con tu cuenta.
            </>
          )}
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "border border-white/10 text-zinc-300 hover:border-white/25"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-bold">
            {activeTab}
          </h2>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
              Cargando biblioteca...
            </div>
          ) : (
            <BookList
              rows={currentRows}
              catalog={catalog}
              showContinue={
                activeTab === "Leyendo"
              }
              emptyText={
                activeTab === "Leyendo"
                  ? "Todavía no has comenzado ninguna obra con esta cuenta."
                  : activeTab === "Guardadas"
                  ? "Todavía no has guardado ninguna obra con esta cuenta."
                  : activeTab === "Terminadas"
                  ? "Todavía no has terminado ninguna obra con esta cuenta."
                  : activeTab === "Compradas"
                  ? "Todavía no hay compras simuladas para esta cuenta."
                  : "El historial de esta cuenta todavía está vacío."
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
