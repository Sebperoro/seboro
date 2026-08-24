import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type WorkStatus = "ongoing" | "finished";
export type SerialState = "active" | "paused" | "abandoned" | "finished";
export type ChapterStatus = "draft" | "published";

export type PublicationStatus =
  | "draft"
  | "in_review"
  | "human_review"
  | "changes_requested"
  | "approved"
  | "published";

export type AgeRating =
  | "Sin clasificar"
  | "Todos"
  | "13+"
  | "16+"
  | "18+";

export type PublishedWork = {
  id: string;
  slug: string;
  author_id: string;
  title: string;
  subtitle: string;
  genre: string;
  tags: string[];
  synopsis: string;
  content_warnings: string[];
  language_code: string;
  age_rating: AgeRating;
  work_status: WorkStatus;
  publication_status: PublicationStatus;
  price_mxn: number;
  cover_style: string;
  cover_url: string | null;
  cover_path: string | null;
  serial_state: SerialState;
  release_frequency_days: number;
  next_release_at: string | null;
  completion_target_at: string | null;
  author_commitment: string;
  last_chapter_published_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

export type WorkChapter = {
  id: string;
  work_id: string;
  chapter_number: number;
  title: string;
  content: string;
  chapter_status: ChapterStatus;
  published_at: string | null;
  current_version: number;
  last_correction_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkReview = {
  id: string;
  work_id: string;
  author_id: string;
  review_type: "automatic" | "human";
  result:
    | "in_review"
    | "approved"
    | "changes_requested";
  issues: string[];
  notes: string | null;
  submitted_at: string;
  decided_at: string | null;
};

export type ReviewResult = {
  result:
    | "human_review"
    | "changes_requested";
  issues: string[];
  chapter_count: number;
  required_chapters: number;
};

export type PublicWorkBundle = {
  work: PublishedWork;
  chapters: WorkChapter[];
  author_name: string;
};

export type WorkReadingStats = {
  wordCount: number;
  readMinutes: number;
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function stringArray(
  value: unknown
): string[] {
  return Array.isArray(value)
    ? value
        .map((item) =>
          String(item).trim()
        )
        .filter(Boolean)
    : [];
}

function normalizeWork(
  row: Record<string, unknown>
): PublishedWork {
  return {
    id: String(row.id),
    slug: String(row.slug),
    author_id: String(row.author_id),
    title: String(row.title),
    subtitle: String(
      row.subtitle || ""
    ),
    genre: String(row.genre),
    tags: stringArray(row.tags),
    synopsis: String(row.synopsis),
    content_warnings: stringArray(
      row.content_warnings
    ),
    language_code: String(
      row.language_code || "es"
    ),
    age_rating: String(
      row.age_rating ||
        "Sin clasificar"
    ) as AgeRating,
    work_status:
      row.work_status as WorkStatus,
    publication_status:
      row.publication_status as PublicationStatus,
    price_mxn: Number(
      row.price_mxn || 0
    ),
    cover_style: String(
      row.cover_style ||
        "linear-gradient(135deg,#27272a,#09090b)"
    ),
    cover_url: row.cover_url
      ? String(row.cover_url)
      : null,
    cover_path: row.cover_path
      ? String(row.cover_path)
      : null,
    serial_state: String(
      row.serial_state ||
        (row.work_status === "finished" ? "finished" : "active")
    ) as SerialState,
    release_frequency_days: Number(row.release_frequency_days || 14),
    next_release_at: row.next_release_at ? String(row.next_release_at) : null,
    completion_target_at: row.completion_target_at
      ? String(row.completion_target_at)
      : null,
    author_commitment: String(row.author_commitment || ""),
    last_chapter_published_at: row.last_chapter_published_at
      ? String(row.last_chapter_published_at)
      : null,
    created_at: String(
      row.created_at
    ),
    updated_at: String(
      row.updated_at
    ),
    published_at:
      row.published_at
        ? String(row.published_at)
        : null,
    submitted_at:
      row.submitted_at
        ? String(row.submitted_at)
        : null,
    reviewed_at:
      row.reviewed_at
        ? String(row.reviewed_at)
        : null,
  };
}

function normalizeChapter(
  row: Record<string, unknown>
): WorkChapter {
  return {
    id: String(row.id),
    work_id: String(row.work_id),
    chapter_number: Number(row.chapter_number),
    title: String(row.title),
    content: String(row.content),
    chapter_status: String(row.chapter_status || "published") as ChapterStatus,
    published_at: row.published_at ? String(row.published_at) : null,
    current_version: Number(row.current_version || 1),
    last_correction_at: row.last_correction_at
      ? String(row.last_correction_at)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function normalizeIssues(
  value: unknown
): string[] {
  return stringArray(value);
}

function cleanStringArray(
  value: string[],
  max: number
) {
  return Array.from(
    new Set(
      value
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)
    )
  ).slice(0, max);
}

export function getWorkCoverBackground(
  work: Pick<
    PublishedWork,
    "cover_url" | "cover_style"
  >
) {
  return work.cover_url
    ? `url("${work.cover_url}") center / cover no-repeat`
    : work.cover_style;
}

export function getWorkReadingStats(
  chapters: Pick<
    WorkChapter,
    "content"
  >[]
): WorkReadingStats {
  const wordCount = chapters.reduce(
    (total, chapter) => {
      const text =
        chapter.content.trim();

      if (!text) return total;

      return (
        total +
        text
          .split(/\s+/)
          .filter(Boolean).length
      );
    },
    0
  );

  return {
    wordCount,
    readMinutes:
      wordCount > 0
        ? Math.max(
            1,
            Math.ceil(
              wordCount / 220
            )
          )
        : 0,
  };
}

export async function createMyWork(
  input: {
    title: string;
    genre: string;
    synopsis: string;
    work_status: WorkStatus;
    price_mxn: number;
    cover_style: string;
  }
) {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const base =
    slugify(input.title) || "obra";

  const candidates = [
    base,
    `${base}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
  ];

  let lastError = "";

  for (const slug of candidates) {
    const { data, error } =
      await supabase
        .from("works")
        .insert({
          slug,
          author_id: user.id,
          title:
            input.title.trim(),
          genre:
            input.genre.trim(),
          synopsis:
            input.synopsis.trim(),
          work_status:
            input.work_status,
          price_mxn: Math.max(
            0,
            Number(
              input.price_mxn
            ) || 0
          ),
          cover_style:
            input.cover_style,
        })
        .select("*")
        .single();

    if (!error) {
      return normalizeWork(
        data as Record<
          string,
          unknown
        >
      );
    }

    lastError = error.message;

    if (error.code !== "23505") {
      break;
    }
  }

  throw new Error(
    lastError ||
      "No se pudo crear la obra."
  );
}

export async function getMyWorks(): Promise<
  PublishedWork[]
> {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) return [];

  const { data, error } =
    await supabase
      .from("works")
      .select("*")
      .eq(
        "author_id",
        user.id
      )
      .order(
        "created_at",
        { ascending: false }
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
  ).map(normalizeWork);
}

export async function getMyWorkBundle(
  id: string
): Promise<{
  work: PublishedWork;
  chapters: WorkChapter[];
  latestReview:
    | WorkReview
    | null;
} | null> {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) return null;

  const {
    data: workRow,
    error: workError,
  } = await supabase
    .from("works")
    .select("*")
    .eq("id", id)
    .eq(
      "author_id",
      user.id
    )
    .maybeSingle();

  if (workError) {
    throw new Error(
      workError.message
    );
  }

  if (!workRow) return null;

  const [
    {
      data: chapters,
      error: chaptersError,
    },
    {
      data: review,
      error: reviewError,
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
      .from("work_reviews")
      .select("*")
      .eq("work_id", id)
      .eq(
        "author_id",
        user.id
      )
      .order(
        "submitted_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle(),
  ]);

  if (chaptersError) {
    throw new Error(
      chaptersError.message
    );
  }

  if (reviewError) {
    throw new Error(
      reviewError.message
    );
  }

  const latestReview =
    review
      ? ({
          ...review,
          issues:
            normalizeIssues(
              review.issues
            ),
        } as WorkReview)
      : null;

  return {
    work: normalizeWork(
      workRow as Record<
        string,
        unknown
      >
    ),
    chapters: ((chapters || []) as Record<string, unknown>[]).map(
      normalizeChapter
    ),
    latestReview,
  };
}

type WorkPatch = Partial<
  Pick<
    PublishedWork,
    | "title"
    | "subtitle"
    | "genre"
    | "tags"
    | "synopsis"
    | "content_warnings"
    | "language_code"
    | "age_rating"
    | "work_status"
    | "price_mxn"
    | "cover_style"
    | "cover_url"
    | "cover_path"
    | "serial_state"
    | "release_frequency_days"
    | "next_release_at"
    | "completion_target_at"
    | "author_commitment"
  >
>;

export async function updateMyWork(
  id: string,
  patch: WorkPatch
) {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const cleaned: WorkPatch = {
    ...patch,
  };

  if (patch.tags) {
    cleaned.tags =
      cleanStringArray(
        patch.tags,
        8
      );
  }

  if (
    patch.content_warnings
  ) {
    cleaned.content_warnings =
      cleanStringArray(
        patch.content_warnings,
        8
      );
  }

  if (
    typeof patch.subtitle ===
    "string"
  ) {
    cleaned.subtitle =
      patch.subtitle
        .trim()
        .slice(0, 180);
  }

  if (typeof patch.author_commitment === "string") {
    cleaned.author_commitment = patch.author_commitment.trim().slice(0, 500);
  }

  if (typeof patch.release_frequency_days === "number") {
    cleaned.release_frequency_days = Math.max(
      1,
      Math.min(365, Math.round(patch.release_frequency_days))
    );
  }

  const { data, error } =
    await supabase
      .from("works")
      .update(cleaned)
      .eq("id", id)
      .eq(
        "author_id",
        user.id
      )
      .select("*")
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return normalizeWork(
    data as Record<
      string,
      unknown
    >
  );
}

export async function uploadMyWorkCover(
  workId: string,
  file: File
) {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const allowed = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);

  const extension =
    allowed.get(file.type);

  if (!extension) {
    throw new Error(
      "La portada debe ser JPG, PNG o WEBP."
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      "La portada no puede superar 5 MB."
    );
  }

  const {
    data: work,
    error: workError,
  } = await supabase
    .from("works")
    .select(
      "id, author_id, cover_path"
    )
    .eq("id", workId)
    .eq(
      "author_id",
      user.id
    )
    .maybeSingle();

  if (workError) {
    throw new Error(
      workError.message
    );
  }

  if (!work) {
    throw new Error(
      "Esta obra no pertenece a tu cuenta."
    );
  }

  const path = `${user.id}/${workId}/${Date.now()}.${extension}`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from("book-covers")
    .upload(path, file, {
      cacheControl: "3600",
      contentType:
        file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message
    );
  }

  const {
    data: publicData,
  } = supabase.storage
    .from("book-covers")
    .getPublicUrl(path);

  const publicUrl =
    publicData.publicUrl;

  try {
    const updated =
      await updateMyWork(
        workId,
        {
          cover_url:
            publicUrl,
          cover_path: path,
        }
      );

    const oldPath =
      work.cover_path
        ? String(
            work.cover_path
          )
        : null;

    if (
      oldPath &&
      oldPath !== path
    ) {
      await supabase.storage
        .from("book-covers")
        .remove([oldPath]);
    }

    return updated;
  } catch (err) {
    await supabase.storage
      .from("book-covers")
      .remove([path]);

    throw err;
  }
}

export async function removeMyWorkCover(
  workId: string
) {
  const supabase = client();
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const {
    data: work,
    error,
  } = await supabase
    .from("works")
    .select(
      "cover_path"
    )
    .eq("id", workId)
    .eq(
      "author_id",
      user.id
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!work) {
    throw new Error(
      "Obra no encontrada."
    );
  }

  const oldPath =
    work.cover_path
      ? String(
          work.cover_path
        )
      : null;

  const updated =
    await updateMyWork(
      workId,
      {
        cover_url: null,
        cover_path: null,
      }
    );

  if (oldPath) {
    await supabase.storage
      .from("book-covers")
      .remove([oldPath]);
  }

  return updated;
}

export async function addChapter(
  workId: string,
  chapterNumber: number,
  titleValue: string,
  contentValue: string
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const title = titleValue.trim();
  const content = contentValue.trim();

  if (!title) {
    throw new Error("El capítulo necesita título.");
  }

  if (!content) {
    throw new Error("El capítulo está vacío.");
  }

  const { data: work, error: workError } = await supabase
    .from("works")
    .select("publication_status, work_status")
    .eq("id", workId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (workError) {
    throw new Error(workError.message);
  }

  if (!work) {
    throw new Error("Esta obra no pertenece a tu cuenta.");
  }

  if (
    work.publication_status === "published" &&
    work.work_status === "finished"
  ) {
    throw new Error(
      "Una obra terminada y publicada no acepta capítulos nuevos."
    );
  }

  const chapterStatus: ChapterStatus =
    work.publication_status === "published" ? "draft" : "published";

  const { data, error } = await supabase
    .from("work_chapters")
    .insert({
      work_id: workId,
      chapter_number: chapterNumber,
      title,
      content,
      chapter_status: chapterStatus,
      published_at:
        chapterStatus === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeChapter(data as Record<string, unknown>);
}

export async function publishSerialChapter(
  chapterId: string
) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "publish_serial_chapter",
    {
      p_chapter_id: chapterId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return normalizeChapter(data as Record<string, unknown>);
}

export async function updateChapter(
  id: string,
  patch: Pick<
    WorkChapter,
    "title" | "content"
  >
) {
  const supabase = client();

  const { data, error } =
    await supabase
      .from(
        "work_chapters"
      )
      .update({
        title:
          patch.title.trim(),
        content:
          patch.content.trim(),
      })
      .eq("id", id)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return normalizeChapter(data as Record<string, unknown>);
}

export async function deleteChapter(
  id: string
) {
  const supabase = client();

  const { error } =
    await supabase
      .from(
        "work_chapters"
      )
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function submitMyWorkForReview(
  workId: string
): Promise<ReviewResult> {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "submit_my_work_for_review",
      {
        p_work_id:
          workId,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const result =
    data as Record<
      string,
      unknown
    >;

  return {
    result:
      result.result as
        | "human_review"
        | "changes_requested",
    issues:
      normalizeIssues(
        result.issues
      ),
    chapter_count:
      Number(
        result.chapter_count ||
          0
      ),
    required_chapters:
      Number(
        result.required_chapters ||
          0
      ),
  };
}

export async function publishMyWork(
  workId: string
) {
  const supabase = client();

  const { data, error } =
    await supabase.rpc(
      "publish_my_work",
      {
        p_work_id:
          workId,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  return normalizeWork(
    row as Record<
      string,
      unknown
    >
  );
}

export async function getPublishedWorks(): Promise<
  Array<
    PublishedWork & {
      author_name: string;
    }
  >
> {
  const supabase = client();

  const { data, error } =
    await supabase
      .from("works")
      .select("*")
      .eq(
        "publication_status",
        "published"
      )
      .order(
        "published_at",
        { ascending: false }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const works = (
    (data || []) as Record<
      string,
      unknown
    >[]
  ).map(normalizeWork);

  const authorIds = [
    ...new Set(
      works.map(
        (work) =>
          work.author_id
      )
    ),
  ];

  if (
    authorIds.length === 0
  ) {
    return [];
  }

  const [
    {
      data: profiles,
      error:
        profilesError,
    },
    {
      data:
        authorProfiles,
      error:
        authorProfilesError,
    },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, display_name"
      )
      .in(
        "user_id",
        authorIds
      ),

    supabase
      .from(
        "author_profiles"
      )
      .select(
        "user_id, pen_name"
      )
      .in(
        "user_id",
        authorIds
      ),
  ]);

  if (profilesError) {
    throw new Error(
      profilesError.message
    );
  }

  if (
    authorProfilesError
  ) {
    throw new Error(
      authorProfilesError.message
    );
  }

  const baseNames =
    new Map(
      (profiles ||
        []).map(
        (profile) => [
          String(
            profile.user_id
          ),
          String(
            profile.display_name ||
              "Autor"
          ),
        ]
      )
    );

  const penNames =
    new Map(
      (authorProfiles ||
        []).map(
        (profile) => [
          String(
            profile.user_id
          ),
          String(
            profile.pen_name ||
              ""
          ).trim(),
        ]
      )
    );

  return works.map(
    (work) => ({
      ...work,
      author_name:
        penNames.get(
          work.author_id
        ) ||
        baseNames.get(
          work.author_id
        ) ||
        "Autor",
    })
  );
}

export async function getPublishedWorkBySlug(
  slug: string
): Promise<
  PublicWorkBundle | null
> {
  const supabase = client();

  const {
    data: workRow,
    error: workError,
  } = await supabase
    .from("works")
    .select("*")
    .eq("slug", slug)
    .eq(
      "publication_status",
      "published"
    )
    .maybeSingle();

  if (workError) {
    throw new Error(
      workError.message
    );
  }

  if (!workRow) {
    return null;
  }

  const work =
    normalizeWork(
      workRow as Record<
        string,
        unknown
      >
    );

  const [
    {
      data: chapters,
      error:
        chaptersError,
    },
    {
      data: profile,
      error:
        profileError,
    },
    {
      data:
        authorProfile,
      error:
        authorProfileError,
    },
  ] = await Promise.all([
    supabase
      .from(
        "work_chapters"
      )
      .select("*")
      .eq(
        "work_id",
        work.id
      )
      .eq("chapter_status", "published")
      .order(
        "chapter_number",
        { ascending: true }
      ),

    supabase
      .from("profiles")
      .select(
        "display_name"
      )
      .eq(
        "user_id",
        work.author_id
      )
      .maybeSingle(),

    supabase
      .from(
        "author_profiles"
      )
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

  if (
    authorProfileError
  ) {
    throw new Error(
      authorProfileError.message
    );
  }

  const penName =
    String(
      authorProfile?.pen_name ||
        ""
    ).trim();

  return {
    work,
    chapters: ((chapters || []) as Record<string, unknown>[]).map(
      normalizeChapter
    ),
    author_name:
      penName ||
      String(
        profile?.display_name ||
          "Autor"
      ),
  };
}
