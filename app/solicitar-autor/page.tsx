"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  getAccessProfile,
  type AccessProfile,
} from "@/lib/access";
import {
  getMyAuthorApplications,
  submitAuthorApplication,
  type AuthorApplication,
} from "@/lib/authorApplications";

export default function SolicitarAutorPage() {
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [applications, setApplications] = useState<AuthorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [penName, setPenName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const current = await getAccessProfile();
      setProfile(current);

      if (current) {
        setPenName((value) => value || current.display_name);
        setApplications(await getMyAuthorApplications());
      } else {
        setApplications([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar la solicitud."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () => applications.find((item) => item.status === "pending") || null,
    [applications]
  );

  const latest = applications[0] || null;

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await submitAuthorApplication({
        pen_name: penName,
        motivation,
        experience,
      });

      setMessage("Solicitud enviada correctamente.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar la solicitud."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link href="/" className="text-sm font-semibold text-zinc-400">
          ← Volver
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-500">
          SEBORO · autores
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Publica como autor
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Antes de abrir las herramientas de publicación, SEBORO revisará una
          solicitud breve para mantener una comunidad de autores identificados.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">
            ✓ {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-zinc-500">Cargando...</div>
        ) : !profile ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-2xl font-bold">Primero inicia sesión</h2>
            <p className="mt-3 text-zinc-400">
              Necesitas una cuenta de lector para solicitar el modo autor.
            </p>
          </div>
        ) : profile.role === "author" || profile.role === "admin" ? (
          <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-8">
            <h2 className="text-2xl font-bold text-emerald-100">
              Tu cuenta ya puede publicar
            </h2>
            <p className="mt-3 text-emerald-100/70">
              No necesitas enviar una solicitud nueva.
            </p>
            <Link
              href="/autor"
              className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Ir al Centro del creador
            </Link>
          </div>
        ) : pending ? (
          <div className="mt-8 rounded-3xl border border-sky-300/20 bg-sky-300/10 p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-200/60">
              Solicitud enviada
            </p>
            <h2 className="mt-2 text-2xl font-bold text-sky-100">
              Pendiente de revisión
            </h2>
            <p className="mt-3 text-sky-100/70">
              El administrador todavía no ha tomado una decisión.
            </p>
            <div className="mt-5 rounded-2xl border border-sky-100/10 bg-black/10 p-4">
              <p className="text-sm text-sky-100/60">Nombre de autor</p>
              <p className="mt-1 font-semibold text-sky-100">
                {pending.pen_name}
              </p>
            </div>
          </div>
        ) : (
          <>
            {latest?.status === "rejected" && (
              <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6">
                <h2 className="text-xl font-bold text-amber-100">
                  Tu solicitud anterior necesitó cambios
                </h2>
                {latest.admin_notes && (
                  <p className="mt-3 text-sm leading-6 text-amber-100/75">
                    Nota del administrador: {latest.admin_notes}
                  </p>
                )}
                <p className="mt-3 text-sm text-amber-100/60">
                  Puedes enviar una nueva solicitud.
                </p>
              </div>
            )}

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <div className="grid gap-6">
                <div>
                  <label className="text-sm font-semibold">
                    Nombre con el que publicarás
                  </label>
                  <input
                    value={penName}
                    onChange={(event) => setPenName(event.target.value)}
                    placeholder="Nombre o seudónimo"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    ¿Por qué quieres publicar en SEBORO?
                  </label>
                  <textarea
                    value={motivation}
                    onChange={(event) => setMotivation(event.target.value)}
                    placeholder="Cuéntanos qué tipo de historias quieres compartir..."
                    className="mt-2 min-h-40 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
                  />
                  <p className="mt-2 text-xs text-zinc-600">
                    Mínimo 30 caracteres.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Experiencia escribiendo (opcional)
                  </label>
                  <textarea
                    value={experience}
                    onChange={(event) => setExperience(event.target.value)}
                    placeholder="Puedes contar si ya has escrito novelas, relatos, fanfiction, blogs, etc."
                    className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={
                    busy ||
                    penName.trim().length < 2 ||
                    motivation.trim().length < 30
                  }
                  className="w-fit rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
                >
                  {busy ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
