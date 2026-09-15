"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  isFollowingAuthor,
  toggleAuthorFollow,
} from "@/lib/authorProfiles";
import { getCurrentUser } from "@/lib/userBooks";

export default function FollowAuthorButton({
  authorId,
  onChanged,
}: {
  authorId: string;
  onChanged?: () => void | Promise<void>;
}) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [ownProfile, setOwnProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = await getCurrentUser();

        if (!active) return;

        const isLoggedIn = Boolean(user);
        const isOwnProfile = user?.id === authorId;

        setLoggedIn(isLoggedIn);
        setOwnProfile(isOwnProfile);

        if (user && !isOwnProfile) {
          const result = await isFollowingAuthor(authorId);

          if (active) {
            setFollowing(result);
          }
        } else if (active) {
          setFollowing(false);
        }
      } catch {
        if (active) {
          setLoggedIn(false);
          setOwnProfile(false);
          setFollowing(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [authorId]);

  if (ownProfile) {
    return (
      <Link
        href="/autor/perfil"
        className="inline-flex items-center justify-center rounded-full border border-[#d8c8bc] bg-white px-5 py-2.5 text-sm font-black text-[#6d625b] shadow-[0_5px_14px_rgba(62,45,34,0.06)] transition hover:border-[#bfa895] hover:bg-[#fff8f2] hover:text-[#9a4b1c]"
      >
        Editar mi perfil
      </Link>
    );
  }

  if (!loggedIn) {
    return (
      <Link
        href="/cuenta"
        className="inline-flex items-center justify-center rounded-full border border-[#d8c8bc] bg-white px-5 py-2.5 text-sm font-black text-[#6d625b] shadow-[0_5px_14px_rgba(62,45,34,0.06)] transition hover:border-[#bfa895] hover:bg-[#fff8f2] hover:text-[#9a4b1c]"
      >
        Inicia sesión para seguir
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const next = await toggleAuthorFollow(authorId);
      setFollowing(next);

      if (onChanged) {
        await onChanged();
      }
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
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        title={
          following
            ? "Ya sigues a este autor. Pulsa para dejar de seguirlo."
            : "Sigue al autor para recibir novedades de sus publicaciones."
        }
        className={`inline-flex min-w-[150px] cursor-pointer items-center justify-center rounded-full border px-5 py-2.5 text-sm font-black shadow-[0_5px_14px_rgba(62,45,34,0.08)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96a24] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          following
            ? "border-[#9fc9ad] bg-[#eef8f1] text-[#397053] hover:border-[#80b892] hover:bg-[#e3f3e8]"
            : "border-[#d96a24] bg-[#d96a24] text-white hover:border-[#be571c] hover:bg-[#be571c]"
        }`}
      >
        {busy
          ? "Guardando..."
          : following
          ? "✓ Siguiendo"
          : "+ Seguir autor"}
      </button>

      {error && (
        <p className="max-w-xs text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
