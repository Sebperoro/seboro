import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type PublicAuthorProfile = {
  author_id: string;
  display_name: string;
  bio: string;
  genres: string[];
  website_url: string | null;
  location_text: string | null;
  published_count: number;
  follower_count: number;
  rating_avg: number | null;
  rating_count: number;
};

export type EditableAuthorProfile = {
  user_id: string;
  pen_name: string;
  bio: string;
  genres: string[];
  website_url: string | null;
  location_text: string | null;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

function normalizePublicAuthor(
  row: Record<string, unknown>
): PublicAuthorProfile {
  return {
    author_id: String(row.author_id),
    display_name: String(row.display_name || "Autor"),
    bio: String(row.bio || ""),
    genres: Array.isArray(row.genres)
      ? row.genres.map((item) => String(item))
      : [],
    website_url: row.website_url ? String(row.website_url) : null,
    location_text: row.location_text
      ? String(row.location_text)
      : null,
    published_count: Number(row.published_count || 0),
    follower_count: Number(row.follower_count || 0),
    rating_avg:
      row.rating_avg === null || row.rating_avg === undefined
        ? null
        : Number(row.rating_avg),
    rating_count: Number(row.rating_count || 0),
  };
}

function cleanWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      "El sitio web debe ser una dirección completa, por ejemplo https://misitio.com."
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("El sitio web debe comenzar con http:// o https://.");
  }

  return parsed.toString().slice(0, 300);
}

export async function getPublicAuthors(): Promise<
  PublicAuthorProfile[]
> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_public_authors"
  );

  if (error) throw new Error(error.message);

  return ((data || []) as Record<string, unknown>[]).map(
    normalizePublicAuthor
  );
}

export async function getPublicAuthorById(
  authorId: string
): Promise<PublicAuthorProfile | null> {
  const authors = await getPublicAuthors();

  return (
    authors.find(
      (author) => author.author_id === authorId
    ) || null
  );
}

export async function getMyAuthorProfile(): Promise<
  EditableAuthorProfile | null
> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return null;

  const [
    { data: profile, error: profileError },
    { data: authorProfile, error: authorProfileError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, role")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("author_profiles")
      .select(
        "user_id, pen_name, bio, genres, website_url, location_text"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (authorProfileError) {
    throw new Error(authorProfileError.message);
  }

  if (
    !profile ||
    !["author", "admin"].includes(String(profile.role))
  ) {
    return null;
  }

  return {
    user_id: user.id,
    pen_name:
      String(authorProfile?.pen_name || "").trim() ||
      String(profile.display_name || "Autor"),
    bio: String(authorProfile?.bio || ""),
    genres: Array.isArray(authorProfile?.genres)
      ? authorProfile.genres.map((item: unknown) =>
          String(item)
        )
      : [],
    website_url: authorProfile?.website_url
      ? String(authorProfile.website_url)
      : null,
    location_text: authorProfile?.location_text
      ? String(authorProfile.location_text)
      : null,
  };
}

export async function saveMyAuthorProfile(input: {
  pen_name: string;
  bio: string;
  genres: string[];
  website_url: string;
  location_text: string;
}) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const penName = input.pen_name.trim();

  if (penName.length < 2) {
    throw new Error(
      "El nombre público debe tener al menos 2 caracteres."
    );
  }

  if (penName.length > 60) {
    throw new Error(
      "El nombre público no puede superar 60 caracteres."
    );
  }

  const bio = input.bio.trim().slice(0, 800);

  const genres = Array.from(
    new Set(
      input.genres
        .map((genre) => genre.trim())
        .filter(Boolean)
    )
  ).slice(0, 6);

  const location = input.location_text.trim().slice(0, 80);

  const { error } = await supabase
    .from("author_profiles")
    .upsert(
      {
        user_id: user.id,
        pen_name: penName,
        bio,
        genres,
        website_url: cleanWebsite(input.website_url),
        location_text: location || null,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) throw new Error(error.message);
}

export async function isFollowingAuthor(
  authorId: string
): Promise<boolean> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user || user.id === authorId) return false;

  const { data, error } = await supabase
    .from("author_follows")
    .select("author_id")
    .eq("follower_id", user.id)
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return Boolean(data);
}

export async function toggleAuthorFollow(
  authorId: string
): Promise<boolean> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para seguir a un autor."
    );
  }

  if (user.id === authorId) {
    throw new Error(
      "No puedes seguir tu propio perfil."
    );
  }

  const following = await isFollowingAuthor(authorId);

  if (following) {
    const { error } = await supabase
      .from("author_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("author_id", authorId);

    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase
    .from("author_follows")
    .insert({
      follower_id: user.id,
      author_id: authorId,
    });

  if (error) throw new Error(error.message);
  return true;
}
