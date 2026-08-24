import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";
import type {
  PublishedWork,
  WorkChapter,
} from "@/lib/publishedWorks";

function client() {
  const supabase =
    getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error(
      "Supabase no está configurado."
    );
  }

  return supabase;
}

export async function getMyRole(): Promise<
  string | null
> {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) return null;

  const { data, error } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data?.role || null;
}

export async function getPendingHumanReviews(): Promise<
  PublishedWork[]
> {
  const supabase = client();

  const { data, error } =
    await supabase
      .from("works")
      .select("*")
      .eq(
        "publication_status",
        "human_review"
      )
      .order(
        "submitted_at",
        { ascending: true }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data || []
  ) as PublishedWork[];
}

// Compatibilidad con páginas antiguas que todavía usan este nombre.
export const getPendingReviews =
  getPendingHumanReviews;

export async function getModerationBundle(
  id: string
): Promise<{
  work: PublishedWork;
  chapters: WorkChapter[];
  authorName: string;
} | null> {
  const supabase = client();

  const {
    data: work,
    error: workError,
  } = await supabase
    .from("works")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (workError) {
    throw new Error(
      workError.message
    );
  }

  if (!work) return null;

  const [
    {
      data: chapters,
      error: chaptersError,
    },
    {
      data: profile,
      error: profileError,
    },
    {
      data: authorProfile,
      error: authorProfileError,
    },
  ] = await Promise.all([
    supabase
      .from("work_chapters")
      .select("*")
      .eq("work_id", id)
      .order(
        "chapter_number",
        { ascending: true }
      ),

    supabase
      .from("profiles")
      .select("display_name")
      .eq(
        "user_id",
        work.author_id
      )
      .maybeSingle(),

    supabase
      .from("author_profiles")
      .select("pen_name")
      .eq(
        "user_id",
        work.author_id
      )
      .maybeSingle(),
  ]);

  if (chaptersError) {
    throw new Error(
      chaptersError.message
    );
  }

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  if (authorProfileError) {
    throw new Error(
      authorProfileError.message
    );
  }

  const penName = String(
    authorProfile?.pen_name || ""
  ).trim();

  return {
    work: work as PublishedWork,
    chapters:
      (chapters ||
        []) as WorkChapter[],
    authorName:
      penName ||
      profile?.display_name ||
      "Autor",
  };
}

export async function decideHumanReview(
  workId: string,
  decision:
    | "approved"
    | "changes_requested",
  notes: string
) {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "admin_review_work",
      {
        p_work_id:
          workId,
        p_decision:
          decision,
        p_notes:
          notes.trim() ||
          null,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return Array.isArray(data)
    ? data[0]
    : data;
}

// Compatibilidad con páginas antiguas.
export const decideReview =
  decideHumanReview;
