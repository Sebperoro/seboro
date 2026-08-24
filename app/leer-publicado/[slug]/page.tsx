"use client";

import Link from "next/link";
import {
  useParams,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getPublishedWorkBySlug,
  type PublicWorkBundle,
} from "@/lib/publishedWorks";
import {
  getCurrentUser,
  getUserBook,
  patchUserBook,
} from "@/lib/userBooks";

type ReaderTheme =
  | "paper"
  | "sepia"
  | "dark";

type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  width: "narrow" | "medium" | "wide";
  theme: ReaderTheme;
};

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 21,
  lineHeight: 1.75,
  width: "medium",
  theme: "paper",
};

function updateLocalHistory(
  slug: string
) {
  try {
    const current: string[] =
      JSON.parse(
        localStorage.getItem(
          "seboro-history"
        ) || "[]"
      );

    const next = [
      slug,
      ...current.filter(
        (item) =>
          item !== slug
      ),
    ].slice(0, 100);

    localStorage.setItem(
      "seboro-history",
      JSON.stringify(next)
    );
  } catch {
    localStorage.setItem(
      "seboro-history",
      JSON.stringify([slug])
    );
  }

  window.dispatchEvent(
    new Event(
      "seboro-library-updated"
    )
  );
}

function loadSettings(): ReaderSettings {
  try {
    const raw =
      localStorage.getItem(
        "seboro-reader-settings"
      );

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed =
      JSON.parse(raw);

    return {
      fontSize:
        Number(
          parsed.fontSize
        ) ||
        DEFAULT_SETTINGS.fontSize,
      lineHeight:
        Number(
          parsed.lineHeight
        ) ||
        DEFAULT_SETTINGS.lineHeight,
      width:
        ["narrow", "medium", "wide"].includes(
          parsed.width
        )
          ? parsed.width
          : DEFAULT_SETTINGS.width,
      theme:
        ["paper", "sepia", "dark"].includes(
          parsed.theme
        )
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function PublishedReaderPage() {
  const params =
    useParams<{ slug: string }>();

  const search =
    useSearchParams();

  const [bundle, setBundle] =
    useState<PublicWorkBundle | null>(
      null
    );

  const [
    chapterIndex,
    setChapterIndex,
  ] = useState(0);

  const [
    loggedIn,
    setLoggedIn,
  ] = useState(false);

  const [loaded, setLoaded] =
    useState(false);

  const [
    finished,
    setFinished,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    settingsOpen,
    setSettingsOpen,
  ] = useState(false);

  const [
    settings,
    setSettings,
  ] =
    useState<ReaderSettings>(
      DEFAULT_SETTINGS
    );

  useEffect(() => {
    setSettings(
      loadSettings()
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "seboro-reader-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getPublishedWorkBySlug(
            params.slug
          );

        if (!active) return;

        setBundle(result);

        if (!result) {
          setLoaded(true);
          return;
        }

        const requested =
          Number(
            search.get(
              "capitulo"
            )
          );

        const requestedIndex =
          Number.isFinite(
            requested
          ) &&
          requested >= 1
            ? Math.min(
                result.chapters
                  .length - 1,
                requested - 1
              )
            : null;

        const user =
          await getCurrentUser();

        if (!active) return;

        setLoggedIn(
          Boolean(user)
        );

        if (user) {
          const row =
            await getUserBook(
              result.work.slug
            );

          const storedIndex =
            typeof row?.progress ===
            "number"
              ? Math.min(
                  Math.max(
                    0,
                    row.progress
                  ),
                  Math.max(
                    0,
                    result.chapters
                      .length - 1
                  )
                )
              : 0;

          setFinished(
            Boolean(
              row?.finished
            )
          );

          setChapterIndex(
            requestedIndex ??
              storedIndex
          );

          await patchUserBook(
            result.work.slug,
            {
              last_opened_at:
                new Date().toISOString(),
            }
          );
        } else {
          const raw =
            localStorage.getItem(
              `seboro-progress:${result.work.slug}`
            );

          const stored =
            raw === null
              ? 0
              : Number(raw);

          const storedIndex =
            Number.isFinite(
              stored
            ) &&
            stored >= 0
              ? Math.min(
                  stored,
                  Math.max(
                    0,
                    result.chapters
                      .length - 1
                  )
                )
              : 0;

          setFinished(
            localStorage.getItem(
              `seboro-finished:${result.work.slug}`
            ) === "true"
          );

          setChapterIndex(
            requestedIndex ??
              storedIndex
          );

          updateLocalHistory(
            result.work.slug
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo abrir la obra."
          );
        }
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params.slug, search]);

  useEffect(() => {
    if (
      !bundle ||
      !loaded ||
      bundle.chapters.length ===
        0
    ) {
      return;
    }

    const currentBundle = bundle;

    async function saveProgress(
      activeBundle: PublicWorkBundle
    ) {
      if (loggedIn) {
        await patchUserBook(
          activeBundle.work.slug,
          {
            progress:
              chapterIndex,
            last_opened_at:
              new Date().toISOString(),
          }
        );
      } else {
        localStorage.setItem(
          `seboro-progress:${activeBundle.work.slug}`,
          String(
            chapterIndex
          )
        );

        updateLocalHistory(
          activeBundle.work.slug
        );
      }
    }

    saveProgress(currentBundle);
  }, [
    bundle,
    chapterIndex,
    loaded,
    loggedIn,
  ]);

  useEffect(() => {
    function handleKey(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
          "ArrowRight" &&
        bundle &&
        chapterIndex <
          bundle.chapters
            .length - 1
      ) {
        setChapterIndex(
          (index) =>
            Math.min(
              bundle.chapters
                .length - 1,
              index + 1
            )
        );
      }

      if (
        event.key ===
          "ArrowLeft" &&
        chapterIndex > 0
      ) {
        setChapterIndex(
          (index) =>
            Math.max(
              0,
              index - 1
            )
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKey
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKey
      );
  }, [
    bundle,
    chapterIndex,
  ]);

  const chapter = useMemo(
    () =>
      bundle?.chapters[
        chapterIndex
      ] || null,
    [
      bundle,
      chapterIndex,
    ]
  );

  async function finishWork() {
    if (!bundle) return;

    const lastIndex =
      Math.max(
        0,
        bundle.chapters
          .length - 1
      );

    if (loggedIn) {
      await patchUserBook(
        bundle.work.slug,
        {
          finished: true,
          progress:
            lastIndex,
          last_opened_at:
            new Date().toISOString(),
        }
      );
    } else {
      localStorage.setItem(
        `seboro-finished:${bundle.work.slug}`,
        "true"
      );

      localStorage.setItem(
        `seboro-progress:${bundle.work.slug}`,
        String(lastIndex)
      );

      updateLocalHistory(
        bundle.work.slug
      );
    }

    setFinished(true);

    window.dispatchEvent(
      new Event(
        "seboro-library-updated"
      )
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#f2eee6] p-10 text-zinc-900">
        Cargando lectura...
      </main>
    );
  }

  if (
    error ||
    !bundle ||
    !chapter
  ) {
    return (
      <main className="min-h-screen bg-[#f2eee6] p-10 text-zinc-900">
        {error ||
          "Obra no encontrada."}
      </main>
    );
  }

  const isLast =
    chapterIndex ===
    bundle.chapters.length -
      1;

  const progressPercent =
    bundle.chapters.length > 0
      ? ((chapterIndex + 1) /
          bundle.chapters
            .length) *
        100
      : 0;

  const theme =
    settings.theme === "dark"
      ? {
          page:
            "bg-[#111113] text-zinc-100",
          header:
            "border-white/10 bg-[#111113]/95",
          muted:
            "text-zinc-500",
          body:
            "text-zinc-200",
          line:
            "border-white/10",
          button:
            "border-white/15",
          primary:
            "bg-white text-black",
        }
      : settings.theme ===
        "sepia"
      ? {
          page:
            "bg-[#eadfca] text-[#30281f]",
          header:
            "border-black/10 bg-[#eadfca]/95",
          muted:
            "text-[#746553]",
          body:
            "text-[#3d3328]",
          line:
            "border-black/10",
          button:
            "border-black/15",
          primary:
            "bg-[#30281f] text-white",
        }
      : {
          page:
            "bg-[#f2eee6] text-zinc-900",
          header:
            "border-black/10 bg-[#f2eee6]/95",
          muted:
            "text-zinc-500",
          body:
            "text-zinc-800",
          line:
            "border-black/10",
          button:
            "border-black/15",
          primary:
            "bg-zinc-900 text-white",
        };

  const widthClass =
    settings.width === "narrow"
      ? "max-w-2xl"
      : settings.width ===
        "wide"
      ? "max-w-5xl"
      : "max-w-3xl";

  return (
    <main
      className={`min-h-screen ${theme.page}`}
    >
      <div
        className={`sticky top-0 z-20 border-b backdrop-blur ${theme.header}`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href={`/publicaciones/${bundle.work.slug}`}
            className="text-sm font-semibold"
          >
            ← Salir
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">
              {
                bundle.work.title
              }
            </p>

            <p
              className={`text-xs ${theme.muted}`}
            >
              {chapterIndex + 1} /{" "}
              {
                bundle.chapters
                  .length
              }
              {loggedIn
                ? " · sincronizado"
                : ""}
              {" · "}v
              {chapter.current_version}
            </p>

            <div className="mx-auto mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-current"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setSettingsOpen(
                  (value) =>
                    !value
                )
              }
              className={`rounded-full border px-3 py-2 text-sm font-semibold ${theme.button}`}
            >
              Aa
            </button>

            <Link
              href="/biblioteca"
              className="hidden text-sm font-semibold sm:block"
            >
              Biblioteca
            </Link>
          </div>
        </div>

        {settingsOpen && (
          <div className="border-t border-current/10">
            <div className="mx-auto grid max-w-5xl gap-4 px-5 py-4 sm:grid-cols-4">
              <div>
                <p
                  className={`text-xs uppercase tracking-[0.15em] ${theme.muted}`}
                >
                  Tamaño
                </p>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          fontSize:
                            Math.max(
                              17,
                              current.fontSize -
                                1
                            ),
                        })
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 ${theme.button}`}
                  >
                    A−
                  </button>

                  <button
                    onClick={() =>
                      setSettings(
                        (current) => ({
                          ...current,
                          fontSize:
                            Math.min(
                              28,
                              current.fontSize +
                                1
                            ),
                        })
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 ${theme.button}`}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div>
                <p
                  className={`text-xs uppercase tracking-[0.15em] ${theme.muted}`}
                >
                  Interlineado
                </p>

                <select
                  value={
                    settings.lineHeight
                  }
                  onChange={(event) =>
                    setSettings(
                      (current) => ({
                        ...current,
                        lineHeight:
                          Number(
                            event.target.value
                          ),
                      })
                    )
                  }
                  className="mt-2 rounded-xl border border-current/15 bg-transparent px-3 py-2"
                >
                  <option value="1.55">
                    Compacto
                  </option>
                  <option value="1.75">
                    Cómodo
                  </option>
                  <option value="1.95">
                    Amplio
                  </option>
                </select>
              </div>

              <div>
                <p
                  className={`text-xs uppercase tracking-[0.15em] ${theme.muted}`}
                >
                  Ancho
                </p>

                <select
                  value={
                    settings.width
                  }
                  onChange={(event) =>
                    setSettings(
                      (current) => ({
                        ...current,
                        width:
                          event.target.value as ReaderSettings["width"],
                      })
                    )
                  }
                  className="mt-2 rounded-xl border border-current/15 bg-transparent px-3 py-2"
                >
                  <option value="narrow">
                    Estrecho
                  </option>
                  <option value="medium">
                    Medio
                  </option>
                  <option value="wide">
                    Amplio
                  </option>
                </select>
              </div>

              <div>
                <p
                  className={`text-xs uppercase tracking-[0.15em] ${theme.muted}`}
                >
                  Tema
                </p>

                <select
                  value={
                    settings.theme
                  }
                  onChange={(event) =>
                    setSettings(
                      (current) => ({
                        ...current,
                        theme:
                          event.target.value as ReaderTheme,
                      })
                    )
                  }
                  className="mt-2 rounded-xl border border-current/15 bg-transparent px-3 py-2"
                >
                  <option value="paper">
                    Papel
                  </option>
                  <option value="sepia">
                    Sepia
                  </option>
                  <option value="dark">
                    Oscuro
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <article
        className={`mx-auto px-6 py-14 md:py-20 ${widthClass}`}
      >
        <p
          className={`text-sm uppercase tracking-[0.2em] ${theme.muted}`}
        >
          Capítulo{" "}
          {
            chapter.chapter_number
          }
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          {chapter.title}
        </h1>

        {chapter.last_correction_at && (
          <p
            className={`mt-3 text-xs ${theme.muted}`}
          >
            Versión {chapter.current_version} ·
            corrección aprobada{" "}
            {new Intl.DateTimeFormat(
              "es-MX",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            ).format(
              new Date(
                chapter.last_correction_at
              )
            )}
          </p>
        )}

        <div
          className={`mt-10 whitespace-pre-wrap font-serif ${theme.body}`}
          style={{
            fontSize:
              settings.fontSize,
            lineHeight:
              settings.lineHeight,
          }}
        >
          {chapter.content}
        </div>

        <p
          className={`mt-8 text-center text-xs ${theme.muted}`}
        >
          Usa ← y → para cambiar de capítulo.
        </p>

        <div
          className={`mt-16 flex items-center justify-between border-t pt-8 ${theme.line}`}
        >
          <button
            onClick={() =>
              setChapterIndex(
                (index) =>
                  Math.max(
                    0,
                    index - 1
                  )
              )
            }
            disabled={
              chapterIndex === 0
            }
            className={`rounded-full border px-5 py-3 font-semibold disabled:opacity-30 ${theme.button}`}
          >
            ← Anterior
          </button>

          {!isLast ? (
            <button
              onClick={() =>
                setChapterIndex(
                  (index) =>
                    Math.min(
                      bundle.chapters
                        .length - 1,
                      index + 1
                    )
                )
              }
              className={`rounded-full px-6 py-3 font-semibold ${theme.primary}`}
            >
              Siguiente →
            </button>
          ) : finished ? (
            <Link
              href={`/publicaciones/${bundle.work.slug}`}
              className={`rounded-full px-6 py-3 font-semibold ${theme.primary}`}
            >
              Volver a la obra
            </Link>
          ) : (
            <button
              onClick={
                finishWork
              }
              className={`rounded-full px-6 py-3 font-semibold ${theme.primary}`}
            >
              Terminar obra
            </button>
          )}
        </div>

        {finished && (
          <div className="mt-6 rounded-2xl bg-emerald-100 p-4 text-sm font-semibold text-emerald-900">
            ✓ Lectura terminada y guardada en tu biblioteca.
          </div>
        )}
      </article>
    </main>
  );
}
