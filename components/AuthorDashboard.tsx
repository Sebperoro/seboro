"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMyWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";

import {
  completionRate,
  getMyAuthorMetrics,
  getWorkState,
  type RealAuthorMetric,
  type WorkState,
} from "@/lib/authorMetrics";

import {
  getMyAuthorEarningsHistory,
  getMyAuthorEarningsSummary,
  getMyPayoutProfile,
  isValidClabe,
  upsertMyPayoutProfile,
  type AuthorEarningsHistoryItem,
  type AuthorEarningsSummary,
  type PayoutProfile,
} from "@/lib/authorPayouts";

type DashboardTab =
  | "works"
  | "performance"
  | "community"
  | "economy";

type EconomyTab =
  | "summary"
  | "income"
  | "payments";

type PeriodKey =
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "year";

type MetricKey =
  | "revenue"
  | "sales"
  | "readers"
  | "interactions";

type DemoHistoryPoint = {
  label: string;
  revenue: number;
  sales: number;
  readers: number;
  interactions: number;
};

type DemoPeriod = {
  label: string;
  comparisonLabel: string;

  revenue: number;
  previousRevenue: number;

  sales: number;
  previousSales: number;

  readers: number;
  previousReaders: number;

  interactions: number;
  previousInteractions: number;

  history: DemoHistoryPoint[];
};

const DEMO_ANALYTICS: Record<
  PeriodKey,
  DemoPeriod
> = {
  "7d": {
    label: "Últimos 7 días",
    comparisonLabel:
      "7 días anteriores",

    revenue: 1120,
    previousRevenue: 870,

    sales: 12,
    previousSales: 9,

    readers: 38,
    previousReaders: 31,

    interactions: 74,
    previousInteractions: 59,

    history: [
      {
        label: "Jue",
        revenue: 90,
        sales: 1,
        readers: 5,
        interactions: 7,
      },
      {
        label: "Vie",
        revenue: 130,
        sales: 1,
        readers: 5,
        interactions: 8,
      },
      {
        label: "Sáb",
        revenue: 160,
        sales: 2,
        readers: 6,
        interactions: 11,
      },
      {
        label: "Dom",
        revenue: 125,
        sales: 1,
        readers: 4,
        interactions: 8,
      },
      {
        label: "Lun",
        revenue: 180,
        sales: 2,
        readers: 6,
        interactions: 12,
      },
      {
        label: "Mar",
        revenue: 195,
        sales: 2,
        readers: 5,
        interactions: 13,
      },
      {
        label: "Mié",
        revenue: 240,
        sales: 3,
        readers: 7,
        interactions: 15,
      },
    ],
  },

  "30d": {
    label: "Últimos 30 días",
    comparisonLabel:
      "30 días anteriores",

    revenue: 3800,
    previousRevenue: 3070,

    sales: 38,
    previousSales: 31,

    readers: 91,
    previousReaders: 79,

    interactions: 146,
    previousInteractions: 121,

    history: [
      {
        label: "Sem 1",
        revenue: 660,
        sales: 7,
        readers: 17,
        interactions: 25,
      },
      {
        label: "Sem 2",
        revenue: 790,
        sales: 8,
        readers: 19,
        interactions: 30,
      },
      {
        label: "Sem 3",
        revenue: 1010,
        sales: 10,
        readers: 24,
        interactions: 39,
      },
      {
        label: "Sem 4",
        revenue: 1340,
        sales: 13,
        readers: 31,
        interactions: 52,
      },
    ],
  },

  "3m": {
    label: "Últimos 3 meses",
    comparisonLabel:
      "3 meses anteriores",

    revenue: 9190,
    previousRevenue: 6810,

    sales: 93,
    previousSales: 69,

    readers: 224,
    previousReaders: 174,

    interactions: 398,
    previousInteractions: 302,

    history: [
      {
        label: "Jun",
        revenue: 2320,
        sales: 24,
        readers: 58,
        interactions: 98,
      },
      {
        label: "Jul",
        revenue: 3070,
        sales: 31,
        readers: 75,
        interactions: 132,
      },
      {
        label: "Ago",
        revenue: 3800,
        sales: 38,
        readers: 91,
        interactions: 168,
      },
    ],
  },

  "6m": {
    label: "Últimos 6 meses",
    comparisonLabel:
      "6 meses anteriores",

    revenue: 14670,
    previousRevenue: 10280,

    sales: 148,
    previousSales: 105,

    readers: 357,
    previousReaders: 268,

    interactions: 648,
    previousInteractions: 482,

    history: [
      {
        label: "Mar",
        revenue: 1190,
        sales: 12,
        readers: 31,
        interactions: 54,
      },
      {
        label: "Abr",
        revenue: 1350,
        sales: 14,
        readers: 35,
        interactions: 61,
      },
      {
        label: "May",
        revenue: 1940,
        sales: 20,
        readers: 47,
        interactions: 84,
      },
      {
        label: "Jun",
        revenue: 2320,
        sales: 24,
        readers: 58,
        interactions: 98,
      },
      {
        label: "Jul",
        revenue: 3070,
        sales: 31,
        readers: 75,
        interactions: 132,
      },
      {
        label: "Ago",
        revenue: 4800,
        sales: 47,
        readers: 111,
        interactions: 219,
      },
    ],
  },

  year: {
    label: "Este año",
    comparisonLabel:
      "mismo periodo anterior",

    revenue: 21640,
    previousRevenue: 15200,

    sales: 219,
    previousSales: 155,

    readers: 528,
    previousReaders: 392,

    interactions: 986,
    previousInteractions: 711,

    history: [
      {
        label: "Ene",
        revenue: 760,
        sales: 8,
        readers: 22,
        interactions: 37,
      },
      {
        label: "Feb",
        revenue: 910,
        sales: 9,
        readers: 26,
        interactions: 43,
      },
      {
        label: "Mar",
        revenue: 1190,
        sales: 12,
        readers: 31,
        interactions: 54,
      },
      {
        label: "Abr",
        revenue: 1350,
        sales: 14,
        readers: 35,
        interactions: 61,
      },
      {
        label: "May",
        revenue: 1940,
        sales: 20,
        readers: 47,
        interactions: 84,
      },
      {
        label: "Jun",
        revenue: 2320,
        sales: 24,
        readers: 58,
        interactions: 98,
      },
      {
        label: "Jul",
        revenue: 3070,
        sales: 31,
        readers: 75,
        interactions: 132,
      },
      {
        label: "Ago",
        revenue: 4100,
        sales: 41,
        readers: 99,
        interactions: 188,
      },
    ],
  },
};


const DEMO_INCOME_MOVEMENTS = [
  {
    id: "i1",
    date: "Hoy · 10:16",
    title:
      "La Casa de la Niebla",
    type: "Venta",
    amount: 100,
  },
  {
    id: "i2",
    date: "Hoy · 08:42",
    title:
      "El Último Umbral",
    type: "Venta",
    amount: 100,
  },
  {
    id: "i3",
    date: "Ayer · 22:11",
    title:
      "La Casa de la Niebla",
    type: "Venta",
    amount: 100,
  },
  {
    id: "i4",
    date: "Ayer · 17:03",
    title:
      "Sombras de Invierno",
    type: "Venta",
    amount: 100,
  },
];

const periodOptions: {
  id: PeriodKey;
  label: string;
}[] = [
  {
    id: "7d",
    label: "7 días",
  },
  {
    id: "30d",
    label: "30 días",
  },
  {
    id: "3m",
    label: "3 meses",
  },
  {
    id: "6m",
    label: "6 meses",
  },
  {
    id: "year",
    label: "Este año",
  },
];

