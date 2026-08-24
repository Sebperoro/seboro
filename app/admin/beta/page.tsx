"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";
import {
  getBetaLaunchChecklist,
  getBetaReadinessAudit,
  updateBetaCheck,
  type BetaAuditCheck,
  type BetaChecklistItem,
} from "@/lib/betaReadiness";

const STATUS_META = {
  pass: { label: "Correcto", classes: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100" },
  warn: { label: "Revisar", classes: "border-amber-300/20 bg-amber-300/[0.06] text-amber-100" },
  fail: { label: "Bloquea", classes: "border-rose-300/20 bg-rose-300/[0.07] text-rose-100" },
  info: { label: "Info", classes: "border-sky-300/15 bg-sky-300/[0.05] text-sky-100" },
} as const;

export default function AdminBetaPage() {
  const [audit, setAudit] = useState<BetaAuditCheck[]>([]);
  const [checklist, setChecklist] = useState<BetaChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [auditData, checklistData] = await Promise.all([
        getBetaReadinessAudit(),
        getBetaLaunchChecklist(),
      ]);

      setAudit(auditData);
      setChecklist(checklistData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo ejecutar la auditoría."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const automaticBlockingFails = audit.filter(
      (item) => item.blocking && item.status === "fail"
    ).length;

    const manualBlockingPending = checklist.filter(
      (item) => item.blocking && !item.completed
    ).length;

    const warnings = audit.filter((item) => item.status === "warn").length;

    const automaticPass = audit.filter((item) => item.status === "pass").length;
    const manualPass = checklist.filter((item) => item.completed).length;
    const total = Math.max(1, audit.length + checklist.length);

    const score = Math.round(
      ((automaticPass + manualPass) / total) * 100
    );

    return {
      automaticBlockingFails,
      manualBlockingPending,
      warnings,
      score,
      ready:
        automaticBlockingFails === 0 &&
        manualBlockingPending === 0,
    };
  }, [audit, checklist]);

  async function toggle(item: BetaChecklistItem) {
    setSaving(item.check_key);
    setError("");

    try {
      await updateBetaCheck(
        item.check_key,
        !item.completed,
        item.note
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar."
      );
    } finally {
      setSaving("");
    }
  }

  async function saveNote(item: BetaChecklistItem) {
    setSaving(item.check_key);
    setError("");

    try {
      await updateBetaCheck(
        item.check_key,
        item.completed,
        item.note
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar."
      );
    } finally {
      setSaving("");
    }
  }

  const sections = Array.from(new Set(audit.map((item) => item.section)));

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                SEBORO · 0.55
              </p>

              <h1 className="mt-2 text-4xl font-black">
                Preparación para beta cerrada
              </h1>

              <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
                Una vista única para detectar bloqueos técnicos,
                completar pruebas manuales y decidir cuándo es seguro
                invitar a usuarios reales.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/beta/feedback"
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
              >
                Feedback de beta
              </Link>

              <button
                onClick={load}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
              >
                Volver a auditar
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-10 text-zinc-500">Ejecutando auditoría...</p>
          ) : (
            <>
              <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={`rounded-3xl border p-6 ${
                  summary.ready
                    ? "border-emerald-300/20 bg-emerald-300/[0.06]"
                    : "border-amber-300/20 bg-amber-300/[0.05]"
                }`}>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                    Estado
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {summary.ready ? "Lista para beta" : "Aún no lista"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                    Progreso
                  </p>
                  <p className="mt-2 text-3xl font-black">{summary.score}%</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                    Bloqueos técnicos
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {summary.automaticBlockingFails}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                    Checks manuales pendientes
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {summary.manualBlockingPending}
                  </p>
                </div>
              </section>

              <section className="mt-12">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Auditoría automática
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Base técnica
                </h2>

                <div className="mt-5 space-y-7">
                  {sections.map((section) => (
                    <div key={section}>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-zinc-500">
                        {section}
                      </h3>

                      <div className="grid gap-3 lg:grid-cols-2">
                        {audit
                          .filter((item) => item.section === section)
                          .map((item) => {
                            const meta = STATUS_META[item.status];

                            return (
                              <article
                                key={item.check_key}
                                className={`rounded-2xl border p-5 ${meta.classes}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-bold">{item.label}</p>
                                    <p className="mt-2 text-sm leading-6 opacity-70">
                                      {item.detail}
                                    </p>
                                  </div>

                                  <span className="shrink-0 rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]">
                                    {meta.label}
                                  </span>
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-14">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Validación humana
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Checklist de lanzamiento
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  Estos checks no se pueden deducir solo desde la base de datos.
                  Se marcan después de probarlos realmente.
                </p>

                <div className="mt-5 space-y-3">
                  {checklist.map((item) => (
                    <article
                      key={item.check_key}
                      className={`rounded-2xl border p-5 ${
                        item.completed
                          ? "border-emerald-300/15 bg-emerald-300/[0.04]"
                          : item.blocking
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <button
                            onClick={() => toggle(item)}
                            disabled={saving === item.check_key}
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                              item.completed
                                ? "border-emerald-300/30 bg-emerald-300 text-emerald-950"
                                : "border-white/20"
                            }`}
                          >
                            {item.completed ? "✓" : ""}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">{item.label}</p>
                              {item.blocking && (
                                <span className="rounded-full border border-rose-300/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-rose-200/70">
                                  Requerido
                                </span>
                              )}
                            </div>

                            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex w-full gap-2 lg:max-w-md">
                          <input
                            value={item.note}
                            onChange={(event) =>
                              setChecklist((current) =>
                                current.map((row) =>
                                  row.check_key === item.check_key
                                    ? { ...row, note: event.target.value }
                                    : row
                                )
                              )
                            }
                            placeholder="Nota opcional..."
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                          />

                          <button
                            onClick={() => saveNote(item)}
                            disabled={saving === item.check_key}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </RoleGate>
  );
}
