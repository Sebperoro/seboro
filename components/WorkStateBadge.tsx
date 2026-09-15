import type { WorkState } from "@/lib/authorMetrics";

type WorkStateBadgeProps = {
  state: WorkState;
  activityChange?: number | null;
  variant?: "compact" | "hero";
};

const stateDesign: Record<
  WorkState,
  {
    icon: string;
    title: string;
    compactClass: string;
    iconClass: string;
    heroClass: string;
    titleClass: string;
    accentClass: string;
  }
> = {
  Creciendo: {
    icon: "↗",
    title: "Creciendo",
    compactClass:
      "border-[#a9d7b8] bg-[#edf8f0] text-[#267444] shadow-[0_4px_14px_rgba(38,116,68,0.08)]",
    iconClass:
      "bg-[#d8f0df] text-[#237242]",
    heroClass:
      "border-[#a9d7b8] bg-gradient-to-br from-[#f5fcf7] to-[#e5f6ea]",
    titleClass:
      "text-[#246f42]",
    accentClass:
      "bg-[#56a971]",
  },

  Estable: {
    icon: "≈",
    title: "Estable",
    compactClass:
      "border-[#aecde8] bg-[#eef6fc] text-[#347197] shadow-[0_4px_14px_rgba(52,113,151,0.08)]",
    iconClass:
      "bg-[#dceefa] text-[#326f95]",
    heroClass:
      "border-[#aecde8] bg-gradient-to-br from-[#f6fbff] to-[#e5f3fc]",
    titleClass:
      "text-[#336f94]",
    accentClass:
      "bg-[#5aa0cf]",
  },

  Disminuyendo: {
    icon: "↘",
    title: "Disminuyendo",
    compactClass:
      "border-[#ebb8b0] bg-[#fff1ef] text-[#a24b42] shadow-[0_4px_14px_rgba(162,75,66,0.08)]",
    iconClass:
      "bg-[#f9dcd7] text-[#a1483f]",
    heroClass:
      "border-[#ebb8b0] bg-gradient-to-br from-[#fff8f7] to-[#fde8e5]",
    titleClass:
      "text-[#a24940]",
    accentClass:
      "bg-[#d9786e]",
  },

  "En reposo": {
    icon: "☾",
    title: "En reposo",
    compactClass:
      "border-[#cfc0e8] bg-[#f5f1fb] text-[#6d54a2] shadow-[0_4px_14px_rgba(109,84,162,0.08)]",
    iconClass:
      "bg-[#e8def5] text-[#6c52a0]",
    heroClass:
      "border-[#cfc0e8] bg-gradient-to-br from-[#faf8fd] to-[#eee7f8]",
    titleClass:
      "text-[#6c52a0]",
    accentClass:
      "bg-[#9073bd]",
  },
};

function stateDescription(
  state: WorkState,
  activityChange?: number | null
) {
  if (state === "Creciendo") {
    if (activityChange === null || activityChange === undefined) {
      return "La obra está mostrando actividad nueva y señales positivas de crecimiento.";
    }

    return `${Math.abs(activityChange).toFixed(
      1
    )}% más actividad que en los 30 días anteriores.`;
  }

  if (state === "Disminuyendo") {
    if (activityChange === null || activityChange === undefined) {
      return "La actividad reciente es menor que la registrada anteriormente.";
    }

    return `${Math.abs(activityChange).toFixed(
      1
    )}% menos actividad que en los 30 días anteriores.`;
  }

  if (state === "Estable") {
    return "La actividad se mantiene en un nivel parecido al periodo anterior.";
  }

  return "La obra no tiene suficiente actividad reciente para marcar una tendencia fuerte.";
}

export default function WorkStateBadge({
  state,
  activityChange,
  variant = "compact",
}: WorkStateBadgeProps) {
  const design = stateDesign[state];

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-black ${design.compactClass}`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${design.iconClass}`}
        >
          {design.icon}
        </span>

        {design.title}
      </span>
    );
  }

  return (
    <article
      className={`relative overflow-hidden rounded-[22px] border p-5 ${design.heroClass}`}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-1 ${design.accentClass}`}
      />

      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] text-2xl font-black ${design.iconClass}`}
        >
          {design.icon}
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8b817a]">
            Estado de la obra
          </p>

          <h3
            className={`mt-1 text-2xl font-black tracking-[-0.03em] ${design.titleClass}`}
          >
            {design.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#746a63]">
            {stateDescription(
              state,
              activityChange
            )}
          </p>
        </div>
      </div>
    </article>
  );
}