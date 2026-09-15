"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";

import {
  getAdminAuthorBalances,
  getAdminAuthorEarningsDetail,
  getAdminFlaggedEarnings,
  getAdminPayoutProfile,
  markEarningsPaid,
  resolveFlaggedEarnings,
  type AuthorBalance,
  type AuthorEarningDetail,
  type FlaggedEarning,
  type PayoutProfile,
} from "@/lib/authorPayouts";
import {
  cancelAbandonedPurchases,
  getAbandonedPurchases,
  reconcileStuckPurchases,
  type AbandonedPurchase,
  type ReconcileStuckResult,
} from "@/lib/adminPurchases";

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function isAvailableNow(earning: AuthorEarningDetail) {
  return (
    earning.status === "pending_release" &&
    new Date(earning.available_at).getTime() <= Date.now()
  );
}

const STATUS_LABEL: Record<
  AuthorEarningDetail["status"],
  string
> = {
  pending_release: "En retención",
  paid: "Pagado",
  voided: "Anulada",
  flagged_for_review: "Requiere revisión",
};

const STATUS_STYLE: Record<
  AuthorEarningDetail["status"],
  string
> = {
  pending_release:
    "border-[#ead5aa] bg-[#fff8e8] text-[#87672e]",
  paid: "border-[#c9dfd1] bg-[#eef8f1] text-[#397053]",
  voided: "border-[#e4ddd7] bg-[#f5f2ef] text-[#7d7169]",
  flagged_for_review:
    "border-[#efc1b9] bg-[#fff2ef] text-[#a34d43]",
};

