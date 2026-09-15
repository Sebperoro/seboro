"use client";

import Link from "next/link";
import {
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";

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
          className="aspect-[2/3] rounded-2xl border border-[#ddd4ca] shadow-[0_8px_24px_rgba(55,40,25,0.08)] transition duration-200 group-hover:-translate-y-1 group-hover:border-[#cdbdaf] group-hover:shadow-[0_14px_32px_rgba(55,40,25,0.13)]"
          style={{
            background: getWorkCoverBackground(work),
          }}
        />

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-[#746d66]">
              {work.genre}
            </span>

            {hasRating ? (
              <span className="shrink-0 text-xs font-bold text-[#c98918]">
                ★ {work.rating_avg?.toFixed(1)}
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-[#b9dfcf] bg-[#edf9f3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#34805f]">
                Nueva
              </span>
            )}
          </div>

          <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug tracking-[-0.02em] text-[#211f1c] transition group-hover:text-[#c45b1b]">
            {work.title}
          </h3>
        </div>
      </Link>

      <Link
        href={`/autores/${work.author_id}`}
        className="mt-1 block truncate text-sm font-medium text-[#6d665f] transition hover:text-[#c45b1b]"
      >
        {work.author_name}
      </Link>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#777069]">
        <span className="font-medium">
          {work.price_mxn > 0
            ? `$${Number(work.price_mxn).toFixed(0)} MXN`
            : "Gratis"}
        </span>

        <span
          className={
            work.work_status === "finished"
              ? "font-semibold text-[#5f776a]"
              : "font-semibold text-[#a4602f]"
          }
        >
          {status}
        </span>
      </div>

      {hasRating && (
        <p className="mt-1 text-[11px] text-[#918980]">
          {work.rating_count}{" "}
          {work.rating_count === 1
            ? "valoración"
            : "valoraciones"}
        </p>
      )}
    </article>
  );
}