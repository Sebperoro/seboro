import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type WorkState =
  | "Creciendo"
  | "Estable"
  | "Disminuyendo"
  | "En reposo";

export type RealAuthorMetric = {
  book_slug: string;
  readers: number;
  reading_now: number;
  saves: number;
  finished: number;
  purchases: number;
  rating_count: number;
  average_rating: number;
  reviews: number;
  community_posts: number;
  community_replies: number;
  community_reactions: number;
  activity_30d: number;
  activity_prev_30d: number;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(row: Record<string, unknown>): RealAuthorMetric {
  return {
    book_slug: String(row.book_slug || ""),
    readers: numeric(row.readers),
    reading_now: numeric(row.reading_now),
    saves: numeric(row.saves),
    finished: numeric(row.finished),
    purchases: numeric(row.purchases),
    rating_count: numeric(row.rating_count),
    average_rating: numeric(row.average_rating),
    reviews: numeric(row.reviews),
    community_posts: numeric(row.community_posts),
    community_replies: numeric(row.community_replies),
    community_reactions: numeric(row.community_reactions),
    activity_30d: numeric(row.activity_30d),
    activity_prev_30d: numeric(row.activity_prev_30d),
  };
}

export async function getMyAuthorMetrics(): Promise<RealAuthorMetric[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  const supabase = client();
  const { data, error } = await supabase.rpc("get_my_author_metrics");

  if (error) throw new Error(error.message);

  return ((data || []) as Record<string, unknown>[]).map(normalize);
}

export async function getMyAuthorMetric(
  bookSlug: string
): Promise<RealAuthorMetric | null> {
  const metrics = await getMyAuthorMetrics();
  return metrics.find((item) => item.book_slug === bookSlug) || null;
}

export function getWorkState(metric: RealAuthorMetric): WorkState {
  const current = metric.activity_30d;
  const previous = metric.activity_prev_30d;

  if (current === 0) return "En reposo";
  if (previous === 0) return "Creciendo";

  const change = ((current - previous) / previous) * 100;

  if (change >= 20) return "Creciendo";
  if (change <= -20) return "Disminuyendo";
  return "Estable";
}

export function getActivityChange(metric: RealAuthorMetric) {
  if (metric.activity_prev_30d === 0) {
    return metric.activity_30d > 0 ? null : 0;
  }

  return (
    ((metric.activity_30d - metric.activity_prev_30d) /
      metric.activity_prev_30d) *
    100
  );
}

export function completionRate(metric: RealAuthorMetric) {
  if (metric.readers === 0) return 0;
  return (metric.finished / metric.readers) * 100;
}

export function purchaseRate(metric: RealAuthorMetric) {
  if (metric.readers === 0) return 0;
  return (metric.purchases / metric.readers) * 100;
}
