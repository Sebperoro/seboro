"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  pass: {
    label: "Correcto",
    icon: "✓",
    border: "#c5dfcf",
    background: "#eef8f1",
    text: "#397053",
  },

  warn: {
    label: "Revisar",
    icon: "!",
    border: "#ead5aa",
    background: "#fffaf0",
    text: "#8a682d",
  },

  fail: {
    label: "Bloquea",
    icon: "×",
    border: "#ecc7c3",
    background: "#fff2f1",
    text: "#a24d43",
  },

  info: {
    label: "Info",
    icon: "i",
    border: "#e4ddd7",
    background: "#f5f2ef",
    text: "#7d7169",
  },
} as const;

export default function AdminBetaPage() {
  const [
    audit,
    setAudit,
  ] =
    useState<
      BetaAuditCheck[]
    >([]);

  const [
    checklist,
    setChecklist,
  ] =
    useState<
      BetaChecklistItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        auditData,
        checklistData,
      ] =
        await Promise.all([
          getBetaReadinessAudit(),
          getBetaLaunchChecklist(),
        ]);

      setAudit(
        auditData
      );

      setChecklist(
        checklistData
      );
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

  const summary =
    useMemo(() => {
      const automaticBlockingFails =
        audit.filter(
          (item) =>
            item.blocking &&
            item.status ===
              "fail"
        ).length;

      const manualBlockingPending =
        checklist.filter(
          (item) =>
            item.blocking &&
            !item.completed
        ).length;

      const warnings =
        audit.filter(
          (item) =>
            item.status ===
            "warn"
        ).length;

      const automaticPass =
        audit.filter(
          (item) =>
            item.status ===
            "pass"
        ).length;

      const manualPass =
        checklist.filter(
          (item) =>
            item.completed
        ).length;

      const total =
        Math.max(
          1,
          audit.length +
            checklist.length
        );

      const score =
        Math.round(
          ((
            automaticPass +
            manualPass
          ) /
            total) *
            100
        );

      return {
        automaticBlockingFails,
        manualBlockingPending,
        warnings,
        score,

        ready:
          automaticBlockingFails ===
            0 &&
          manualBlockingPending ===
            0,
      };
    }, [
      audit,
      checklist,
    ]);

  async function toggle(
    item: BetaChecklistItem
  ) {
    setSaving(
      item.check_key
    );

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
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving("");
    }
  }

  async function saveNote(
    item: BetaChecklistItem
  ) {
    setSaving(
      item.check_key
    );

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
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving("");
    }
  }

  const sections =
    Array.from(
      new Set(
        audit.map(
          (item) =>
            item.section
        )
      )
    );

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#428397]"
          >
            ← Volver a administración
          </Link>

          {/* HERO */}

          <section className="mt-4 overflow-hidden rounded-[30px] border border-[#c7e0e6] bg-gradient-to-br from-white via-[#fbfeff] to-[#eef8fa] px-6 py-7 shadow-[0_10px_30px_rgba(66,131,151,0.04)] md:px-8 md:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#428397]">
                    SEBORO · LANZAMIENTO
                  </p>

                  <span className="rounded-full border border-[#c7e0e6] bg-white/80 px-3 py-1 text-[9px] font-black text-[#428397]">
                    Beta cerrada
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Preparación de beta
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f7f84] md:text-base">
                  Detecta bloqueos técnicos, completa pruebas manuales y confirma si SEBORO está listo para recibir usuarios reales.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/beta/feedback"
                  className="rounded-full border border-[#c7e0e6] bg-white px-4 py-2.5 text-xs font-black text-[#428397]"
                >
                  Feedback de beta →
                </Link>

                <button
                  type="button"
                  onClick={
                    load
                  }
                  className="rounded-full bg-[#428397] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#377487]"
                >
                  Volver a auditar
                </button>
              </div>
            </div>
          </section>

          {error && (
            <div className="mt-5 rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
              {
                error
              }
            </div>
          )}

          {loading ? (
            <section className="mt-6 rounded-[24px] border border-[#e4ddd7] bg-white p-8">
              <div className="h-5 w-44 animate-pulse rounded-full bg-[#eee9e5]" />

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="h-28 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
                <div className="h-28 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
                <div className="h-28 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
                <div className="h-28 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
              </div>
            </section>
          ) : (
            <>
              {/* RESUMEN */}

              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article
                  className={`rounded-[22px] border p-5 ${
                    summary.ready
                      ? "border-[#c5dfcf] bg-[#eef8f1]"
                      : "border-[#ead5aa] bg-[#fffaf0]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                      summary.ready
                        ? "text-[#397053]"
                        : "text-[#8a682d]"
                    }`}
                  >
                    Estado
                  </p>

                  <p
                    className={`mt-3 text-2xl font-black ${
                      summary.ready
                        ? "text-[#315e46]"
                        : "text-[#765a29]"
                    }`}
                  >
                    {summary.ready
                      ? "Lista para beta"
                      : "Aún no lista"}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#7f756e]">
                    {summary.ready
                      ? "No hay bloqueos críticos pendientes."
                      : "Todavía existen puntos que deben resolverse."}
                  </p>
                </article>

                <article className="rounded-[22px] border border-[#c7e0e6] bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#428397]">
                    Progreso
                  </p>

                  <p className="mt-3 text-3xl font-black text-[#366c7b]">
                    {
                      summary.score
                    }
                    %
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf1f2]">
                    <div
                      className="h-full rounded-full bg-[#428397]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            summary.score
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </article>

                <article
                  className={`rounded-[22px] border p-5 ${
                    summary.automaticBlockingFails >
                    0
                      ? "border-[#ecc7c3] bg-[#fff2f1]"
                      : "border-[#d8e4db] bg-white"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Bloqueos técnicos
                  </p>

                  <p
                    className={`mt-3 text-3xl font-black ${
                      summary.automaticBlockingFails >
                      0
                        ? "text-[#a24d43]"
                        : "text-[#397053]"
                    }`}
                  >
                    {
                      summary.automaticBlockingFails
                    }
                  </p>

                  <p className="mt-2 text-xs text-[#91867e]">
                    Fallos automáticos que impiden avanzar.
                  </p>
                </article>

                <article
                  className={`rounded-[22px] border p-5 ${
                    summary.manualBlockingPending >
                    0
                      ? "border-[#ead5aa] bg-[#fffaf0]"
                      : "border-[#d8e4db] bg-white"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Checks manuales
                  </p>

                  <p
                    className={`mt-3 text-3xl font-black ${
                      summary.manualBlockingPending >
                      0
                        ? "text-[#8a682d]"
                        : "text-[#397053]"
                    }`}
                  >
                    {
                      summary.manualBlockingPending
                    }
                  </p>

                  <p className="mt-2 text-xs text-[#91867e]">
                    Pruebas requeridas que aún no se han confirmado.
                  </p>
                </article>
              </section>

              {/* AVISOS */}

              {summary.warnings >
                0 && (
                <section className="mt-5 rounded-[20px] border border-[#ead5aa] bg-[#fffaf0] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#8a682d]">
                      !
                    </div>

                    <div>
                      <p className="text-sm font-black text-[#765a29]">
                        {
                          summary.warnings
                        }{" "}
                        advertencia
                        {summary.warnings ===
                        1
                          ? ""
                          : "s"}{" "}
                        técnica
                        {summary.warnings ===
                        1
                          ? ""
                          : "s"}
                      </p>

                      <p className="mt-1 text-xs text-[#8c7955]">
                        No necesariamente bloquean la beta, pero conviene revisarlas.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* AUDITORÍA */}

              <section className="mt-9">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#428397]">
                      Auditoría automática
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Base técnica
                    </h2>

                    <p className="mt-1 text-sm text-[#8b8078]">
                      Comprobaciones ejecutadas directamente contra el estado actual de SEBORO.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#c7e0e6] bg-[#eef8fa] px-4 py-2 text-xs font-black text-[#428397]">
                    {
                      audit.length
                    }{" "}
                    checks
                  </span>
                </div>

                <div className="mt-5 space-y-7">
                  {sections.map(
                    (
                      section
                    ) => (
                      <div
                        key={
                          section
                        }
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <span className="h-px flex-1 bg-[#e5dfda]" />

                          <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a8078]">
                            {
                              section
                            }
                          </h3>

                          <span className="h-px flex-1 bg-[#e5dfda]" />
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {audit
                            .filter(
                              (
                                item
                              ) =>
                                item.section ===
                                section
                            )
                            .map(
                              (
                                item
                              ) => {
                                const meta =
                                  STATUS_META[
                                    item.status
                                  ];

                                return (
                                  <article
                                    key={
                                      item.check_key
                                    }
                                    className="rounded-[20px] border p-5"
                                    style={{
                                      borderColor:
                                        meta.border,
                                      background:
                                        meta.background,
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex gap-3">
                                        <div
                                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black"
                                          style={{
                                            color:
                                              meta.text,
                                          }}
                                        >
                                          {
                                            meta.icon
                                          }
                                        </div>

                                        <div>
                                          <p className="font-black text-[#3e3732]">
                                            {
                                              item.label
                                            }
                                          </p>

                                          <p className="mt-2 text-sm leading-6 text-[#776d66]">
                                            {
                                              item.detail
                                            }
                                          </p>
                                        </div>
                                      </div>

                                      <span
                                        className="shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                                        style={{
                                          borderColor:
                                            meta.border,
                                          color:
                                            meta.text,
                                          background:
                                            "#ffffff",
                                        }}
                                      >
                                        {
                                          meta.label
                                        }
                                      </span>
                                    </div>
                                  </article>
                                );
                              }
                            )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* CHECKLIST MANUAL */}

              <section className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7d7169]">
                      Validación humana
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Checklist de lanzamiento
                    </h2>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-[#8b8078]">
                      Estas comprobaciones no pueden deducirse únicamente desde la base de datos. Deben probarse manualmente antes de marcarlas como completadas.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#e4ddd7] bg-[#f5f2ef] px-4 py-2 text-xs font-black text-[#7d7169]">
                    {
                      checklist.filter(
                        (
                          item
                        ) =>
                          item.completed
                      ).length
                    }
                    /
                    {
                      checklist.length
                    }{" "}
                    completados
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {checklist.map(
                    (
                      item
                    ) => {
                      const isSaving =
                        saving ===
                        item.check_key;

                      return (
                        <article
                          key={
                            item.check_key
                          }
                          className={`rounded-[22px] border p-5 transition ${
                            item.completed
                              ? "border-[#c5dfcf] bg-[#f5fbf7]"
                              : item.blocking
                              ? "border-[#ead5aa] bg-[#fffdf8]"
                              : "border-[#e4ddd7] bg-white"
                          }`}
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  toggle(
                                    item
                                  )
                                }
                                disabled={
                                  isSaving
                                }
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-sm font-black transition disabled:opacity-40 ${
                                  item.completed
                                    ? "border-[#9fc8ad] bg-[#397053] text-white"
                                    : "border-[#d9d1cb] bg-white text-transparent hover:border-[#b7aaa1]"
                                }`}
                              >
                                {item.completed
                                  ? "✓"
                                  : "✓"}
                              </button>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-black">
                                    {
                                      item.label
                                    }
                                  </p>

                                  {item.blocking && (
                                    <span className="rounded-full border border-[#ecc7c3] bg-[#fff2f1] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#a24d43]">
                                      Requerido
                                    </span>
                                  )}

                                  {item.completed && (
                                    <span className="rounded-full border border-[#c5dfcf] bg-[#eef8f1] px-2.5 py-1 text-[9px] font-black text-[#397053]">
                                      Completado
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#81766e]">
                                  {
                                    item.description
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="flex w-full gap-2 lg:max-w-md">
                              <input
                                value={
                                  item.note
                                }
                                onChange={(
                                  event
                                ) =>
                                  setChecklist(
                                    (
                                      current
                                    ) =>
                                      current.map(
                                        (
                                          row
                                        ) =>
                                          row.check_key ===
                                          item.check_key
                                            ? {
                                                ...row,
                                                note:
                                                  event
                                                    .target
                                                    .value,
                                              }
                                            : row
                                      )
                                  )
                                }
                                placeholder="Nota opcional..."
                                className="min-w-0 flex-1 rounded-[14px] border border-[#ddd6d0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9abec9]"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  saveNote(
                                    item
                                  )
                                }
                                disabled={
                                  isSaving
                                }
                                className="rounded-[14px] border border-[#c7e0e6] bg-[#eef8fa] px-4 py-2.5 text-xs font-black text-[#428397] disabled:opacity-40"
                              >
                                {isSaving
                                  ? "..."
                                  : "Guardar"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </section>

              {/* CIERRE */}

              <section
                className={`mt-8 rounded-[24px] border p-6 ${
                  summary.ready
                    ? "border-[#c5dfcf] bg-[#eef8f1]"
                    : "border-[#ead5aa] bg-[#fffaf0]"
                }`}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl font-black ${
                        summary.ready
                          ? "text-[#397053]"
                          : "text-[#8a682d]"
                      }`}
                    >
                      {summary.ready
                        ? "✓"
                        : "!"}
                    </div>

                    <div>
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                          summary.ready
                            ? "text-[#397053]"
                            : "text-[#8a682d]"
                        }`}
                      >
                        Decisión de lanzamiento
                      </p>

                      <h3 className="mt-1 text-xl font-black">
                        {summary.ready
                          ? "SEBORO está listo para beta"
                          : "Todavía faltan comprobaciones"}
                      </h3>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#776d66]">
                        {summary.ready
                          ? "La auditoría automática no detecta bloqueos y todos los checks manuales requeridos están completados."
                          : "Resuelve los bloqueos técnicos y completa los checks manuales requeridos antes de abrir la beta."}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/admin/beta/feedback"
                    className="shrink-0 rounded-full border border-[#c7e0e6] bg-white px-5 py-2.5 text-xs font-black text-[#428397]"
                  >
                    Ver feedback →
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </RoleGate>
  );
}