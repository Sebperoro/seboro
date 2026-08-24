import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type UserFeedbackRow = {
  user_id: string;
  book_slug: string;
  rating: number | null;
  reactions: string[];
  review: string | null;
  created_at: string;
  updated_at: string;
};

export type UserFeedbackPatch = {
  rating?: number | null;
  reactions?: string[];
  review?: string | null;
};

export async function getUserFeedback(
  slug: string
): Promise<UserFeedbackRow | null> {
  const supabase =
    getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const user =
    await getCurrentUser();

  if (!user) return null;

  const { data, error } =
    await supabase
      .from("user_feedback")
      .select("*")
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
    console.error(
      "SEBORO user_feedback maybeSingle:",
      error
    );

    return null;
  }

  return (
    (data as UserFeedbackRow | null) ||
    null
  );
}

export async function getAllUserFeedback(): Promise<
  UserFeedbackRow[] | null
> {
  const supabase =
    getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const user =
    await getCurrentUser();

  if (!user) return null;

  const { data, error } =
    await supabase
      .from("user_feedback")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

  if (error) {
    console.error(
      "SEBORO user_feedback select:",
      error
    );

    return [];
  }

  return (
    data || []
  ) as UserFeedbackRow[];
}

export async function upsertUserFeedback(
  slug: string,
  patch: UserFeedbackPatch
): Promise<boolean> {
  const supabase =
    getSupabaseBrowserClient();

  if (!supabase) {
    return false;
  }

  const user =
    await getCurrentUser();

  if (!user) return false;

  const existing =
    await getUserFeedback(slug);

  const now =
    new Date().toISOString();

  let error:
    | {
        message?: string;
      }
    | null = null;

  if (existing) {
    // IMPORTANTE:
    // actualizamos solo los campos que realmente llegaron en "patch".
    // Así una crítica/reacción nunca puede borrar estrellas por accidente.
    const updatePatch: Record<
      string,
      unknown
    > = {
      updated_at: now,
    };

    if (
      Object.prototype.hasOwnProperty.call(
        patch,
        "rating"
      )
    ) {
      updatePatch.rating =
        patch.rating;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        patch,
        "reactions"
      )
    ) {
      updatePatch.reactions =
        patch.reactions || [];
    }

    if (
      Object.prototype.hasOwnProperty.call(
        patch,
        "review"
      )
    ) {
      updatePatch.review =
        patch.review ?? null;
    }

    const result =
      await supabase
        .from(
          "user_feedback"
        )
        .update(
          updatePatch
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "book_slug",
          slug
        );

    error = result.error;
  } else {
    const result =
      await supabase
        .from(
          "user_feedback"
        )
        .insert({
          user_id:
            user.id,
          book_slug: slug,
          rating:
            patch.rating ??
            null,
          reactions:
            patch.reactions ??
            [],
          review:
            patch.review ??
            null,
          created_at:
            now,
          updated_at:
            now,
        });

    error = result.error;
  }

  if (error) {
    console.error(
      "SEBORO user_feedback write:",
      error
    );

    return false;
  }

  window.dispatchEvent(
    new Event(
      "seboro-profile-updated"
    )
  );

  return true;
}
