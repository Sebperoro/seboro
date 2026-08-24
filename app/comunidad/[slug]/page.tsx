"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import CommunityBoard, {
  type CommunityWork,
} from "@/components/CommunityBoard";
import { books } from "@/data/books";
import { getPublishedWorkBySlug, getWorkCoverBackground } from "@/lib/publishedWorks";

export default function CommunityBookPage() {
  const params = useParams<{ slug: string }>();

  const [work, setWork] =
    useState<CommunityWork | null>(null);

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
        const staticBook = books.find(
          (book) => book.slug === params.slug
        );

        if (staticBook) {
          if (!active) return;

          setWork({
            slug: staticBook.slug,
            title: staticBook.title,
            author: staticBook.author,
            cover: staticBook.cover,
            backHref: `/obra/${staticBook.slug}`,
            authorUserId: null,
            real: false,
          });

          return;
        }

        const published =
          await getPublishedWorkBySlug(
            params.slug
          );

        if (!active) return;

        if (!published) {
          setWork(null);
          return;
        }

        setWork({
          slug: published.work.slug,
          title: published.work.title,
          author: published.author_name,
          cover:
            getWorkCoverBackground(
              published.work
            ),
          backHref: `/publicaciones/${published.work.slug}`,
          authorUserId:
            published.work.author_id,
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
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      {loading ? (
        <div className="mx-auto max-w-7xl px-5 py-12 text-zinc-500">
          Cargando comunidad...
        </div>
      ) : error ? (
        <div className="mx-auto max-w-7xl px-5 py-12 text-rose-300">
          {error}
        </div>
      ) : !work ? (
        <div className="mx-auto max-w-7xl px-5 py-12">
          Esta comunidad no existe.
        </div>
      ) : (
        <CommunityBoard work={work} />
      )}
    </main>
  );
}
