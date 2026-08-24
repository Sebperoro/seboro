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

        setLoggedIn(Boolean(user));
        setOwnProfile(user?.id === authorId);

        if (user && user.id !== authorId) {
          setFollowing(
            await isFollowingAuthor(authorId)
          );
        }
      } catch {
        if (active) {
          setFollowing(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [authorId]);

  if (ownProfile) {
    return (
      <Link
        href="/autor/perfil"
        className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
      >
        Editar mi perfil
      </Link>
    );
  }

  if (!loggedIn) {
    return (
      <Link
        href="/cuenta"
        className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
      >
        Inicia sesión para seguir
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    setError("");

    try {
      const next =
        await toggleAuthorFollow(authorId);

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
    <div>
      <button
        onClick={toggle}
        disabled={busy}
        title={
          following
            ? "Recibirás avisos de nuevas obras y capítulos de este autor."
            : "Sigue al autor para recibir avisos de nuevas publicaciones."
        }
        className={`rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${
          following
            ? "border border-white/15 text-white"
            : "bg-white text-black"
        }`}
      >
        {busy
          ? "Guardando..."
          : following
          ? "Siguiendo"
          : "Seguir autor"}
      </button>

      {error && (
        <p className="mt-2 max-w-xs text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
