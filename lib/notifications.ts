import {
  getPublishedWorks,
  type PublishedWork,
} from "@/lib/publishedWorks";
import {
  getPublicAuthors,
  type PublicAuthorProfile,
} from "@/lib/authorProfiles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type NotificationType =
  | "new_follower"
  | "work_follower"
  | "new_work"
  | "new_chapter"
  | "work_review_approved"
  | "work_review_changes"
  | "correction_pending_admin"
  | "correction_approved"
  | "correction_rejected"
  | "author_question"
  | "author_reply"
  | "community_reply"
  | "moderation_report_admin"
  | "moderation_warning"
  | "content_hidden"
  | "content_restored"
  | "community_restricted"
  | "community_restriction_lifted"
  | "beta_feedback_admin"
  | "beta_feedback_updated"
  | "author_application_approved"
  | "author_application_rejected"
  | "author_application_pending_admin"
  | "work_review_pending_admin";

export type SeboroNotification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  notification_type: NotificationType;
  title: string;
  body: string;
  href: string;
  work_id: string | null;
  chapter_id: string | null;
  post_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type NotificationPreferences = {
  new_chapters: boolean;
  new_works: boolean;
  editorial: boolean;
  community: boolean;
  followers: boolean;
};

export type FollowingOverview = {
  authors: PublicAuthorProfile[];
  works: Array<
    PublishedWork & {
      author_name: string;
    }
  >;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_chapters: true,
  new_works: true,
  editorial: true,
  community: true,
  followers: true,
};

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

function emitChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(
        "seboro-notifications-updated"
      )
    );
  }
}

export async function getMyNotifications(
  limit = 50
): Promise<SeboroNotification[]> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return [];

  const { data, error } =
    await supabase
      .from("notifications")
      .select(
        "id, recipient_id, actor_id, notification_type, title, body, href, work_id, chapter_id, post_id, created_at, read_at"
      )
      .eq("recipient_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (
    data || []
  ) as SeboroNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return 0;

  const { count, error } =
    await supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("recipient_id", user.id)
      .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
}

export async function markNotificationRead(
  notificationId: string
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return;

  const { error } =
    await supabase
      .from("notifications")
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("recipient_id", user.id)
      .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  emitChanged();
}

export async function markAllNotificationsRead() {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return;

  const { error } =
    await supabase
      .from("notifications")
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq("recipient_id", user.id)
      .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  emitChanged();
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    return {
      ...DEFAULT_PREFERENCES,
    };
  }

  const { data, error } =
    await supabase
      .from(
        "notification_preferences"
      )
      .select(
        "new_chapters, new_works, editorial, community, followers"
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      ...DEFAULT_PREFERENCES,
    };
  }

  return {
    new_chapters:
      Boolean(data.new_chapters),
    new_works:
      Boolean(data.new_works),
    editorial:
      Boolean(data.editorial),
    community:
      Boolean(data.community),
    followers:
      Boolean(data.followers),
  };
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const { error } =
    await supabase
      .from(
        "notification_preferences"
      )
      .upsert(
        {
          user_id: user.id,
          ...preferences,
        },
        {
          onConflict: "user_id",
        }
      );

  if (error) {
    throw new Error(error.message);
  }

  emitChanged();
}

export async function isFollowingWork(
  workId: string
): Promise<boolean> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) return false;

  const { data, error } =
    await supabase
      .from("work_follows")
      .select("work_id")
      .eq("follower_id", user.id)
      .eq("work_id", workId)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function toggleWorkFollow(
  workId: string
): Promise<boolean> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para seguir una obra."
    );
  }

  const following =
    await isFollowingWork(workId);

  if (following) {
    const { error } =
      await supabase
        .from("work_follows")
        .delete()
        .eq(
          "follower_id",
          user.id
        )
        .eq("work_id", workId);

    if (error) {
      throw new Error(error.message);
    }

    return false;
  }

  const { error } =
    await supabase
      .from("work_follows")
      .insert({
        follower_id: user.id,
        work_id: workId,
      });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getFollowingOverview(): Promise<FollowingOverview> {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    return {
      authors: [],
      works: [],
    };
  }

  const [
    authorFollowResult,
    workFollowResult,
    allAuthors,
    allWorks,
  ] = await Promise.all([
    supabase
      .from("author_follows")
      .select("author_id")
      .eq("follower_id", user.id),
    supabase
      .from("work_follows")
      .select("work_id")
      .eq("follower_id", user.id),
    getPublicAuthors(),
    getPublishedWorks({ includeTest: true }),
  ]);

  if (authorFollowResult.error) {
    throw new Error(
      authorFollowResult.error.message
    );
  }

  if (workFollowResult.error) {
    throw new Error(
      workFollowResult.error.message
    );
  }

  const authorIds =
    new Set(
      (
        authorFollowResult.data || []
      ).map((row) =>
        String(row.author_id)
      )
    );

  const workIds =
    new Set(
      (
        workFollowResult.data || []
      ).map((row) =>
        String(row.work_id)
      )
    );

  return {
    authors:
      allAuthors.filter(
        (author) =>
          authorIds.has(
            author.author_id
          )
      ),
    works:
      allWorks.filter(
        (work) =>
          workIds.has(work.id)
      ),
  };
}