const metricMeta: Record<
  MetricKey,
  {
    label: string;
    shortLabel: string;
    color: string;
    soft: string;
    icon: string;
  }
> = {
  revenue: {
    label: "Ingresos brutos",
    shortLabel: "Ingresos",
    color: "#2f855a",
    soft: "#edf8f0",
    icon: "$",
  },

  sales: {
    label: "Obras vendidas",
    shortLabel: "Ventas",
    color: "#3b82f6",
    soft: "#eff6ff",
    icon: "◫",
  },

  readers: {
    label: "Lectores",
    shortLabel: "Lectores",
    color: "#7c3aed",
    soft: "#f5f3ff",
    icon: "👥",
  },

  interactions: {
    label: "Interacciones",
    shortLabel:
      "Interacciones",
    color: "#64748b",
    soft: "#f1f5f9",
    icon: "💬",
  },
};

function number(
  value: number
) {
  return value.toLocaleString(
    "es-MX"
  );
}

function money(
  value: number
) {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function earningStatusLabel(
  movement: AuthorEarningsHistoryItem
) {
  if (movement.status === "paid") return "Pagado";
  if (movement.status === "voided") return "Anulada";
  if (movement.status === "flagged_for_review") {
    return "Requiere revisión";
  }

  return new Date(
    movement.available_at
  ).getTime() <= Date.now()
    ? "Disponible"
    : "En retención";
}

function shortDate(
  value: string | null
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(value));
}

function percentChange(
  current: number,
  previous: number
) {
  if (previous === 0) {
    return null;
  }

  return (
    ((current - previous) /
      previous) *
    100
  );
}

function pointValue(
  point: DemoHistoryPoint,
  metric: MetricKey
) {
  if (
    metric === "revenue"
  ) {
    return point.revenue;
  }

  if (
    metric === "sales"
  ) {
    return point.sales;
  }

  if (
    metric === "readers"
  ) {
    return point.readers;
  }

  return point.interactions;
}

function demoCurrent(
  demo: DemoPeriod,
  metric: MetricKey
) {
  if (
    metric === "revenue"
  ) {
    return demo.revenue;
  }

  if (
    metric === "sales"
  ) {
    return demo.sales;
  }

  if (
    metric === "readers"
  ) {
    return demo.readers;
  }

  return demo.interactions;
}

function demoPrevious(
  demo: DemoPeriod,
  metric: MetricKey
) {
  if (
    metric === "revenue"
  ) {
    return demo.previousRevenue;
  }

  if (
    metric === "sales"
  ) {
    return demo.previousSales;
  }

  if (
    metric === "readers"
  ) {
    return demo.previousReaders;
  }

  return demo.previousInteractions;
}

function metricValue(
  metric: MetricKey,
  value: number
) {
  if (
    metric === "revenue"
  ) {
    return money(value);
  }

  return number(value);
}

function stateClass(
  state: WorkState
) {
  if (
    state === "Creciendo"
  ) {
    return "border-[#a9d7b8] bg-[#edf8f0] text-[#267444]";
  }

  if (
    state ===
    "Disminuyendo"
  ) {
    return "border-[#efc2bc] bg-[#fff2f0] text-[#a74e43]";
  }

  if (
    state === "En reposo"
  ) {
    return "border-[#ded7d1] bg-[#f5f2ef] text-[#786f68]";
  }

  return "border-[#bcd5e9] bg-[#eff7fc] text-[#39718e]";
}

function publicationLabel(
  work: PublishedWork
) {
  if (
    work.publication_status ===
    "published"
  ) {
    return "Publicada";
  }

  if (
    work.publication_status ===
    "human_review"
  ) {
    return "Revisión humana";
  }

  if (
    work.publication_status ===
    "in_review"
  ) {
    return "En revisión";
  }

  if (
    work.publication_status ===
    "changes_requested"
  ) {
    return "Cambios solicitados";
  }

  if (
    work.publication_status ===
    "approved"
  ) {
    return "Aprobada";
  }

  return "Borrador";
}

function statusClass(
  work: PublishedWork
) {
  if (
    work.publication_status ===
    "published"
  ) {
    return "border-[#a9d7b8] bg-[#edf8f0] text-[#267444]";
  }

  if (
    work.publication_status ===
      "in_review" ||
    work.publication_status ===
      "human_review"
  ) {
    return "border-[#e7cda2] bg-[#fff8e8] text-[#8d6728]";
  }

  if (
    work.publication_status ===
    "changes_requested"
  ) {
    return "border-[#efc2bc] bg-[#fff2f0] text-[#a74e43]";
  }

  if (
    work.publication_status ===
    "approved"
  ) {
    return "border-[#bcd5e9] bg-[#eff7fc] text-[#39718e]";
  }

  return "border-[#ded5ce] bg-[#f7f3f0] text-[#756c65]";
}

function workStatusLabel(
  work: PublishedWork
) {
  return work.work_status ===
    "finished"
    ? "Terminada"
    : "En proceso";
}

