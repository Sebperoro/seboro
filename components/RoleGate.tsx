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
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function check() {
      setLoading(true);
      setError("");

      try {
        const result = await getAccessProfile();
        if (active) setProfile(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo comprobar tu acceso."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    check();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <div className="mx-auto max-w-5xl px-5 py-16 text-zinc-500">
          Comprobando permisos...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6">
            <h1 className="text-2xl font-black text-rose-100">
              No pudimos comprobar los permisos
            </h1>
            <p className="mt-3 text-rose-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
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
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-3xl font-black">Inicia sesión</h1>
            <p className="mt-3 text-zinc-400">
              Esta sección necesita una cuenta de SEBORO.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!allow.includes(profile.role)) {
    const authorArea = allow.includes("author");

    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/60">
              Acceso restringido
            </p>
            <h1 className="mt-2 text-3xl font-black text-amber-100">
              Esta sección no corresponde a tu cuenta
            </h1>
            <p className="mt-3 max-w-2xl text-amber-100/70">
              {authorArea
                ? "Necesitas una cuenta de autor para entrar al Centro del creador."
                : "Solo una cuenta administradora puede entrar a esta sección."}
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
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
