"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  if (minutes < 1) {
    return "ahora";
  }

  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `hace ${hours} h`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `hace ${days} d`;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
    }
  ).format(new Date(value));
}

export default function NotificationBell() {
  const pathname = usePathname();

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

  const onNotificationsPage =
    pathname.startsWith(
      "/notificaciones"
    );

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

      setUnread(
        await getUnreadNotificationCount()
      );

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const active =
    open || onNotificationsPage;

  const hasUnread = unread > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        aria-expanded={open}
        className={[
          "relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200",
          active
            ? "border-[#d96822] bg-[#fff0e5] text-[#b95016] shadow-[0_0_0_3px_rgba(217,104,34,0.10),0_8px_22px_rgba(217,104,34,0.14)]"
            : hasUnread
            ? "border-[#e5b08b] bg-[#fff8f2] text-[#b95016] shadow-[0_0_0_3px_rgba(217,104,34,0.06),0_6px_16px_rgba(217,104,34,0.10)] hover:border-[#d96822] hover:bg-[#fff0e5] hover:shadow-[0_0_0_4px_rgba(217,104,34,0.09),0_10px_24px_rgba(217,104,34,0.14)]"
            : "border-[#ddd4ca] bg-[#fffdfb] text-[#3f3a35] hover:border-[#d96822] hover:bg-[#fff5ed] hover:text-[#b95016] hover:shadow-[0_0_0_4px_rgba(217,104,34,0.07),0_8px_20px_rgba(217,104,34,0.10)]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute inset-0 rounded-full transition-opacity",
            hasUnread && !active
              ? "opacity-100"
              : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        >
          <span className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,184,130,0.22),transparent_55%)]" />
        </span>

        <svg
          viewBox="0 0 24 24"
          className="relative z-10 h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
          />
          <path d="M10 21h4" />
        </svg>

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 z-20 min-w-5 rounded-full border-2 border-white bg-[#d96822] px-1.5 py-0.5 text-center text-[10px] font-black leading-4 text-white shadow-[0_4px_10px_rgba(217,104,34,0.30)]">
            {unread > 99
              ? "99+"
              : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[68px] z-[70] flex max-h-[calc(100dvh-80px)] flex-col overflow-hidden rounded-[22px] border border-[#ddd4ca] bg-white shadow-[0_20px_60px_rgba(55,40,25,0.18)] md:absolute md:inset-x-auto md:right-0 md:top-12 md:z-50 md:w-[390px] md:max-h-[min(620px,calc(100vh-96px))]">
          <div className="shrink-0 flex items-center justify-between border-b border-[#eee8e0] bg-[#fffaf6] p-4">
            <div>
              <p className="font-black text-[#211f1c]">
                Notificaciones
              </p>

              <p className="mt-0.5 text-xs font-semibold text-[#8a8179]">
                {unread} pendiente{unread === 1 ? "" : "s"}
              </p>
            </div>

            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="rounded-full border border-[#e2d5ca] bg-white px-3 py-1.5 text-xs font-black text-[#8a5a3a] transition hover:border-[#d96822] hover:text-[#b95016]"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="p-5 text-sm text-[#8f8580]">
                Cargando...
              </p>
            ) : items.length === 0 ? (
              <div className="p-6">
                <p className="font-black text-[#2b2521]">
                  Todo al día
                </p>

                <p className="mt-2 text-sm leading-6 text-[#8a8079]">
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
                  className={[
                    "block border-b border-[#f0ebe6] p-4 transition",
                    item.read_at
                      ? "bg-white hover:bg-[#faf8f6]"
                      : "bg-[#fff8f2] hover:bg-[#fff2e7]",
                  ].join(" ")}
                >
                  <div className="flex gap-3">
                    <span
                      className={[
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        item.read_at
                          ? "bg-[#c8c0ba]"
                          : "bg-[#d96822] shadow-[0_0_0_4px_rgba(217,104,34,0.08)]",
                      ].join(" ")}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-black text-[#2b2521]">
                        {item.title}
                      </p>

                      {item.body && (
                        <p className="mt-1 break-words text-sm leading-5 text-[#776d67]">
                          {item.body}
                        </p>
                      )}

                      <p className="mt-2 text-xs font-semibold text-[#a09790]">
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

          <div className="shrink-0 grid grid-cols-2 border-t border-[#eee8e0] bg-[#fffdfb]">
            <Link
              href="/notificaciones"
              onClick={() =>
                setOpen(false)
              }
              className={[
                "p-3 text-center text-xs font-black transition",
                onNotificationsPage
                  ? "bg-[#fff0e5] text-[#b95016]"
                  : "text-[#6f655f] hover:bg-[#faf7f3] hover:text-[#b95016]",
              ].join(" ")}
            >
              Ver todas
            </Link>

            <Link
              href="/siguiendo"
              onClick={() =>
                setOpen(false)
              }
              className="border-l border-[#eee8e0] p-3 text-center text-xs font-black text-[#6f655f] transition hover:bg-[#faf7f3] hover:text-[#b95016]"
            >
              A quién sigo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
