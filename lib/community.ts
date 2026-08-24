import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type CommunityBranch = "general" | "autor" | "criticas";
export type CommunityReaction =
  | "love"
  | "moved"
  | "surprised"
  | "funny"
  | "annoyed";

export type CommunityPost = {
  id: string;
  book_slug: string;
  branch: CommunityBranch;
  user_id: string;
  display_name: string;
  body: string;
  spoiler: boolean;
  created_at: string;
};

export type CommunityReply = {
  id: string;
  post_id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

export type CommunityReactionRow = {
  user_id: string;
  post_id: string;
  reaction: CommunityReaction;
  created_at: string;
};

export type CommunitySnapshot = {
  posts: CommunityPost[];
  replies: CommunityReply[];
  reactions: CommunityReactionRow[];
  currentUserId: string | null;
};

function getClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

async function displayNameForCurrentUser() {
  const supabase = getClient();
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      displayName: "Lector",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileName =
    typeof profile?.display_name === "string"
      ? profile.display_name.trim()
      : "";

  if (profileName) {
    return {
      user,
      displayName: profileName.slice(0, 40),
    };
  }

  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";

  if (metadataName) {
    return {
      user,
      displayName: metadataName.slice(0, 40),
    };
  }

  const emailName = user.email?.split("@")[0]?.trim();

  return {
    user,
    displayName: emailName
      ? emailName.slice(0, 40)
      : "Lector",
  };
}

export async function getCommunitySnapshot(
  bookSlug: string
): Promise<CommunitySnapshot> {
  const supabase = getClient();
  const user = await getCurrentUser();

  const { data: posts, error: postsError } = await supabase
    .from("community_posts")
    .select("*")
    .eq("book_slug", bookSlug)
    .order("created_at", { ascending: false });

  if (postsError) throw new Error(postsError.message);

  const typedPosts = (posts || []) as CommunityPost[];
  const postIds = typedPosts.map((post) => post.id);

  if (postIds.length === 0) {
    return {
      posts: [],
      replies: [],
      reactions: [],
      currentUserId: user?.id || null,
    };
  }

  const [
    { data: replies, error: repliesError },
    { data: reactions, error: reactionsError },
  ] = await Promise.all([
    supabase
      .from("community_replies")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),

    supabase
      .from("community_reactions")
      .select("*")
      .in("post_id", postIds),
  ]);

  if (repliesError) throw new Error(repliesError.message);
  if (reactionsError) throw new Error(reactionsError.message);

  return {
    posts: typedPosts,
    replies: (replies || []) as CommunityReply[],
    reactions: (reactions || []) as CommunityReactionRow[],
    currentUserId: user?.id || null,
  };
}

export async function createCommunityPost(args: {
  bookSlug: string;
  branch: CommunityBranch;
  body: string;
  spoiler: boolean;
}) {
  const supabase = getClient();

  const {
    user,
    displayName,
  } = await displayNameForCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para publicar."
    );
  }

  const body = args.body.trim();

  if (!body) {
    throw new Error("La publicación está vacía.");
  }

  const { error } = await supabase
    .from("community_posts")
    .insert({
      book_slug: args.bookSlug,
      branch: args.branch,
      user_id: user.id,
      display_name: displayName,
      body,
      spoiler: args.spoiler,
    });

  if (error) throw new Error(error.message);
}

export async function createCommunityReply(
  postId: string,
  bodyValue: string
) {
  const supabase = getClient();

  const {
    user,
    displayName,
  } = await displayNameForCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para responder."
    );
  }

  const body = bodyValue.trim();

  if (!body) {
    throw new Error("La respuesta está vacía.");
  }

  const { error } = await supabase
    .from("community_replies")
    .insert({
      post_id: postId,
      user_id: user.id,
      display_name: displayName,
      body,
    });

  if (error) throw new Error(error.message);
}

export async function toggleCommunityReaction(
  postId: string,
  reaction: CommunityReaction
) {
  const supabase = getClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para reaccionar."
    );
  }

  const { data: existing, error: readError } =
    await supabase
      .from("community_reactions")
      .select("user_id, post_id, reaction")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .eq("reaction", reaction)
      .maybeSingle();

  if (readError) throw new Error(readError.message);

  if (existing) {
    const { error } = await supabase
      .from("community_reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .eq("reaction", reaction);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("community_reactions")
    .insert({
      user_id: user.id,
      post_id: postId,
      reaction,
    });

  if (error) throw new Error(error.message);
}
