"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isFavorite,
  toggleFavorite,
} from "@/lib/readerProfiles";
import { getCurrentUser } from "@/lib/userBooks";

export default function FavoriteButton({
  slug,
}: {
  slug: string;
}) {
  const [loggedIn, setLoggedIn] =
    useState(false);
  const [favorite, setFavorite] =
    useState(false);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = await getCurrentUser();

        if (!active) return;

        setLoggedIn(Boolean(user));

        if (user) {
          setFavorite(
            await isFavorite(slug)
          );
        }
      } catch {
        if (active) setFavorite(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  if (!loggedIn) {
    return (
      <Link
        href="/cuenta"
        className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white"
      >
        ♡ Favorita
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    setError("");

    try {
      setFavorite(
        await toggleFavorite(slug)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 ${
          favorite
            ? "bg-rose-100 text-rose-950"
            : "border border-white/15 text-white"
        }`}
      >
        {busy
          ? "Guardando..."
          : favorite
          ? "♥ Favorita"
          : "♡ Favorita"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
