"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  acknowledgeCommunityWarning,
  getMyCommunityModerationStatus,
  type MyCommunityModerationStatus,
} from "@/lib/communityModeration";
import { getCurrentUser } from "@/lib/userBooks";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function severityLabel(severity: string) {
  if (severity === "final") return "Restricción";
  if (severity === "warning") return "Advertencia";
  return "Aviso";
}

export default function MyModerationPage() {
  const [data, setData] = useState<MyCommunityModerationStatus | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const user = await getCurrentUser();
      setLoggedIn(Boolean(user));

      if (user) {
        setData(await getMyCommunityModerationStatus());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar tu estado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function acknowledge(warningId: string) {
    try {
      await acknowledgeCommunityWarning(warningId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar el aviso.");
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link
          href="/notificaciones"
          className="text-sm font-semibold text-zinc-500 hover:text-white"
        >
          ← Notificaciones
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-500">
          Comunidad
        </p>
        <h1 className="mt-2 text-4xl font-black">Moderación y seguridad</h1>
        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          Aquí puedes consultar avisos y restricciones aplicados a tu participación.
          Los reportes enviados por otras personas no se muestran públicamente.
        </p>

        {loggedIn === false ? (
          <div className="mt-8 rounded-3xl border border-white/10 p-8">
            <p className="font-bold">Inicia sesión para consultar esta información.</p>
          </div>
        ) : loading ? (
          <p className="mt-8 text-zinc-500">Cargando...</p>
        ) : error ? (
          <p className="mt-8 text-rose-300">{error}</p>
        ) : data ? (
          <>
            {data.restriction ? (
              <section className="mt-8 rounded-3xl border border-rose-300/20 bg-rose-300/[0.06] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-200/70">
                  Restricción activa
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Participación temporalmente limitada
                </h2>
                <p className="mt-3 leading-7 text-zinc-300">
                  No puedes publicar ni responder hasta{" "}
                  <b>{formatDate(data.restriction.restricted_until)}</b>.
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {data.restriction.reason}
                </p>
              </section>
            ) : (
              <section className="mt-8 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-6">
                <p className="font-bold text-emerald-100">Sin restricciones activas</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Puedes participar normalmente en la comunidad.
                </p>
              </section>
            )}

            <section className="mt-10">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Historial personal
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Avisos de moderación · {data.warnings.length}
              </h2>

              {data.warnings.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-zinc-500">
                  No tienes avisos de moderación.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {data.warnings.map((warning) => (
                    <article
                      key={warning.id}
                      className={`rounded-2xl border p-5 ${
                        warning.acknowledged_at
                          ? "border-white/10 bg-white/[0.02]"
                          : "border-amber-300/20 bg-amber-300/[0.05]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                            {severityLabel(warning.severity)}
                          </span>
                          <p className="mt-3 leading-7 text-zinc-300">{warning.reason}</p>
                          <p className="mt-3 text-xs text-zinc-600">
                            {formatDate(warning.created_at)}
                          </p>
                        </div>

                        {!warning.acknowledged_at && (
                          <button
                            onClick={() => acknowledge(warning.id)}
                            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold"
                          >
                            Entendido
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
