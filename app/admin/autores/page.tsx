"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  getPendingAuthorApplications,
  reviewAuthorApplication,
} from "@/lib/authorApplications";

type PendingApplication = Awaited<
  ReturnType<typeof getPendingAuthorApplications>
>[number];

export default function AdminAutoresPage() {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setApplications(await getPendingAuthorApplications());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar las solicitudes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(
    application: PendingApplication,
    decision: "approved" | "rejected"
  ) {
    setBusyId(application.id);
    setError("");

    try {
      await reviewAuthorApplication(
        application.id,
        decision,
        notes[application.id] || ""
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la decisión."
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Administración · usuarios
        </p>
        <h1 className="mt-2 text-4xl font-black">Solicitudes de autor</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Aprobar una solicitud cambia automáticamente la cuenta de reader a
          author.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Cargando...</p>
        ) : applications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
            No hay solicitudes pendientes.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {applications.map((application) => (
              <article
                key={application.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Solicitud pendiente
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {application.pen_name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      cuenta: {application.display_name}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Motivación
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {application.motivation}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Experiencia
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {application.experience || "No indicó experiencia previa."}
                    </p>
                  </div>
                </div>

                <textarea
                  value={notes[application.id] || ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [application.id]: event.target.value,
                    }))
                  }
                  placeholder="Nota para el usuario (recomendada si rechazas la solicitud)..."
                  className="mt-5 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
                />

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => decide(application, "approved")}
                    disabled={busyId === application.id}
                    className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
                  >
                    Aprobar como autor
                  </button>

                  <button
                    onClick={() => decide(application, "rejected")}
                    disabled={busyId === application.id}
                    className="rounded-full border border-amber-300/25 px-6 py-3 font-semibold text-amber-100 disabled:opacity-40"
                  >
                    Rechazar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
