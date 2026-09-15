"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublishedWorks, getWorkCoverBackground } from "@/lib/publishedWorks";
import { getPublicWorkRatings } from "@/lib/workRatings";
import type { RatedPublishedWork } from "@/components/PublishedWorkCard";

type DiscoveryWork = RatedPublishedWork & {
  synopsis?: string | null;
  summary?: string | null;
  excerpt?: string | null;
  short_description?: string | null;
};

type FilterId =
  | "all"
  | "misterio"
  | "fantasia"
  | "finished"
  | "progress"
  | "hidden";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "misterio", label: "Misterio" },
  { id: "fantasia", label: "Fantasía" },
  { id: "finished", label: "Terminadas" },
  { id: "progress", label: "En proceso" },
  { id: "hidden", label: "Joyas ocultas" },
];

function getStatusLabel(work: DiscoveryWork) {
  return work.work_status === "finished" ? "Terminada" : "En proceso";
}

function getDiscoveryText(work: DiscoveryWork) {
  return (
    work.synopsis ||
    work.summary ||
    work.excerpt ||
    work.short_description ||
    "Una historia esperando ser descubierta por nuevos lectores dentro de SEBORO."
  );
}

function matchesFilter(work: DiscoveryWork, filter: FilterId) {
  const genre = String(work.genre || "").toLowerCase();

  switch (filter) {
    case "misterio":
      return genre.includes("misterio");
    case "fantasia":
      return genre.includes("fantas");
    case "finished":
      return work.work_status === "finished";
    case "progress":
      return work.work_status !== "finished";
    case "hidden":
      return (
        (work.rating_count ?? 0) <= 5 ||
        (typeof work.rating_avg === "number" && work.rating_avg >= 4)
      );
    case "all":
    default:
      return true;
  }
}