function TrendBadge({
  current,
  previous,
  comparisonLabel,
}: {
  current: number;
  previous: number;
  comparisonLabel: string;
}) {
  const change =
    percentChange(
      current,
      previous
    );

  if (change === null) {
    return null;
  }

  const positive =
    change > 0;

  const neutral =
    Math.abs(change) <
    0.05;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
        neutral
          ? "bg-[#f2f0ee] text-[#766d66]"
          : positive
          ? "bg-[#edf8f0] text-[#2d7447]"
          : "bg-[#fff1ef] text-[#a84f43]"
      }`}
    >
      {neutral
        ? "→"
        : positive
        ? "↑"
        : "↓"}{" "}
      {change > 0
        ? "+"
        : ""}
      {change.toFixed(
        1
      )}
      % vs.{" "}
      {comparisonLabel}
    </span>
  );
}

function MetricCard({
  metric,
  value,
  current,
  previous,
  comparisonLabel,
}: {
  metric: MetricKey;
  value: string;
  current: number;
  previous: number;
  comparisonLabel: string;
}) {
  const meta =
    metricMeta[
      metric
    ];

  return (
    <article className="rounded-[20px] border border-[#e6ddd6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
            {meta.label}
          </p>

          <p className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#342d28]">
            {value}
          </p>
        </div>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black"
          style={{
            background:
              meta.soft,

            color:
              meta.color,
          }}
        >
          {meta.icon}
        </div>
      </div>

      <div className="mt-3">
        <TrendBadge
          current={
            current
          }
          previous={
            previous
          }
          comparisonLabel={
            comparisonLabel
          }
        />
      </div>
    </article>
  );
}

function CompactLineChart({
  history,
  metric,
}: {
  history: DemoHistoryPoint[];
  metric: MetricKey;
}) {
  const meta =
    metricMeta[
      metric
    ];

  const values =
    history.map(
      (point) =>
        pointValue(
          point,
          metric
        )
    );

  const maxValue =
    Math.max(
      ...values,
      1
    );

  const width = 720;
  const height = 170;

  const left = 18;
  const right = 18;
  const top = 20;
  const bottom = 24;

  const usableWidth =
    width -
    left -
    right;

  const usableHeight =
    height -
    top -
    bottom;

  const points =
    values.map(
      (
        value,
        index
      ) => {
        const x =
          history.length ===
          1
            ? width / 2
            : left +
              (index /
                (history.length -
                  1)) *
                usableWidth;

        const y =
          top +
          usableHeight -
          (value /
            maxValue) *
            usableHeight;

        return {
          x,
          y,
          value,
          label:
            history[
              index
            ].label,
        };
      }
    );

  const linePath =
    points
      .map(
        (
          point,
          index
        ) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${point.x} ${point.y}`
      )
      .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${
          points[
            points.length -
              1
          ].x
        } ${
          height -
          bottom
        } L ${
          points[0].x
        } ${
          height -
          bottom
        } Z`
      : "";

  const gradientId =
    `seboro-${metric}-gradient`;

  return (
    <div className="h-[210px] w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`Evolución de ${meta.label}`}
      >
        <defs>
          <linearGradient
            id={
              gradientId
            }
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={
                meta.color
              }
              stopOpacity="0.22"
            />

            <stop
              offset="100%"
              stopColor={
                meta.color
              }
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(
          (ratio) => {
            const y =
              top +
              usableHeight *
                ratio;

            return (
              <line
                key={
                  ratio
                }
                x1={
                  left
                }
                x2={
                  width -
                  right
                }
                y1={y}
                y2={y}
                stroke="#ece7e2"
                strokeWidth="1"
              />
            );
          }
        )}

        {areaPath && (
          <path
            d={
              areaPath
            }
            fill={`url(#${gradientId})`}
          />
        )}

        {linePath && (
          <path
            d={
              linePath
            }
            fill="none"
            stroke={
              meta.color
            }
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map(
          (
            point,
            index
          ) => (
            <g
              key={
                point.label
              }
            >
              <circle
                cx={
                  point.x
                }
                cy={
                  point.y
                }
                r="5"
                fill="white"
                stroke={
                  meta.color
                }
                strokeWidth="3"
              >
                <title>
                  {point.label}
                  {": "}
                  {metricValue(
                    metric,
                    point.value
                  )}
                </title>
              </circle>

              <text
                x={
                  point.x
                }
                y={
                  height -
                  5
                }
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#81766e"
              >
                {
                  point.label
                }
              </text>

              {index ===
                points.length -
                  1 && (
                <text
                  x={
                    point.x -
                    4
                  }
                  y={
                    Math.max(
                      12,
                      point.y -
                        12
                    )
                  }
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="800"
                  fill={
                    meta.color
                  }
                >
                  {metricValue(
                    metric,
                    point.value
                  )}
                </text>
              )}
            </g>
          )
        )}
      </svg>
    </div>
  );
}

