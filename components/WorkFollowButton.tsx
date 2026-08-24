"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  isFollowingWork,
  toggleWorkFollow,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/userBooks";

export default function WorkFollowButton({
  workId,
  authorId,
}: {
  workId: string;
  authorId: string;
}) {
  const [loggedIn, setLoggedIn] =
    useState(false);

  const [ownWork, setOwnWork] =
    useState(false);

  const [following, setFollowing] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user =
          await getCurrentUser();

        if (!active) return;

        setLoggedIn(Boolean(user));
        setOwnWork(
          user?.id === authorId
        );

        if (
          user &&
          user.id !== authorId
        ) {
          setFollowing(
            await isFollowingWork(
              workId
            )
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
  }, [workId, authorId]);

  if (ownWork) return null;

  if (!loggedIn) {
    return (
      <Link
        href="/cuenta"
        className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold"
      >
        Seguir obra
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    setError("");

    try {
      setFollowing(
        await toggleWorkFollow(
          workId
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el seguimiento."
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
            ? "Recibirás avisos cuando esta obra publique capítulos nuevos."
            : "Sigue esta obra para recibir avisos de nuevos capítulos."
        }
        className={`rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${
          following
            ? "border border-sky-300/25 bg-sky-300/10 text-sky-100"
            : "border border-white/15 hover:border-white/30 hover:bg-white/[0.04]"
        }`}
      >
        {busy
          ? "Guardando..."
          : following
          ? "✓ Siguiendo obra"
          : "Seguir obra"}
      </button>

      {error && (
        <p className="mt-2 max-w-xs text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
