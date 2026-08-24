"use client";

import Link from "next/link";
import { getWorkCoverBackground, type PublishedWork } from "@/lib/publishedWorks";

export type RatedPublishedWork = PublishedWork & {
  author_name: string;
  rating_avg?: number | null;
  rating_count?: number;
  ranking_score?: number | null;
};

export default function PublishedWorkCard({
  work,
}: {
  work: RatedPublishedWork;
}) {
  const status =
    work.work_status === "finished"
      ? "Terminada"
      : "En proceso";

  const hasRating =
    typeof work.rating_avg === "number" &&
    (work.rating_count || 0) > 0;

  return (
    <article className="block w-[190px] shrink-0">
      <Link
        href={`/publicaciones/${work.slug}`}
        className="group block"
      >
        <div
          className="aspect-[2/3] rounded-2xl border border-white/10 transition group-hover:-translate-y-1 group-hover:border-white/25"
          style={{
            background: getWorkCoverBackground(work),
          }}
        />

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs uppercase tracking-[0.15em] text-zinc-500">
              {work.genre}
            </span>

            {hasRating ? (
              <span className="shrink-0 text-xs font-semibold text-amber-300">
                ★ {work.rating_avg?.toFixed(1)}
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                Nueva
              </span>
            )}
          </div>

          <h3 className="mt-2 line-clamp-2 text-lg font-bold text-white">
            {work.title}
          </h3>
        </div>
      </Link>

      <Link
        href={`/autores/${work.author_id}`}
        className="mt-1 block truncate text-sm text-zinc-500 transition hover:text-white"
      >
        {work.author_name}
      </Link>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span>
          {work.price_mxn > 0
            ? `$${Number(work.price_mxn).toFixed(0)} MXN`
            : "Gratis"}
        </span>

        <span>{status}</span>
      </div>

      {hasRating && (
        <p className="mt-1 text-[11px] text-zinc-600">
          {work.rating_count}{" "}
          {work.rating_count === 1
            ? "valoración"
            : "valoraciones"}
        </p>
      )}
    </article>
  );
}
