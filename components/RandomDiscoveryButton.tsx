"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { books } from "@/data/books";
import { getPublishedWorks } from "@/lib/publishedWorks";

export default function RandomDiscoveryButton() {
  const router = useRouter();
  const [realRoutes, setRealRoutes] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const works = await getPublishedWorks();

        if (active) {
          setRealRoutes(
            works.map(
              (work) => `/publicaciones/${work.slug}`
            )
          );
        }
      } catch {
        if (active) setRealRoutes([]);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const routes = useMemo(
    () => [
      ...books.map((book) => `/obra/${book.slug}`),
      ...realRoutes,
    ],
    [realRoutes]
  );

  function discover() {
    if (routes.length === 0) return;

    const index = Math.floor(Math.random() * routes.length);
    router.push(routes[index]);
  }

  return (
    <button
      onClick={discover}
      className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04]"
    >
      Sorpréndeme
    </button>
  );
}
