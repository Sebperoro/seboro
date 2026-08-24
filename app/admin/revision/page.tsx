"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  getMyRole,
  getPendingHumanReviews,
} from "@/lib/moderation";
import { getWorkCoverBackground, type PublishedWork } from "@/lib/publishedWorks";

export default function AdminReviewPage() {
  const [role, setRole] = useState<string | null>(null);
  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentRole = await getMyRole();
        if (!active) return;

        setRole(currentRole);

        if (currentRole === "admin") {
          setWorks(await getPendingHumanReviews());
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la moderación."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          SEBORO · administración
        </p>
        <h1 className="mt-2 text-4xl font-black">Revisión humana</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-zinc-400">
            Obras que ya superaron los requisitos técnicos y esperan una decisión
            editorial humana.
          </p>

          <Link
            href="/admin/correcciones"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
          >
            Correcciones versionadas
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Cargando...</p>
        ) : role !== "admin" ? (
          <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            <h2 className="text-xl font-bold">Acceso reservado</h2>
            <p className="mt-2 text-sm text-amber-100/70">
              Esta cuenta no tiene rol de administrador.
            </p>
          </div>
        ) : works.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
            No hay obras pendientes de revisión humana.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {works.map((work) => (
              <Link
                key={work.id}
                href={`/admin/revision/${work.id}`}
                className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/25 md:grid-cols-[90px_1fr_auto] md:items-center"
              >
                <div
                  className="aspect-[2/3] rounded-xl"
                  style={{
                    background:
                      getWorkCoverBackground(
                        work
                      ),
                  }}
                />

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    Pendiente
                  </p>
                  <h2 className="mt-2 text-xl font-bold">{work.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {work.genre} ·{" "}
                    {work.work_status === "ongoing" ? "En proceso" : "Terminada"}
                  </p>
                </div>

                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                  Revisar →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
