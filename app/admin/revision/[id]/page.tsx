"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  decideHumanReview,
  getModerationBundle,
  getMyRole,
} from "@/lib/moderation";
import {
  getWorkCoverBackground,
  getWorkReadingStats,
  type PublishedWork,
  type WorkChapter,
} from "@/lib/publishedWorks";

export default function AdminReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [work, setWork] = useState<PublishedWork | null>(null);
  const [chapters, setChapters] = useState<WorkChapter[]>([]);
  const [authorName, setAuthorName] = useState("Autor");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentRole = await getMyRole();
        if (!active) return;

        setRole(currentRole);
        if (currentRole !== "admin") return;

        const bundle = await getModerationBundle(params.id);
        if (!active || !bundle) return;

        setWork(bundle.work);
        setChapters(bundle.chapters);
        setAuthorName(bundle.authorName);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la revisión."
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
  }, [params.id]);

  async function decide(decision: "approved" | "changes_requested") {
    if (!work) return;

    setBusy(true);
    setError("");

    try {
      await decideHumanReview(work.id, decision, notes);
      router.push("/admin/revision");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la decisión."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <Link href="/admin/revision" className="text-sm font-semibold text-zinc-400">
          ← Volver a la cola
        </Link>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-zinc-500">Cargando revisión...</p>
        ) : role !== "admin" ? (
          <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            No tienes permisos de administrador.
          </div>
        ) : !work ? (
          <div className="mt-8">Obra no encontrada.</div>
        ) : (
          <>
            <section className="mt-6 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[170px_1fr]">
              <div
                className="aspect-[2/3] rounded-2xl"
                style={{
                  background:
                    getWorkCoverBackground(work),
                }}
              />

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Revisión humana
                </p>
                <h1 className="mt-2 text-4xl font-black">{work.title}</h1>

                {work.subtitle && (
                  <p className="mt-2 text-lg text-zinc-400">
                    {work.subtitle}
                  </p>
                )}

                <p className="mt-2 text-zinc-400">por {authorName}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {work.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400"
                    >
                      #{tag}
                    </span>
                  ))}

                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
                    {work.age_rating}
                  </span>

                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
                    {work.language_code.toUpperCase()}
                  </span>
                </div>

                <p className="mt-6 leading-7 text-zinc-300">{work.synopsis}</p>

                {work.content_warnings.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100/80">
                    <b className="text-amber-100">Advertencias:</b>{" "}
                    {work.content_warnings.join(" · ")}
                  </div>
                )}

                <p className="mt-4 text-sm text-zinc-500">
                  {getWorkReadingStats(chapters).wordCount.toLocaleString("es-MX")} palabras ·
                  ≈ {getWorkReadingStats(chapters).readMinutes} min de lectura
                </p>
              </div>
            </section>

            <section className="mt-8 space-y-4">
              {chapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <p className="text-xs text-zinc-500">
                    Capítulo {chapter.chapter_number}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">{chapter.title}</h2>
                  <div className="mt-4 whitespace-pre-wrap font-serif leading-7 text-zinc-300">
                    {chapter.content}
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-2xl font-bold">Decisión editorial</h2>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notas para el autor (especialmente si solicitas cambios)..."
                className="mt-5 min-h-32 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => decide("approved")}
                  disabled={busy}
                  className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
                >
                  Aprobar obra
                </button>

                <button
                  onClick={() => decide("changes_requested")}
                  disabled={busy}
                  className="rounded-full border border-amber-300/25 px-6 py-3 font-semibold text-amber-100 disabled:opacity-40"
                >
                  Solicitar cambios
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
