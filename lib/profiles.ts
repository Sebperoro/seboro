import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type SeboroRole = "reader" | "author" | "admin";

export type SeboroProfile = {
  user_id: string;
  display_name: string;
  role: SeboroRole;
  created_at: string;
  updated_at: string;
};

export type AuthorWork = {
  book_slug: string;
  author_id: string;
  created_at: string;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

function suggestedName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return "Lector";

  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  if (metadataName) return metadataName.slice(0, 40);

  const emailName = user.email?.split("@")[0]?.trim();
  return emailName ? emailName.slice(0, 40) : "Lector";
}

export async function ensureMyProfile(): Promise<SeboroProfile | null> {
  const supabase = client();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (existing) return existing as SeboroProfile;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      display_name: suggestedName(user),
      role: "reader",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SeboroProfile;
}

export async function activateAuthorRole() {
  const supabase = client();
  const user = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  await ensureMyProfile();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      role: "author",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SeboroProfile;
}

export async function claimAuthorWork(bookSlugValue: string) {
  const supabase = client();
  const user = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  const bookSlug = bookSlugValue.trim().toLowerCase();
  if (!bookSlug) throw new Error("Escribe el identificador de la obra.");

  const profile = await ensureMyProfile();
  if (!profile || profile.role === "reader") {
    throw new Error("Primero activa el modo autor.");
  }

  const { data, error } = await supabase
    .from("author_works")
    .insert({
      book_slug: bookSlug,
      author_id: user.id,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esa obra ya está vinculada a un autor.");
    }
    throw new Error(error.message);
  }

  return data as AuthorWork;
}

export async function unclaimAuthorWork(bookSlug: string) {
  const supabase = client();
  const user = await getCurrentUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  const { error } = await supabase
    .from("author_works")
    .delete()
    .eq("book_slug", bookSlug)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);
}

export async function listMyAuthorWorks(): Promise<AuthorWork[]> {
  const supabase = client();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("author_works")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AuthorWork[];
}