function Tile({
  work,
  selected,
  onSelect,
}: {
  work: DiscoveryWork;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative aspect-[2/3] overflow-hidden rounded-[22px] border transition duration-300 ${
        selected
          ? "border-[#e07a27] shadow-[0_0_0_2px_rgba(224,122,39,0.18)]"
          : "border-white/50 hover:border-[#e7c2aa]"
      }`}
      style={{
        background: getWorkCoverBackground(work),
      }}
      aria-label={`Seleccionar ${work.title}`}
    >
      <div className="absolute inset-0 bg-black/10 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

export default function DiscoverySpotlight() {
  const [works, setWorks] = useState<DiscoveryWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [published, ratings] = await Promise.all([
          getPublishedWorks(),
          getPublicWorkRatings(),
        ]);

        const ratingMap = new Map(
          ratings.map((item) => [item.book_slug, item])
        );

        const merged: DiscoveryWork[] = published.map((work) => {
          const rating = ratingMap.get(work.slug);

          return {
            ...(work as DiscoveryWork),
            rating_avg: rating?.rating_avg ?? null,
            rating_count: rating?.rating_count ?? 0,
            ranking_score: rating?.ranking_score ?? null,
          };
        });

        if (active) {
          setWorks(merged);
          setSelectedSlug(merged[0]?.slug ?? null);
        }
      } catch {
        if (active) {
          setWorks([]);
          setSelectedSlug(null);
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

  const filteredWorks = useMemo(() => {
    return works.filter((work) => matchesFilter(work, activeFilter));
  }, [works, activeFilter]);

  useEffect(() => {
    if (!filteredWorks.length) {
      setSelectedSlug(null);
      return;
    }

    const exists = filteredWorks.some((work) => work.slug === selectedSlug);
    if (!exists) {
      setSelectedSlug(filteredWorks[0].slug);
    }
  }, [filteredWorks, selectedSlug]);

  useEffect(() => {
    if (filteredWorks.length <= 1) return;

    const timer = window.setInterval(() => {
      setOffset((current) => current + 1);

      setSelectedSlug((currentSlug) => {
        const currentIndex = filteredWorks.findIndex(
          (work) => work.slug === currentSlug
        );

        if (currentIndex < 0) {
          return filteredWorks[0].slug;
        }

        return filteredWorks[(currentIndex + 1) % filteredWorks.length].slug;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [filteredWorks]);

  const selectedWork =
    filteredWorks.find((work) => work.slug === selectedSlug) ??
    filteredWorks[0] ??
    null;

  const mosaicSource = filteredWorks.length ? filteredWorks : works;

  const mosaicItems = useMemo(() => {
    if (!mosaicSource.length) return [];

    return Array.from({ length: 18 }, (_, index) => {
      return mosaicSource[(index + offset) % mosaicSource.length];
    });
  }, [mosaicSource, offset]);

  function chooseRandom() {
    if (!filteredWorks.length) return;
    const random = filteredWorks[Math.floor(Math.random() * filteredWorks.length)];
    setSelectedSlug(random.slug);
  }

  if (!loading && works.length === 0) return null;

  return (
    <section className="mt-10 overflow-hidden rounded-[34px] border-[1.5px] border-[#ebc9b2] bg-[#fcf8f4] shadow-[0_12px_35px_rgba(120,68,22,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#edd8ca] px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-[#1d1815] md:text-3xl">
            Descubre algo diferente
          </h2>
          <span className="rounded-full border border-[#e8c0a6] bg-[#fff7f1] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.24em] text-[#d66d1f]">
            Descubre
          </span>
        </div>

        <Link
          href="/descubre"
          className="shrink-0 text-base font-bold text-[#d86d1e] transition hover:text-[#b85712]"
        >
          Explorar más
        </Link>
      </div>

      <div className="border-b border-[#f0dfd2] bg-[#fdfaf7] px-6 py-4 md:px-8">
        <div className="mb-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#ae7a56]">
            Explora por vibra
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`shrink-0 rounded-full border px-5 py-3 text-base font-semibold transition ${
                  active
                    ? "border-[#e07a27] bg-[#e07a27] text-white shadow-[0_8px_20px_rgba(224,122,39,0.18)]"
                    : "border-[#ead8cb] bg-white text-[#5b5149] hover:border-[#e3bb9e] hover:text-[#1d1815]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={chooseRandom}
            className="shrink-0 rounded-full border border-[#ead8cb] bg-white px-5 py-3 text-base font-semibold text-[#5b5149] transition hover:border-[#e3bb9e] hover:text-[#1d1815]"
          >
            Sorpréndeme
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="relative overflow-hidden rounded-[32px] border-[2px] border-[#eed6c5] bg-[#f7efe8] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <div className="absolute inset-0">
            <div className="grid h-full grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
              {mosaicItems.map((work, index) => {
                const isSelected = selectedWork?.slug === work.slug;

                return (
                  <Tile
                    key={`${work.slug}-${index}`}
                    work={work}
                    selected={isSelected}
                    onSelect={() => setSelectedSlug(work.slug)}
                  />
                );
              })}
            </div>

            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#f7efe8] via-[#f7efe8]/75 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#f7efe8] via-[#f7efe8]/75 to-transparent" />
          </div>

          <div className="relative z-10 p-5 md:p-6">
            {selectedWork ? (
              <div className="max-w-[900px] rounded-[34px] border-[1.5px] border-[#dccfc6] bg-[rgba(255,251,248,0.88)] shadow-[0_25px_60px_rgba(63,35,15,0.10)] backdrop-blur-md">
                <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
                  <div className="border-b border-[#ece1d8] p-6 lg:border-b-0 lg:border-r">
                    <div
                      className="aspect-[2/3] w-full overflow-hidden rounded-[28px] border border-white/40 shadow-[0_16px_35px_rgba(0,0,0,0.12)]"
                      style={{
                        background: getWorkCoverBackground(selectedWork),
                      }}
                    />
                    <h3 className="mt-5 text-3xl font-black leading-tight text-[#1d1815]">
                      {selectedWork.title}
                    </h3>
                  </div>

                  <div className="p-6 md:p-7">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-sm font-extrabold uppercase tracking-[0.22em] text-[#d96d1f]">
                        Descubierta ahora
                      </span>
                      <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#8a8078]">
                        {selectedWork.genre}
                      </span>
                    </div>

                    <p className="mt-4 text-xl font-semibold text-[#5f554d]">
                      {selectedWork.author_name}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <span className="rounded-full border border-[#e3d8d0] bg-white px-4 py-2 text-lg font-semibold text-[#5a4f48]">
                        {getStatusLabel(selectedWork)}
                      </span>

                      <span className="rounded-full border border-[#e3d8d0] bg-white px-4 py-2 text-lg font-semibold text-[#5a4f48]">
                        {selectedWork.price_mxn > 0
                          ? `$${Number(selectedWork.price_mxn).toFixed(0)} MXN`
                          : "Gratis"}
                      </span>
                    </div>

                    <p className="mt-7 max-w-2xl text-[1.15rem] leading-9 text-[#5b514a]">
                      {getDiscoveryText(selectedWork)}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                      <Link
                        href={`/publicaciones/${selectedWork.slug}`}
                        className="rounded-full bg-[#e07a27] px-7 py-4 text-xl font-bold text-white shadow-[0_10px_24px_rgba(224,122,39,0.22)] transition hover:bg-[#c96616]"
                      >
                        Ver historia
                      </Link>

                      <button
                        type="button"
                        onClick={chooseRandom}
                        className="rounded-full border border-[#e3d8d0] bg-white px-7 py-4 text-xl font-bold text-[#4b423c] transition hover:border-[#e0bba1] hover:text-[#1d1815]"
                      >
                        Descubrir otra
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-[#e7d7ca] bg-[rgba(255,251,248,0.86)] p-8 backdrop-blur">
                <p className="text-lg font-semibold text-[#6a5d53]">
                  Cargando historias para descubrir...
                </p>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full border border-[#e4d4c9] bg-[rgba(255,251,248,0.86)] px-5 py-3 text-sm font-bold text-[#887a6e] shadow-sm backdrop-blur">
            Las historias siguen moviéndose
          </div>
        </div>
      </div>
    </section>
  );
}