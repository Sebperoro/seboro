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
  adminUpdateBetaFeedback,
  getBetaFeedbackAdmin,
  type AdminBetaFeedback,
  type BetaFeedbackStatus,
} from "@/lib/betaFeedback";

const STATUS_LABELS: Record<
  BetaFeedbackStatus,
  string
> = {
  new: "Nuevo",
  reviewing: "En revisión",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const STATUS_META: Record<
  BetaFeedbackStatus,
  {
    border: string;
    bg: string;
    text: string;
  }
> = {
  new: {
    border: "#c7e0e6",
    bg: "#eef8fa",
    text: "#428397",
  },

  reviewing: {
    border: "#ead5aa",
    bg: "#fffaf0",
    text: "#8a682d",
  },

  resolved: {
    border: "#c5dfcf",
    bg: "#eef8f1",
    text: "#397053",
  },

  closed: {
    border: "#ded8d3",
    bg: "#f5f3f1",
    text: "#756c65",
  },
};

const SEVERITY_META: Record<
  string,
  {
    label: string;
    border: string;
    bg: string;
    text: string;
  }
> = {
  blocker: {
    label: "Bloqueador",
    border: "#ecc7c3",
    bg: "#fff2f1",
    text: "#a24d43",
  },

  high: {
    label: "Alta",
    border: "#efcfb7",
    bg: "#fff6ef",
    text: "#b9682f",
  },

  medium: {
    label: "Media",
    border: "#c7e0e6",
    bg: "#eef8fa",
    text: "#428397",
  },

  low: {
    label: "Baja",
    border: "#ded8d3",
    bg: "#f5f3f1",
    text: "#756c65",
  },
};

function FeedbackCard({
  item,
  onChanged,
}: {
  item: AdminBetaFeedback;
  onChanged: () => Promise<void>;
}) {
  const [
    status,
    setStatus,
  ] =
    useState<BetaFeedbackStatus>(
      item.status
    );

  const [
    note,
    setNote,
  ] =
    useState(
      item.admin_note
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function save() {
    setBusy(true);
    setError("");

    try {
      await adminUpdateBetaFeedback(
        item.id,
        status,
        note
      );

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setBusy(false);
    }
  }

  const severity =
    SEVERITY_META[
      item.severity
    ] ||
    SEVERITY_META.medium;

  const statusMeta =
    STATUS_META[
      item.status
    ];

  return (
    <article
      className="overflow-hidden rounded-[26px] border bg-white shadow-[0_10px_28px_rgba(64,43,29,0.04)]"
      style={{
        borderColor:
          severity.border,
      }}
    >
      {/* CABECERA */}

      <div
        className="border-b px-5 py-5 md:px-6"
        style={{
          background:
            severity.bg,
          borderColor:
            severity.border,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                style={{
                  borderColor:
                    severity.border,
                  color:
                    severity.text,
                }}
              >
                {
                  severity.label
                }
              </span>

              <span className="rounded-full border border-[#ded8d3] bg-white px-3 py-1 text-[9px] font-black text-[#756c65]">
                {
                  item.category
                }
              </span>
            </div>

            <h2 className="mt-3 text-xl font-black tracking-[-0.02em] text-[#332b26]">
              {
                item.display_name
              }
            </h2>

            {item.page_path && (
              <p className="mt-1 text-[10px] font-bold text-[#91867e]">
                {
                  item.page_path
                }
              </p>
            )}
          </div>

          <span
            className="rounded-full border px-3 py-1.5 text-[10px] font-black"
            style={{
              borderColor:
                statusMeta.border,
              background:
                statusMeta.bg,
              color:
                statusMeta.text,
            }}
          >
            {
              STATUS_LABELS[
                item.status
              ]
            }
          </span>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {/* MENSAJE */}

        <section className="rounded-[20px] border border-[#e4ddd7] bg-[#faf9f7] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
            Feedback del tester
          </p>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5f5550]">
            {
              item.message
            }
          </p>
        </section>

        {/* GESTIÓN */}

        <section className="mt-5 rounded-[20px] border border-[#e3ddd7] bg-white p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                Gestión administrativa
              </p>

              <p className="mt-1 text-xs text-[#91867e]">
                Cambia el estado y deja una nota para el tester.
              </p>
            </div>

            <span className="text-[10px] font-bold text-[#9a9088]">
              {
                note.length
              }
              /2000
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
            <select
              value={
                status
              }
              onChange={(
                event
              ) =>
                setStatus(
                  event.target
                    .value as BetaFeedbackStatus
                )
              }
              className="rounded-[14px] border border-[#ddd6d0] bg-white px-3 py-2.5 text-sm font-bold text-[#514841] outline-none focus:border-[#9abec9]"
            >
              <option value="new">
                Nuevo
              </option>

              <option value="reviewing">
                En revisión
              </option>

              <option value="resolved">
                Resuelto
              </option>

              <option value="closed">
                Cerrado
              </option>
            </select>

            <input
              value={
                note
              }
              maxLength={
                2000
              }
              onChange={(
                event
              ) =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Nota para el tester..."
              className="min-w-0 rounded-[14px] border border-[#ddd6d0] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#aaa099] focus:border-[#9abec9]"
            />

            <button
              type="button"
              onClick={
                save
              }
              disabled={
                busy
              }
              className="rounded-[14px] bg-[#428397] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#377487] disabled:opacity-40"
            >
              {busy
                ? "Guardando..."
                : "Guardar"}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {
                error
              }
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

export default function AdminBetaFeedbackPage() {
  const [
    items,
    setItems,
  ] =
    useState<
      AdminBetaFeedback[]
    >([]);

  const [
    filter,
    setFilter,
  ] =
    useState<
      "open" | "all"
    >("open");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setItems(
        await getBetaFeedbackAdmin()
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible =
    useMemo(
      () =>
        filter ===
        "open"
          ? items.filter(
              (item) =>
                item.status ===
                  "new" ||
                item.status ===
                  "reviewing"
            )
          : items,
      [
        items,
        filter,
      ]
    );

  const blockers =
    items.filter(
      (item) =>
        item.severity ===
          "blocker" &&
        (item.status ===
          "new" ||
          item.status ===
            "reviewing")
    ).length;

  const openItems =
    items.filter(
      (item) =>
        item.status ===
          "new" ||
        item.status ===
          "reviewing"
    ).length;

  const resolvedItems =
    items.filter(
      (item) =>
        item.status ===
          "resolved" ||
        item.status ===
          "closed"
    ).length;

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
          <Link
            href="/admin/beta"
            className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#428397]"
          >
            ← Preparación de beta
          </Link>

          {/* HERO */}

          <section className="mt-4 overflow-hidden rounded-[30px] border border-[#c7e0e6] bg-gradient-to-br from-white via-[#fbfeff] to-[#eef8fa] px-6 py-7 shadow-[0_10px_30px_rgba(66,131,151,0.04)] md:px-8 md:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#428397]">
                    SEBORO · TESTER FEEDBACK
                  </p>

                  <span className="rounded-full border border-[#c7e0e6] bg-white/80 px-3 py-1 text-[9px] font-black text-[#428397]">
                    Beta cerrada
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Feedback de beta
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f7f84] md:text-base">
                  Revisa problemas reportados por testers, prioriza bloqueadores y registra el estado de cada incidencia.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[18px] border border-[#ecc7c3] bg-[#fff2f1] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#926963]">
                    Bloqueadores
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#a24d43]">
                    {
                      blockers
                    }
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#c7e0e6] bg-white/85 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#708492]">
                    Abiertos
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#428397]">
                    {
                      openItems
                    }
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#c5dfcf] bg-[#eef8f1] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#698071]">
                    Cerrados
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#397053]">
                    {
                      resolvedItems
                    }
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FILTROS */}

          <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e4ddd7] bg-white px-4 py-3">
            <div>
              <p className="text-xs font-black">
                Vista de feedback
              </p>

              <p className="mt-0.5 text-[10px] text-[#91867e]">
                Muestra únicamente incidencias abiertas o todo el historial.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilter(
                    "open"
                  )
                }
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  filter ===
                  "open"
                    ? "bg-[#428397] text-white"
                    : "border border-[#c7e0e6] bg-[#eef8fa] text-[#428397]"
                }`}
              >
                Abiertos
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter(
                    "all"
                  )
                }
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  filter ===
                  "all"
                    ? "bg-[#428397] text-white"
                    : "border border-[#c7e0e6] bg-[#eef8fa] text-[#428397]"
                }`}
              >
                Todos
              </button>
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

              <div className="mt-5 h-56 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
            </section>
          ) : visible.length ===
            0 ? (
            <section className="mt-6 rounded-[24px] border border-[#d6e4d9] bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8f1] text-lg font-black text-[#397053]">
                ✓
              </div>

              <h3 className="mt-4 text-lg font-black">
                No hay feedback en esta vista
              </h3>

              <p className="mt-2 text-sm text-[#8c8179]">
                {filter ===
                "open"
                  ? "No quedan incidencias abiertas."
                  : "Todavía no existe feedback registrado."}
              </p>
            </section>
          ) : (
            <section className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#428397]">
                    Incidencias
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {filter ===
                    "open"
                      ? "Feedback abierto"
                      : "Historial completo"}
                  </h2>
                </div>

                <span className="rounded-full border border-[#c7e0e6] bg-[#eef8fa] px-4 py-2 text-xs font-black text-[#428397]">
                  {
                    visible.length
                  }{" "}
                  elemento
                  {visible.length ===
                  1
                    ? ""
                    : "s"}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {visible.map(
                  (item) => (
                    <FeedbackCard
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      onChanged={
                        load
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}

          {/* PRINCIPIO */}

          <section className="mt-7 rounded-[22px] border border-[#e4ddd7] border-l-4 border-l-[#b5a99d] bg-[#f5f2ef] p-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e4ddd7] font-black text-[#5b5048]">
                ◇
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                  Ciclo de beta
                </p>

                <h3 className="mt-1 text-xl font-black">
                  Feedback → revisión → corrección → validación
                </h3>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8a8078]">
                  Una incidencia no se considera resuelta únicamente porque se haya leído. Debe cambiar de estado conforme se investiga, corrige y valida durante las pruebas de SEBORO.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </RoleGate>
  );
}