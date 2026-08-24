"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublishedWorkCard, {
  type RatedPublishedWork,
} from "@/components/PublishedWorkCard";
import { getPublishedWorks } from "@/lib/publishedWorks";
import { getPublicWorkRatings } from "@/lib/workRatings";

export default function TopRatedPublishedRow() {
  const [works, setWorks] = useState<RatedPublishedWork[]>([]);
  const [loading, setLoading] = useState(true);

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

        const ranked = published
          .map((work) => {
            const rating = ratingMap.get(work.slug);

            return {
              ...work,
              rating_avg: rating?.rating_avg ?? null,
              rating_count: rating?.rating_count ?? 0,
              ranking_score: rating?.ranking_score ?? null,
            };
          })
          .filter(
            (work) =>
              typeof work.rating_avg === "number" &&
              (work.rating_count || 0) > 0
          )
          .sort(
            (a, b) =>
              (b.ranking_score ?? -1) -
              (a.ranking_score ?? -1)
          );

        if (active) setWorks(ranked);
      } catch {
        if (active) setWorks([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  if (!loading && works.length === 0) return null;

  return (
    <section className="mt-11">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white">
              Mejor valoradas por lectores
            </h2>

            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
              Datos reales
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            El orden considera promedio y cantidad de valoraciones para evitar
            que una muestra mínima domine el ranking.
          </p>
        </div>

        <Link
          href="/descubre"
          className="shrink-0 text-sm text-zinc-400 hover:text-white"
        >
          Ver catálogo
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-5 overflow-hidden pb-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="w-[190px] shrink-0">
              <div className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4">
          {works.map((work) => (
            <PublishedWorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </section>
  );
}
