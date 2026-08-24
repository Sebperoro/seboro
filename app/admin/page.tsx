"use client";

import Link from "next/link";
import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";

export default function AdminPage() {
  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            SEBORO · ADMINISTRACIÓN
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Panel de administración
          </h1>

          <p className="mt-3 max-w-2xl text-lg leading-7 text-zinc-400">
            Revisa publicaciones, gestiona autores y controla la seguridad de la comunidad.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Link
              href="/admin/revision"
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-white/25 hover:bg-white/[0.05]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Editorial
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Revisión de obras
              </h2>

              <p className="mt-3 leading-7 text-zinc-400">
                Aprueba o solicita cambios a las obras que superaron la revisión técnica.
              </p>
            </Link>

            <Link
              href="/admin/autores"
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-white/25 hover:bg-white/[0.05]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Usuarios
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Solicitudes de autor
              </h2>

              <p className="mt-3 leading-7 text-zinc-400">
                Decide qué lectores pueden activar las herramientas de publicación.
              </p>
            </Link>

            <Link
              href="/admin/moderacion"
              className="rounded-3xl border border-rose-300/15 bg-rose-300/[0.04] p-7 transition hover:border-rose-300/30 hover:bg-rose-300/[0.07]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-rose-200/60">
                Seguridad
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Moderación de comunidad
              </h2>

              <p className="mt-3 leading-7 text-zinc-400">
                Revisa reportes, aplica advertencias, gestiona restricciones y consulta la auditoría.
              </p>
            </Link>

            <Link
              href="/admin/correcciones"
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-white/25 hover:bg-white/[0.05]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Versionado
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Correcciones versionadas
              </h2>

              <p className="mt-3 leading-7 text-zinc-400">
                Compara propuestas de corrección y aprueba nuevas versiones sin perder historial.
              </p>
            </Link>

            <Link
              href="/admin/beta"
              className="rounded-3xl border border-sky-300/15 bg-sky-300/[0.04] p-7 transition hover:border-sky-300/30 hover:bg-sky-300/[0.07]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200/60">
                Lanzamiento
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Preparación de beta
              </h2>

              <p className="mt-3 leading-7 text-zinc-400">
                Auditoría automática, checklist de lanzamiento y feedback de testers.
              </p>
            </Link>
          </div>
        </div>
      </main>
    </RoleGate>
  );
}
