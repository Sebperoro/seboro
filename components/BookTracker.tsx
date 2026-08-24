"use client";

import { useEffect } from "react";
import { getCurrentUser, patchUserBook } from "@/lib/userBooks";

const HISTORY_KEY = "seboro-history";

function localHistory(slug: string) {
  try {
    const current: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const next = [slug, ...current.filter((item) => item !== slug)].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([slug]));
  }
}

export default function BookTracker({ slug }: { slug: string }) {
  useEffect(() => {
    async function track() {
      const user = await getCurrentUser();

      if (user) {
        await patchUserBook(slug, { last_opened_at: new Date().toISOString() });
      } else {
        localHistory(slug);
        window.dispatchEvent(new Event("seboro-library-updated"));
      }
    }

    track();
  }, [slug]);

  return null;
}
