"use client";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAccessProfile,
  type AccessProfile,
} from "@/lib/access";

export default function TopNav() {
  const pathname = usePathname();

  const [profile, setProfile] =
    useState<AccessProfile | null>(null);

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getAccessProfile();

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
    setMenuOpen(false);
  }, [pathname]);

  const isReader =
    profile?.role === "reader";

  const isAuthor =
    profile?.role === "author" ||
    profile?.role === "admin";

  const isAdmin =
    profile?.role === "admin";

  function linkClass(
    active: boolean
  ) {
    return active
      ? "text-white"
      : "text-zinc-400 transition hover:text-white";
  }

  function mobileLinkClass(
    active: boolean
  ) {
    return `rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
      active
        ? "border-white/20 bg-white/[0.07] text-white"
        : "border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
    }`;
  }

  return (
    <header className="relative z-50 border-b border-white/10 bg-[#0a0a0b] text-white">
      <div className="mx-auto flex min-h-[84px] max-w-7xl items-center gap-4 px-4 sm:px-5 md:px-8 lg:gap-7">
        <Link
          href="/"
          className="shrink-0 text-xl font-black tracking-[0.24em] sm:text-2xl sm:tracking-[0.28em]"
        >
          SEBORO
        </Link>

        <nav className="hidden flex-1 items-center gap-6 text-sm font-semibold lg:flex">
          <Link
            href="/"
            className={linkClass(
              pathname === "/"
            )}
          >
            Inicio
          </Link>

          <Link
            href="/descubre"
            className={linkClass(
              pathname.startsWith(
                "/descubre"
              )
            )}
          >
            Descubre
          </Link>

          <Link
            href="/autores"
            className={linkClass(
              pathname.startsWith(
                "/autores"
              )
            )}
          >
            Autores
          </Link>

          <Link
            href="/comunidad"
            className={linkClass(
              pathname.startsWith(
                "/comunidad"
              )
            )}
          >
            Comunidad
          </Link>

          <Link
            href="/biblioteca"
            className={linkClass(
              pathname.startsWith(
                "/biblioteca"
              )
            )}
          >
            Biblioteca
          </Link>

          {isReader && (
            <Link
              href="/solicitar-autor"
              className={linkClass(
                pathname.startsWith(
                  "/solicitar-autor"
                )
              )}
            >
              Publicar
            </Link>
          )}

          {isAuthor && (
            <Link
              href="/autor"
              className={linkClass(
                pathname.startsWith(
                  "/autor"
                )
              )}
            >
              Autor
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className={linkClass(
                pathname.startsWith(
                  "/admin"
                )
              )}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <NotificationBell />

          {profile && (
            <Link
              href={`/beta/feedback?from=${encodeURIComponent(pathname)}`}
              className="hidden rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:text-white xl:block"
            >
              Feedback
            </Link>
          )}

          <Link
            href="/descubre"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-semibold xl:block"
          >
            Buscar
          </Link>

          <Link
            href="/perfil"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-semibold md:block"
          >
            Perfil
          </Link>

          <Link
            href="/cuenta"
            className="hidden max-w-[150px] truncate rounded-full bg-white px-4 py-2 text-sm font-bold text-black sm:block lg:max-w-[180px]"
          >
            {profile?.display_name ||
              "Cuenta"}
          </Link>

          <button
            type="button"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            aria-label={
              menuOpen
                ? "Cerrar menú"
                : "Abrir menú"
            }
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 lg:hidden"
          >
            <span className="text-xl leading-none">
              {menuOpen ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#0a0a0b] px-4 pb-5 pt-4 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-2 sm:grid-cols-2">
            <Link
              href="/"
              className={mobileLinkClass(
                pathname === "/"
              )}
            >
              Inicio
            </Link>

            <Link
              href="/descubre"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/descubre"
                )
              )}
            >
              Descubre / Buscar
            </Link>

            <Link
              href="/autores"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/autores"
                )
              )}
            >
              Autores
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
              href="/perfil"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/perfil"
                )
              )}
            >
              Perfil
            </Link>

            <Link
              href="/cuenta"
              className={mobileLinkClass(
                pathname.startsWith(
                  "/cuenta"
                )
              )}
            >
              {profile?.display_name
                ? `Cuenta · ${profile.display_name}`
                : "Cuenta"}
            </Link>

            {profile && (
              <Link
                href={`/beta/feedback?from=${encodeURIComponent(pathname)}`}
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
                Publicar
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
                Autor
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
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
