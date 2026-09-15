"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getPublishedWorks } from "@/lib/publishedWorks";

export default function RandomDiscoveryButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [routes, setRoutes] = useState<string[]>([]);

  const previewMode =
    searchParams.get("preview") === "1";

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const works = await getPublishedWorks({
          includeTest: previewMode,
        });

        if (active) {
          setRoutes(
            works.map(
              (work) =>
                `/publicaciones/${work.slug}`
            )
          );
        }
      } catch {
        if (active) {
          setRoutes([]);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [previewMode]);

  function discover() {
    if (routes.length === 0) {
      return;
    }

    const index = Math.floor(
      Math.random() * routes.length
    );

    router.push(routes[index]);
  }

  return (
    <button
      type="button"
      onClick={discover}
      disabled={routes.length === 0}
      className="
        rounded-full
        border border-[#c9a97f]
        bg-transparent
        px-5 py-3
        text-[15px]
        font-semibold
        text-[#5c4d3b]
        transition
        hover:border-[#b98f69]
        hover:bg-white/60
        hover:text-[#46392a]
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      Sorpréndeme
    </button>
  );
}