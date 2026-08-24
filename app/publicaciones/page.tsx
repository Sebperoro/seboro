"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  getPublishedWorks,
  type PublishedWork,
} from "@/lib/publishedWorks";

type CatalogWork = PublishedWork & { author_name: string };

export default function PublicacionesPage() {
  const [works, setWorks] = useState<CatalogWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getPublishedWorks();
        if (active) setWorks(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el catálogo."
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

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Catálogo conectado a Supabase
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Obras publicadas de verdad
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Esta sección ya no usa libros precargados en el código.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-zinc-500">Cargando publicaciones...</div>
        ) : works.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-2xl font-bold">El catálogo real está vacío</h2>
            <p className="mt-2 text-zinc-500">
              Cuando un autor publique su primera obra, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {works.map((work) => (
              <Link
                key={work.id}
                href={`/publicaciones/${work.slug}`}
                className="group"
              >
                <div
                  className="aspect-[2/3] rounded-3xl shadow-2xl ring-1 ring-white/10 transition group-hover:-translate-y-1"
                  style={{ background: work.cover_style }}
                />
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                      {work.genre}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                      {work.work_status === "ongoing" ? "En proceso" : "Terminada"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold">{work.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    por {work.author_name}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    ${work.price_mxn.toFixed(0)} MXN
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
