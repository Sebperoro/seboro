"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/userBooks";

const ROWS: Array<{
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}> = [
  {
    key: "new_chapters",
    title: "Capítulos nuevos",
    description:
      "Avisos de autores y obras que sigues cuando publiquen un capítulo nuevo.",
  },
  {
    key: "new_works",
    title: "Obras nuevas",
    description:
      "Cuando un autor que sigues publique una obra nueva.",
  },
  {
    key: "editorial",
    title: "Decisiones editoriales",
    description:
      "Aprobaciones, cambios solicitados y decisiones sobre correcciones versionadas.",
  },
  {
    key: "community",
    title: "Comunidad",
    description:
      "Preguntas para el autor y respuestas relevantes a tus publicaciones.",
  },
  {
    key: "followers",
    title: "Seguidores",
    description:
      "Cuando alguien empiece a seguir tu perfil de autor o una de tus obras.",
  },
];

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(
      null
    );

  const [loggedIn, setLoggedIn] =
    useState<boolean | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

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

        if (user) {
          setPreferences(
            await getNotificationPreferences()
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la configuración."
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!preferences) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await saveNotificationPreferences(
        preferences
      );

      setMessage(
        "Preferencias guardadas."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <Link
          href="/notificaciones"
          className="text-sm font-semibold text-zinc-500 hover:text-white"
        >
          ← Notificaciones
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-500">
          Control
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Configurar avisos
        </h1>

        <p className="mt-3 leading-7 text-zinc-400">
          Seguir una obra o autor no cambia
          su posición en SEBORO. Solo
          controla qué actividad quieres
          recibir.
        </p>

        <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100/80">
          Los avisos de moderación, seguridad
          o restricciones de cuenta son
          obligatorios y no pueden
          desactivarse desde estas
          preferencias.
        </div>

        {loggedIn === false ? (
          <div className="mt-8 rounded-3xl border border-white/10 p-7">
            <p className="font-bold">
              Inicia sesión para cambiar tus
              preferencias.
            </p>
          </div>
        ) : !preferences ? (
          <p className="mt-8 text-zinc-500">
            Cargando...
          </p>
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
            {ROWS.map(
              (row, index) => (
                <label
                  key={row.key}
                  className={`flex cursor-pointer items-start justify-between gap-5 p-5 ${
                    index > 0
                      ? "border-t border-white/10"
                      : ""
                  }`}
                >
                  <div>
                    <p className="font-bold">
                      {row.title}
                    </p>

                    <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
                      {
                        row.description
                      }
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      preferences[
                        row.key
                      ]
                    }
                    onChange={(event) =>
                      setPreferences(
                        (current) =>
                          current
                            ? {
                                ...current,
                                [row.key]:
                                  event
                                    .target
                                    .checked,
                              }
                            : current
                      )
                    }
                    className="mt-1 h-5 w-5 accent-white"
                  />
                </label>
              )
            )}
          </div>
        )}

        {error && (
          <p className="mt-5 text-sm text-rose-300">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-5 text-sm text-emerald-200">
            ✓ {message}
          </p>
        )}

        {preferences && (
          <button
            onClick={save}
            disabled={saving}
            className="mt-6 rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : "Guardar preferencias"}
          </button>
        )}
      </div>
    </main>
  );
}
