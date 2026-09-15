"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getUserFeedback,
  upsertUserFeedback,
} from "@/lib/userFeedback";

export default function ReaderFeedbackExtras({
  slug,
}: {
  slug: string;
}) {
  const [review, setReview] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const feedback =
          await getUserFeedback(slug);

        if (!active || !feedback) {
          return;
        }

        setReview(
          feedback.review || ""
        );
      } catch (loadError) {
        console.error(
          "SEBORO feedback extras load:",
          loadError
        );
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [slug]);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      /*
       * La crítica es independiente del rating.
       * Tampoco usamos emociones como evaluación
       * de la obra: las reacciones pertenecen a
       * comentarios/conversaciones de comunidad.
       */
      await upsertUserFeedback(
        slug,
        {
          review:
            review.trim()
              ? review.trim()
              : null,
        }
      );

      setMessage(
        "✓ Crítica guardada."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 border-t border-[#e3dcd5] pt-5">
      <h3 className="text-lg font-black text-[#342f2b]">
        Crítica opcional
      </h3>

      <p className="mt-1.5 text-sm leading-6 text-[#81776f]">
        Cuenta qué funcionó para ti, qué no, o qué debería saber otro lector antes de decidir.
      </p>

      <textarea
        value={review}
        maxLength={3000}
        onChange={(event) =>
          setReview(
            event.target.value
          )
        }
        placeholder="¿Qué destacarías de la obra?"
        className="mt-3 min-h-28 w-full rounded-[16px] border border-[#d8d0c7] bg-[#fbfaf8] p-3.5 text-[#34312d] outline-none transition placeholder:text-[#aaa39b] focus:border-[#aaa096] focus:bg-white md:min-h-32 md:rounded-[18px] md:p-4"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-[#2f2d29] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1e1b] disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : "Guardar crítica"}
        </button>

        {message && (
          <p className="text-sm font-semibold text-[#4f7951]">
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm font-semibold text-[#a84f58]">
            ✕ {error}
          </p>
        )}
      </div>
    </div>
  );
}
