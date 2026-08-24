"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  getUserFeedback,
  upsertUserFeedback,
} from "@/lib/userFeedback";

const reactions = [
  { id: "love", emoji: "❤️", label: "Me encantó" },
  { id: "moved", emoji: "😢", label: "Me emocionó" },
  { id: "surprised", emoji: "😮", label: "Me sorprendió" },
  { id: "funny", emoji: "😂", label: "Me hizo reír" },
  { id: "annoyed", emoji: "😡", label: "Me molestó" },
];

export default function ReaderFeedbackExtras({
  slug,
}: {
  slug: string;
}) {
  const [selected, setSelected] =
    useState<string[]>([]);
  const [review, setReview] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const feedback =
        await getUserFeedback(slug);

      if (!active || !feedback) return;

      setSelected(
        feedback.reactions || []
      );
      setReview(
        feedback.review || ""
      );
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  }

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const ok =
        await upsertUserFeedback(
          slug,
          {
            reactions: selected,
            review: review.trim()
              ? review.trim()
              : null,
          }
        );

      if (!ok) {
        throw new Error(
          "No se pudo guardar la opinión."
        );
      }

      setMessage(
        "✓ Reacciones y crítica guardadas."
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 border-t border-white/10 pt-7">
      <h3 className="text-lg font-bold">
        2. ¿Qué te hizo sentir?
      </h3>

      <div className="mt-4 flex flex-wrap gap-2">
        {reactions.map((reaction) => {
          const active =
            selected.includes(
              reaction.id
            );

          return (
            <button
              key={reaction.id}
              onClick={() =>
                toggle(reaction.id)
              }
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/25"
              }`}
            >
              {reaction.emoji}{" "}
              {reaction.label}
            </button>
          );
        })}
      </div>

      <h3 className="mt-8 text-lg font-bold">
        3. Crítica opcional
      </h3>

      <textarea
        value={review}
        maxLength={3000}
        onChange={(event) =>
          setReview(event.target.value)
        }
        placeholder="¿Qué destacarías de la obra?"
        className="mt-4 min-h-32 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : "Guardar opinión"}
        </button>

        {message && (
          <p className="text-sm text-zinc-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
