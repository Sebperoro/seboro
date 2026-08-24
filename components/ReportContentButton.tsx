"use client";

import { useState } from "react";
import {
  submitCommunityReport,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/communityModeration";

const REASONS: Array<{
  id: ReportReason;
  label: string;
  description: string;
}> = [
  { id: "spam", label: "Spam", description: "Publicidad, repetición o contenido irrelevante." },
  { id: "harassment", label: "Acoso o insultos", description: "Ataques personales o hostigamiento." },
  { id: "hate", label: "Odio o discriminación", description: "Ataques contra una persona o grupo por características protegidas." },
  { id: "sexual", label: "Contenido sexual inapropiado", description: "Contenido sexual que no corresponde a la comunidad." },
  { id: "threats", label: "Amenazas o violencia", description: "Amenazas, intimidación o incitación a la violencia." },
  { id: "personal_data", label: "Datos personales", description: "Publica información privada de otra persona." },
  { id: "spoiler", label: "Spoiler sin marcar", description: "Revela información importante sin advertencia." },
  { id: "other", label: "Otro", description: "Otro problema que debería revisar moderación." },
];

export default function ReportContentButton({
  targetType,
  targetId,
  targetUserId,
  currentUserId,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetUserId: string;
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!currentUserId || currentUserId === targetUserId) return null;

  async function submit() {
    if (!reason) return;

    setBusy(true);
    setError("");

    try {
      await submitCommunityReport({
        targetType,
        targetId,
        reason,
        details,
      });
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar el reporte."
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <span className="text-[11px] font-semibold text-emerald-300/80">
        Reportado
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-zinc-600 transition hover:text-zinc-300"
      >
        Reportar
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Seguridad de comunidad
                </p>
                <h3 className="mt-2 text-2xl font-bold">Reportar contenido</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  El reporte será revisado. Reportar no oculta automáticamente el contenido.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-2">
              {REASONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setReason(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    reason === item.id
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className={`mt-1 text-xs leading-5 ${
                    reason === item.id ? "text-zinc-600" : "text-zinc-500"
                  }`}>
                    {item.description}
                  </p>
                </button>
              ))}
            </div>

            <textarea
              value={details}
              maxLength={500}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Detalle opcional para moderación..."
              className="mt-5 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-zinc-600"
            />

            {error && (
              <p className="mt-3 text-sm text-rose-300">{error}</p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={submit}
                disabled={busy || !reason}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
              >
                {busy ? "Enviando..." : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
