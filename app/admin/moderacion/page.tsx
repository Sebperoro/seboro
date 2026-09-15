"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

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

const REASON_LABELS: Record<
  string,
  string
> = {
  spam: "Spam",
  harassment:
    "Acoso / insultos",
  hate:
    "Odio / discriminación",
  sexual:
    "Contenido sexual",
  threats:
    "Amenazas / violencia",
  personal_data:
    "Datos personales",
  spoiler:
    "Spoiler sin marcar",
  other: "Otro",
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function actionLabel(
  action: string
) {
  if (
    action === "dismiss"
  ) {
    return "Reportes descartados";
  }

  if (
    action === "hide"
  ) {
    return "Contenido ocultado";
  }

  if (
    action === "warn"
  ) {
    return "Advertencia";
  }

  if (
    action ===
    "hide_warn"
  ) {
    return "Ocultado + advertencia";
  }

  if (
    action === "restore"
  ) {
    return "Contenido restaurado";
  }

  if (
    action === "restrict"
  ) {
    return "Restricción aplicada";
  }

  if (
    action ===
    "lift_restriction"
  ) {
    return "Restricción levantada";
  }

  return action;
}

function ReportCard({
  report,
  onChanged,
}: {
  report: PendingCommunityReport;
  onChanged: () => Promise<void>;
}) {
  const [
    reason,
    setReason,
  ] =
    useState("");

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

  async function act(
    action:
      | "dismiss"
      | "hide"
      | "warn"
      | "hide_warn"
  ) {
    if (
      action !==
        "dismiss" &&
      reason.trim().length <
        3
    ) {
      setError(
        "Escribe el motivo de la acción."
      );

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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo aplicar la acción."
      );
    } finally {
      setBusy(false);
    }
  }

  async function restrict(
    hours: number
  ) {
    if (
      reason.trim().length <
      3
    ) {
      setError(
        "Escribe primero el motivo de la restricción."
      );

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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo restringir."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[26px] border border-[#edc9c6] bg-white shadow-[0_10px_28px_rgba(123,53,53,0.04)]">
      {/* CABECERA */}

      <div className="border-b border-[#f0dfdd] bg-[#fff9f8] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#efc6c1] bg-[#fff0ee] px-3 py-1 text-[9px] font-black text-[#a24d43]">
                {
                  report.report_count
                }{" "}
                reporte
                {report.report_count ===
                1
                  ? ""
                  : "s"}
              </span>

              <span className="rounded-full border border-[#e2dad5] bg-white px-3 py-1 text-[9px] font-black text-[#81766e]">
                {report.target_type ===
                "post"
                  ? "Publicación"
                  : "Respuesta"}
              </span>

              <span className="rounded-full border border-[#ded3ed] bg-[#faf8fd] px-3 py-1 text-[9px] font-black text-[#5b3f8c]">
                {
                  report.branch
                }
              </span>
            </div>

            <h2 className="mt-3 text-xl font-black tracking-[-0.02em]">
              {
                report.display_name
              }
            </h2>

            <p className="mt-1 text-[10px] text-[#9a9088]">
              Primer reporte:{" "}
              {formatDate(
                report.oldest_report_at
              )}
            </p>
          </div>

          <Link
            href={`/comunidad/${report.book_slug}#post-${report.parent_post_id}`}
            className="rounded-full border border-[#ddd5cf] bg-white px-4 py-2 text-xs font-black text-[#665c55] transition hover:border-[#d6a985] hover:text-[#b95016]"
          >
            Abrir en comunidad →
          </Link>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {/* CONTENIDO */}

        <section className="rounded-[20px] border border-[#e5ddd7] bg-[#faf9f7] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
            Contenido reportado
          </p>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5f5550]">
            {
              report.body
            }
          </p>
        </section>

        {/* MOTIVOS */}

        <section className="mt-4 rounded-[20px] border border-[#ead5aa] bg-[#fffaf0] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a682d]">
            Motivos de reporte
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {report.reasons.map(
              (item) => (
                <span
                  key={
                    item
                  }
                  className="rounded-full border border-[#ead5aa] bg-white px-3 py-1 text-xs font-bold text-[#80652e]"
                >
                  {REASON_LABELS[
                    item
                  ] || item}
                </span>
              )
            )}
          </div>
        </section>

        {report.details.length >
          0 && (
          <section className="mt-4 rounded-[20px] border border-[#e3ddd7] bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
              Detalles enviados
            </p>

            <div className="mt-3 space-y-2">
              {report.details.map(
                (
                  detail,
                  index
                ) => (
                  <p
                    key={`${detail}-${index}`}
                    className="text-sm leading-6 text-[#766c65]"
                  >
                    •{" "}
                    {
                      detail
                    }
                  </p>
                )
              )}
            </div>
          </section>
        )}

        {/* MOTIVO ADMIN */}

        <section className="mt-5 rounded-[20px] border border-[#e3ddd7] bg-[#faf9f7] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                Motivo de la decisión
              </p>

              <p className="mt-1 text-xs text-[#91867e]">
                Obligatorio para ocultar, advertir o restringir.
              </p>
            </div>

            <span className="text-[10px] font-bold text-[#9a9088]">
              {
                reason.length
              }
              /1000
            </span>
          </div>

          <textarea
            value={
              reason
            }
            maxLength={
              1000
            }
            onChange={(
              event
            ) =>
              setReason(
                event.target.value
              )
            }
            placeholder="Ej. Insulto directo contra otro usuario."
            className="mt-4 min-h-24 w-full resize-y rounded-[16px] border border-[#ddd6d0] bg-white p-4 text-sm leading-6 outline-none placeholder:text-[#aaa099] focus:border-[#c99892]"
          />

          {error && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {
                error
              }
            </div>
          )}
        </section>

        {/* ACCIONES */}

        <section className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
            Acción sobre el contenido
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() =>
                act(
                  "dismiss"
                )
              }
              disabled={
                busy
              }
              className="rounded-[18px] border border-[#dfe3e5] bg-[#f8fafb] p-4 text-left transition hover:border-[#b9c9d0] disabled:opacity-40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#657780]">
                ✓
              </div>

              <p className="mt-3 text-sm font-black">
                Descartar reportes
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#87939a]">
                El contenido permanece visible.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                act(
                  "hide"
                )
              }
              disabled={
                busy
              }
              className="rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] p-4 text-left transition hover:border-[#d9bd82] disabled:opacity-40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#8a682d]">
                ◉
              </div>

              <p className="mt-3 text-sm font-black text-[#765a29]">
                Ocultar
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#8c7955]">
                Retira el contenido de la vista pública.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                act(
                  "warn"
                )
              }
              disabled={
                busy
              }
              className="rounded-[18px] border border-[#efcfb7] bg-[#fff6ef] p-4 text-left transition hover:border-[#dda87f] disabled:opacity-40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#b9682f]">
                !
              </div>

              <p className="mt-3 text-sm font-black text-[#98572b]">
                Advertir
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#98755c]">
                Envía una advertencia al usuario.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                act(
                  "hide_warn"
                )
              }
              disabled={
                busy
              }
              className="rounded-[18px] border border-[#e8b8b3] bg-[#fff1ef] p-4 text-left transition hover:border-[#d78f86] disabled:opacity-40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#a24d43]">
                ×
              </div>

              <p className="mt-3 text-sm font-black text-[#8d443c]">
                Ocultar + advertir
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#946a64]">
                Retira el contenido y registra advertencia.
              </p>
            </button>
          </div>
        </section>

        {/* ESCALACIÓN */}

        <section className="mt-5 rounded-[20px] border border-[#ebc2bd] bg-[#fff7f5] p-4 md:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#a24d43]">
            Escalación temporal
          </p>

          <p className="mt-1 text-xs leading-5 text-[#946a64]">
            Restringe temporalmente al usuario y oculta el contenido reportado.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                restrict(
                  24
                )
              }
              disabled={
                busy
              }
              className="rounded-full border border-[#e6b7b1] bg-white px-4 py-2 text-xs font-black text-[#a24d43] disabled:opacity-40"
            >
              Restringir 24 h
            </button>

            <button
              type="button"
              onClick={() =>
                restrict(
                  168
                )
              }
              disabled={
                busy
              }
              className="rounded-full bg-[#a24d43] px-4 py-2 text-xs font-black text-white disabled:opacity-40"
            >
              Restringir 7 días
            </button>
          </div>
        </section>

        {busy && (
          <div className="mt-4 rounded-[15px] border border-[#e3ddd7] bg-[#faf9f7] p-4 text-center text-xs font-black text-[#81766e]">
            Aplicando acción de moderación...
          </div>
        )}
      </div>
    </article>
  );
}

