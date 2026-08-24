import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type PublicWorkRating = {
  book_slug: string;
  rating_avg: number | null;
  rating_count: number;
  ranking_score: number | null;
};

function client() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error(
      "Supabase no está configurado."
    );
  }

  return supabase;
}

function normalizeRating(
  row: Record<string, unknown>
): PublicWorkRating {
  return {
    book_slug: String(
      row.book_slug
    ),
    rating_avg:
      row.rating_avg === null ||
      row.rating_avg === undefined
        ? null
        : Number(
            row.rating_avg
          ),
    rating_count: Number(
      row.rating_count || 0
    ),
    ranking_score:
      row.ranking_score === null ||
      row.ranking_score === undefined
        ? null
        : Number(
            row.ranking_score
          ),
  };
}

export async function getPublicWorkRatings(): Promise<
  PublicWorkRating[]
> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "get_public_work_ratings"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    (data || []) as Record<
      string,
      unknown
    >[]
  ).map(normalizeRating);
}

export async function getPublicWorkRating(
  slug: string
): Promise<PublicWorkRating> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "get_public_work_rating",
      {
        p_book_slug: slug,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (
    data &&
    typeof data === "object"
  ) {
    return normalizeRating(
      data as Record<
        string,
        unknown
      >
    );
  }

  return {
    book_slug: slug,
    rating_avg: null,
    rating_count: 0,
    ranking_score: null,
  };
}

export async function getMyWorkRating(
  slug: string
): Promise<number | null> {
  const supabase = client();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      userError.message
    );
  }

  if (!user) return null;

  const { data, error } =
    await supabase
      .from("user_feedback")
      .select("rating")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "book_slug",
        slug
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return typeof data?.rating ===
    "number"
    ? data.rating
    : null;
}

export async function rateFinishedPublishedWork(
  slug: string,
  rating: number
): Promise<
  PublicWorkRating & {
    rating: number;
  }
> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "rate_finished_published_work",
      {
        p_book_slug: slug,
        p_rating: rating,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    data as Record<
      string,
      unknown
    >;

  return {
    ...normalizeRating(row),
    rating: Number(
      row.rating
    ),
  };
}
