import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type ReaderPrivacy = {
  is_public: boolean;
  show_favorites: boolean;
  show_finished: boolean;
  show_reviews: boolean;
  show_activity: boolean;
  show_history: boolean;
};

export type EditableReaderProfile = ReaderPrivacy & {
  user_id: string;
  public_name: string;
  bio: string;
  favorite_genres: string[];
};

export type PublicReaderProfile = ReaderPrivacy & {
  user_id: string;
  display_name: string;
  bio: string;
  favorite_genres: string[];
  role: "reader" | "author" | "admin";
  finished_count: number;
  rating_count: number;
  review_count: number;
  reaction_count: number;
  favorite_count: number;
  community_count: number;
  reader_level: "Explorador" | "Lector" | "Conocedor";
  reader_level_number: number;
  critic_level: "Opinador" | "Crítico" | "Analista";
  critic_level_number: number;
};

export type ReaderFavoriteRow = {
  book_slug: string;
  created_at: string;
};

export type ReaderFinishedRow = {
  book_slug: string;
  updated_at: string;
};

export type ReaderHistoryRow = {
  book_slug: string;
  last_opened_at: string;
};

export type ReaderReviewRow = {
  book_slug: string;
  rating: number | null;
  reactions: string[];
  review: string;
  updated_at: string;
};

export type ReaderActivityRow = {
  activity_type: "post" | "reply";
  book_slug: string;
  body: string;
  created_at: string;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
}

function normalizePublic(
  raw: Record<string, unknown>
): PublicReaderProfile {
  const role = String(raw.role || "reader");

  return {
    user_id: String(raw.user_id),
    display_name: String(raw.display_name || "Lector"),
    bio: String(raw.bio || ""),
    favorite_genres: Array.isArray(raw.favorite_genres)
      ? raw.favorite_genres.map(String)
      : [],
    role: (
      ["reader", "author", "admin"].includes(role)
        ? role
        : "reader"
    ) as PublicReaderProfile["role"],
    is_public: Boolean(raw.is_public),
    show_favorites: Boolean(raw.show_favorites),
    show_finished: Boolean(raw.show_finished),
    show_reviews: Boolean(raw.show_reviews),
    show_activity: Boolean(raw.show_activity),
    show_history: Boolean(raw.show_history),
    finished_count: Number(raw.finished_count || 0),
    rating_count: Number(raw.rating_count || 0),
    review_count: Number(raw.review_count || 0),
    reaction_count: Number(raw.reaction_count || 0),
    favorite_count: Number(raw.favorite_count || 0),
    community_count: Number(raw.community_count || 0),
    reader_level: String(
      raw.reader_level || "Explorador"
    ) as PublicReaderProfile["reader_level"],
    reader_level_number: Number(
      raw.reader_level_number || 1
    ),
    critic_level: String(
      raw.critic_level || "Opinador"
    ) as PublicReaderProfile["critic_level"],
    critic_level_number: Number(
      raw.critic_level_number || 1
    ),
  };
}

export async function getMyReaderProfile(): Promise<
  EditableReaderProfile | null
> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return null;

  const [
    { data: account, error: accountError },
    { data: reader, error: readerError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("reader_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (readerError) {
    throw new Error(readerError.message);
  }

  if (!reader) {
    const publicName =
      String(account?.display_name || "").trim() ||
      user.email?.split("@")[0] ||
      "Lector";

    const { data: created, error } = await supabase
      .from("reader_profiles")
      .upsert(
        {
          user_id: user.id,
          public_name: publicName.slice(0, 60),
        },
        {
          onConflict: "user_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      user_id: user.id,
      public_name: String(created.public_name || publicName),
      bio: String(created.bio || ""),
      favorite_genres: Array.isArray(created.favorite_genres)
        ? created.favorite_genres.map(String)
        : [],
      is_public: Boolean(created.is_public),
      show_favorites: Boolean(created.show_favorites),
      show_finished: Boolean(created.show_finished),
      show_reviews: Boolean(created.show_reviews),
      show_activity: Boolean(created.show_activity),
      show_history: Boolean(created.show_history),
    };
  }

  return {
    user_id: user.id,
    public_name:
      String(reader.public_name || "").trim() ||
      String(account?.display_name || "Lector"),
    bio: String(reader.bio || ""),
    favorite_genres: Array.isArray(reader.favorite_genres)
      ? reader.favorite_genres.map(String)
      : [],
    is_public: Boolean(reader.is_public),
    show_favorites: Boolean(reader.show_favorites),
    show_finished: Boolean(reader.show_finished),
    show_reviews: Boolean(reader.show_reviews),
    show_activity: Boolean(reader.show_activity),
    show_history: Boolean(reader.show_history),
  };
}

export async function saveMyReaderProfile(input: {
  public_name: string;
  bio: string;
  favorite_genres: string[];
  is_public: boolean;
  show_favorites: boolean;
  show_finished: boolean;
  show_reviews: boolean;
  show_activity: boolean;
  show_history: boolean;
}) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const publicName = input.public_name.trim();

  if (publicName.length < 2) {
    throw new Error(
      "El nombre público debe tener al menos 2 caracteres."
    );
  }

  if (publicName.length > 60) {
    throw new Error(
      "El nombre público no puede superar 60 caracteres."
    );
  }

  const favoriteGenres = Array.from(
    new Set(
      input.favorite_genres
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 8);

  const { error } = await supabase
    .from("reader_profiles")
    .upsert(
      {
        user_id: user.id,
        public_name: publicName,
        bio: input.bio.trim().slice(0, 800),
        favorite_genres: favoriteGenres,
        is_public: input.is_public,
        show_favorites: input.show_favorites,
        show_finished: input.show_finished,
        show_reviews: input.show_reviews,
        show_activity: input.show_activity,
        show_history: input.show_history,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("seboro-profile-updated")
  );
}

export async function getPublicReaderProfile(
  userId: string
): Promise<PublicReaderProfile | null> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "get_public_reader_profile",
    {
      p_user_id: userId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return normalizePublic(
    data as Record<string, unknown>
  );
}

export async function getMyFavorites(): Promise<
  ReaderFavoriteRow[]
> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_favorites")
    .select("book_slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ReaderFavoriteRow[];
}

export async function isFavorite(
  slug: string
): Promise<boolean> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("user_favorites")
    .select("book_slug")
    .eq("user_id", user.id)
    .eq("book_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function toggleFavorite(
  slug: string
): Promise<boolean> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para guardar favoritas."
    );
  }

  const current = await isFavorite(slug);

  if (current) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("book_slug", slug);

    if (error) {
      throw new Error(error.message);
    }

    window.dispatchEvent(
      new Event("seboro-profile-updated")
    );

    return false;
  }

  const { error } = await supabase
    .from("user_favorites")
    .insert({
      user_id: user.id,
      book_slug: slug,
    });

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("seboro-profile-updated")
  );

  return true;
}

async function rpcList<T>(
  name: string,
  userId: string
): Promise<T[]> {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    name,
    {
      p_user_id: userId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as T[];
}

export function getPublicReaderFavorites(
  userId: string
) {
  return rpcList<ReaderFavoriteRow>(
    "get_public_reader_favorites",
    userId
  );
}

export function getPublicReaderFinished(
  userId: string
) {
  return rpcList<ReaderFinishedRow>(
    "get_public_reader_finished",
    userId
  );
}

export function getPublicReaderHistory(
  userId: string
) {
  return rpcList<ReaderHistoryRow>(
    "get_public_reader_history",
    userId
  );
}

export function getPublicReaderReviews(
  userId: string
) {
  return rpcList<ReaderReviewRow>(
    "get_public_reader_reviews",
    userId
  );
}

export function getPublicReaderActivity(
  userId: string
) {
  return rpcList<ReaderActivityRow>(
    "get_public_reader_activity",
    userId
  );
}