export default function AdminModerationPage() {
  const [
    reports,
    setReports,
  ] =
    useState<
      PendingCommunityReport[]
    >([]);

  const [
    actions,
    setActions,
  ] =
    useState<
      RecentModerationAction[]
    >([]);

  const [
    restrictions,
    setRestrictions,
  ] =
    useState<
      ActiveCommunityRestriction[]
    >([]);

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
      const [
        pending,
        recent,
        active,
      ] =
        await Promise.all([
          getPendingCommunityReports(),
          getRecentModerationActions(),
          getActiveCommunityRestrictions(),
        ]);

      setReports(
        pending
      );

      setActions(
        recent
      );

      setRestrictions(
        active
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar moderación."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(
    action: RecentModerationAction
  ) {
    if (
      action.target_type !==
        "post" &&
      action.target_type !==
        "reply"
    ) {
      return;
    }

    try {
      await moderateCommunityTarget(
        action.target_type,
        action.target_id,
        "restore",
        "Contenido restaurado tras revisión administrativa."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo restaurar."
      );
    }
  }

  async function lift(
    item: ActiveCommunityRestriction
  ) {
    try {
      await liftCommunityRestriction(
        item.user_id,
        "Restricción levantada manualmente por moderación."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo levantar la restricción."
      );
    }
  }

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#a24d43]"
          >
            ← Volver a administración
          </Link>

          {/* HERO */}

          <section className="mt-4 overflow-hidden rounded-[30px] border border-[#ecc7c3] bg-gradient-to-br from-white via-[#fffafa] to-[#fff2f1] px-6 py-7 shadow-[0_10px_30px_rgba(162,77,67,0.04)] md:px-8 md:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a24d43]">
                    SEBORO · SEGURIDAD Y CONVIVENCIA
                  </p>

                  <span className="rounded-full border border-[#ecc7c3] bg-white/80 px-3 py-1 text-[9px] font-black text-[#a24d43]">
                    Moderación humana
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Moderación de comunidad
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#876f6b] md:text-base">
                  Los reportes priorizan la revisión, pero nunca ocultan contenido automáticamente. Toda acción administrativa queda registrada.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[18px] border border-[#edd0cd] bg-white/85 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#926963]">
                    Reportes
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#a24d43]">
                    {
                      reports.length
                    }
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#ead5aa] bg-[#fffaf0] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#8a682d]">
                    Restricciones
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#8a682d]">
                    {
                      restrictions.length
                    }
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#e4ddd7] bg-[#f5f2ef] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#7d7169]">
                    Auditoría
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#4f4741]">
                    {
                      actions.length
                    }
                  </p>
                </div>
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

              <div className="mt-5 h-64 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
            </section>
          ) : (
            <>
              {/* REPORTES */}

              <section className="mt-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a24d43]">
                      Cola priorizada
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Reportes pendientes
                    </h2>

                    <p className="mt-1 text-sm text-[#8b8078]">
                      Contenido que necesita revisión administrativa.
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      reports.length >
                      0
                        ? "border border-[#ecc7c3] bg-[#fff2f1] text-[#a24d43]"
                        : "border border-[#c9dfd1] bg-[#eef8f1] text-[#397053]"
                    }`}
                  >
                    {reports.length >
                    0
                      ? `${reports.length} por revisar`
                      : "✓ Cola vacía"}
                  </span>
                </div>

                {reports.length ===
                0 ? (
                  <div className="mt-5 rounded-[24px] border border-[#e5d9d7] bg-white p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8f1] text-lg font-black text-[#397053]">
                      ✓
                    </div>

                    <h3 className="mt-4 text-lg font-black">
                      Comunidad al día
                    </h3>

                    <p className="mt-2 text-sm text-[#8c8179]">
                      No hay contenido pendiente de moderación.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {reports.map(
                      (
                        report
                      ) => (
                        <ReportCard
                          key={`${report.target_type}:${report.target_id}`}
                          report={
                            report
                          }
                          onChanged={
                            load
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>

              {/* RESTRICCIONES */}

              <section className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8a682d]">
                      Acceso temporal
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Restricciones activas
                    </h2>

                    <p className="mt-1 text-sm text-[#8b8078]">
                      Usuarios que tienen temporalmente limitado el acceso a la comunidad.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#ead5aa] bg-[#fffaf0] px-4 py-2 text-xs font-black text-[#8a682d]">
                    {
                      restrictions.length
                    }{" "}
                    activas
                  </span>
                </div>

                {restrictions.length ===
                0 ? (
                  <div className="mt-5 rounded-[24px] border border-[#e4ddd7] bg-white p-7">
                    <p className="font-black">
                      No hay usuarios restringidos actualmente.
                    </p>

                    <p className="mt-2 text-sm text-[#8b8078]">
                      Las restricciones temporales aparecerán aquí mientras estén activas.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {restrictions.map(
                      (
                        item
                      ) => (
                        <article
                          key={
                            item.user_id
                          }
                          className="rounded-[22px] border border-[#ead5aa] bg-[#fffaf0] p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-black">
                                {
                                  item.display_name
                                }
                              </p>

                              <p className="mt-1 text-xs font-bold text-[#8a682d]">
                                Hasta{" "}
                                {formatDate(
                                  item.restricted_until
                                )}
                              </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-[#8a682d]">
                              !
                            </div>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-[#806f52]">
                            {
                              item.reason
                            }
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              lift(
                                item
                              )
                            }
                            className="mt-4 rounded-full border border-[#d9bd82] bg-white px-4 py-2 text-xs font-black text-[#80652e]"
                          >
                            Levantar restricción
                          </button>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>

              {/* AUDITORÍA */}

              <section className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7d7169]">
                      Trazabilidad
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Auditoría reciente
                    </h2>

                    <p className="mt-1 text-sm text-[#8b8078]">
                      Historial de decisiones tomadas por moderación.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#e4ddd7] bg-[#f5f2ef] px-4 py-2 text-xs font-black text-[#7d7169]">
                    {
                      actions.length
                    }{" "}
                    acciones
                  </span>
                </div>

                {actions.length ===
                0 ? (
                  <div className="mt-5 rounded-[24px] border border-[#e4ddd7] bg-white p-7">
                    <p className="font-black">
                      Aún no hay acciones de moderación.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e3ddd7] bg-white">
                    {actions.map(
                      (
                        action,
                        index
                      ) => (
                        <article
                          key={
                            action.action_id
                          }
                          className={`flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between ${
                            index <
                            actions.length -
                              1
                              ? "border-b border-[#eee7e2]"
                              : ""
                          }`}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="text-sm">
                                {
                                  action.display_name
                                }
                              </b>

                              <span className="rounded-full border border-[#e4ddd7] bg-[#f5f2ef] px-2.5 py-1 text-[9px] font-black text-[#7d7169]">
                                {actionLabel(
                                  action.action
                                )}
                              </span>
                            </div>

                            {action.reason && (
                              <p className="mt-2 text-sm leading-6 text-[#756b64]">
                                {
                                  action.reason
                                }
                              </p>
                            )}

                            <p className="mt-2 text-[10px] text-[#9a9088]">
                              {formatDate(
                                action.created_at
                              )}
                            </p>
                          </div>

                          {(action.target_type ===
                            "post" ||
                            action.target_type ===
                              "reply") &&
                            action.current_status ===
                              "hidden" && (
                              <button
                                type="button"
                                onClick={() =>
                                  restore(
                                    action
                                  )
                                }
                                className="shrink-0 rounded-full border border-[#c5dfcf] bg-[#eef8f1] px-4 py-2 text-xs font-black text-[#397053]"
                              >
                                Restaurar contenido
                              </button>
                            )}
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>

              {/* PRINCIPIO */}

              <section className="mt-7 rounded-[22px] border border-[#e4ddd7] border-l-4 border-l-[#b5a99d] bg-[#f5f2ef] p-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e4ddd7] font-black text-[#5b5048]">
                    ◉
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                      Principio de moderación
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      Reportar no significa condenar
                    </h3>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8a8078]">
                      Los reportes sirven para priorizar revisión humana. El contenido solo cambia de estado cuando una decisión administrativa lo determina y toda acción queda registrada en auditoría.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </RoleGate>
  );
}