"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";
import {
  getActiveCommunityRestrictions,
  getPendingCommunityReports,
  getRecentModerationActions,
  liftCommunityRestriction,
  moderateCommunityTarget,
  restrictCommunityUser,
  type ActiveCommunityRestriction,
  type PendingCommunityReport,
  type RecentModerationAction,
} from "@/lib/communityModeration";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Acoso / insultos",
  hate: "Odio / discriminación",
  sexual: "Contenido sexual",
  threats: "Amenazas / violencia",
  personal_data: "Datos personales",
  spoiler: "Spoiler sin marcar",
  other: "Otro",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ReportCard({
  report,
  onChanged,
}: {
  report: PendingCommunityReport;
  onChanged: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "dismiss" | "hide" | "warn" | "hide_warn") {
    if (action !== "dismiss" && reason.trim().length < 3) {
      setError("Escribe el motivo de la acción.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await moderateCommunityTarget(
        report.target_type,
        report.target_id,
        action,
        reason
      );
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar la acción.");
    } finally {
      setBusy(false);
    }
  }

  async function restrict(hours: number) {
    if (reason.trim().length < 3) {
      setError("Escribe primero el motivo de la restricción.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await restrictCommunityUser(
        report.content_user_id,
        hours,
        reason
      );

      await moderateCommunityTarget(
        report.target_type,
        report.target_id,
        "hide",
        reason
      );

      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restringir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rose-200 px-2.5 py-1 text-xs font-black text-rose-950">
              {report.report_count} reporte{report.report_count === 1 ? "" : "s"}
            </span>

            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              {report.target_type === "post" ? "Publicación" : "Respuesta"}
            </span>

            <span className="text-xs text-zinc-600">{report.branch}</span>
          </div>

          <h2 className="mt-3 text-xl font-bold">{report.display_name}</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Primer reporte: {formatDate(report.oldest_report_at)}
          </p>
        </div>

        <Link
          href={`/comunidad/${report.book_slug}#post-${report.parent_post_id}`}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold"
        >
          Abrir en comunidad
        </Link>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="whitespace-pre-wrap leading-7 text-zinc-300">
          {report.body}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {report.reasons.map((item) => (
          <span
            key={item}
            className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-3 py-1 text-xs text-amber-100/80"
          >
            {REASON_LABELS[item] || item}
          </span>
        ))}
      </div>

      {report.details.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Detalles enviados
          </p>
          <div className="mt-2 space-y-2">
            {report.details.map((detail, index) => (
              <p key={`${detail}-${index}`} className="text-sm leading-6 text-zinc-400">
                • {detail}
              </p>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={reason}
        maxLength={1000}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motivo de la decisión. Ej. Insulto directo contra otro usuario."
        className="mt-5 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-zinc-600"
      />

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => act("dismiss")}
          disabled={busy}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Descartar reportes
        </button>

        <button
          onClick={() => act("hide")}
          disabled={busy}
          className="rounded-full border border-amber-300/20 px-4 py-2 text-xs font-semibold text-amber-100 disabled:opacity-40"
        >
          Ocultar
        </button>

        <button
          onClick={() => act("warn")}
          disabled={busy}
          className="rounded-full border border-orange-300/20 px-4 py-2 text-xs font-semibold text-orange-100 disabled:opacity-40"
        >
          Advertir
        </button>

        <button
          onClick={() => act("hide_warn")}
          disabled={busy}
          className="rounded-full bg-rose-200 px-4 py-2 text-xs font-bold text-rose-950 disabled:opacity-40"
        >
          Ocultar + advertir
        </button>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-xs text-zinc-600">Escalación temporal</p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => restrict(24)}
            disabled={busy}
            className="rounded-full border border-rose-300/20 px-4 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40"
          >
            Restringir 24 h
          </button>

          <button
            onClick={() => restrict(168)}
            disabled={busy}
            className="rounded-full border border-rose-300/20 px-4 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40"
          >
            Restringir 7 días
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminModerationPage() {
  const [reports, setReports] = useState<PendingCommunityReport[]>([]);
  const [actions, setActions] = useState<RecentModerationAction[]>([]);
  const [restrictions, setRestrictions] = useState<ActiveCommunityRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [pending, recent, active] = await Promise.all([
        getPendingCommunityReports(),
        getRecentModerationActions(),
        getActiveCommunityRestrictions(),
      ]);

      setReports(pending);
      setActions(recent);
      setRestrictions(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar moderación.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(action: RecentModerationAction) {
    if (action.target_type !== "post" && action.target_type !== "reply") return;

    try {
      await moderateCommunityTarget(
        action.target_type,
        action.target_id,
        "restore",
        "Contenido restaurado tras revisión administrativa."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restaurar.");
    }
  }

  async function lift(item: ActiveCommunityRestriction) {
    try {
      await liftCommunityRestriction(
        item.user_id,
        "Restricción levantada manualmente por moderación."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo levantar la restricción.");
    }
  }

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#0a0a0b] text-white">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                SEBORO · seguridad
              </p>
              <h1 className="mt-2 text-4xl font-black">Moderación de comunidad</h1>
              <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
                Los reportes priorizan la revisión, pero nunca ocultan contenido por sí solos.
                Toda acción queda registrada.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/revision"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold"
              >
                Revisión de obras
              </Link>
              <Link
                href="/admin/correcciones"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold"
              >
                Correcciones
              </Link>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-zinc-500">Cargando...</p>
          ) : (
            <>
              <section className="mt-10">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Cola priorizada
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Reportes pendientes · {reports.length}
                </h2>

                {reports.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-500">
                    No hay contenido pendiente de moderación.
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {reports.map((report) => (
                      <ReportCard
                        key={`${report.target_type}:${report.target_id}`}
                        report={report}
                        onChanged={load}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-12">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Acceso temporal
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Restricciones activas · {restrictions.length}
                </h2>

                {restrictions.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-zinc-500">
                    No hay usuarios restringidos actualmente.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {restrictions.map((item) => (
                      <article
                        key={item.user_id}
                        className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-5"
                      >
                        <p className="font-bold">{item.display_name}</p>
                        <p className="mt-2 text-sm text-zinc-400">
                          Hasta {formatDate(item.restricted_until)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {item.reason}
                        </p>
                        <button
                          onClick={() => lift(item)}
                          className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold"
                        >
                          Levantar restricción
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-12">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Trazabilidad
                </p>
                <h2 className="mt-2 text-2xl font-bold">Auditoría reciente</h2>

                {actions.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-zinc-500">
                    Aún no hay acciones de moderación.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {actions.map((action) => (
                      <article
                        key={action.action_id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b>{action.display_name}</b>
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                              {action.action}
                            </span>
                          </div>

                          {action.reason && (
                            <p className="mt-2 text-sm text-zinc-400">
                              {action.reason}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-zinc-600">
                            {formatDate(action.created_at)}
                          </p>
                        </div>

                        {(action.target_type === "post" ||
                          action.target_type === "reply") &&
                          action.current_status === "hidden" && (
                            <button
                              onClick={() => restore(action)}
                              className="shrink-0 rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold text-emerald-200"
                            >
                              Restaurar contenido
                            </button>
                          )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </RoleGate>
  );
}
