"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  activateAuthorRole,
  claimAuthorWork,
  ensureMyProfile,
  listMyAuthorWorks,
  unclaimAuthorWork,
  type AuthorWork,
  type SeboroProfile,
} from "@/lib/profiles";

export default function AuthorConfigurationPage() {
  const [profile, setProfile] = useState<SeboroProfile | null>(null);
  const [works, setWorks] = useState<AuthorWork[]>([]);
  const [slug, setSlug] = useState("el-reino-de-ceniza");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const currentProfile = await ensureMyProfile();
      setProfile(currentProfile);
      setWorks(currentProfile ? await listMyAuthorWorks() : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar tu perfil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function becomeAuthor() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await activateAuthorRole();
      setMessage("Modo autor activado.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar el modo autor.");
    } finally {
      setBusy(false);
    }
  }

  async function linkWork() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await claimAuthorWork(slug);
      setMessage("Obra vinculada correctamente a tu cuenta.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular la obra.");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkWork(bookSlug: string) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await unclaimAuthorWork(bookSlug);
      setMessage("Vínculo eliminado.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desvincular.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              SEBORO · configuración de prueba
            </p>
            <h1 className="mt-2 text-3xl font-black">Identidad de autor</h1>
          </div>

          <Link
            href="/autor"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300"
          >
            Volver
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-200">
            ✓ {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-zinc-400">
            Cargando...
          </div>
        ) : !profile ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="font-bold">Debes iniciar sesión.</p>
            <Link href="/cuenta" className="mt-3 inline-block underline">
              Ir a Cuenta
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-zinc-500">Perfil actual</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{profile.display_name}</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-300">
                  {profile.role}
                </span>
              </div>

              {profile.role === "reader" && (
                <button
                  onClick={becomeAuthor}
                  disabled={busy}
                  className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Activar modo autor
                </button>
              )}
            </section>

            {profile.role !== "reader" && (
              <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-sm text-zinc-500">Vincular una obra</p>
                <h2 className="mt-2 text-xl font-bold">Obras de tu cuenta</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Esta pantalla es temporal para probar la arquitectura. En la
                  publicación real, el vínculo se creará automáticamente cuando
                  SEBORO apruebe y publique la obra.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    placeholder="el-reino-de-ceniza"
                    className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none placeholder:text-zinc-600"
                  />
                  <button
                    onClick={linkWork}
                    disabled={busy || !slug.trim()}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                  >
                    Vincular obra
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {works.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Todavía no tienes obras vinculadas.
                    </p>
                  ) : (
                    works.map((work) => (
                      <div
                        key={work.book_slug}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div>
                          <p className="font-semibold">{work.book_slug}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Autor verificado para esta obra en el prototipo.
                          </p>
                        </div>

                        <button
                          onClick={() => unlinkWork(work.book_slug)}
                          disabled={busy}
                          className="text-xs font-semibold text-zinc-500 underline hover:text-white"
                        >
                          Desvincular
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
