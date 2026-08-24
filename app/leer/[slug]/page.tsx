"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getBook } from "@/data/books";
import {
  getCurrentUser,
  getUserBook,
  patchUserBook,
} from "@/lib/userBooks";
import {
  getUserFeedback,
  upsertUserFeedback,
} from "@/lib/userFeedback";

const HISTORY_KEY = "seboro-history";
const FINISHED_KEY = "seboro-finished";
const RATING_KEY = "seboro-ratings";
const REACTIONS_KEY = "seboro-reactions";
const REVIEWS_KEY = "seboro-reviews";

const reactionOptions = [
  { id: "love", emoji: "❤️", label: "Me encantó" },
  { id: "moved", emoji: "😢", label: "Me emocionó" },
  { id: "surprised", emoji: "😮", label: "Me sorprendió" },
  { id: "funny", emoji: "😂", label: "Me hizo reír" },
  { id: "annoyed", emoji: "😡", label: "Me molestó" },
];

function readArray(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function readObject<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function pushLocalHistory(slug: string) {
  const current = readArray(HISTORY_KEY);
  const next = [slug, ...current.filter((item) => item !== slug)].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function markLocalFinished(slug: string) {
  const current = readArray(FINISHED_KEY);
  if (!current.includes(slug)) {
    localStorage.setItem(FINISHED_KEY, JSON.stringify([...current, slug]));
  }
}

export default function ReaderPage() {
  const params = useParams<{ slug: string }>();
  const book = useMemo(() => getBook(params.slug), [params.slug]);

  const [chapterIndex, setChapterIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [showFinish, setShowFinish] = useState(false);
  const [rating, setRating] = useState(0);
  const [reactions, setReactions] = useState<string[]>([]);
  const [review, setReview] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  useEffect(() => {
    if (!book) return;

    let active = true;

    async function load() {
      const user = await getCurrentUser();
      if (!active) return;

      setLoggedIn(Boolean(user));

      if (user) {
        const row = await getUserBook(book.slug);
        if (active && typeof row?.progress === "number") {
          setChapterIndex(
            Math.min(Math.max(0, row.progress), book.chapters.length - 1)
          );
        }

        await patchUserBook(book.slug, {
          last_opened_at: new Date().toISOString(),
        });

        try {
          const feedback = await getUserFeedback(book.slug);
          if (active && feedback) {
            setRating(feedback.rating || 0);
            setReactions(feedback.reactions || []);
            setReview(feedback.review || "");
          }
        } catch (error) {
          console.error("SEBORO feedback load failed:", error);
        }
      } else {
        pushLocalHistory(book.slug);
        const saved = localStorage.getItem(`seboro-progress:${book.slug}`);

        if (saved !== null) {
          const parsed = Number(saved);
          if (
            !Number.isNaN(parsed) &&
            parsed >= 0 &&
            parsed < book.chapters.length
          ) {
            setChapterIndex(parsed);
          }
        }

        const ratings = readObject<Record<string, number>>(RATING_KEY, {});
        const reactionsMap = readObject<Record<string, string[]>>(
          REACTIONS_KEY,
          {}
        );
        const reviews = readObject<Record<string, string>>(REVIEWS_KEY, {});

        setRating(ratings[book.slug] || 0);
        setReactions(reactionsMap[book.slug] || []);
        setReview(reviews[book.slug] || "");
      }

      if (active) setLoaded(true);
    }

    load();

    return () => {
      active = false;
    };
  }, [book]);

  useEffect(() => {
    if (!book || !loaded) return;

    if (loggedIn) {
      patchUserBook(book.slug, {
        progress: chapterIndex,
        last_opened_at: new Date().toISOString(),
      });
    } else {
      localStorage.setItem(
        `seboro-progress:${book.slug}`,
        String(chapterIndex)
      );
      pushLocalHistory(book.slug);
      window.dispatchEvent(new Event("seboro-library-updated"));
    }
  }, [book, chapterIndex, loaded, loggedIn]);

  if (!book) {
    return (
      <main className="min-h-screen bg-[#f4efe6] p-10 text-zinc-900">
        Obra no encontrada.
      </main>
    );
  }

  const chapter = book.chapters[chapterIndex];
  const isLast = chapterIndex === book.chapters.length - 1;

  function toggleReaction(id: string) {
    setReactions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function markFinishedForCurrentUser(hasUser: boolean) {
    if (hasUser) {
      await patchUserBook(book.slug, {
        finished: true,
        progress: chapterIndex,
        last_opened_at: new Date().toISOString(),
      });
    } else {
      markLocalFinished(book.slug);
      window.dispatchEvent(new Event("seboro-library-updated"));
    }
  }

  async function saveFeedback() {
    setSavingFeedback(true);
    setSavedFeedback(false);
    setFeedbackError("");

    try {
      const user = await getCurrentUser();
      const hasUser = Boolean(user);

      console.log("SEBORO feedback save start", {
        slug: book.slug,
        hasUser,
        rating,
        reactions,
        review,
      });

      await markFinishedForCurrentUser(hasUser);

      if (hasUser) {
        const ok = await upsertUserFeedback(book.slug, {
          rating: rating > 0 ? rating : null,
          reactions,
          review: review.trim() ? review.trim() : null,
        });

        console.log("SEBORO feedback save result", { ok });

        if (!ok) {
          throw new Error("Supabase no confirmó el guardado.");
        }
      } else {
        const ratings = readObject<Record<string, number>>(RATING_KEY, {});
        const reactionsMap = readObject<Record<string, string[]>>(
          REACTIONS_KEY,
          {}
        );
        const reviews = readObject<Record<string, string>>(REVIEWS_KEY, {});

        if (rating > 0) ratings[book.slug] = rating;
        else delete ratings[book.slug];

        reactionsMap[book.slug] = reactions;

        if (review.trim()) reviews[book.slug] = review.trim();
        else delete reviews[book.slug];

        localStorage.setItem(RATING_KEY, JSON.stringify(ratings));
        localStorage.setItem(REACTIONS_KEY, JSON.stringify(reactionsMap));
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
      }

      setSavedFeedback(true);
    } catch (error) {
      console.error("SEBORO feedback save failed:", error);
      setFeedbackError(
        error instanceof Error ? error.message : "No se pudo guardar la opinión."
      );
    } finally {
      setSavingFeedback(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f2eee6] text-zinc-900">
      <div className="sticky top-0 z-20 border-b border-black/10 bg-[#f2eee6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <Link href={`/obra/${book.slug}`} className="text-sm font-semibold">
            ← Salir
          </Link>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold">{book.title}</p>
            <p className="text-xs text-zinc-500">
              {chapterIndex + 1} / {book.chapters.length}
              {loggedIn ? " · sincronizado" : ""}
            </p>
          </div>

          <Link href="/biblioteca" className="text-sm font-semibold">
            Biblioteca
          </Link>
        </div>
      </div>

      {!showFinish ? (
        <article className="mx-auto max-w-3xl px-6 py-14 md:py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Lectura
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
            {chapter.title}
          </h1>

          <div className="mt-10 space-y-7 font-serif text-[20px] leading-9 text-zinc-800 md:text-[22px]">
            {chapter.content.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-16 flex items-center justify-between border-t border-black/10 pt-8">
            <button
              onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
              disabled={chapterIndex === 0}
              className="rounded-full border border-black/15 px-5 py-3 font-semibold disabled:opacity-30"
            >
              ← Anterior
            </button>

            {!isLast ? (
              <button
                onClick={() =>
                  setChapterIndex((i) =>
                    Math.min(book.chapters.length - 1, i + 1)
                  )
                }
                className="rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={() => setShowFinish(true)}
                className="rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white"
              >
                Terminar obra
              </button>
            )}
          </div>
        </article>
      ) : (
        <section className="mx-auto max-w-3xl px-6 py-14 md:py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Lectura completada
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Terminaste {book.title}
          </h1>
          <p className="mt-4 text-zinc-600">
            Tu valoración, reacciones y crítica se guardan en tu cuenta cuando has iniciado sesión.
          </p>

          <div className="mt-10 rounded-3xl border border-black/10 bg-white/55 p-6 md:p-8">
            <h2 className="text-xl font-bold">1. ¿Qué te pareció?</h2>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition ${
                    star <= rating ? "opacity-100" : "opacity-25"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <h2 className="mt-8 text-xl font-bold">2. ¿Qué te hizo sentir?</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {reactionOptions.map((reaction) => {
                const active = reactions.includes(reaction.id);
                return (
                  <button
                    key={reaction.id}
                    onClick={() => toggleReaction(reaction.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white/70 text-zinc-800"
                    }`}
                  >
                    {reaction.emoji} {reaction.label}
                  </button>
                );
              })}
            </div>

            <h2 className="mt-8 text-xl font-bold">3. Crítica opcional</h2>
            <textarea
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="¿Qué destacarías de la obra?"
              className="mt-4 min-h-32 w-full rounded-2xl border border-black/10 bg-white/80 p-4 outline-none placeholder:text-zinc-400"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={saveFeedback}
                disabled={savingFeedback}
                className="rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {savingFeedback ? "Guardando..." : "Guardar opinión"}
              </button>

              <Link
                href="/biblioteca"
                onClick={async () => {
                  const user = await getCurrentUser();
                  await markFinishedForCurrentUser(Boolean(user));
                }}
                className="rounded-full border border-black/15 px-6 py-3 font-semibold"
              >
                Omitir y volver a biblioteca
              </Link>
            </div>

            {savedFeedback && (
              <div className="mt-6 rounded-2xl bg-emerald-100 p-4 text-sm font-semibold text-emerald-900">
                ✓ Opinión sincronizada correctamente con tu cuenta.
              </div>
            )}

            {feedbackError && (
              <div className="mt-6 rounded-2xl bg-rose-100 p-4 text-sm font-semibold text-rose-900">
                ✕ No se pudo sincronizar: {feedbackError}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
