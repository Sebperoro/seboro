"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getPublishedWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";

type DiscoveryWork = PublishedWork & {
  author_name: string;
};

const ITEMS_PER_ROW = 12;

const AUTO_SELECTION_MS = 10000;
const MANUAL_SELECTION_MS = 15000;

export default function HomeDiscoveryShowcase() {
  const [works, setWorks] =
    useState<DiscoveryWork[]>([]);

  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState(0);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("all");

  /*
   * Fila pausada porque el usuario
   * seleccionó una portada.
   */
  const [
    pausedRowIndex,
    setPausedRowIndex,
  ] = useState<number | null>(
    null
  );

  /*
   * Fila pausada temporalmente
   * porque el mouse está encima.
   */
  const [
    hoveredRowIndex,
    setHoveredRowIndex,
  ] = useState<number | null>(
    null
  );

  const [
    manualSelection,
    setManualSelection,
  ] = useState(false);

  /*
   * Permite reiniciar completamente
   * el contador de una selección.
   */
  const [
    selectionTimerVersion,
    setSelectionTimerVersion,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const published =
          await getPublishedWorks();

        if (active) {
          setWorks(published);
        }
      } catch {
        if (active) {
          setWorks([]);
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

  const genres = useMemo(() => {
    return Array.from(
      new Set(
        works
          .map((work) =>
            work.genre.trim()
          )
          .filter(Boolean)
      )
    ).slice(0, 4);
  }, [works]);

  const filteredWorks =
    useMemo(() => {
      if (
        activeFilter === "all"
      ) {
        return works;
      }

      if (
        activeFilter ===
        "finished"
      ) {
        return works.filter(
          (work) =>
            work.work_status ===
            "finished"
        );
      }

      if (
        activeFilter ===
        "ongoing"
      ) {
        return works.filter(
          (work) =>
            work.work_status ===
            "ongoing"
        );
      }

      if (
        activeFilter.startsWith(
          "genre:"
        )
      ) {
        const genre =
          activeFilter.replace(
            "genre:",
            ""
          );

        return works.filter(
          (work) =>
            work.genre === genre
        );
      }

      return works;
    }, [works, activeFilter]);

  useEffect(() => {
    setSelectedIndex(0);
    setPausedRowIndex(null);
    setHoveredRowIndex(null);
    setManualSelection(false);

    setSelectionTimerVersion(
      (current) =>
        current + 1
    );
  }, [activeFilter]);

  /*
   * CICLO DE DESCUBRIMIENTO
   *
   * Selección automática:
   * 10 segundos.
   *
   * Selección manual:
   * 15 segundos completos desde
   * el momento del clic.
   */
  useEffect(() => {
    if (
      filteredWorks.length <= 1
    ) {
      return;
    }

    const delay =
      manualSelection
        ? MANUAL_SELECTION_MS
        : AUTO_SELECTION_MS;

    const timer =
      window.setTimeout(() => {
        /*
         * Después de una selección
         * manual, liberamos la fila.
         */
        setPausedRowIndex(null);
        setManualSelection(false);

        setSelectedIndex(
          (current) => {
            let next = current;

            while (
              next === current &&
              filteredWorks.length > 1
            ) {
              next = Math.floor(
                Math.random() *
                  filteredWorks.length
              );
            }

            return next;
          }
        );
      }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    filteredWorks,
    selectedIndex,
    manualSelection,
    selectionTimerVersion,
  ]);

  const selected =
    filteredWorks[
      selectedIndex %
        Math.max(
          1,
          filteredWorks.length
        )
    ];

  const rows = useMemo(() => {
    function createRow(
      offset: number
    ) {
      if (
        filteredWorks.length ===
        0
      ) {
        return [];
      }

      return Array.from(
        {
          length:
            ITEMS_PER_ROW,
        },
        (_, index) =>
          filteredWorks[
            (index + offset) %
              filteredWorks.length
          ]
      );
    }

    return [
      createRow(0),
      createRow(2),
      createRow(1),
    ];
  }, [filteredWorks]);

  /*
   * Selección manual:
   *
   * - cambia la obra;
   * - congela esa fila;
   * - reinicia el contador;
   * - mantiene la obra 15 segundos.
   */
  function selectWork(
    work: DiscoveryWork,
    rowIndex: number
  ) {
    const index =
      filteredWorks.findIndex(
        (item) =>
          item.id === work.id
      );

    if (index < 0) {
      return;
    }

    setSelectedIndex(index);

    setPausedRowIndex(
      rowIndex
    );

    setManualSelection(true);

    setSelectionTimerVersion(
      (current) =>
        current + 1
    );
  }

  function nextWork() {
    if (
      filteredWorks.length <= 1
    ) {
      return;
    }

    setPausedRowIndex(null);
    setManualSelection(false);

    setSelectedIndex(
      (current) =>
        (current + 1) %
        filteredWorks.length
    );

    setSelectionTimerVersion(
      (current) =>
        current + 1
    );
  }

  function randomWork() {
    if (
      filteredWorks.length === 0
    ) {
      return;
    }

    setPausedRowIndex(null);
    setManualSelection(false);

    if (
      filteredWorks.length === 1
    ) {
      setSelectedIndex(0);

      setSelectionTimerVersion(
        (current) =>
          current + 1
      );

      return;
    }

    setSelectedIndex(
      (current) => {
        let next = current;

        while (
          next === current
        ) {
          next = Math.floor(
            Math.random() *
              filteredWorks.length
          );
        }

        return next;
      }
    );

    setSelectionTimerVersion(
      (current) =>
        current + 1
    );
  }

  function changeFilter(
    filter: string
  ) {
    setPausedRowIndex(null);
    setHoveredRowIndex(null);
    setManualSelection(false);
    setActiveFilter(filter);
  }

  function renderGroup(
    row: DiscoveryWork[],
    rowIndex: number,
    group: number
  ) {
    return (
      <div
        className="flex shrink-0 gap-2 pr-2"
        aria-hidden={
          group === 1
            ? true
            : undefined
        }
      >
        {row.map(
          (work, index) => {
            const isSelected =
              selected?.id ===
              work.id;

            return (
              <button
                key={`${group}-${work.id}-${index}`}
                type="button"
                onClick={() =>
                  selectWork(
                    work,
                    rowIndex
                  )
                }
                aria-label={`Descubrir ${work.title}`}
                className={`group relative h-[112px] w-[74px] shrink-0 overflow-hidden rounded-[10px] border transition duration-300 sm:h-[126px] sm:w-[84px] lg:h-[132px] lg:w-[88px] ${
                  isSelected
                    ? "border-[#d96822] shadow-[0_8px_22px_rgba(183,89,31,0.28)]"
                    : "border-black/5 opacity-[0.84] hover:scale-[1.04] hover:opacity-100"
                }`}
              >
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      getWorkCoverBackground(
                        work
                      ),
                  }}
                />

                <span
                  className={`absolute inset-0 transition ${
                    isSelected
                      ? "bg-[#d96822]/10"
                      : "bg-black/0 group-hover:bg-white/5"
                  }`}
                />
              </button>
            );
          }
        )}
      </div>
    );
  }

  function filterClass(
    active: boolean
  ) {
    return active
      ? "bg-[#d96822] text-white shadow-[0_10px_22px_rgba(217,104,34,0.30)] -translate-y-[1px]"
      : "border border-[#e3d9d0] bg-white text-[#655e57] hover:border-[#d7bca7] hover:bg-[#fff8f2]";
  }

  if (
    !loading &&
    works.length === 0
  ) {
    return null;
  }

  return (
    <section className="mt-7 overflow-hidden rounded-[24px] border-2 border-[#ebc9b2] bg-white shadow-[0_14px_34px_rgba(141,90,49,0.06)]">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0dfd2] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#211f1c] md:text-xl">
            Descubre algo diferente
          </h2>

          <span className="rounded-full border border-[#efc7aa] bg-[#fff0e5] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b84f14]">
            Descubre
          </span>
        </div>

        <Link
          href="/descubre"
          className="text-sm font-semibold text-[#c45b1b] transition hover:text-[#963d0d]"
        >
          Explorar más
        </Link>
      </div>

      {/* FILTROS */}
      <div className="border-b border-[#f1e2d7] bg-[#fffaf7] px-4 py-4 md:px-5">
        <div className="mx-auto max-w-5xl rounded-[22px] border border-[#ecd7c7] bg-white/90 px-4 py-4 shadow-[0_10px_24px_rgba(149,101,58,0.06)]">
          <p className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.20em] text-[#b37345]">
            Explora por vibra
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                changeFilter(
                  "all"
                )
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${filterClass(
                activeFilter ===
                  "all"
              )}`}
            >
              Todos
            </button>

            {genres.map(
              (genre) => {
                const key =
                  `genre:${genre}`;

                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() =>
                      changeFilter(
                        key
                      )
                    }
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${filterClass(
                      activeFilter ===
                        key
                    )}`}
                  >
                    {genre}
                  </button>
                );
              }
            )}

            <button
              type="button"
              onClick={() =>
                changeFilter(
                  "finished"
                )
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${filterClass(
                activeFilter ===
                  "finished"
              )}`}
            >
              Terminadas
            </button>

            <button
              type="button"
              onClick={() =>
                changeFilter(
                  "ongoing"
                )
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${filterClass(
                activeFilter ===
                  "ongoing"
              )}`}
            >
              En proceso
            </button>

            <button
              type="button"
              onClick={
                randomWork
              }
              className="rounded-full border border-[#f0c5a8] bg-[#fff3ea] px-4 py-2 text-sm font-bold text-[#b95718] transition hover:-translate-y-[1px] hover:border-[#e7ab83] hover:bg-[#ffe8d7]"
            >
              ✦ Sorpréndeme
            </button>
          </div>
        </div>
      </div>

      {/* MOSAICO */}
      <div className="px-3 py-3 md:px-4 md:py-4">
        <div className="relative h-[460px] overflow-hidden rounded-[28px] border-2 border-[#e8c7ad] bg-[#f5f2ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] md:h-[470px]">
          {loading ? (
            <div className="absolute inset-0 grid grid-cols-6 gap-2 p-4 opacity-60">
              {Array.from({
                length: 18,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-xl bg-[#e7e1db]"
                  />
                )
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col justify-center gap-2 overflow-hidden py-3">
              {rows.map(
                (
                  row,
                  rowIndex
                ) => {
                  const animation =
                    rowIndex === 1
                      ? "seboroDiscoveryRight 48s linear infinite"
                      : rowIndex === 0
                      ? "seboroDiscoveryLeft 42s linear infinite"
                      : "seboroDiscoveryLeft 54s linear infinite";

                  /*
                   * La fila se pausa si:
                   *
                   * 1. fue seleccionada
                   *    manualmente;
                   *
                   * O
                   *
                   * 2. el mouse está
                   *    actualmente encima.
                   */
                  const paused =
                    pausedRowIndex ===
                      rowIndex ||
                    hoveredRowIndex ===
                      rowIndex;

                  return (
                    <div
                      key={
                        rowIndex
                      }
                      className="overflow-hidden"
                      onMouseEnter={() =>
                        setHoveredRowIndex(
                          rowIndex
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredRowIndex(
                          null
                        )
                      }
                    >
                      <div
                        className="seboro-discovery-track flex w-max"
                        style={{
                          animation,
                          animationPlayState:
                            paused
                              ? "paused"
                              : "running",
                        }}
                      >
                        {renderGroup(
                          row,
                          rowIndex,
                          0
                        )}

                        {renderGroup(
                          row,
                          rowIndex,
                          1
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* DESVANECIMIENTOS */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#f5f2ef] via-[#f5f2ef]/60 to-transparent"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#f5f2ef] via-[#f5f2ef]/60 to-transparent"
            aria-hidden="true"
          />

          {/* OBRA DESTACADA */}
          {selected && (
            <div className="absolute left-4 top-1/2 z-20 w-[calc(100%-2rem)] -translate-y-1/2 md:left-7 md:w-[700px] lg:w-[58%] xl:w-[60%] xl:max-w-[790px]">
              <article
                key={
                  selected.id
                }
                className="seboro-discovery-pop overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_75px_rgba(50,32,20,0.25)] backdrop-blur-xl"
              >
                <div className="p-5 md:p-6">
                  {/* TÍTULO ARRIBA */}
                  <div className="mb-4 border-b border-white/55 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c45b1b]">
                        Descubierta
                        ahora
                      </span>

                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#817970]">
                        {
                          selected.genre
                        }
                      </span>
                    </div>

                    <h3 className="mt-2 text-2xl font-black leading-[1.05] tracking-[-0.04em] text-[#211f1c] md:text-[30px]">
                      {
                        selected.title
                      }
                    </h3>
                  </div>

                  {/* PORTADA + INFORMACIÓN */}
                  <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-5 md:grid-cols-[215px_minmax(0,1fr)]">
                    {/* PORTADA */}
                    <div>
                      <Link
                        href={`/publicaciones/${selected.slug}`}
                        className="group block"
                      >
                        <div
                          className="aspect-[2/3] w-full rounded-[18px] border border-white/80 shadow-[0_14px_32px_rgba(40,25,15,0.22)] transition duration-300 group-hover:-translate-y-1"
                          style={{
                            background:
                              getWorkCoverBackground(
                                selected
                              ),
                          }}
                        />
                      </Link>
                    </div>

                    {/* DETALLES */}
                    <div className="flex min-w-0 flex-col">
                      <p className="text-base font-bold text-[#554d46] md:text-lg">
                        {
                          selected.author_name
                        }
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[12px] font-semibold text-[#625a53]">
                          {selected.work_status ===
                          "finished"
                            ? "Terminada"
                            : "En proceso"}
                        </span>

                        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[12px] font-semibold text-[#625a53]">
                          {selected.price_mxn >
                          0
                            ? `$${Number(
                                selected.price_mxn
                              ).toFixed(
                                0
                              )} MXN`
                            : "Gratis"}
                        </span>

                        {selected.tags
                          .slice(
                            0,
                            2
                          )
                          .map(
                            (
                              tag
                            ) => (
                              <span
                                key={
                                  tag
                                }
                                className="hidden rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[12px] font-semibold text-[#746c65] lg:inline"
                              >
                                {
                                  tag
                                }
                              </span>
                            )
                          )}
                      </div>

                      <p className="mt-4 line-clamp-6 text-sm leading-7 text-[#574f49] md:text-[15px]">
                        {
                          selected.synopsis
                        }
                      </p>

                      <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-5">
                        <Link
                          href={`/publicaciones/${selected.slug}`}
                          className="rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#b95016]"
                        >
                          Ver historia
                        </Link>

                        <button
                          type="button"
                          onClick={
                            nextWork
                          }
                          className="rounded-full border border-white/80 bg-white/85 px-5 py-2.5 text-sm font-semibold text-[#423c37] backdrop-blur transition hover:bg-white"
                        >
                          Descubrir
                          otra
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 right-4 z-20 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-semibold text-[#776e67] shadow-sm backdrop-blur-md">
            {manualSelection &&
            pausedRowIndex !== null
              ? "Una fila está pausada mientras exploras"
              : hoveredRowIndex !==
                null
              ? "Esta fila está pausada mientras la observas"
              : "Las historias siguen moviéndose"}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes seboroDiscoveryLeft {
            from {
              transform: translateX(0);
            }

            to {
              transform: translateX(-50%);
            }
          }

          @keyframes seboroDiscoveryRight {
            from {
              transform: translateX(-50%);
            }

            to {
              transform: translateX(0);
            }
          }

          @keyframes seboroDiscoveryPop {
            from {
              opacity: 0;
              transform: scale(0.97);
            }

            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          .seboro-discovery-pop {
            animation:
              seboroDiscoveryPop
              420ms
              cubic-bezier(
                0.2,
                0.8,
                0.2,
                1
              )
              both;
          }

          @media (
            prefers-reduced-motion:
            reduce
          ) {
            .seboro-discovery-track,
            .seboro-discovery-pop {
              animation:
                none !important;
            }
          }
        `}
      </style>
    </section>
  );
}