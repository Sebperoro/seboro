"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";

import TopNav from "@/components/TopNav";

import CommunityBoard, {
  type CommunityWork,
} from "@/components/CommunityBoard";

import {
  getPublishedWorkBySlug,
  getWorkCoverBackground,
} from "@/lib/publishedWorks";

export default function CommunityBookPage() {
  const params =
    useParams<{
      slug: string;
    }>();

  const [work, setWork] =
    useState<CommunityWork | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const published =
          await getPublishedWorkBySlug(
            params.slug
          );

        if (!active) {
          return;
        }

        if (!published) {
          setWork(null);
          return;
        }

        setWork({
          slug:
            published.work.slug,

          title:
            published.work.title,

          author:
            published.author_name,

          cover:
            getWorkCoverBackground(
              published.work
            ),

          backHref: `/publicaciones/${published.work.slug}`,

          authorUserId:
            published.work
              .author_id,

          real: true,
        });
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la comunidad."
          );
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
  }, [params.slug]);

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#211f1c]">
      <TopNav />

      {loading ? (
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="overflow-hidden rounded-[28px] border border-[#ead8ca] bg-white p-7 shadow-[0_10px_30px_rgba(91,60,37,0.04)]">
            <div className="flex items-center gap-4">
              <div className="h-20 w-14 animate-pulse rounded-[10px] bg-[#eee6df]" />

              <div className="flex-1">
                <div className="h-3 w-28 animate-pulse rounded-full bg-[#eee6df]" />

                <div className="mt-3 h-7 max-w-sm animate-pulse rounded-full bg-[#eee6df]" />

                <div className="mt-3 h-3 w-44 animate-pulse rounded-full bg-[#eee6df]" />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="h-24 animate-pulse rounded-[20px] bg-[#f5f0ec]" />
              <div className="h-24 animate-pulse rounded-[20px] bg-[#f5f0ec]" />
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-[#91867d]">
            Cargando comunidad...
          </p>
        </div>
      ) : error ? (
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="rounded-[28px] border border-[#efc7bd] bg-[#fff8f6] p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#bd604d]">
              No pudimos abrir esta comunidad
            </p>

            <h1 className="mt-2 text-2xl font-black text-[#342925]">
              Ocurrió un problema
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#796760]">
              {error}
            </p>
          </div>
        </div>
      ) : !work ? (
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="rounded-[28px] border border-[#ead8ca] bg-white p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b96a37]">
              Comunidad
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#29221d]">
              Esta comunidad no existe.
            </h1>

            <p className="mt-3 text-[#81766e]">
              Es posible que la obra ya no esté publicada o que el enlace haya cambiado.
            </p>
          </div>
        </div>
      ) : (
        <CommunityBoard
          work={work}
        />
      )}
    </main>
  );
}