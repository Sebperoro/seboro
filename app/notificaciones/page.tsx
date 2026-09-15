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

  if (type.startsWith("author_application")) {
    return "Autoría";
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
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <div className="flex flex-col gap-5 border-b border-[#ddd5cf] pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
              Tu actividad
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Notificaciones
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7d736c] md:text-base">
              Capítulos nuevos, respuestas, decisiones editoriales y actividad de seguimiento.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/siguiendo"
              className="rounded-full border border-[#d8cfc8] bg-white px-4 py-2 text-sm font-black text-[#6f655f] transition hover:border-[#c5ad9c] hover:text-[#9a4b1c]"
            >
              A quién sigo
            </Link>

            <Link
              href="/notificaciones/configuracion"
              className="rounded-full border border-[#d8cfc8] bg-white px-4 py-2 text-sm font-black text-[#6f655f] transition hover:border-[#c5ad9c] hover:text-[#9a4b1c]"
            >
              Configurar avisos
            </Link>
          </div>
        </div>

        {loggedIn === false ? (
          <div className="mt-8 rounded-[22px] border border-[#ddd5cf] bg-white p-7">
            <h2 className="text-xl font-black">
              Inicia sesión
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#81766f]">
              Necesitas una cuenta para recibir notificaciones.
            </p>

            <Link
              href="/cuenta"
              className="mt-5 inline-flex rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#bd5718]"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilter("all")
                  }
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    filter === "all"
                      ? "bg-[#2f2925] text-white"
                      : "border border-[#ddd5cf] bg-white text-[#6f655f] hover:border-[#c5b7ad]"
                  }`}
                >
                  Todas · {items.length}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFilter("unread")
                  }
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    filter === "unread"
                      ? "bg-[#2f2925] text-white"
                      : "border border-[#ddd5cf] bg-white text-[#6f655f] hover:border-[#c5b7ad]"
                  }`}
                >
                  Sin leer · {unreadCount}
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={readAll}
                  className="text-sm font-black text-[#8a5a3a] transition hover:text-[#b95016]"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {error && (
              <div className="mt-5 rounded-[20px] border border-[#e5c3c3] bg-white p-4 text-[#b24949]">
                {error}
              </div>
            )}

            {loading ? (
              <div className="mt-6 rounded-[20px] border border-[#ddd5cf] bg-white p-6 text-[#8f8580]">
                Cargando...
              </div>
            ) : visible.length === 0 ? (
              <div className="mt-6 rounded-[22px] border border-[#ddd5cf] bg-white p-7">
                <h2 className="text-xl font-black">
                  {filter === "unread"
                    ? "Todo leído"
                    : "Todavía no hay avisos"}
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#81766f]">
                  Sigue autores u obras. Cuando ocurra algo relevante aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[22px] border border-[#ddd5cf] bg-white">
                {visible.map(
                  (item, index) => {
                    const category =
                      categoryLabel(
                        item.notification_type
                      );

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() =>
                          read(item)
                        }
                        className={`group block px-5 py-4 transition hover:bg-[#faf8f6] ${
                          index !== 0
                            ? "border-t border-[#eee8e2]"
                            : ""
                        } ${
                          item.read_at
                            ? ""
                            : "bg-[#fffaf6]"
                        }`}
                      >
                        <div className="flex gap-4">
                          <span
                            className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                              item.read_at
                                ? "bg-[#c8c0ba]"
                                : "bg-[#d96822]"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-[#2b2521]">
                                {item.title}
                              </p>

                              <span className="rounded-full border border-[#ddd5cf] bg-[#faf9f7] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#7d736c]">
                                {category}
                              </span>
                            </div>

                            {item.body && (
                              <p className="mt-2 leading-6 text-[#756b65]">
                                {item.body}
                              </p>
                            )}

                            <p className="mt-3 text-xs font-semibold text-[#9a9089]">
                              {formatDate(
                                item.created_at
                              )}
                            </p>
                          </div>

                          <span className="self-center text-lg font-black text-[#a19892] transition group-hover:translate-x-1 group-hover:text-[#b95016]">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