function PayoutProfileForm({
  initialProfile,
  onCancel,
  onSaved,
}: {
  initialProfile: PayoutProfile | null;
  onCancel: () => void;
  onSaved: (profile: PayoutProfile) => void;
}) {
  const [bankName, setBankName] = useState(
    initialProfile?.bank_name || ""
  );

  const [clabe, setClabe] = useState(
    initialProfile?.clabe || ""
  );

  const [accountHolderName, setAccountHolderName] =
    useState(
      initialProfile?.account_holder_name || ""
    );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const clabeTouched = clabe.length > 0;
  const clabeValid =
    !clabeTouched || isValidClabe(clabe);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!isValidClabe(clabe)) {
      setError(
        "La CLABE no es válida. Revisa que tenga 18 dígitos y que el dígito verificador coincida."
      );
      return;
    }

    setSaving(true);

    try {
      const saved = await upsertMyPayoutProfile({
        bankName,
        clabe,
        accountHolderName,
      });

      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar tu cuenta bancaria."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3"
    >
      <div>
        <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[#91847a]">
          Banco
        </label>

        <input
          type="text"
          value={bankName}
          onChange={(event) =>
            setBankName(event.target.value)
          }
          required
          placeholder="BBVA"
          className="mt-1 w-full rounded-[12px] border border-[#dfd8d2] px-3 py-2 text-sm outline-none focus:border-[#8bb79b]"
        />
      </div>

      <div>
        <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[#91847a]">
          CLABE (18 dígitos)
        </label>

        <input
          type="text"
          inputMode="numeric"
          maxLength={18}
          value={clabe}
          onChange={(event) =>
            setClabe(
              event.target.value.replace(
                /\D/g,
                ""
              )
            )
          }
          required
          placeholder="032180000118359719"
          className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm outline-none ${
            clabeValid
              ? "border-[#dfd8d2] focus:border-[#8bb79b]"
              : "border-[#e3bdb7]"
          }`}
        />

        {!clabeValid && (
          <p className="mt-1 text-[10px] font-semibold text-[#a34d43]">
            El dígito verificador no coincide.
            Revisa la CLABE.
          </p>
        )}
      </div>

      <div>
        <label className="text-[9px] font-black uppercase tracking-[0.12em] text-[#91847a]">
          Titular de la cuenta
        </label>

        <input
          type="text"
          value={accountHolderName}
          onChange={(event) =>
            setAccountHolderName(
              event.target.value
            )
          }
          required
          placeholder="Como aparece en tu banco"
          className="mt-1 w-full rounded-[12px] border border-[#dfd8d2] px-3 py-2 text-sm outline-none focus:border-[#8bb79b]"
        />
      </div>

      {error && (
        <p className="text-xs font-semibold text-[#a34d43]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#2f855a] px-4 py-2 text-xs font-black text-white transition hover:bg-[#276f4b] disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-[#dfd8d2] px-4 py-2 text-xs font-black text-[#6b6058]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function AuthorDashboard() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<DashboardTab>(
      "works"
    );

  const [
    economyTab,
    setEconomyTab,
  ] =
    useState<EconomyTab>(
      "summary"
    );

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] =
    useState<PeriodKey>(
      "30d"
    );

  const [
    selectedMetric,
    setSelectedMetric,
  ] =
    useState<MetricKey>(
      "revenue"
    );

  const [
    metrics,
    setMetrics,
  ] =
    useState<
      RealAuthorMetric[]
    >([]);

  const [
    works,
    setWorks,
  ] =
    useState<
      PublishedWork[]
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

  const [
    earningsSummary,
    setEarningsSummary,
  ] =
    useState<AuthorEarningsSummary>({
      available_mxn: 0,
      pending_release_mxn: 0,
      paid_total_mxn: 0,
      next_release_at: null,
    });

  const [
    earningsHistory,
    setEarningsHistory,
  ] =
    useState<AuthorEarningsHistoryItem[]>([]);

  const [
    payoutProfile,
    setPayoutProfile,
  ] =
    useState<PayoutProfile | null>(null);

  const [
    editingPayout,
    setEditingPayout,
  ] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [
          metricResult,
          workResult,
          summaryResult,
          historyResult,
          payoutProfileResult,
        ] =
          await Promise.all([
            getMyAuthorMetrics(),
            getMyWorks(),
            getMyAuthorEarningsSummary(),
            getMyAuthorEarningsHistory(),
            getMyPayoutProfile(),
          ]);

        if (!active) {
          return;
        }

        setMetrics(
          metricResult
        );

        setWorks(
          workResult
        );

        setEarningsSummary(
          summaryResult
        );

        setEarningsHistory(
          historyResult
        );

        setPayoutProfile(
          payoutProfileResult
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el panel del autor."
        );
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const totals =
    useMemo(() => {
      return metrics.reduce(
        (
          acc,
          metric
        ) => {
          acc.readers +=
            metric.readers;

          acc.reading +=
            metric.reading_now;

          acc.finished +=
            metric.finished;

          acc.posts +=
            metric.community_posts;

          acc.replies +=
            metric.community_replies;

          acc.reactions +=
            metric.community_reactions;

          acc.reviews +=
            metric.reviews;

          acc.ratingCount +=
            metric.rating_count;

          acc.ratingSum +=
            metric.average_rating *
            metric.rating_count;

          return acc;
        },
        {
          readers: 0,
          reading: 0,
          finished: 0,
          posts: 0,
          replies: 0,
          reactions: 0,
          reviews: 0,
          ratingCount: 0,
          ratingSum: 0,
        }
      );
    }, [metrics]);

  const catalogRating =
    totals.ratingCount > 0
      ? totals.ratingSum /
        totals.ratingCount
      : 0;

  const totalCommunity =
    totals.posts +
    totals.replies +
    totals.reactions;

  const totalCompletion =
    totals.readers > 0
      ? Math.min(
          100,
          (totals.finished /
            totals.readers) *
            100
        )
      : 0;

  const workBySlug =
    useMemo(
      () =>
        new Map(
          works.map(
            (work) => [
              work.slug,
              work,
            ]
          )
        ),
      [works]
    );

  const dashboardItems =
    useMemo(() => {
      const slugs =
        new Set<string>();

      works.forEach(
        (work) =>
          slugs.add(
            work.slug
          )
      );

      metrics.forEach(
        (metric) =>
          slugs.add(
            metric.book_slug
          )
      );

      return [
        ...slugs,
      ].map((slug) => {
        const work =
          workBySlug.get(
            slug
          ) || null;

        const metric =
          metrics.find(
            (item) =>
              item.book_slug ===
              slug
          ) || null;

        return {
          slug,
          work,
          metric,
        };
      });
    }, [
      works,
      metrics,
      workBySlug,
    ]);

  const publishedCount =
    works.filter(
      (work) =>
        work.publication_status ===
        "published"
    ).length;

  const growingCount =
    metrics.filter(
      (metric) =>
        getWorkState(
          metric
        ) === "Creciendo"
    ).length;

  const demo =
    DEMO_ANALYTICS[
      selectedPeriod
    ];

  const currentMetricValue =
    demoCurrent(
      demo,
      selectedMetric
    );

  const previousMetricValue =
    demoPrevious(
      demo,
      selectedMetric
    );

  const selectedChange =
    percentChange(
      currentMetricValue,
      previousMetricValue
    );

  const demoWorkRows =
    useMemo(() => {
      const titles =
        dashboardItems.length >
        0
          ? dashboardItems.map(
              (
                item
              ) =>
                item.work
                  ?.title ||
                item.slug
            )
          : [
              "La Casa de la Niebla",
              "El Último Umbral",
              "Sombras de Invierno",
            ];

      const limited =
        titles.slice(
          0,
          4
        );

      const weights =
        limited.map(
          (
            _,
            index
          ) =>
            1 /
            Math.pow(
              index + 1,
              0.7
            )
        );

      const previousWeights =
        weights.map(
          (
            weight,
            index
          ) => {
            const factor =
              [
                0.84,
                1.08,
                1.14,
                0.96,
              ][
                index
              ] || 1;

            return (
              weight *
              factor
            );
          }
        );

      const totalWeight =
        weights.reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        );

      const totalPreviousWeight =
        previousWeights.reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        );

      return limited.map(
        (
          title,
          index
        ) => {
          const share =
            weights[
              index
            ] /
            totalWeight;

          const previousShare =
            previousWeights[
              index
            ] /
            totalPreviousWeight;

          return {
            title,

            revenue:
              Math.round(
                demo.revenue *
                  share
              ),

            previousRevenue:
              Math.round(
                demo.previousRevenue *
                  previousShare
              ),

            sales:
              Math.max(
                1,
                Math.round(
                  demo.sales *
                    share
                )
              ),

            previousSales:
              Math.max(
                1,
                Math.round(
                  demo.previousSales *
                    previousShare
                )
              ),

            readers:
              Math.max(
                1,
                Math.round(
                  demo.readers *
                    share
                )
              ),

            previousReaders:
              Math.max(
                1,
                Math.round(
                  demo.previousReaders *
                    previousShare
                )
              ),

            interactions:
              Math.max(
                1,
                Math.round(
                  demo.interactions *
                    share
                )
              ),

            previousInteractions:
              Math.max(
                1,
                Math.round(
                  demo.previousInteractions *
                    previousShare
                )
              ),
          };
        }
      );
    }, [
      dashboardItems,
      demo,
    ]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-7 md:px-8">
        <div className="h-48 animate-pulse rounded-[28px] border border-[#eadfd6] bg-white" />

        <div className="mt-5 h-16 animate-pulse rounded-[22px] border border-[#eadfd6] bg-white" />

        <div className="mt-5 h-96 animate-pulse rounded-[26px] border border-[#eadfd6] bg-white" />
      </div>
    );
  }

  const tabs: {
    id: DashboardTab;
    label: string;
    icon: string;
  }[] = [
    {
      id: "works",
      label: "Mis obras",
      icon: "📚",
    },
    {
      id: "performance",
      label: "Rendimiento",
      icon: "📈",
    },
    {
      id: "community",
      label: "Comunidad",
      icon: "💬",
    },
    {
      id: "economy",
      label: "Economía",
      icon: "◈",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#e2ad86] bg-gradient-to-br from-[#fffaf6] via-[#fff2e8] to-[#f6c6a1] p-6 shadow-[0_12px_36px_rgba(133,72,30,0.07)] md:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[#d96822]/18 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#d96822] px-3 py-1 text-[9px] font-black uppercase tracking-[0.17em] text-white">
                Centro del autor
              </span>

              <span className="text-xs font-semibold text-[#8c6d58]">
                Gestiona tu trabajo en SEBORO
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#251f1b] md:text-4xl">
              Tus historias, lectores y resultados.
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#726156]">
              Publica, revisa tus obras y analiza
              cómo están funcionando sin salir de
              tu espacio de autor.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/autor/publicar"
              className="rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white shadow-[0_7px_18px_rgba(217,104,34,0.17)] transition hover:bg-[#b95016]"
            >
              + Nueva obra
            </Link>

            <Link
              href="/autor/perfil"
              className="rounded-full border border-[#dcb69a] bg-white/75 px-5 py-2.5 text-sm font-bold text-[#5d4f45] transition hover:border-[#ca9167]"
            >
              Perfil público
            </Link>
          </div>
        </div>
      </section>

      {/* PESTAÑAS PRINCIPALES */}
      <section className="relative mt-5 overflow-hidden rounded-[22px] border border-[#e5d8cf] bg-white shadow-[0_6px_20px_rgba(91,60,37,0.03)]">
        <div className="flex overflow-x-auto px-2">
          {tabs.map(
            (tab) => {
              const active =
                activeTab ===
                tab.id;

              return (
                <button
                  key={
                    tab.id
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.id
                    )
                  }
                  className={`relative flex shrink-0 items-center gap-2 px-5 py-4 text-sm transition ${
                    active
                      ? "font-black text-[#302923]"
                      : "font-semibold text-[#847970] hover:text-[#4c433d]"
                  }`}
                >
                  <span>
                    {
                      tab.icon
                    }
                  </span>

                  {
                    tab.label
                  }

                  {tab.id ===
                    "economy" && (
                    <span className="hidden rounded-full bg-[#edf8f0] px-2 py-0.5 text-[9px] font-black text-[#34724b] lg:inline">
                      {money(
                        earningsSummary.available_mxn
                      )}
                    </span>
                  )}

                  {active && (
                    <span className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full bg-[#d96822]" />
                  )}
                </button>
              );
            }
          )}

          <Link
            href="/autor/configuracion"
            className="ml-auto hidden shrink-0 items-center px-5 py-4 text-sm font-semibold text-[#968a81] transition hover:text-[#5b5048] md:flex"
          >
            ⚙ Configuración
          </Link>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-[22px] bg-gradient-to-l from-white via-white/80 to-transparent md:hidden"
        />
      </section>

      {error && (
        <div className="mt-5 rounded-[18px] border border-[#efc6bd] bg-[#fff6f3] px-5 py-4 text-sm font-semibold text-[#a84f3c]">
          {error}
        </div>
      )}

      {/* ESPACIO DE TRABAJO */}
      <section className="mt-5 min-h-[520px] rounded-[28px] border border-[#e7dcd4] bg-[#fbfaf9] p-5 shadow-[0_8px_26px_rgba(93,62,39,0.03)] md:p-6">
        {/* =====================================================
            MIS OBRAS
        ====================================================== */}
        {activeTab ===
          "works" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a46c48]">
                  Tu catálogo
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#2f2823]">
                  Mis obras
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Continúa escribiendo, revisa el
                  estado de publicación o abre el
                  panel individual de cada historia.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#e2d9d2] bg-white px-3 py-1.5 text-xs font-bold text-[#7e736b]">
                  {
                    dashboardItems.length
                  }{" "}
                  obras
                </span>

                <span className="rounded-full border border-[#cfe4d5] bg-[#edf8f0] px-3 py-1.5 text-xs font-bold text-[#35764d]">
                  {
                    publishedCount
                  }{" "}
                  publicadas
                </span>
              </div>
            </div>

            {dashboardItems.length ===
            0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[#dbcfc5] bg-white p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e5] text-xl">
                  ✍️
                </div>

                <h3 className="mt-4 text-xl font-black text-[#3b332d]">
                  Tu primera historia empieza aquí.
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#897e76]">
                  Crea una obra y aparecerá dentro
                  de tu espacio de autor.
                </p>

                <Link
                  href="/autor/publicar"
                  className="mt-5 inline-block rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white"
                >
                  Crear obra
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {dashboardItems.map(
                  ({
                    slug,
                    work,
                    metric,
                  }) => {
                    const state =
                      metric
                        ? getWorkState(
                            metric
                          )
                        : null;

                    const title =
                      work?.title ||
                      slug;

                    const genre =
                      work?.genre ||
                      "Obra";

                    const cover =
                      work
                        ? getWorkCoverBackground(
                            work
                          )
                        : "linear-gradient(145deg,#f0e3d9,#d6b69f)";

                    return (
                      <article
                        key={
                          slug
                        }
                        className="rounded-[22px] border border-[#e5dcd5] bg-white p-4 transition hover:border-[#d8bca8] md:p-5"
                      >
                        <div className="grid gap-4 md:grid-cols-[76px_minmax(0,1fr)_auto] md:items-center">
                          <div
                            className="h-[108px] w-[76px] rounded-[12px] border border-[#ddd3cb] shadow-[0_7px_16px_rgba(53,36,23,0.08)]"
                            style={{
                              background:
                                cover,
                            }}
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-black text-[#39312c]">
                                {
                                  title
                                }
                              </h3>

                              {work && (
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(
                                    work
                                  )}`}
                                >
                                  {publicationLabel(
                                    work
                                  )}
                                </span>
                              )}

                              {state && (
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${stateClass(
                                    state
                                  )}`}
                                >
                                  {
                                    state
                                  }
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-[#91867e]">
                              {work
                                ? `${workStatusLabel(
                                    work
                                  )} · ${genre}`
                                : genre}
                            </p>

                            {metric ? (
                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#81766e]">
                                <span>
                                  <b className="text-[#443a34]">
                                    {number(
                                      metric.readers
                                    )}
                                  </b>{" "}
                                  lectores
                                </span>

                                <span>
                                  <b className="text-[#443a34]">
                                    {completionRate(
                                      metric
                                    ).toFixed(
                                      0
                                    )}
                                    %
                                  </b>{" "}
                                  finalización
                                </span>

                                <span>
                                  <b className="text-[#443a34]">
                                    {metric.rating_count >
                                    0
                                      ? metric.average_rating.toFixed(
                                          1
                                        )
                                      : "—"}
                                  </b>{" "}
                                  valoración
                                </span>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs font-semibold text-[#9a8f87]">
                                Aún sin suficientes métricas.
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 md:flex-col">
                            {work &&
                            (work.publication_status === "draft" ||
                              !work.publication_status ||
                              work.publication_status ===
                                "changes_requested") ? (
                              <>
                                <Link
                                  href={`/autor/publicar/${work.id}`}
                                  className="rounded-full bg-[#d96822] px-4 py-2.5 text-center text-xs font-black text-white transition hover:bg-[#b95016]"
                                >
                                  {work.publication_status ===
                                  "changes_requested"
                                    ? "Corregir obra"
                                    : "Continuar editando"}
                                </Link>

                                <Link
                                  href={`/autor/obra/${slug}`}
                                  className="rounded-full border border-[#e1d7cf] bg-white px-4 py-2 text-center text-xs font-bold text-[#7d726a] transition hover:border-[#d3b39d] hover:bg-[#fffaf6]"
                                >
                                  Ver panel
                                </Link>
                              </>
                            ) : (
                              <Link
                                href={`/autor/obra/${slug}`}
                                className="rounded-full bg-[#d96822] px-4 py-2.5 text-center text-xs font-black text-white transition hover:bg-[#b95016]"
                              >
                                {work?.publication_status === "published"
                                  ? "Gestionar obra"
                                  : "Ver estado"}
                              </Link>
                            )}

                            {work
                              ?.publication_status ===
                              "published" && (
                              <Link
                                href={`/publicaciones/${work.slug}`}
                                className="rounded-full border border-[#e1d7cf] bg-white px-4 py-2 text-center text-xs font-bold text-[#7d726a]"
                              >
                                Ver publicada
                              </Link>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            RENDIMIENTO
        ====================================================== */}
        {activeTab ===
          "performance" && (
          <div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#64748b]">
                    Rendimiento
                  </p>

                  <span className="rounded-full border border-[#e4ddd7] bg-white px-2.5 py-1 text-[9px] font-black uppercase text-[#8a7e75]">
                    Datos demo
                  </span>
                </div>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#302924]">
                  Cómo están funcionando tus historias
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Compara periodos y cambia la
                  métrica que quieres analizar.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[16px] border border-[#e3dad3] bg-white">
                <div className="flex gap-1 overflow-x-auto p-1">
                  {periodOptions.map(
                    (
                      option
                    ) => {
                      const active =
                        selectedPeriod ===
                        option.id;

                      return (
                        <button
                          key={
                            option.id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedPeriod(
                              option.id
                            )
                          }
                          className={`shrink-0 rounded-[11px] px-3 py-2 text-xs font-black transition ${
                            active
                              ? "bg-[#30363d] text-white"
                              : "text-[#756a62] hover:bg-[#f5f2ef]"
                          }`}
                        >
                          {
                            option.label
                          }
                        </button>
                      );
                    }
                  )}
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent md:hidden"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                metric="revenue"
                value={money(
                  demo.revenue
                )}
                current={
                  demo.revenue
                }
                previous={
                  demo.previousRevenue
                }
                comparisonLabel={
                  demo.comparisonLabel
                }
              />

              <MetricCard
                metric="sales"
                value={number(
                  demo.sales
                )}
                current={
                  demo.sales
                }
                previous={
                  demo.previousSales
                }
                comparisonLabel={
                  demo.comparisonLabel
                }
              />

              <MetricCard
                metric="readers"
                value={number(
                  demo.readers
                )}
                current={
                  demo.readers
                }
                previous={
                  demo.previousReaders
                }
                comparisonLabel={
                  demo.comparisonLabel
                }
              />

              <MetricCard
                metric="interactions"
                value={number(
                  demo.interactions
                )}
                current={
                  demo.interactions
                }
                previous={
                  demo.previousInteractions
                }
                comparisonLabel={
                  demo.comparisonLabel
                }
              />
            </div>

            <article className="mt-4 rounded-[22px] border border-[#e4ddd7] bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#91857c]">
                    Evolución
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-black text-[#37302b]">
                      {
                        metricMeta[
                          selectedMetric
                        ].label
                      }
                    </h3>

                    <TrendBadge
                      current={
                        currentMetricValue
                      }
                      previous={
                        previousMetricValue
                      }
                      comparisonLabel={
                        demo.comparisonLabel
                      }
                    />
                  </div>

                  <p className="mt-1 text-xs text-[#91867e]">
                    {
                      demo.label
                    }
                  </p>
                </div>

                <div className="flex gap-1.5 overflow-x-auto">
                  {(
                    Object.keys(
                      metricMeta
                    ) as MetricKey[]
                  ).map(
                    (key) => {
                      const meta =
                        metricMeta[
                          key
                        ];

                      const active =
                        selectedMetric ===
                        key;

                      return (
                        <button
                          key={
                            key
                          }
                          type="button"
                          onClick={() =>
                            setSelectedMetric(
                              key
                            )
                          }
                          className="shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition"
                          style={{
                            borderColor:
                              active
                                ? meta.color
                                : "#e4ddd7",

                            background:
                              active
                                ? meta.soft
                                : "white",

                            color:
                              active
                                ? meta.color
                                : "#81766e",
                          }}
                        >
                          {
                            meta.icon
                          }{" "}
                          {
                            meta.shortLabel
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="mt-2">
                <CompactLineChart
                  history={
                    demo.history
                  }
                  metric={
                    selectedMetric
                  }
                />
              </div>
            </article>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
              <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#91857c]">
                  Comparación
                </p>

                <p className="mt-2 text-sm font-bold text-[#756a62]">
                  {
                    demo.label
                  }{" "}
                  vs.{" "}
                  {
                    demo.comparisonLabel
                  }
                </p>

                <p
                  className="mt-4 text-3xl font-black"
                  style={{
                    color:
                      metricMeta[
                        selectedMetric
                      ].color,
                  }}
                >
                  {selectedChange ===
                  null
                    ? "—"
                    : `${
                        selectedChange >=
                        0
                          ? "+"
                          : ""
                      }${selectedChange.toFixed(
                        1
                      )}%`}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#8f847b]">
                  {metricValue(
                    selectedMetric,
                    currentMetricValue -
                      previousMetricValue
                  )}{" "}
                  de diferencia.
                </p>
              </article>

              <article className="overflow-hidden rounded-[20px] border border-[#e4ddd7] bg-white">
                <div className="border-b border-[#eee7e2] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#91857c]">
                    Por obra
                  </p>

                  <h3 className="mt-1 font-black text-[#3c342f]">
                    Qué historias explican el resultado
                  </h3>
                </div>

                <div className="divide-y divide-[#eee7e2]">
                  {demoWorkRows.map(
                    (
                      row
                    ) => {
                      const current =
                        selectedMetric ===
                        "revenue"
                          ? row.revenue
                          : selectedMetric ===
                            "sales"
                          ? row.sales
                          : selectedMetric ===
                            "readers"
                          ? row.readers
                          : row.interactions;

                      const previous =
                        selectedMetric ===
                        "revenue"
                          ? row.previousRevenue
                          : selectedMetric ===
                            "sales"
                          ? row.previousSales
                          : selectedMetric ===
                            "readers"
                          ? row.previousReaders
                          : row.previousInteractions;

                      const change =
                        percentChange(
                          current,
                          previous
                        );

                      return (
                        <div
                          key={
                            row.title
                          }
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[#453c36]">
                              {
                                row.title
                              }
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-[#433a34]">
                              {metricValue(
                                selectedMetric,
                                current
                              )}
                            </p>

                            {change !==
                              null && (
                              <span
                                className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                  change >=
                                  0
                                    ? "bg-[#edf8f0] text-[#307449]"
                                    : "bg-[#fff1ef] text-[#a84f43]"
                                }`}
                              >
                                {change >=
                                0
                                  ? "↑ +"
                                  : "↓ "}
                                {change.toFixed(
                                  1
                                )}
                                %
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </article>
            </div>

            <p className="mt-4 text-center text-[10px] font-semibold text-[#a0958d]">
              Ingresos, ventas y comparaciones
              son datos simulados.
            </p>
          </div>
        )}

        {/* =====================================================
            COMUNIDAD
        ====================================================== */}
        {activeTab ===
          "community" && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#64748b]">
                  Comunidad
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#302924]">
                  Lo que ocurre alrededor de tus obras
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Publicaciones, respuestas,
                  reacciones y críticas registradas.
                </p>
              </div>

              <Link
                href="/comunidad"
                className="rounded-full border border-[#dce1e5] bg-white px-4 py-2.5 text-sm font-black text-[#536271]"
              >
                Abrir Comunidad →
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase text-[#8d8178]">
                  Publicaciones
                </p>

                <p className="mt-3 text-3xl font-black">
                  {number(
                    totals.posts
                  )}
                </p>
              </article>

              <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase text-[#8d8178]">
                  Respuestas
                </p>

                <p className="mt-3 text-3xl font-black">
                  {number(
                    totals.replies
                  )}
                </p>
              </article>

              <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase text-[#8d8178]">
                  Reacciones
                </p>

                <p className="mt-3 text-3xl font-black">
                  {number(
                    totals.reactions
                  )}
                </p>
              </article>

              <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase text-[#8d8178]">
                  Críticas
                </p>

                <p className="mt-3 text-3xl font-black">
                  {number(
                    totals.reviews
                  )}
                </p>
              </article>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8d8178]">
                  Actividad social
                </p>

                <p className="mt-4 text-4xl font-black text-[#536271]">
                  {number(
                    totalCommunity
                  )}
                </p>

                <p className="mt-1 text-xs text-[#90857c]">
                  interacciones registradas
                </p>
              </article>

              <article className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8d8178]">
                  Lectura
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] bg-[#f6f4f2] p-4">
                    <p className="text-2xl font-black">
                      {totals.readers >
                      0
                        ? `${totalCompletion.toFixed(
                            0
                          )}%`
                        : "—"}
                    </p>

                    <p className="mt-1 text-xs text-[#867c74]">
                      finalización
                    </p>
                  </div>

                  <div className="rounded-[16px] bg-[#f6f4f2] p-4">
                    <p className="text-2xl font-black">
                      {totals.ratingCount >
                      0
                        ? catalogRating.toFixed(
                            1
                          )
                        : "—"}
                    </p>

                    <p className="mt-1 text-xs text-[#867c74]">
                      valoración
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* =====================================================
            ECONOMÍA
        ====================================================== */}
        {activeTab ===
          "economy" && (
          <div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#2f855a]">
                    Economía
                  </p>

                  <span className="rounded-full border border-[#cfe4d5] bg-[#edf8f0] px-2.5 py-1 text-[9px] font-black uppercase text-[#34724b]">
                    Datos demo
                  </span>
                </div>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#302924]">
                  Tus ingresos y pagos en SEBORO
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  Consulta lo generado y revisa
                  tus movimientos de pago.
                </p>
              </div>

              <div className="rounded-[18px] border border-[#cfe4d5] bg-[#f5faf7] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#668273]">
                  Saldo disponible
                </p>

                <div className="mt-1 flex items-center gap-3">
                  <p className="text-xl font-black text-[#2f855a]">
                    {money(
                      earningsSummary.available_mxn
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* SUBPESTAÑAS ECONOMÍA */}
            <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[#e5ddd7]">
              {(
                [
                  {
                    id: "summary",
                    label:
                      "Resumen",
                  },
                  {
                    id: "income",
                    label:
                      "Ingresos",
                  },
                  {
                    id: "payments",
                    label:
                      "Pagos",
                  },
                ] as {
                  id: EconomyTab;
                  label: string;
                }[]
              ).map(
                (item) => {
                  const active =
                    economyTab ===
                    item.id;

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        setEconomyTab(
                          item.id
                        )
                      }
                      className={`relative shrink-0 px-4 py-3 text-sm transition ${
                        active
                          ? "font-black text-[#2f6f4a]"
                          : "font-semibold text-[#8a7f77]"
                      }`}
                    >
                      {
                        item.label
                      }

                      {active && (
                        <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-[#2f855a]" />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            {/* ---------------------
                RESUMEN ECONÓMICO
            ---------------------- */}
            {economyTab ===
              "summary" && (
              <div>
                <div className="mt-5 flex justify-end">
                  <div className="relative max-w-full overflow-hidden rounded-[15px] border border-[#dde6e0] bg-white">
                    <div className="flex gap-1 overflow-x-auto p-1">
                      {periodOptions.map(
                        (
                          option
                        ) => {
                          const active =
                            selectedPeriod ===
                            option.id;

                          return (
                            <button
                              key={
                                option.id
                              }
                              type="button"
                              onClick={() =>
                                setSelectedPeriod(
                                  option.id
                                )
                              }
                              className={`shrink-0 rounded-[10px] px-3 py-2 text-xs font-black ${
                                active
                                  ? "bg-[#2f855a] text-white"
                                  : "text-[#756a62]"
                              }`}
                            >
                              {
                                option.label
                              }
                            </button>
                          );
                        }
                      )}
                    </div>

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent md:hidden"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-[20px] border border-[#d7e6dc] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#668273]">
                      Ingresos brutos
                    </p>

                    <p className="mt-2 text-3xl font-black text-[#2f855a]">
                      {money(
                        demo.revenue
                      )}
                    </p>

                    <div className="mt-3">
                      <TrendBadge
                        current={
                          demo.revenue
                        }
                        previous={
                          demo.previousRevenue
                        }
                        comparisonLabel={
                          demo.comparisonLabel
                        }
                      />
                    </div>
                  </article>

                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Obras vendidas
                    </p>

                    <p className="mt-2 text-3xl font-black text-[#342d28]">
                      {number(
                        demo.sales
                      )}
                    </p>

                    <div className="mt-3">
                      <TrendBadge
                        current={
                          demo.sales
                        }
                        previous={
                          demo.previousSales
                        }
                        comparisonLabel={
                          demo.comparisonLabel
                        }
                      />
                    </div>
                  </article>

                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Estimado autor
                    </p>

                    <p className="mt-2 text-3xl font-black text-[#342d28]">
                      {money(
                        Math.round(
                          demo.revenue *
                            0.75
                        )
                      )}
                    </p>

                    <p className="mt-3 text-[10px] font-semibold text-[#9a8f86]">
                      Estimado con datos de ejemplo,
                      aplicando la comisión real
                      del 25%.
                    </p>
                  </article>
                </div>

                <article className="mt-4 rounded-[22px] border border-[#dce6df] bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#628070]">
                        Evolución
                      </p>

                      <h3 className="mt-1 text-lg font-black text-[#37302b]">
                        Ingresos brutos
                      </h3>

                      <p className="mt-1 text-xs text-[#91867e]">
                        {
                          demo.label
                        }
                      </p>
                    </div>

                    <TrendBadge
                      current={
                        demo.revenue
                      }
                      previous={
                        demo.previousRevenue
                      }
                      comparisonLabel={
                        demo.comparisonLabel
                      }
                    />
                  </div>

                  <CompactLineChart
                    history={
                      demo.history
                    }
                    metric="revenue"
                  />
                </article>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Pendiente de liberación
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {money(
                        earningsSummary.pending_release_mxn
                      )}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#91867e]">
                      Próxima liberación:{" "}
                      <b>
                        {shortDate(
                          earningsSummary.next_release_at
                        )}
                      </b>
                    </p>
                  </article>

                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Pagado hasta ahora
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {money(
                        earningsSummary.paid_total_mxn
                      )}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#91867e]">
                      Total transferido a tu
                      cuenta hasta hoy.
                    </p>
                  </article>

                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Método de cobro
                    </p>

                    <p className="mt-2 text-lg font-black">
                      {payoutProfile
                        ? `${payoutProfile.bank_name} •••• ${payoutProfile.clabe.slice(-4)}`
                        : "Sin registrar"}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setEconomyTab(
                          "payments"
                        )
                      }
                      className="mt-2 text-xs font-black text-[#2f855a]"
                    >
                      Administrar pagos →
                    </button>
                  </article>
                </div>
              </div>
            )}

            {/* ---------------------
                INGRESOS
            ---------------------- */}
            {economyTab ===
              "income" && (
              <div>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#628070]">
                      Ingresos
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      Ventas e ingresos detallados
                    </h3>
                  </div>

                  <div className="relative max-w-full overflow-hidden rounded-[15px] border border-[#dde6e0] bg-white">
                    <div className="flex gap-1 overflow-x-auto p-1">
                      {periodOptions.map(
                        (
                          option
                        ) => {
                          const active =
                            selectedPeriod ===
                            option.id;

                          return (
                            <button
                              key={
                                option.id
                              }
                              type="button"
                              onClick={() =>
                                setSelectedPeriod(
                                  option.id
                                )
                              }
                              className={`shrink-0 rounded-[10px] px-3 py-2 text-xs font-black ${
                                active
                                  ? "bg-[#2f855a] text-white"
                                  : "text-[#756a62]"
                              }`}
                            >
                              {
                                option.label
                              }
                            </button>
                          );
                        }
                      )}
                    </div>

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent md:hidden"
                    />
                  </div>
                </div>

                <article className="mt-4 rounded-[22px] border border-[#dce6df] bg-white p-5">
                  <CompactLineChart
                    history={
                      demo.history
                    }
                    metric="revenue"
                  />
                </article>

                <article className="mt-4 overflow-hidden rounded-[22px] border border-[#e4ddd7] bg-white">
                  <div className="border-b border-[#eee7e2] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#718478]">
                      Por obra
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Ingresos por historia
                    </h3>
                  </div>

                  <div className="hidden grid-cols-[1fr_100px_130px_130px] gap-3 border-b border-[#eee7e2] bg-[#fafcfb] px-5 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-[#8f9b93] md:grid">
                    <span>
                      Obra
                    </span>

                    <span className="text-right">
                      Ventas
                    </span>

                    <span className="text-right">
                      Bruto
                    </span>

                    <span className="text-right">
                      Est. autor
                    </span>
                  </div>

                  <div className="divide-y divide-[#eee7e2]">
                    {demoWorkRows.map(
                      (
                        row
                      ) => (
                        <div
                          key={
                            row.title
                          }
                          className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_100px_130px_130px] md:items-center"
                        >
                          <p className="truncate text-sm font-black">
                            {
                              row.title
                            }
                          </p>

                          <p className="text-sm md:text-right">
                            {number(
                              row.sales
                            )}
                          </p>

                          <p className="text-sm font-black text-[#2f855a] md:text-right">
                            {money(
                              row.revenue
                            )}
                          </p>

                          <p className="text-sm font-black md:text-right">
                            {money(
                              Math.round(
                                row.revenue *
                                  0.75
                              )
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </article>

                <article className="mt-4 overflow-hidden rounded-[22px] border border-[#e4ddd7] bg-white">
                  <div className="border-b border-[#eee7e2] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#718478]">
                      Actividad
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Ventas recientes
                    </h3>
                  </div>

                  <div className="divide-y divide-[#eee7e2]">
                    {DEMO_INCOME_MOVEMENTS.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                        >
                          <div>
                            <p className="text-sm font-black">
                              {
                                item.title
                              }
                            </p>

                            <p className="mt-1 text-xs text-[#958a82]">
                              {
                                item.date
                              }{" "}
                              ·{" "}
                              {
                                item.type
                              }
                            </p>
                          </div>

                          <p className="font-black text-[#2f855a]">
                            +
                            {money(
                              item.amount
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </article>
              </div>
            )}

            {/* ---------------------
                PAGOS
            ---------------------- */}
            {economyTab ===
              "payments" && (
              <div>
                <div className="mt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#628070]">
                    Pagos
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Saldo y cuenta bancaria
                  </h3>

                  <p className="mt-1 text-sm text-[#8b8078]">
                    Aquí cobras el dinero realmente
                    generado en SEBORO.
                  </p>
                </div>

                {/* SALDO PRINCIPAL */}
                <article className="mt-5 overflow-hidden rounded-[24px] border border-[#bad8c5] bg-gradient-to-br from-[#f7fcf8] to-[#edf8f0] p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#558069]">
                        Disponible
                      </p>

                      <p className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#286d46]">
                        {money(
                          earningsSummary.available_mxn
                        )}
                      </p>

                      <p className="mt-2 text-xs text-[#6e8275]">
                        MXN
                      </p>
                    </div>

                    <p className="max-w-xs rounded-[16px] bg-white/70 p-3 text-xs leading-5 text-[#3e5c4a] md:text-right">
                      Los pagos se transfieren
                      manualmente cada semana a tu
                      cuenta registrada, una vez que
                      el saldo queda disponible.
                    </p>
                  </div>
                </article>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Próxima liberación
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {money(
                        earningsSummary.pending_release_mxn
                      )}
                    </p>

                    <p className="mt-2 text-xs text-[#91867e]">
                      {shortDate(
                        earningsSummary.next_release_at
                      )}
                    </p>
                  </article>

                  <article className="rounded-[20px] border border-[#e4ddd7] bg-white p-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#91847a]">
                      Pagado hasta ahora
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {money(
                        earningsSummary.paid_total_mxn
                      )}
                    </p>

                    <p className="mt-2 text-xs text-[#91867e]">
                      Total transferido a tu cuenta.
                    </p>
                  </article>

                  <article
                    className={`rounded-[20px] border border-[#d7e6dc] bg-white p-5 ${
                      editingPayout
                        ? "md:col-span-3"
                        : ""
                    }`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#668273]">
                      Cuenta de cobro
                    </p>

                    {editingPayout ? (
                      <PayoutProfileForm
                        initialProfile={
                          payoutProfile
                        }
                        onCancel={() =>
                          setEditingPayout(
                            false
                          )
                        }
                        onSaved={(
                          profile
                        ) => {
                          setPayoutProfile(
                            profile
                          );
                          setEditingPayout(
                            false
                          );
                        }}
                      />
                    ) : (
                      <>
                        {payoutProfile ? (
                          <>
                            <p className="mt-2 text-lg font-black">
                              {payoutProfile.bank_name}{" "}
                              ••••{" "}
                              {payoutProfile.clabe.slice(-4)}
                            </p>

                            <p className="mt-1 text-xs text-[#91867e]">
                              {payoutProfile.account_holder_name}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm leading-5 text-[#91867e]">
                            Todavía no registraste tu
                            cuenta bancaria.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setEditingPayout(
                              true
                            )
                          }
                          className="mt-3 text-xs font-black text-[#2f855a]"
                        >
                          {payoutProfile
                            ? "Editar cuenta"
                            : "Registrar cuenta"}
                        </button>
                      </>
                    )}
                  </article>
                </div>

                {/* EXPLICACIÓN DE FLUJO */}
                <article className="mt-4 rounded-[22px] border border-[#e3ddd7] bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8d8178]">
                    Cómo funciona
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[16px] bg-[#f7f5f3] p-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black">
                        1
                      </span>

                      <p className="mt-3 text-sm font-black">
                        Generas ingresos
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#8d8279]">
                        Las ventas se registran en
                        Ingresos.
                      </p>
                    </div>

                    <div className="rounded-[16px] bg-[#f7f5f3] p-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black">
                        2
                      </span>

                      <p className="mt-3 text-sm font-black">
                        Se libera el saldo
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#8d8279]">
                        14 días después de cada
                        venta queda disponible.
                      </p>
                    </div>

                    <div className="rounded-[16px] bg-[#f0f8f3] p-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-[#2f855a]">
                        3
                      </span>

                      <p className="mt-3 text-sm font-black">
                        Recibes el pago
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#738378]">
                        Te transferimos semanalmente
                        lo que ya esté disponible.
                      </p>
                    </div>
                  </div>
                </article>

                {/* HISTORIAL DE PAGOS */}
                <article className="mt-4 overflow-hidden rounded-[22px] border border-[#e4ddd7] bg-white">
                  <div className="border-b border-[#eee7e2] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#718478]">
                      Historial
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Movimientos de pagos
                    </h3>
                  </div>

                  {earningsHistory.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-[#8b8078]">
                      Todavía no tienes movimientos
                      de pago registrados.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#eee7e2]">
                      {earningsHistory.map(
                        (movement) => {
                          const label =
                            earningStatusLabel(
                              movement
                            );

                          return (
                            <div
                              key={
                                movement.id
                              }
                              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                            >
                              <div>
                                <p className="text-sm font-black">
                                  {
                                    movement.book_slug
                                  }
                                </p>

                                <p className="mt-1 text-xs text-[#958a82]">
                                  {shortDate(
                                    movement.payout_at ||
                                      movement.available_at
                                  )}{" "}
                                  ·{" "}
                                  {label}
                                </p>
                              </div>

                              <p className="font-black text-[#2f855a]">
                                +
                                {money(
                                  movement.author_share_mxn
                                )}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </article>
              </div>
            )}

            {economyTab !==
              "payments" && (
              <p className="mt-5 text-center text-[10px] font-semibold text-[#9a8f87]">
                Toda la información económica
                mostrada aquí (fuera de Pagos) es
                ficticia.
              </p>
            )}
          </div>
        )}
      </section>

    </div>
  );
}