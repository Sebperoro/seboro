export type DiscoveryLaneId =
  | "selection-seboro"
  | "trend"
  | "mixed-diversity"
  | "hidden-gem"
  | "breakout"
  | "new"
  | "genre"
  | "community"
  | "community-favorites"
  | "serial";

export type DiscoveryLanePolicy = {
  id: DiscoveryLaneId;
  title: string;
  family:
    | "editorial"
    | "activity"
    | "diversity"
    | "quality"
    | "launch"
    | "genre"
    | "community"
    | "format";
  appearanceChance: number;
  positionWeight: number;
  minItems: number;
  maxItems: number;
  description: string;
};

export const DISCOVERY_LANE_POLICIES: DiscoveryLanePolicy[] = [
  {
    id: "selection-seboro",
    title: "Selección SEBORO",
    family: "editorial",
    appearanceChance: 0.90,
    positionWeight: 12,
    minItems: 1,
    maxItems: 10,
    description:
      "Obras destacadas por la curaduría de SEBORO, apoyada por señales de lectura y calidad.",
  },
  {
    id: "trend",
    title: "Tendencia",
    family: "activity",
    appearanceChance: 0.88,
    positionWeight: 11.5,
    minItems: 2,
    maxItems: 10,
    description:
      "Historias con actividad reciente especialmente fuerte dentro del catálogo actual.",
  },
  {
    id: "mixed-diversity",
    title: "Para todos los gustos",
    family: "diversity",
    appearanceChance: 0.80,
    positionWeight: 9.5,
    minItems: 4,
    maxItems: 10,
    description:
      "Una mezcla deliberada de géneros, autores y estilos para descubrir algo diferente.",
  },
  {
    id: "hidden-gem",
    title: "Joya oculta",
    family: "quality",
    appearanceChance: 0.78,
    positionWeight: 9,
    minItems: 1,
    maxItems: 10,
    description:
      "Obras con señales prometedoras de calidad que todavía han recibido poca exposición.",
  },
  {
    id: "breakout",
    title: "Despegando",
    family: "activity",
    appearanceChance: 0.75,
    positionWeight: 8.5,
    minItems: 1,
    maxItems: 10,
    description:
      "Historias cuyo crecimiento reciente está acelerándose frente a su propio nivel anterior.",
  },
  {
    id: "new",
    title: "Nuevas historias",
    family: "launch",
    appearanceChance: 0.75,
    positionWeight: 7.5,
    minItems: 1,
    maxItems: 10,
    description:
      "Publicaciones recientes que necesitan su primera oportunidad real de encontrar lectores.",
  },
  {
    id: "community",
    title: "En boca de la comunidad",
    family: "community",
    appearanceChance: 0.65,
    positionWeight: 7,
    minItems: 1,
    maxItems: 10,
    description:
      "Historias que están provocando conversación real entre los lectores de SEBORO.",
  },
  {
    id: "community-favorites",
    title: "Favoritos de la comunidad",
    family: "community",
    appearanceChance: 0.60,
    positionWeight: 6.5,
    minItems: 2,
    maxItems: 10,
    description:
      "Obras con señales consistentes de aprobación: finalización, guardados, seguimiento y valoraciones.",
  },
  {
    id: "genre",
    title: "Géneros",
    family: "genre",
    appearanceChance: 0.55,
    positionWeight: 5.8,
    minItems: 3,
    maxItems: 10,
    description:
      "Carriles de género que aparecen cuando existe suficiente catálogo para que valga la pena mostrarlos.",
  },
  {
    id: "serial",
    title: "Obras seriadas",
    family: "format",
    appearanceChance: 0.40,
    positionWeight: 4.5,
    minItems: 2,
    maxItems: 10,
    description:
      "Historias activas publicadas por capítulos. Aparecen menos porque son un formato específico.",
  },
];

export const DISCOVERY_HOME_MIN_LANES = 4;

/*
 * La Home crece con SEBORO.
 * No mostramos 14 carriles cuando apenas existe catálogo,
 * pero tampoco dejamos un techo fijo de 8 para siempre.
 */
export function getDiscoveryHomeLaneLimits(
  mode:
    | "initial"
    | "learning"
    | "competitive"
    | "mature",
  candidateCount: number
) {
  const maxByMode =
    mode === "mature"
      ? 14
      : mode === "competitive"
      ? 12
      : mode === "learning"
      ? 10
      : 8;

  return {
    min: Math.min(
      DISCOVERY_HOME_MIN_LANES,
      candidateCount
    ),
    max: Math.min(
      maxByMode,
      candidateCount
    ),
  };
}

export function getDiscoveryLanePolicy(
  id: DiscoveryLaneId
) {
  return DISCOVERY_LANE_POLICIES.find(
    (policy) => policy.id === id
  )!;
}