function AuthorDetailPanel({
  balance,
  onChanged,
}: {
  balance: AuthorBalance;
  onChanged: () => Promise<void>;
}) {
  const [earnings, setEarnings] = useState<
    AuthorEarningDetail[]
  >([]);

  const [payoutProfile, setPayoutProfile] =
    useState<PayoutProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set()
  );

  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [detail, profile] = await Promise.all([
        getAdminAuthorEarningsDetail(balance.author_id),
        getAdminPayoutProfile(balance.author_id),
      ]);

      setEarnings(detail);
      setPayoutProfile(profile);
      setSelected(new Set());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el detalle de este autor."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance.author_id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMarkPaid() {
    if (selected.size === 0) return;

    setMarking(true);
    setMarkError("");

    try {
      await markEarningsPaid(Array.from(selected));
      await load();
      await onChanged();
    } catch (err) {
      setMarkError(
        err instanceof Error
          ? err.message
          : "No se pudo marcar como pagado."
      );
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="mt-4 rounded-[22px] border border-[#e3ddd7] bg-[#faf9f7] p-5 md:p-6">
      {/* DATOS BANCARIOS */}

      <section className="rounded-[18px] border border-[#dfd8d2] bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
          Datos para transferencia
        </p>

        {payoutProfile ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9a9088]">
                Banco
              </p>
              <p className="mt-1 text-sm font-black text-[#3c342e]">
                {payoutProfile.bank_name}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9a9088]">
                CLABE
              </p>
              <p className="mt-1 text-sm font-black text-[#3c342e]">
                {payoutProfile.clabe}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9a9088]">
                Titular
              </p>
              <p className="mt-1 text-sm font-black text-[#3c342e]">
                {payoutProfile.account_holder_name}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#8b8078]">
            Este autor todavía no registró su cuenta bancaria.
          </p>
        )}
      </section>

      {error && (
        <div className="mt-4 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
          {error}
        </div>
      )}

      {/* MOVIMIENTOS */}

      <section className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
            Movimientos
          </p>

          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={selected.size === 0 || marking}
            className="rounded-full bg-[#367b57] px-4 py-2 text-xs font-black text-white transition hover:bg-[#2f6d4d] disabled:opacity-40"
          >
            {marking
              ? "Guardando..."
              : `Marcar ${selected.size || ""} como pagado`.trim()}
          </button>
        </div>

        {markError && (
          <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
            {markError}
          </div>
        )}

        {loading ? (
          <div className="mt-3 h-24 animate-pulse rounded-[16px] bg-[#f5f2ef]" />
        ) : earnings.length === 0 ? (
          <p className="mt-3 text-sm text-[#8b8078]">
            Este autor todavía no tiene ganancias registradas.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[16px] border border-[#e3ddd7] bg-white">
            {earnings.map((earning, index) => {
              const available = isAvailableNow(earning);

              return (
                <div
                  key={earning.id}
                  className={`flex flex-wrap items-center gap-4 p-4 ${
                    index < earnings.length - 1
                      ? "border-b border-[#eee7e2]"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(earning.id)}
                    disabled={!available}
                    onChange={() => toggle(earning.id)}
                    className="h-4 w-4 accent-[#367b57] disabled:opacity-30"
                  />

                  <div className="min-w-[140px] flex-1">
                    <p className="text-sm font-black text-[#3c342e]">
                      {earning.book_slug}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#9a9088]">
                      Compra {earning.purchase_id.slice(0, 8)} ·{" "}
                      {formatDate(earning.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-[#3c342e]">
                      {money(earning.author_share_mxn)}
                    </p>
                    <p className="text-[10px] text-[#9a9088]">
                      bruto {money(earning.gross_amount_mxn)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black ${STATUS_STYLE[earning.status]}`}
                  >
                    {available
                      ? "Disponible"
                      : STATUS_LABEL[earning.status]}
                  </span>

                  <p className="w-full text-[10px] text-[#9a9088] sm:w-auto">
                    {earning.status === "paid"
                      ? `Pagado ${formatDate(earning.payout_at)}`
                      : `Disponible desde ${formatDate(earning.available_at)}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FlaggedReviewSection({
  flagged,
  onChanged,
}: {
  flagged: FlaggedEarning[];
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const [showResolved, setShowResolved] = useState(false);
  const [resolvedHistory, setResolvedHistory] = useState<
    FlaggedEarning[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const rows = await getAdminFlaggedEarnings(true);
      setResolvedHistory(rows.filter((row) => row.resolved_at));
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el historial de resueltas."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleToggleHistory() {
    const next = !showResolved;
    setShowResolved(next);
    if (next && resolvedHistory.length === 0) {
      await loadHistory();
    }
  }

  async function handleResolve() {
    if (selected.size === 0 || !note.trim()) return;

    setResolving(true);
    setResolveError("");

    try {
      await resolveFlaggedEarnings(Array.from(selected), note);
      setSelected(new Set());
      setNote("");
      await onChanged();
      if (showResolved) await loadHistory();
    } catch (err) {
      setResolveError(
        err instanceof Error
          ? err.message
          : "No se pudo resolver la selección."
      );
    } finally {
      setResolving(false);
    }
  }

  const hasPending = flagged.length > 0;

  return (
    <section
      className={`mt-6 overflow-hidden rounded-[26px] border bg-white shadow-[0_10px_28px_rgba(64,43,29,0.04)] ${
        hasPending ? "border-[#efc1b9]" : "border-[#d6e5db]"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-6 ${
          hasPending
            ? "border-[#f3e2de] bg-[#fff7f5]"
            : "border-[#e5efe8] bg-[#f6fbf8]"
        }`}
      >
        <div>
          <p
            className={`text-[10px] font-black uppercase tracking-[0.14em] ${
              hasPending ? "text-[#a34d43]" : "text-[#397053]"
            }`}
          >
            Requiere revisión
          </p>
          <h2 className="mt-1 text-lg font-black text-[#3c342e]">
            {hasPending
              ? `${flagged.length} ganancia${
                  flagged.length === 1 ? "" : "s"
                } marcada${
                  flagged.length === 1 ? "" : "s"
                } de todos los autores`
              : "Sin ganancias pendientes de revisión"}
          </h2>
        </div>

        <button
          type="button"
          onClick={handleToggleHistory}
          className="text-xs font-black text-[#877a72] underline decoration-dotted"
        >
          {showResolved ? "Ocultar resueltas" : "Ver resueltas"}
        </button>
      </div>

      {hasPending && (
        <div className="px-5 py-4 md:px-6">
          <div className="overflow-hidden rounded-[16px] border border-[#e3ddd7]">
            {flagged.map((earning, index) => (
              <div
                key={earning.id}
                className={`flex flex-wrap items-center gap-4 p-4 ${
                  index < flagged.length - 1
                    ? "border-b border-[#eee7e2]"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(earning.id)}
                  onChange={() => toggle(earning.id)}
                  className="h-4 w-4 accent-[#a34d43]"
                />

                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-black text-[#3c342e]">
                    {earning.author_name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#9a9088]">
                    {earning.book_slug} · compra{" "}
                    {earning.purchase_id.slice(0, 8)} ·{" "}
                    {formatDate(earning.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-[#3c342e]">
                    {money(earning.author_share_mxn)}
                  </p>
                  <p className="text-[10px] text-[#9a9088]">
                    bruto {money(earning.gross_amount_mxn)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Qué se decidió sobre las filas seleccionadas (obligatorio)…"
              rows={2}
              className="w-full flex-1 rounded-[14px] border border-[#e3ddd7] bg-[#faf9f7] p-3 text-sm text-[#3c342e] outline-none focus:border-[#a34d43]"
            />

            <button
              type="button"
              onClick={handleResolve}
              disabled={selected.size === 0 || !note.trim() || resolving}
              className="rounded-full bg-[#a34d43] px-5 py-3 text-xs font-black text-white transition hover:bg-[#8f4139] disabled:opacity-40"
            >
              {resolving
                ? "Guardando..."
                : `Resolver ${selected.size || ""}`.trim()}
            </button>
          </div>

          {resolveError && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {resolveError}
            </div>
          )}
        </div>
      )}

      {showResolved && (
        <div className="border-t border-[#eee7e2] bg-[#faf9f7] px-5 py-4 md:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
            Historial de resueltas
          </p>

          {historyError && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {historyError}
            </div>
          )}

          {historyLoading ? (
            <div className="mt-3 h-16 animate-pulse rounded-[16px] bg-[#f0ece7]" />
          ) : resolvedHistory.length === 0 ? (
            <p className="mt-3 text-sm text-[#8b8078]">
              Todavía no hay ninguna resuelta.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-[16px] border border-[#e3ddd7] bg-white">
              {resolvedHistory.map((earning, index) => (
                <div
                  key={earning.id}
                  className={`p-4 ${
                    index < resolvedHistory.length - 1
                      ? "border-b border-[#eee7e2]"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#3c342e]">
                      {earning.author_name} · {earning.book_slug}
                    </p>
                    <p className="text-[10px] text-[#9a9088]">
                      Resuelto por {earning.resolved_by_admin_name} ·{" "}
                      {formatDate(earning.resolved_at)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-[#6f665f]">
                    {earning.resolution_note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AbandonedPurchasesSection({
  purchases,
  onChanged,
}: {
  purchases: AbandonedPurchase[];
  onChanged: () => Promise<void>;
}) {
  const bucketA = purchases.filter(
    (p) => p.bucket === "no_payment_attempt"
  );
  const bucketB = purchases.filter(
    (p) => p.bucket === "stuck_mp_pending"
  );

  const [selectedA, setSelectedA] = useState<Set<string>>(
    new Set()
  );
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState("");
  const [reconcileResults, setReconcileResults] = useState<
    ReconcileStuckResult[]
  >([]);

  useEffect(() => {
    setSelectedA(new Set(bucketA.map((p) => p.id)));
    // Los resultados de una reconciliación anterior ya no aplican a una
    // lista nueva — se limpian cuando cambia el set de compras.
    setReconcileResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases]);

  function toggleA(id: string) {
    setSelectedA((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCancel() {
    if (selectedA.size === 0) return;

    setCancelling(true);
    setCancelError("");

    try {
      await cancelAbandonedPurchases(Array.from(selectedA));
      await onChanged();
    } catch (err) {
      setCancelError(
        err instanceof Error
          ? err.message
          : "No se pudieron cancelar las compras seleccionadas."
      );
    } finally {
      setCancelling(false);
    }
  }

  async function handleReconcile() {
    if (bucketB.length === 0) return;

    setReconciling(true);
    setReconcileError("");

    try {
      const { results } = await reconcileStuckPurchases(
        bucketB.map((p) => p.id)
      );
      setReconcileResults(results);
      await onChanged();
    } catch (err) {
      setReconcileError(
        err instanceof Error
          ? err.message
          : "No se pudo reconciliar con Mercado Pago."
      );
    } finally {
      setReconciling(false);
    }
  }

  const isEmpty = purchases.length === 0;

  return (
    <section
      className={`mt-6 overflow-hidden rounded-[26px] border bg-white shadow-[0_10px_28px_rgba(64,43,29,0.04)] ${
        isEmpty ? "border-[#d6e5db]" : "border-[#ddd6d0]"
      }`}
    >
      <div
        className={`border-b px-5 py-4 md:px-6 ${
          isEmpty
            ? "border-[#e5efe8] bg-[#f6fbf8]"
            : "border-[#eee7e2] bg-[#faf9f7]"
        }`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
          Compras pendientes sin resolver
        </p>
        <h2 className="mt-1 text-lg font-black text-[#3c342e]">
          {isEmpty
            ? "Sin compras abandonadas pendientes"
            : `${purchases.length} compra${
                purchases.length === 1 ? "" : "s"
              } requiere${purchases.length === 1 ? "" : "n"} atención`}
        </h2>
      </div>

      {bucketA.length > 0 && (
        <div className="border-b border-[#eee7e2] px-5 py-4 md:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#877a72]">
            Sin intento de pago (más de 24h) · {bucketA.length}
          </p>

          <div className="mt-3 overflow-hidden rounded-[16px] border border-[#e3ddd7]">
            {bucketA.map((purchase, index) => (
              <div
                key={purchase.id}
                className={`flex flex-wrap items-center gap-4 p-4 ${
                  index < bucketA.length - 1
                    ? "border-b border-[#eee7e2]"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedA.has(purchase.id)}
                  onChange={() => toggleA(purchase.id)}
                  className="h-4 w-4 accent-[#877a72]"
                />

                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-black text-[#3c342e]">
                    {purchase.buyer_name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#9a9088]">
                    {purchase.work_title} · {formatDate(purchase.created_at)}
                  </p>
                </div>

                <p className="text-sm font-black text-[#3c342e]">
                  {money(purchase.amount_mxn)}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={selectedA.size === 0 || cancelling}
            className="mt-4 rounded-full bg-[#7d7169] px-5 py-3 text-xs font-black text-white transition hover:bg-[#5b5048] disabled:opacity-40"
          >
            {cancelling
              ? "Cancelando..."
              : `Cancelar ${selectedA.size || ""}`.trim()}
          </button>

          {cancelError && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {cancelError}
            </div>
          )}
        </div>
      )}

      {bucketB.length > 0 && (
        <div className="px-5 py-4 md:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#877a72]">
            Pagos de Mercado Pago sin resolver · {bucketB.length}
          </p>

          <div className="mt-3 overflow-hidden rounded-[16px] border border-[#e3ddd7]">
            {bucketB.map((purchase, index) => {
              const result = reconcileResults.find(
                (r) => r.purchaseId === purchase.id
              );

              return (
                <div
                  key={purchase.id}
                  className={`p-4 ${
                    index < bucketB.length - 1
                      ? "border-b border-[#eee7e2]"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-black text-[#3c342e]">
                        {purchase.buyer_name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#9a9088]">
                        {purchase.work_title} ·{" "}
                        {formatDate(purchase.created_at)} · pago{" "}
                        {purchase.provider_payment_id}
                      </p>
                    </div>

                    <p className="text-sm font-black text-[#3c342e]">
                      {money(purchase.amount_mxn)}
                    </p>

                    {purchase.needs_manual_review && (
                      <span className="rounded-full border border-[#efc1b9] bg-[#fff2ef] px-3 py-1 text-[9px] font-black text-[#a34d43]">
                        7+ días · revisar manualmente
                      </span>
                    )}
                  </div>

                  {result && (
                    <p
                      className={`mt-2 text-xs font-bold ${
                        result.error
                          ? "text-[#a34d43]"
                          : "text-[#397053]"
                      }`}
                    >
                      {result.error
                        ? `Error: ${result.error}`
                        : `Resultado de Mercado Pago: ${result.newStatus}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            className="mt-4 rounded-full border border-[#877a72] px-5 py-3 text-xs font-black text-[#5b5048] transition hover:bg-[#f5f2ef] disabled:opacity-40"
          >
            {reconciling
              ? "Verificando con Mercado Pago..."
              : "Reintentar verificación con Mercado Pago"}
          </button>

          {reconcileError && (
            <div className="mt-3 rounded-[14px] border border-[#efc1b9] bg-[#fff2ef] p-3 text-sm font-bold text-[#a34d43]">
              {reconcileError}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function AdminPaymentsPage() {
  const [balances, setBalances] = useState<
    AuthorBalance[]
  >([]);

  const [flaggedEarnings, setFlaggedEarnings] = useState<
    FlaggedEarning[]
  >([]);

  const [abandonedPurchases, setAbandonedPurchases] =
    useState<AbandonedPurchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<
    string | null
  >(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [rows, flagged, abandoned] = await Promise.all([
        getAdminAuthorBalances(),
        getAdminFlaggedEarnings(),
        getAbandonedPurchases(),
      ]);

      setBalances(
        [...rows].sort(
          (a, b) => b.available_mxn - a.available_mxn
        )
      );
      setFlaggedEarnings(flagged);
      setAbandonedPurchases(abandoned);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el panel de pagos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = balances.reduce(
    (acc, row) => ({
      available: acc.available + row.available_mxn,
      pending: acc.pending + row.pending_release_mxn,
      flagged: acc.flagged + row.flagged_count,
    }),
    { available: 0, pending: 0, flagged: 0 }
  );

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#b95016]"
          >
            ← Volver a administración
          </Link>

          {/* HERO */}

          <section className="mt-4 overflow-hidden rounded-[30px] border border-[#c9dfd1] bg-gradient-to-br from-white via-[#fbfdfb] to-[#eef8f1] px-6 py-7 shadow-[0_10px_30px_rgba(53,102,74,0.04)] md:px-8 md:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#397053]">
                  SEBORO · PAGOS A AUTORES
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Saldos y pagos
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#748078] md:text-base">
                  Revisa el saldo disponible de cada autor y
                  marca como pagado después de transferir por
                  fuera del sistema.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[18px] border border-[#c9dfd1] bg-white/85 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#6f8275]">
                    Disponible
                  </p>
                  <p className="mt-1 text-lg font-black text-[#397053]">
                    {money(totals.available)}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#ead5aa] bg-[#fff8e8] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#87672e]">
                    En retención
                  </p>
                  <p className="mt-1 text-lg font-black text-[#87672e]">
                    {money(totals.pending)}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#a34d43]">
                    Marcadas
                  </p>
                  <p className="mt-1 text-lg font-black text-[#a34d43]">
                    {totals.flagged}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="mt-5 rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
              {error}
            </div>
          )}

          {!loading && (
            <FlaggedReviewSection
              flagged={flaggedEarnings}
              onChanged={load}
            />
          )}

          {loading ? (
            <div className="mt-5 rounded-[24px] border border-[#e4ddd7] bg-white p-8">
              <div className="h-5 w-40 animate-pulse rounded-full bg-[#eee9e5]" />
              <div className="mt-5 h-56 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
            </div>
          ) : balances.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-[#d6e5db] bg-white p-8 text-center">
              <h3 className="text-lg font-black">
                Todavía no hay ganancias registradas
              </h3>
              <p className="mt-2 text-sm text-[#8c8179]">
                Cuando una compra se marque como pagada,
                aparecerá aquí el saldo del autor.
              </p>
            </div>
          ) : (
            <section className="mt-6 space-y-4">
              {balances.map((balance) => {
                const open = selectedAuthorId === balance.author_id;

                return (
                  <article
                    key={balance.author_id}
                    className="overflow-hidden rounded-[26px] border border-[#e2d8d0] bg-white shadow-[0_10px_28px_rgba(64,43,29,0.04)]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAuthorId(open ? null : balance.author_id)
                      }
                      className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-5 text-left md:px-6"
                    >
                      <div>
                        <h2 className="text-lg font-black text-[#2e2722]">
                          {balance.author_name}
                        </h2>
                        <p className="mt-1 text-[10px] text-[#9a9088]">
                          Próxima liberación:{" "}
                          {formatDate(balance.next_release_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {balance.flagged_count > 0 && (
                          <span className="rounded-full border border-[#efc1b9] bg-[#fff2ef] px-3 py-1 text-[9px] font-black text-[#a34d43]">
                            {balance.flagged_count} para revisión
                          </span>
                        )}

                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9a9088]">
                            En retención
                          </p>
                          <p className="text-sm font-black text-[#87672e]">
                            {money(balance.pending_release_mxn)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9a9088]">
                            Disponible
                          </p>
                          <p className="text-sm font-black text-[#397053]">
                            {money(balance.available_mxn)}
                          </p>
                        </div>

                        <span className="text-lg text-[#877a72]">
                          {open ? "−" : "+"}
                        </span>
                      </div>
                    </button>

                    {open && (
                      <div className="px-5 pb-5 md:px-6">
                        <AuthorDetailPanel
                          balance={balance}
                          onChanged={load}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {!loading && (
            <AbandonedPurchasesSection
              purchases={abandonedPurchases}
              onChanged={load}
            />
          )}
        </div>
      </main>
    </RoleGate>
  );
}
