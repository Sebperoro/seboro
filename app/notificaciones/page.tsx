"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type SeboroNotification,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/userBooks";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function categoryLabel(
  type: SeboroNotification["notification_type"]
) {
  if (type.startsWith("beta_feedback")) {
    return "Beta";
  }

  if (
    type.startsWith("moderation") ||
    type === "content_hidden" ||
    type === "content_restored" ||
    type.startsWith("community_restrict")
  ) {
    return "Moderación";
  }

  if (
    type === "new_chapter" ||
    type === "new_work"
  ) {
    return "Seguimiento";
  }

  if (
    type.startsWith(
      "work_review"
    ) ||
    type.startsWith(
      "correction"
    )
  ) {
    return "Editorial";
  }

  if (
    type === "author_question" ||
    type === "author_reply" ||
    type === "community_reply"
  ) {
    return "Comunidad";
  }

  return "Seguidores";
}

export default function NotificationsPage() {
  const [items, setItems] =
    useState<SeboroNotification[]>(
      []
    );

  const [loggedIn, setLoggedIn] =
    useState<boolean | null>(null);

  const [filter, setFilter] =
    useState<"all" | "unread">(
      "all"
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const user =
        await getCurrentUser();

      setLoggedIn(Boolean(user));

      if (!user) {
        setItems([]);
        return;
      }

      setItems(
        await getMyNotifications(
          100
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las notificaciones."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () =>
      filter === "unread"
        ? items.filter(
            (item) =>
              !item.read_at
          )
        : items,
    [items, filter]
  );

  const unreadCount =
    items.filter(
      (item) => !item.read_at
    ).length;

  async function read(
    item: SeboroNotification
  ) {
    if (item.read_at) return;

    try {
      await markNotificationRead(
        item.id
      );

      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                read_at:
                  new Date().toISOString(),
              }
            : row
        )
      );
    } catch {
      // El enlace sigue funcionando.
    }
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();

      const now =
        new Date().toISOString();

      setItems((current) =>
        current.map((item) => ({
          ...item,
          read_at:
            item.read_at || now,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron marcar."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Tu actividad
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Notificaciones
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              Capítulos nuevos, decisiones
              editoriales, respuestas y
              actividad de seguimiento.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/siguiendo"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
            >
              Siguiendo
            </Link>

            <Link
              href="/notificaciones/configuracion"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
            >
              Configurar avisos
            </Link>
          </div>
        </div>

        {loggedIn === false ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-xl font-bold">
              Inicia sesión
            </h2>

            <p className="mt-2 text-zinc-400">
              Necesitas una cuenta para
              recibir notificaciones.
            </p>

            <Link
              href="/cuenta"
              className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilter("all")
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    filter === "all"
                      ? "bg-white text-black"
                      : "border border-white/10"
                  }`}
                >
                  Todas · {items.length}
                </button>

                <button
                  onClick={() =>
                    setFilter("unread")
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    filter === "unread"
                      ? "bg-white text-black"
                      : "border border-white/10"
                  }`}
                >
                  Sin leer ·{" "}
                  {unreadCount}
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={readAll}
                  className="text-sm font-semibold text-zinc-400 hover:text-white"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-rose-200">
                {error}
              </div>
            )}

            {loading ? (
              <p className="mt-8 text-zinc-500">
                Cargando...
              </p>
            ) : visible.length ===
              0 ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <h2 className="text-xl font-bold">
                  {filter ===
                  "unread"
                    ? "Todo leído"
                    : "Todavía no hay avisos"}
                </h2>

                <p className="mt-2 max-w-xl leading-6 text-zinc-500">
                  Sigue autores u obras.
                  Cuando ocurra algo
                  relevante aparecerá aquí
                  sin mezclarlo con
                  publicidad ni ranking.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {visible.map(
                  (item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() =>
                        read(item)
                      }
                      className={`block rounded-2xl border p-5 transition hover:border-white/25 ${
                        item.read_at
                          ? "border-white/10 bg-white/[0.02]"
                          : "border-sky-300/15 bg-sky-300/[0.05]"
                      }`}
                    >
                      <div className="flex gap-4">
                        <span
                          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                            item.read_at
                              ? "bg-zinc-700"
                              : "bg-sky-300"
                          }`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">
                              {
                                item.title
                              }
                            </p>

                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                              {categoryLabel(
                                item.notification_type
                              )}
                            </span>
                          </div>

                          {item.body && (
                            <p className="mt-2 leading-6 text-zinc-400">
                              {
                                item.body
                              }
                            </p>
                          )}

                          <p className="mt-3 text-xs text-zinc-600">
                            {formatDate(
                              item.created_at
                            )}
                          </p>
                        </div>

                        <span className="text-zinc-600">
                          →
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
