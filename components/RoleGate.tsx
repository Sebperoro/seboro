"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getAccessProfile,
  type AccessProfile,
  type UserRole,
} from "@/lib/access";

export default function RoleGate({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const [profile, setProfile] =
    useState<AccessProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function check() {
      setLoading(true);
      setError("");

      try {
        const result =
          await getAccessProfile();

        if (active) {
          setProfile(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo comprobar tu acceso."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    check();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f1ea] text-[#25231f]">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-5 py-16">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d8d2c8] border-t-[#2f2d29]" />

            <p className="mt-4 text-sm font-semibold text-[#8b837b]">
              Comprobando permisos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4f1ea] text-[#25231f]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-[28px] border border-[#e5c3c3] bg-[#fff8f8] p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a84f58]">
              SEBORO
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">
              No pudimos comprobar los permisos
            </h1>

            <p className="mt-3 leading-7 text-[#8c5d62]">
              {error}
            </p>

            <button
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-full bg-[#2f2d29] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1e1b]"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f4f1ea] text-[#25231f]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-[28px] border border-[#d8d2c8] bg-white p-8 shadow-[0_10px_30px_rgba(56,48,40,0.05)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b837b]">
              SEBORO
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">
              Inicia sesión
            </h1>

            <p className="mt-3 text-[#746d65]">
              Esta sección necesita una cuenta de SEBORO.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-[#2f2d29] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1e1b]"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!allow.includes(profile.role)) {
    const authorArea =
      allow.includes("author");

    return (
      <main className="min-h-screen bg-[#f4f1ea] text-[#25231f]">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-[28px] border border-[#ead5aa] bg-[#fffaf0] p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a7533]">
              Acceso restringido
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#4a3c25]">
              Esta sección no corresponde a tu cuenta
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#7f6b45]">
              {authorArea
                ? "Necesitas una cuenta de autor para entrar al Centro del creador."
                : "Solo una cuenta administradora puede entrar a esta sección."}
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-[#2f2d29] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1e1b]"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}