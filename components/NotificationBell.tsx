"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type SeboroNotification,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/userBooks";

function timeAgo(value: string) {
  const diff =
    Date.now() -
    new Date(value).getTime();

  const minutes = Math.max(
    0,
    Math.floor(diff / 60000)
  );

  if (minutes < 1)
    return "ahora";

  if (minutes < 60)
    return `hace ${minutes} min`;

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24)
    return `hace ${hours} h`;

  const days =
    Math.floor(hours / 24);

  if (days < 7)
    return `hace ${days} d`;

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
    }
  ).format(new Date(value));
}

export default function NotificationBell() {
  const [loggedIn, setLoggedIn] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const [unread, setUnread] =
    useState(0);

  const [items, setItems] =
    useState<SeboroNotification[]>(
      []
    );

  const [loading, setLoading] =
    useState(false);

  async function refresh(
    withItems = false
  ) {
    try {
      const user =
        await getCurrentUser();

      setLoggedIn(Boolean(user));

      if (!user) {
        setUnread(0);
        setItems([]);
        return;
      }

      const count =
        await getUnreadNotificationCount();

      setUnread(count);

      if (withItems) {
        setLoading(true);

        setItems(
          await getMyNotifications(6)
        );
      }
    } catch {
      // La campana nunca debe romper la navegación.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(false);

    const interval =
      window.setInterval(
        () => refresh(false),
        45000
      );

    const handleFocus = () =>
      refresh(false);

    const handleChanged = () =>
      refresh(open);

    window.addEventListener(
      "focus",
      handleFocus
    );

    window.addEventListener(
      "seboro-notifications-updated",
      handleChanged
    );

    window.addEventListener(
      "seboro-auth-changed",
      handleFocus
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      window.removeEventListener(
        "seboro-notifications-updated",
        handleChanged
      );

      window.removeEventListener(
        "seboro-auth-changed",
        handleFocus
      );
    };
  }, [open]);

  if (!loggedIn) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);

    if (next) {
      await refresh(true);
    }
  }

  async function read(
    item: SeboroNotification
  ) {
    if (!item.read_at) {
      try {
        await markNotificationRead(
          item.id
        );
      } catch {
        // El enlace sigue siendo utilizable.
      }
    }

    setOpen(false);
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      await refresh(true);
    } catch {
      // Mantener la campana utilizable.
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition hover:border-white/25 hover:bg-white/[0.04]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
          />
          <path d="M10 21h4" />
        </svg>

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-white px-1.5 py-0.5 text-center text-[10px] font-black leading-4 text-black">
            {unread > 99
              ? "99+"
              : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(390px,calc(100vw-28px))] overflow-hidden rounded-2xl border border-white/10 bg-[#111113] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <p className="font-bold">
                Notificaciones
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                {unread} sin leer
              </p>
            </div>

            {unread > 0 && (
              <button
                onClick={readAll}
                className="text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-zinc-500">
                Cargando...
              </p>
            ) : items.length === 0 ? (
              <div className="p-6">
                <p className="font-semibold">
                  Todo al día
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Aquí aparecerán nuevos
                  capítulos, decisiones
                  editoriales y actividad
                  relevante.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() =>
                    read(item)
                  }
                  className={`block border-b border-white/5 p-4 transition hover:bg-white/[0.04] ${
                    item.read_at
                      ? ""
                      : "bg-white/[0.04]"
                  }`}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.read_at
                          ? "bg-zinc-700"
                          : "bg-sky-300"
                      }`}
                    />

                    <div>
                      <p className="text-sm font-bold">
                        {item.title}
                      </p>

                      {item.body && (
                        <p className="mt-1 text-sm leading-5 text-zinc-400">
                          {item.body}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-zinc-600">
                        {timeAgo(
                          item.created_at
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 border-t border-white/10">
            <Link
              href="/notificaciones"
              onClick={() =>
                setOpen(false)
              }
              className="p-3 text-center text-xs font-semibold hover:bg-white/[0.04]"
            >
              Ver todas
            </Link>

            <Link
              href="/siguiendo"
              onClick={() =>
                setOpen(false)
              }
              className="border-l border-white/10 p-3 text-center text-xs font-semibold hover:bg-white/[0.04]"
            >
              Siguiendo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
