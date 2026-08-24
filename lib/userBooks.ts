import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserBookRow = {
  user_id: string;
  book_slug: string;
  saved: boolean;
  progress: number | null;
  finished: boolean;
  purchased: boolean;
  last_opened_at: string | null;
  updated_at: string;
};

export type UserBookPatch = Partial<
  Pick<
    UserBookRow,
    "saved" | "progress" | "finished" | "purchased" | "last_opened_at"
  >
>;

export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return data.user;
}

export async function getAllUserBooks(): Promise<UserBookRow[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_books")
    .select("*")
    .eq("user_id", user.id)
    .order("last_opened_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("SEBORO user_books select:", error);
    return [];
  }

  return (data || []) as UserBookRow[];
}

export async function getUserBook(slug: string): Promise<UserBookRow | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_books")
    .select("*")
    .eq("user_id", user.id)
    .eq("book_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("SEBORO user_books maybeSingle:", error);
    return null;
  }

  return (data as UserBookRow | null) || null;
}

export async function patchUserBook(
  slug: string,
  patch: UserBookPatch
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  const { data: existing, error: selectError } = await supabase
    .from("user_books")
    .select("*")
    .eq("user_id", user.id)
    .eq("book_slug", slug)
    .maybeSingle();

  if (selectError) {
    console.error("SEBORO user_books read before upsert:", selectError);
    return false;
  }

  const row: UserBookRow = {
    user_id: user.id,
    book_slug: slug,
    saved: existing?.saved ?? false,
    progress: existing?.progress ?? null,
    finished: existing?.finished ?? false,
    purchased: existing?.purchased ?? false,
    last_opened_at: existing?.last_opened_at ?? null,
    updated_at: new Date().toISOString(),
    ...patch,
  };

  const { error } = await supabase.from("user_books").upsert(row, {
    onConflict: "user_id,book_slug",
  });

  if (error) {
    console.error("SEBORO user_books upsert:", error);
    return false;
  }

  window.dispatchEvent(new Event("seboro-library-updated"));
  return true;
}
