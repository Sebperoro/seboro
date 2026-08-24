export type WorkState = "Creciendo" | "Estable" | "Disminuyendo" | "En reposo";

export type AuthorWorkMetric = {
  slug: string;
  state: WorkState;
  readers: number;
  reads: number;
  sales: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  reactions: number;
  reviews: number;
  trend: number[];
  previousTrend: number[];
};

export const authorWorkMetrics: AuthorWorkMetric[] = [
  {
    slug: "el-reino-de-ceniza",
    state: "Creciendo",
    readers: 1842,
    reads: 2960,
    sales: 614,
    grossRevenue: 48506,
    commission: 7276,
    netRevenue: 41230,
    reactions: 928,
    reviews: 143,
    trend: [42, 48, 55, 60, 68, 79, 92],
    previousTrend: [37, 40, 43, 47, 51, 56, 61],
  },
  {
    slug: "la-casa-del-umbral",
    state: "Estable",
    readers: 960,
    reads: 1418,
    sales: 288,
    grossRevenue: 14112,
    commission: 2117,
    netRevenue: 11995,
    reactions: 411,
    reviews: 76,
    trend: [58, 61, 59, 63, 60, 62, 61],
    previousTrend: [55, 56, 58, 57, 59, 60, 59],
  },
  {
    slug: "nunca-mires-atras",
    state: "Disminuyendo",
    readers: 1310,
    reads: 2032,
    sales: 401,
    grossRevenue: 27669,
    commission: 4150,
    netRevenue: 23519,
    reactions: 602,
    reviews: 104,
    trend: [86, 82, 76, 72, 66, 62, 57],
    previousTrend: [71, 74, 78, 81, 84, 85, 87],
  },
  {
    slug: "despues-del-invierno",
    state: "Estable",
    readers: 742,
    reads: 1065,
    sales: 219,
    grossRevenue: 12921,
    commission: 1938,
    netRevenue: 10983,
    reactions: 330,
    reviews: 51,
    trend: [48, 50, 49, 52, 51, 53, 52],
    previousTrend: [45, 47, 46, 48, 49, 50, 50],
  },
  {
    slug: "ciudad-de-cristal",
    state: "En reposo",
    readers: 388,
    reads: 520,
    sales: 102,
    grossRevenue: 5610,
    commission: 842,
    netRevenue: 4768,
    reactions: 151,
    reviews: 24,
    trend: [39, 35, 31, 27, 23, 20, 18],
    previousTrend: [45, 43, 42, 40, 39, 38, 36],
  },
];

export function getAuthorMetric(slug: string) {
  return authorWorkMetrics.find((item) => item.slug === slug);
}
