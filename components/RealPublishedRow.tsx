"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PublishedWorkCard, {
  type RatedPublishedWork,
} from "@/components/PublishedWorkCard";

import { getPublishedWorks } from "@/lib/publishedWorks";
import { getPublicWorkRatings } from "@/lib/workRatings";

export default function RealPublishedRow() {
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

        const merged = published.map((work) => {
          const rating = ratingMap.get(work.slug);

          return {
            ...work,
            rating_avg: rating?.rating_avg ?? null,
            rating_count: rating?.rating_count ?? 0,
            ranking_score: rating?.ranking_score ?? null,
          };
        });

        if (active) {
          setWorks(merged);
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

  if (!loading && works.length === 0) {
    return null;
  }

  return (
    <section className="mt-7 overflow-hidden rounded-[22px] border border-[#ebcdb8] bg-white px-4 pt-3 pb-0 md:px-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#211f1c] md:text-xl">
            Nuevas historias
          </h2>

          <span className="rounded-full border border-[#efc7aa] bg-[#fff0e5] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#b84f14]">
            Nuevas
          </span>
        </div>

        <Link
          href="/descubre"
          className="shrink-0 text-sm font-semibold text-[#c45b1b] transition hover:text-[#9f4512]"
        >
          Ver más
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="w-[165px] shrink-0"
            >
              <div className="aspect-[2/3] animate-pulse rounded-2xl border border-[#e4ddd6] bg-[#f1ece7]" />

              <div className="mt-2 h-4 animate-pulse rounded bg-[#e9e3dd]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto">
          {works.map((work) => (
            <div
              key={work.id}
              className="origin-top-left -mr-4 -mb-9 scale-[0.9]"
            >
              <PublishedWorkCard work={work} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}