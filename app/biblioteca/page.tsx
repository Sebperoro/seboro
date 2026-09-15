"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
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
  | "Mis libros"
  | "Leyendo"
  | "Guardadas"
  | "Terminadas"
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

type UserBookWithAcquired = UserBookRow & {
  acquired?: boolean;
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

function isOwned(row: UserBookRow) {
  const extended = row as UserBookWithAcquired;
  return Boolean(extended.acquired || row.purchased);
}

function getLocalTrackedSlugs(): string[] {
  const slugs = new Set<string>([
    ...readArray("seboro-saved"),
    ...readArray("seboro-finished"),
    ...readArray("seboro-purchased"),
    ...readArray("seboro-acquired"),
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
  const acquired = readArray("seboro-acquired");
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
      acquired:
        acquired.includes(slug) || purchased.includes(slug),
      last_opened_at: history.includes(slug)
        ? new Date(
            Date.now() - history.indexOf(slug) * 1000
          ).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    } as UserBookRow;
  });
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
  showOwnership = false,
}: {
  rows: UserBookRow[];
  catalog: LibraryDisplayItem[];
  emptyText: string;
  showContinue?: boolean;
  showOwnership?: boolean;
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
      <div className="rounded-[24px] border border-dashed border-[#cfdce2] bg-[#f8fbfc] p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f1f4] text-lg font-black text-[#4f7e8c]">
          +
        </div>

        <p className="mt-4 text-sm font-bold text-[#73858c]">
          {emptyText}
        </p>

        <Link
          href="/descubre"
          className="mt-5 inline-flex rounded-full border border-[#bfd1d8] bg-white px-4 py-2 text-xs font-black text-[#4f7e8c] transition hover:bg-[#f4f9fa]"
        >
          Descubrir historias
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map(({ row, item }) => {
        const currentChapter =
          typeof row.progress === "number"
            ? Math.min(
                row.progress + 1,
                Math.max(1, item.chapterCount)
              )
            : null;

        const progressPercent =
          currentChapter !== null && item.chapterCount > 0
            ? Math.min(
                100,
                Math.max(
                  4,
                  (currentChapter / item.chapterCount) * 100
                )
              )
            : 0;

        return (
          <article
            key={item.slug}
            className="group grid grid-cols-[92px_1fr] gap-5 rounded-[22px] border border-[#dce5e9] bg-white p-4 shadow-[0_8px_22px_rgba(55,78,88,0.035)] transition hover:-translate-y-0.5 hover:border-[#bfd1d8] hover:shadow-[0_12px_28px_rgba(55,78,88,0.07)]"
          >
            <div
              className="aspect-[2/3] w-[92px] rounded-[14px] border border-[#d8e1e5] shadow-[0_8px_18px_rgba(45,59,66,0.10)]"
              style={{ background: item.cover }}
            />

            <div className="min-w-0 py-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d9097]">
                  {item.genre}
                </p>

                {showOwnership && isOwned(row) && (
                  <span className="rounded-full border border-[#c8d9e8] bg-[#eef5fb] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#47708e]">
                    {row.purchased ? "Comprado" : "Obtenido"}
                  </span>
                )}
              </div>

              <h3 className="mt-1 truncate text-lg font-black text-[#2d3336]">
                {item.title}
              </h3>

              <p className="mt-1 text-sm text-[#7f8b90]">
                {item.author}
              </p>

              {currentChapter !== null && item.chapterCount > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-[#65767d]">
                      Capítulo {currentChapter} de {item.chapterCount}
                    </span>

                    {!row.finished && (
                      <span className="font-black text-[#4f7e8c]">
                        {Math.round(progressPercent)}%
                      </span>
                    )}
                  </div>

                  {!row.finished && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8eef1]">
                      <div
                        className="h-full rounded-full bg-[#4f7e8c]"
                        style={{
                          width: `${progressPercent}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {row.finished && (
                <p className="mt-3 text-sm font-black text-[#397053]">
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
                  className="inline-flex rounded-full bg-[#eaf3f6] px-4 py-2 text-xs font-black text-[#416f7d] transition group-hover:bg-[#dfecef]"
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
    useState<Tab>("Mis libros");

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
    () => realCatalog(published),
    [published]
  );

  const owned = useMemo(
    () =>
      snapshot.rows.filter((row) => isOwned(row)),
    [snapshot.rows]
  );

  const reading = useMemo(
    () =>
      snapshot.rows.filter(
        (row) =>
          isOwned(row) &&
          typeof row.progress === "number" &&
          !row.finished
      ),
    [snapshot.rows]
  );

  const saved = useMemo(
    () =>
      snapshot.rows.filter((row) => row.saved),
    [snapshot.rows]
  );

  const finished = useMemo(
    () =>
      snapshot.rows.filter(
        (row) => isOwned(row) && row.finished
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

  const purchasedCount = snapshot.rows.filter(
    (row) => row.purchased
  ).length;

  const tabs: Tab[] = [
    "Mis libros",
    "Leyendo",
    "Guardadas",
    "Terminadas",
    "Historial",
  ];

  const currentRows =
    activeTab === "Mis libros"
      ? owned
      : activeTab === "Leyendo"
      ? reading
      : activeTab === "Guardadas"
      ? saved
      : activeTab === "Terminadas"
      ? finished
      : history;

  const tabDescriptions: Record<Tab, string> = {
    "Mis libros":
      "Todo lo que ya obtuviste o compraste. Gratis y de pago viven juntos aquí.",
    Leyendo:
      "Obras tuyas que ya comenzaste y todavía no has terminado.",
    Guardadas:
      "Tu lista para recordar obras que te interesan, las hayas obtenido o no.",
    Terminadas:
      "Obras de tu biblioteca que ya completaste.",
    Historial:
      "Actividad reciente de lectura. Útil para volver a algo que abriste hace poco.",
  };

  const tabCount: Record<Tab, number> = {
    "Mis libros": owned.length,
    Leyendo: reading.length,
    Guardadas: saved.length,
    Terminadas: finished.length,
    Historial: history.length,
  };

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#293034]">
      <TopNav />

      <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-7 md:px-8">
        <div className="grid gap-5 xl:grid-cols-[290px_1fr]">
          <aside className="rounded-[28px] border border-[#b8cdd5] bg-[#dcecef] p-5 shadow-[0_14px_32px_rgba(67,100,112,0.10)] xl:sticky xl:top-24 xl:h-fit">
            <div className="mb-5 h-1.5 w-16 rounded-full bg-[#4f7e8c]" />

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4f7e8c]">
              SEBORO · BIBLIOTECA
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#26383e]">
              Tu estantería personal
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#71838a]">
              Tus libros adquiridos, tus lecturas activas y las historias que quieres recordar, cada cosa en su lugar.
            </p>

            {purchasedCount > 0 && (
              <p className="mt-5 text-xs font-bold text-[#71838a]">
                De tus libros, {purchasedCount}{" "}
                {purchasedCount === 1
                  ? "fue comprado"
                  : "fueron comprados"}.
              </p>
            )}

            <div
              className={`mt-5 rounded-[18px] border p-4 text-sm leading-6 ${
                snapshot.loggedIn
                  ? "border-[#c5dfcf] bg-[#eef8f1] text-[#557463]"
                  : "border-[#ead5aa] bg-[#fffaf0] text-[#806f52]"
              }`}
            >
              {snapshot.loggedIn ? (
                <>
                  <p className="font-black text-[#397053]">
                    ✓ Biblioteca sincronizada
                  </p>

                  <p className="mt-1">
                    Con{" "}
                    <b>{snapshot.email || "tu cuenta"}</b>.
                    Tus libros y tu progreso se sincronizan en tu cuenta.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-[#8a682d]">
                    Biblioteca local
                  </p>

                  <p className="mt-1">
                    Tus datos están guardados solo en este navegador.{" "}
                    <Link
                      href="/cuenta"
                      className="font-black underline"
                    >
                      Inicia sesión
                    </Link>{" "}
                    para sincronizarlos.
                  </p>
                </>
              )}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-[28px] border border-[#dfe7ea] bg-white p-5 shadow-[0_10px_28px_rgba(55,78,88,0.04)] md:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4f7e8c]">
                    Colección
                  </p>

                  <h2 className="mt-1 text-3xl font-black tracking-[-0.035em]">
                    {activeTab}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm text-[#7b8b91]">
                    {tabDescriptions[activeTab]}
                  </p>
                </div>

                <Link
                  href="/descubre"
                  className="inline-flex w-fit rounded-[15px] border border-[#c8d8de] bg-[#f6fafb] px-5 py-3 text-sm font-black text-[#4a7784] transition hover:bg-[#edf5f7]"
                >
                  + Encontrar nuevas historias
                </Link>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      activeTab === tab
                        ? "bg-[#4f7e8c] text-white shadow-[0_6px_14px_rgba(79,126,140,0.18)]"
                        : "border border-[#d6e1e5] bg-white text-[#718188] hover:bg-[#f7fafb]"
                    }`}
                  >
                    {tab}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                        activeTab === tab
                          ? "bg-white/15 text-white"
                          : "bg-[#eef3f5] text-[#718188]"
                      }`}
                    >
                      {tabCount[tab]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-[#dfe7ea] bg-[#fbfcfc] p-5 md:p-6">
              {loading ? (
                <div className="rounded-[22px] border border-[#e1e8eb] bg-white p-8">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-[#edf1f3]" />
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="h-36 animate-pulse rounded-[18px] bg-[#f1f4f5]" />
                    <div className="h-36 animate-pulse rounded-[18px] bg-[#f1f4f5]" />
                  </div>
                </div>
              ) : (
                <BookList
                  rows={currentRows}
                  catalog={catalog}
                  showContinue={
                    activeTab === "Leyendo"
                  }
                  showOwnership={
                    activeTab === "Mis libros"
                  }
                  emptyText={
                    activeTab === "Mis libros"
                      ? "Todavía no has obtenido ni comprado ninguna obra."
                      : activeTab === "Leyendo"
                      ? "No tienes ninguna lectura activa en este momento."
                      : activeTab === "Guardadas"
                      ? "Todavía no has guardado ninguna obra para recordar después."
                      : activeTab === "Terminadas"
                      ? "Todavía no has terminado ninguna obra de tu biblioteca."
                      : "El historial de esta cuenta todavía está vacío."
                  }
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
