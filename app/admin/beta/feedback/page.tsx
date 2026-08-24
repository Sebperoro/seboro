"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";
import {
  adminUpdateBetaFeedback,
  getBetaFeedbackAdmin,
  type AdminBetaFeedback,
  type BetaFeedbackStatus,
} from "@/lib/betaFeedback";

const STATUS_LABELS: Record<BetaFeedbackStatus, string> = {
  new: "Nuevo",
  reviewing: "En revisión",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const SEVERITY_CLASSES: Record<string, string> = {
  blocker: "border-rose-300/30 bg-rose-300/[0.08] text-rose-100",
  high: "border-orange-300/20 bg-orange-300/[0.06] text-orange-100",
  medium: "border-white/10 bg-white/[0.03] text-white",
  low: "border-white/10 bg-white/[0.02] text-zinc-300",
};

function FeedbackCard({
  item,
  onChanged,
}: {
  item: AdminBetaFeedback;
  onChanged: () => Promise<void>;
}) {
  const [status, setStatus] = useState<BetaFeedbackStatus>(item.status);
  const [note, setNote] = useState(item.admin_note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");

    try {
      await adminUpdateBetaFeedback(item.id, status, note);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`rounded-3xl border p-6 ${SEVERITY_CLASSES[item.severity] || SEVERITY_CLASSES.medium}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]">
              {item.severity}
            </span>
            <span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em]">
              {item.category}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-bold">{item.display_name}</h2>
          {item.page_path && (
            <p className="mt-1 text-xs opacity-55">{item.page_path}</p>
          )}
        </div>

        <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold">
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <p className="mt-5 whitespace-pre-wrap leading-7 opacity-90">
        {item.message}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as BetaFeedbackStatus)}
          className="rounded-xl border border-white/10 bg-[#121214] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="new">Nuevo</option>
          <option value="reviewing">En revisión</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>

        <input
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota para el tester..."
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
        />

        <button
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
        >
          Guardar
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
    </article>
  );
}

export default function AdminBetaFeedbackPage() {
  const [items, setItems] = useState<AdminBetaFeedback[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setItems(await getBetaFeedbackAdmin());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () =>
      filter === "open"
        ? items.filter((item) => item.status === "new" || item.status === "reviewing")
        : items,
    [items, filter]
  );

  const blockers = items.filter(
    (item) =>
      item.severity === "blocker" &&
      (item.status === "new" || item.status === "reviewing")
  ).length;

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
          <Link
            href="/admin/beta"
            className="text-sm font-semibold text-zinc-500 hover:text-white"
          >
            ← Preparación de beta
          </Link>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Tester feedback
              </p>
              <h1 className="mt-2 text-4xl font-black">Feedback de beta</h1>
              <p className="mt-3 text-zinc-400">
                Bloqueos abiertos: <b className={blockers ? "text-rose-200" : "text-emerald-200"}>{blockers}</b>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter("open")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  filter === "open" ? "bg-white text-black" : "border border-white/10"
                }`}
              >
                Abiertos
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  filter === "all" ? "bg-white text-black" : "border border-white/10"
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-rose-100">
              {error}
            </p>
          )}

          {loading ? (
            <p className="mt-8 text-zinc-500">Cargando...</p>
          ) : visible.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-white/10 p-8 text-zinc-500">
              No hay feedback en esta vista.
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {visible.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </RoleGate>
  );
}
