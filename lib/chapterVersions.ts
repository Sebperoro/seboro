import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ChapterVersion = {
  id: string;
  version_number: number;
  title: string;
  content: string;
  change_note: string;
  change_type:
    | "initial"
    | "serial_publish"
    | "correction"
    | "restore";
  restored_from_version: number | null;
  created_at: string;
  is_current: boolean;
};

export type ChapterCorrectionRequest = {
  id: string;
  request_type:
    | "correction"
    | "restore";
  base_version: number;
  restore_from_version: number | null;
  change_note: string;
  status:
    | "pending"
    | "approved"
    | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type PendingChapterCorrection = {
  request_id: string;
  work_id: string;
  work_slug: string;
  work_title: string;
  chapter_id: string;
  chapter_number: number;
  current_title: string;
  current_content: string;
  current_version: number;
  proposed_title: string;
  proposed_content: string;
  request_type:
    | "correction"
    | "restore";
  restore_from_version: number | null;
  change_note: string;
  author_name: string;
  created_at: string;
};

export type RecentChapterVersion = {
  version_id: string;
  work_slug: string;
  work_title: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
  version_number: number;
  change_type:
    | "correction"
    | "restore";
  restored_from_version: number | null;
  change_note: string;
  author_name: string;
  created_at: string;
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

export async function getChapterVersionHistory(
  chapterId: string
): Promise<ChapterVersion[]> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "get_chapter_version_history",
      {
        p_chapter_id:
          chapterId,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data || []
  ) as ChapterVersion[];
}

export async function getLatestChapterCorrectionRequest(
  chapterId: string
): Promise<ChapterCorrectionRequest | null> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "get_latest_chapter_correction_request",
      {
        p_chapter_id:
          chapterId,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data) return null;

  return data as ChapterCorrectionRequest;
}

export async function submitChapterCorrection(
  chapterId: string,
  input: {
    title: string;
    content: string;
    changeNote: string;
  }
) {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "submit_chapter_correction",
      {
        p_chapter_id:
          chapterId,
        p_title:
          input.title,
        p_content:
          input.content,
        p_change_note:
          input.changeNote,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

export async function requestChapterVersionRestore(
  chapterId: string,
  versionNumber: number,
  changeNote: string
) {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "request_chapter_version_restore",
      {
        p_chapter_id:
          chapterId,
        p_version_number:
          versionNumber,
        p_change_note:
          changeNote,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

export async function getPendingChapterCorrections(): Promise<
  PendingChapterCorrection[]
> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "get_pending_chapter_corrections"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data || []
  ) as PendingChapterCorrection[];
}

export async function reviewChapterCorrection(
  requestId: string,
  decision:
    | "approved"
    | "rejected",
  adminNotes: string
) {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "admin_review_chapter_correction",
      {
        p_request_id:
          requestId,
        p_decision:
          decision,
        p_admin_notes:
          adminNotes,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

export async function getRecentChapterVersions(): Promise<
  RecentChapterVersion[]
> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "get_recent_chapter_versions"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data || []
  ) as RecentChapterVersion[];
}
