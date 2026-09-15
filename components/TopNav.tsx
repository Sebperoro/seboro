"use client";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  getAccessProfile,
  type AccessProfile,
} from "@/lib/access";
import { getPendingAuthorApplicationCount } from "@/lib/adminPending";

export default function TopNav() {
  const pathname = usePathname();

  const [profile, setProfile] =
    useState<AccessProfile | null>(null);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [adminPending, setAdminPending] =
    useState(0);

  const profileMenuRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getAccessProfile();

        if (active) {
          setProfile(result);
        }
      } catch {
        if (active) {
          setProfile(null);
        }
      }
    }

    load();

    const refresh = () => load();

    window.addEventListener(
      "seboro-profile-updated",
      refresh
    );

    window.addEventListener(
      "seboro-auth-changed",
      refresh
    );

    return () => {
      active = false;

      window.removeEventListener(
        "seboro-profile-updated",
        refresh
      );

      window.removeEventListener(
        "seboro-auth-changed",
        refresh
      );
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== "admin") {
      setAdminPending(0);
      return;
    }

    let active = true;

    async function refreshAdminPending() {
      try {
        const count =
          await getPendingAuthorApplicationCount();

        if (active) {
          setAdminPending(count);
        }
      } catch {
        if (active) {
          setAdminPending(0);
        }
      }
    }

    refreshAdminPending();

    const interval =
      window.setInterval(
        refreshAdminPending,
        30000
      );

    const handleFocus =
      () => refreshAdminPending();

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [profile?.role]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const isReader =
    profile?.role === "reader";

  const isAuthor =
    profile?.role === "author" ||
    profile?.role === "admin";

  const isAdmin =
    profile?.role === "admin";

  function desktopLinkClass(
    active: boolean
  ) {
    return [
      "relative py-2 text-sm font-semibold transition-colors",
      active
        ? "text-[#c95717]"
        : "text-[#504a44] hover:text-[#211f1c]",
    ].join(" ");
  }

  function mobileLinkClass(
    active: boolean
  ) {
    return [
      "rounded-2xl px-4 py-3 text-sm font-semibold transition",
      active
        ? "bg-[#fff0e5] text-[#b84f14]"
        : "text-[#4e4944] hover:bg-[#f7f3ed]",
    ].join(" ");
  }

  function profileItemClass(
    active: boolean
  ) {
    return [
      "block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
      active
        ? "bg-[#fff0e5] text-[#b84f14]"
        : "text-[#4e4944] hover:bg-[#f7f3ed] hover:text-[#211f1c]",
    ].join(" ");
  }

  const displayName =
    profile?.display_name || "Perfil";

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || "S";

  return (
    <header className="sticky top-0 z-50 border-b border-[#ded6cd] bg-white shadow-[0_4px_18px_rgba(58,42,28,0.05)]">
      <div className="mx-auto flex min-h-[74px] max-w-7xl items-center gap-5 px-4 sm:px-5 md:px-8">
        <Link
          href="/"
          className="shrink-0 text-xl font-black tracking-[0.24em] text-[#d96822] sm:text-2xl sm:tracking-[0.28em]"
        >
          SEBORO
        </Link>

        <nav className="hidden flex-1 items-center gap-7 lg:flex">
          <Link
            href="/"
            className={desktopLinkClass(
              pathname === "/"
            )}
          >
            Inicio
          </Link>

          <Link
            href="/comunidad"
            className={desktopLinkClass(
              pathname.startsWith(
                "/comunidad"
              )
            )}
          >
            Comunidad
          </Link>

          <Link
            href="/biblioteca"
            className={desktopLinkClass(
              pathname.startsWith(
                "/biblioteca"
              )
            )}
          >
            Biblioteca
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="text-[#3f3a35]">
            <NotificationBell />
          </div>

          <Link
            href="/descubre"
            aria-label="Buscar historias"
            className="hidden h-10 items-center gap-2 rounded-full border border-[#ddd4ca] bg-[#fffdfb] px-4 text-sm font-semibold text-[#3f3a35] transition hover:border-[#cfc1b4] hover:bg-[#faf7f3] hover:text-[#211f1c] sm:flex"
          >
            <span aria-hidden="true">
              ⌕
            </span>

            <span>
              Buscar
            </span>
          </Link>

          <div
            ref={profileMenuRef}
            className="relative hidden md:block"
          >
            <button
              type="button"
              onClick={() =>
                setProfileOpen(
                  (current) => !current
                )
              }
              aria-expanded={profileOpen}
              aria-label="Abrir menú de perfil"
              className="flex h-10 items-center gap-2 rounded-full border border-[#ddd4ca] bg-[#fffdfb] pr-4 pl-1.5 text-sm font-semibold text-[#211f1c] transition hover:border-[#cfc1b4] hover:bg-[#faf7f3]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d96822] text-xs font-black text-white">
                {initial}
              </span>

              <span className="max-w-[110px] truncate">
                {displayName}
              </span>

              <span
                className={`text-xs text-[#817970] transition ${
                  profileOpen
                    ? "rotate-180"
                    : ""
                }`}
              >
                ▾
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-[#ddd4ca] bg-white p-2 shadow-[0_18px_55px_rgba(55,40,25,0.16)]">
                {profile && (
                  <div className="mb-2 border-b border-[#eee8e0] px-3 py-3">
                    <p className="truncate text-sm font-bold text-[#211f1c]">
                      {displayName}
                    </p>

                    <p className="mt-0.5 text-xs capitalize text-[#817970]">
                      {profile.role}
                    </p>
                  </div>
                )}

                <Link
                  href="/perfil"
                  className={profileItemClass(
                    pathname.startsWith(
                      "/perfil"
                    )
                  )}
                >
                  Mi perfil
                </Link>

                <Link
                  href="/cuenta"
                  className={profileItemClass(
                    pathname.startsWith(
                      "/cuenta"
                    )
                  )}
                >
                  Cuenta
                </Link>

                {profile && (
                  <Link
                    href={`/beta/feedback?from=${encodeURIComponent(
                      pathname
                    )}`}
                    className={profileItemClass(
                      pathname.startsWith(
                        "/beta/feedback"
                      )
                    )}
                  >
                    Feedback
                  </Link>
                )}

                {isReader && (
                  <Link
                    href="/solicitar-autor"
                    className={profileItemClass(
                      pathname.startsWith(
                        "/solicitar-autor"
                      )
                    )}
                  >
                    Publicar en SEBORO
                  </Link>
                )}

                {isAuthor && (
                  <Link
                    href="/autor"
                    className={profileItemClass(
                      pathname.startsWith(
                        "/autor"
                      )
                    )}
                  >
                    Panel de autor
                  </Link>
                )}

                {isAdmin && (
                  <>
                    <div className="my-2 border-t border-[#eee8e0]" />

                    <Link
                      href="/admin"
                      className={profileItemClass(
                        pathname.startsWith(
                          "/admin"
                        )
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span>Administración</span>

                        {adminPending > 0 && (
                          <span className="min-w-5 rounded-full bg-[#d96822] px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                            {adminPending > 99
                              ? "99+"
                              : adminPending}
                          </span>
                        )}
                      </span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (current) => !current
              )
            }
            aria-label={
              mobileOpen
                ? "Cerrar menú"
                : "Abrir menú"
            }
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ddd4ca] bg-[#fffdfb] text-[#211f1c] transition hover:bg-[#faf7f3] lg:hidden"
          >
            <span className="text-xl leading-none">
              {mobileOpen ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#e5ddd4] bg-white px-4 pb-5 pt-4 shadow-[0_12px_30px_rgba(55,40,25,0.06)] lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
            <Link
              href="/"
              className={mobileLinkClass(
                pathname === "/"
              )}
            >
              Inicio
            </Link>

            <Link
              href="/comunidad"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/comunidad"
                )
              )}
            >
              Comunidad
            </Link>

            <Link
              href="/biblioteca"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/biblioteca"
                )
              )}
            >
              Biblioteca
            </Link>

            <Link
              href="/descubre"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/descubre"
                )
              )}
            >
              Buscar
            </Link>

            <div className="my-2 border-t border-[#eee8e0] sm:col-span-2" />

            <Link
              href="/perfil"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/perfil"
                )
              )}
            >
              Mi perfil
            </Link>

            <Link
              href="/cuenta"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/cuenta"
                )
              )}
            >
              Cuenta
            </Link>

            {profile && (
              <Link
                href={`/beta/feedback?from=${encodeURIComponent(
                  pathname
                )}`}
                className={mobileLinkClass(
                  pathname.startsWith(
                    "/beta/feedback"
                  )
                )}
              >
                Feedback
              </Link>
            )}

            {isReader && (
              <Link
                href="/solicitar-autor"
                className={mobileLinkClass(
                  pathname.startsWith(
                    "/solicitar-autor"
                  )
                )}
              >
                Publicar en SEBORO
              </Link>
            )}

            {isAuthor && (
              <Link
                href="/autor"
                className={mobileLinkClass(
                  pathname.startsWith(
                    "/autor"
                  )
                )}
              >
                Panel de autor
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className={mobileLinkClass(
                  pathname.startsWith(
                    "/admin"
                  )
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>Administración</span>

                  {adminPending > 0 && (
                    <span className="min-w-5 rounded-full bg-[#d96822] px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                      {adminPending > 99
                        ? "99+"
                        : adminPending}
                    </span>
                  )}
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}