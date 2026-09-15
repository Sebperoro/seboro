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
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-3xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <Link
          href="/notificaciones"
          className="inline-flex items-center gap-2 text-sm font-black text-[#7d736c] transition hover:text-[#b95016]"
        >
          ← Notificaciones
        </Link>

        <div className="mt-7 border-b border-[#ddd5cf] pb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b817a]">
            Control
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            Configurar avisos
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7c726b] md:text-base">
            Elige qué actividad quieres recibir. Seguir una obra o un autor no cambia su posición en SEBORO.
          </p>
        </div>

        <div className="mt-5 rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a682d]">
            Avisos obligatorios
          </p>

          <p className="mt-2 text-sm leading-6 text-[#806f52]">
            Moderación, seguridad y restricciones de cuenta no pueden desactivarse desde estas preferencias.
          </p>
        </div>

        {loggedIn === false ? (
          <div className="mt-7 rounded-[22px] border border-[#ddd5cf] bg-white p-7">
            <p className="font-black">
              Inicia sesión para cambiar tus preferencias.
            </p>

            <Link
              href="/cuenta"
              className="mt-5 inline-flex rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#bd5718]"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : !preferences ? (
          <div className="mt-7 rounded-[20px] border border-[#ddd5cf] bg-white p-6 text-[#8f8580]">
            Cargando...
          </div>
        ) : (
          <div className="mt-7 overflow-hidden rounded-[22px] border border-[#ddd5cf] bg-white">
            {ROWS.map(
              (row, index) => (
                <label
                  key={row.key}
                  className={`flex cursor-pointer items-start justify-between gap-5 px-5 py-5 transition hover:bg-[#faf8f6] ${
                    index > 0
                      ? "border-t border-[#eee8e2]"
                      : ""
                  }`}
                >
                  <div className="pr-4">
                    <p className="font-black text-[#2b2521]">
                      {row.title}
                    </p>

                    <p className="mt-1 max-w-xl text-sm leading-6 text-[#81766f]">
                      {row.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      preferences[
                        row.key
                      ]
                    }
                    aria-label={row.title}
                    onClick={() =>
                      setPreferences(
                        (current) =>
                          current
                            ? {
                                ...current,
                                [row.key]:
                                  !current[
                                    row.key
                                  ],
                              }
                            : current
                      )
                    }
                    className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-all duration-200 ${
                      preferences[
                        row.key
                      ]
                        ? "border-[#d96822] bg-[#d96822] shadow-[0_4px_12px_rgba(217,104,34,0.18)]"
                        : "border-[#d8d0ca] bg-[#eee9e4]"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(47,41,37,0.18)] transition-all duration-200 ${
                        preferences[
                          row.key
                        ]
                          ? "left-[23px]"
                          : "left-[3px]"
                      }`}
                    />
                  </button>
                </label>
              )
            )}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-[18px] border border-[#e5c3c3] bg-white p-4 text-sm text-[#b24949]">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-[18px] border border-[#cbdcc9] bg-[#f6faf5] p-4 text-sm font-semibold text-[#4f7951]">
            ✓ {message}
          </div>
        )}

        {preferences && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-[#2f2925] px-6 py-3 font-black text-white transition hover:bg-[#1f1b18] disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : "Guardar preferencias"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
