import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/userBooks";

export type WorkStatus = "ongoing" | "finished";
export type SerialState = "active" | "paused" | "abandoned" | "finished";
export type ChapterStatus = "draft" | "published";
export type ContentFormat = "native" | "epub" | "pdf";
export type ReadingMode = "reflowable" | "fixed";
export type ProcessingStatus =
  | "none"
  | "pending"
  | "processing"
  | "ready"
  | "error";

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
  is_test: boolean;
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
  sample_enabled: boolean;
  sample_chapters: number;
  sample_pages: number;
  sample_level_bonus_enabled: boolean;
  cover_style: string;
  cover_url: string | null;
  cover_path: string | null;
  content_format: ContentFormat;
  reading_mode: ReadingMode;
  source_file_path: string | null;
  source_file_name: string | null;
  source_file_size: number | null;
  source_uploaded_at: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  page_count: number | null;
  manuscript_chapter_count: number | null;
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
    is_test: Boolean(row.is_test),
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
    sample_enabled: row.sample_enabled === undefined ? true : Boolean(row.sample_enabled),
    sample_chapters: Math.max(0, Number(row.sample_chapters ?? 1)),
    sample_pages: Math.max(0, Number(row.sample_pages ?? 10)),
    sample_level_bonus_enabled: Boolean(row.sample_level_bonus_enabled),
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
    content_format: String(
      row.content_format || "native"
    ) as ContentFormat,
    reading_mode: String(
      row.reading_mode || "reflowable"
    ) as ReadingMode,
    source_file_path: row.source_file_path
      ? String(row.source_file_path)
      : null,
    source_file_name: row.source_file_name
      ? String(row.source_file_name)
      : null,
    source_file_size:
      row.source_file_size === null ||
      row.source_file_size === undefined
        ? null
        : Number(row.source_file_size),
    source_uploaded_at: row.source_uploaded_at
      ? String(row.source_uploaded_at)
      : null,
    processing_status: String(
      row.processing_status || "none"
    ) as ProcessingStatus,
    processing_error: row.processing_error
      ? String(row.processing_error)
      : null,
    page_count:
      row.page_count === null ||
      row.page_count === undefined
        ? null
        : Number(row.page_count),
    manuscript_chapter_count:
      row.manuscript_chapter_count === null ||
      row.manuscript_chapter_count === undefined
        ? null
        : Math.max(0, Number(row.manuscript_chapter_count)),
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
    | "sample_enabled"
    | "sample_chapters"
    | "sample_pages"
    | "sample_level_bonus_enabled"
    | "cover_style"
    | "cover_url"
    | "cover_path"
    | "content_format"
    | "reading_mode"
    | "source_file_path"
    | "source_file_name"
    | "source_file_size"
    | "source_uploaded_at"
    | "processing_status"
    | "processing_error"
    | "page_count"
    | "manuscript_chapter_count"
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

  if (typeof patch.sample_chapters === "number") {
    cleaned.sample_chapters = Math.max(0, Math.min(50, Math.round(patch.sample_chapters)));
  }

  if (typeof patch.sample_pages === "number") {
    cleaned.sample_pages = Math.max(0, Math.min(200, Math.round(patch.sample_pages)));
  }

  if (typeof patch.manuscript_chapter_count === "number") {
    cleaned.manuscript_chapter_count = Math.max(
      0,
      Math.min(10000, Math.round(patch.manuscript_chapter_count))
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

export const COVER_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const COVER_MAX_BYTES = 5 * 1024 * 1024;

export function validateCoverFile(file: File): string | null {
  if (!COVER_ALLOWED_TYPES[file.type]) {
    return "La portada debe ser JPG, PNG o WEBP.";
  }

  if (file.size > COVER_MAX_BYTES) {
    return "La portada no puede superar 5 MB.";
  }

  return null;
}

// Proporción recomendada 2:3 (ancho/alto ≈ 0.667). Fuera de este rango no
// se bloquea la subida, solo se advierte: la portada igual se muestra
// recortada al centro (background center/cover) en toda la app.
export const COVER_RATIO_MIN = 0.5;
export const COVER_RATIO_MAX = 0.85;

export function getCoverRatioWarning(ratio: number): string | null {
  if (ratio < COVER_RATIO_MIN || ratio > COVER_RATIO_MAX) {
    return "Esta imagen no es muy vertical (2:3): se mostrará recortada al centro en las portadas. Puedes subirla igual o elegir una más vertical.";
  }

  return null;
}

export function getImageAspectRatio(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth / img.naturalHeight);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    img.src = url;
  });
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

  const validationError = validateCoverFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const extension =
    COVER_ALLOWED_TYPES[file.type];

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

const MANUSCRIPT_BUCKET = "book-manuscripts";
const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;

function getManuscriptFileInfo(file: File): {
  contentFormat: Exclude<ContentFormat, "native">;
  readingMode: ReadingMode;
  extension: "pdf" | "epub";
  contentType: string;
} {
  const fileName = file.name.trim();
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    if (
      file.type &&
      file.type !== "application/pdf" &&
      file.type !== "application/octet-stream"
    ) {
      throw new Error("El archivo seleccionado no parece ser un PDF válido.");
    }

    return {
      contentFormat: "pdf",
      readingMode: "fixed",
      extension: "pdf",
      contentType: "application/pdf",
    };
  }

  if (extension === "epub") {
    if (
      file.type &&
      file.type !== "application/epub+zip" &&
      file.type !== "application/octet-stream" &&
      file.type !== "application/zip"
    ) {
      throw new Error("El archivo seleccionado no parece ser un EPUB válido.");
    }

    return {
      contentFormat: "epub",
      readingMode: "reflowable",
      extension: "epub",
      contentType: "application/epub+zip",
    };
  }

  throw new Error("El manuscrito debe ser un archivo PDF o EPUB.");
}

async function countPdfPages(
  source: ArrayBuffer | Uint8Array
) {
  const { PDFDocument } = await import("pdf-lib");

  try {
    const bytes =
      source instanceof Uint8Array
        ? source
        : new Uint8Array(source);

    const document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    const pageCount = document.getPageCount();

    if (!Number.isFinite(pageCount) || pageCount < 1) {
      throw new Error("El PDF no contiene páginas válidas.");
    }

    return pageCount;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `No se pudo leer el PDF: ${error.message}`
        : "No se pudo leer el PDF."
    );
  }
}

export async function processMyWorkPdf(
  workId: string
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data: work, error } = await supabase
    .from("works")
    .select(
      "id, author_id, content_format, source_file_path, publication_status"
    )
    .eq("id", workId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!work) {
    throw new Error("Esta obra no pertenece a tu cuenta.");
  }

  if (work.content_format !== "pdf") {
    throw new Error("Esta obra no utiliza un manuscrito PDF.");
  }

  if (!work.source_file_path) {
    throw new Error("La obra todavía no tiene un archivo PDF.");
  }

  if (
    work.publication_status === "in_review" ||
    work.publication_status === "human_review"
  ) {
    throw new Error(
      "No puedes reprocesar el PDF mientras la obra está en revisión."
    );
  }

  await updateMyWork(workId, {
    processing_status: "processing",
    processing_error: null,
    page_count: null,
  });

  try {
    const { data: fileData, error: downloadError } =
      await supabase.storage
        .from(MANUSCRIPT_BUCKET)
        .download(String(work.source_file_path));

    if (downloadError) {
      throw new Error(downloadError.message);
    }

    const pageCount = await countPdfPages(
      await fileData.arrayBuffer()
    );

    return await updateMyWork(workId, {
      reading_mode: "fixed",
      processing_status: "ready",
      processing_error: null,
      page_count: pageCount,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el PDF.";

    await updateMyWork(workId, {
      processing_status: "error",
      processing_error: message.slice(0, 1000),
      page_count: null,
    });

    throw new Error(message);
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHtmlTitle(value: string, fallback: string) {
  const headingMatch =
    value.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);

  if (headingMatch?.[1]) {
    const heading = stripHtml(headingMatch[1]).trim();

    if (heading) {
      return heading.slice(0, 180);
    }
  }

  const titleMatch =
    value.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (titleMatch?.[1]) {
    const title = stripHtml(titleMatch[1]).trim();

    if (title) {
      return title.slice(0, 180);
    }
  }

  return fallback.slice(0, 180);
}

function resolveEpubPath(baseFile: string, relative: string) {
  const cleanRelative = relative.split("#")[0].split("?")[0];

  if (!cleanRelative) return "";

  const baseParts = baseFile.split("/");
  baseParts.pop();

  const relativeParts = cleanRelative.split("/");

  for (const part of relativeParts) {
    if (!part || part === ".") continue;

    if (part === "..") {
      baseParts.pop();
      continue;
    }

    baseParts.push(part);
  }

  return baseParts.join("/");
}

function getXmlAttribute(
  tag: string,
  attribute: string
) {
  const match = tag.match(
    new RegExp(
      `${attribute}\\s*=\\s*["']([^"']+)["']`,
      "i"
    )
  );

  return match?.[1] || "";
}

async function parseEpubChapters(
  source: ArrayBuffer | Uint8Array
) {
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  const zip = await JSZip.loadAsync(source);

  const containerFile =
    zip.file("META-INF/container.xml");

  if (!containerFile) {
    throw new Error(
      "El EPUB no contiene META-INF/container.xml."
    );
  }

  const containerXml =
    await containerFile.async("text");

  const rootfileMatch =
    containerXml.match(
      /<rootfile[^>]*full-path=["']([^"']+)["'][^>]*>/i
    );

  const packagePath =
    rootfileMatch?.[1];

  if (!packagePath) {
    throw new Error(
      "No se pudo localizar el archivo OPF del EPUB."
    );
  }

  const packageFile =
    zip.file(packagePath);

  if (!packageFile) {
    throw new Error(
      "El archivo OPF declarado por el EPUB no existe."
    );
  }

  const packageXml =
    await packageFile.async("text");

  const manifest = new Map<string, string>();

  const itemTags =
    packageXml.match(/<item\b[^>]*>/gi) || [];

  for (const tag of itemTags) {
    const id =
      getXmlAttribute(tag, "id");

    const href =
      getXmlAttribute(tag, "href");

    if (id && href) {
      manifest.set(
        id,
        resolveEpubPath(
          packagePath,
          decodeURIComponent(href)
        )
      );
    }
  }

  const spineMatch =
    packageXml.match(
      /<spine\b[^>]*>([\s\S]*?)<\/spine>/i
    );

  if (!spineMatch?.[1]) {
    throw new Error(
      "El EPUB no contiene un orden de lectura válido."
    );
  }

  const itemRefs =
    spineMatch[1].match(
      /<itemref\b[^>]*>/gi
    ) || [];

  const orderedFiles: string[] = [];

  for (const tag of itemRefs) {
    const idref =
      getXmlAttribute(tag, "idref");

    const href =
      manifest.get(idref);

    if (href) {
      orderedFiles.push(href);
    }
  }

  if (orderedFiles.length === 0) {
    throw new Error(
      "El EPUB no contiene capítulos legibles en su spine."
    );
  }

  const chapters: Array<{
    title: string;
    content: string;
  }> = [];

  for (let index = 0; index < orderedFiles.length; index++) {
    const filePath =
      orderedFiles[index];

    const chapterFile =
      zip.file(filePath);

    if (!chapterFile) {
      continue;
    }

    const html =
      await chapterFile.async("text");

    const content =
      stripHtml(html);

    if (content.length < 80) {
      continue;
    }

    const fallbackTitle =
      `Capítulo ${chapters.length + 1}`;

    chapters.push({
      title:
        extractHtmlTitle(
          html,
          fallbackTitle
        ) || fallbackTitle,
      content,
    });
  }

  if (chapters.length === 0) {
    throw new Error(
      "No se pudieron extraer capítulos con contenido suficiente del EPUB."
    );
  }

  return chapters;
}

export async function processMyWorkEpub(
  workId: string
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data: work, error } = await supabase
    .from("works")
    .select(
      "id, author_id, content_format, source_file_path, publication_status"
    )
    .eq("id", workId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!work) {
    throw new Error(
      "Esta obra no pertenece a tu cuenta."
    );
  }

  if (work.content_format !== "epub") {
    throw new Error(
      "Esta obra no utiliza un manuscrito EPUB."
    );
  }

  if (!work.source_file_path) {
    throw new Error(
      "La obra todavía no tiene un archivo EPUB."
    );
  }

  if (
    work.publication_status === "in_review" ||
    work.publication_status === "human_review"
  ) {
    throw new Error(
      "No puedes reprocesar el EPUB mientras la obra está en revisión."
    );
  }

  await updateMyWork(workId, {
    processing_status: "processing",
    processing_error: null,
    page_count: null,
  });

  try {
    const { data: fileData, error: downloadError } =
      await supabase.storage
        .from(MANUSCRIPT_BUCKET)
        .download(
          String(work.source_file_path)
        );

    if (downloadError) {
      throw new Error(
        downloadError.message
      );
    }

    const chapters =
      await parseEpubChapters(
        await fileData.arrayBuffer()
      );

    const { error: deleteError } =
      await supabase
        .from("work_chapters")
        .delete()
        .eq("work_id", workId);

    if (deleteError) {
      throw new Error(
        deleteError.message
      );
    }

    const rows = chapters.map(
      (chapter, index) => ({
        work_id: workId,
        chapter_number: index + 1,
        title: chapter.title,
        content: chapter.content,
        chapter_status: "published",
        published_at: new Date().toISOString(),
        current_version: 1,
        last_correction_at: null,
      })
    );

    const { error: insertError } =
      await supabase
        .from("work_chapters")
        .insert(rows);

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }

    return await updateMyWork(
      workId,
      {
        reading_mode: "reflowable",
        processing_status: "ready",
        processing_error: null,
        page_count: null,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el EPUB.";

    await updateMyWork(
      workId,
      {
        processing_status: "error",
        processing_error:
          message.slice(0, 1000),
        page_count: null,
      }
    );

    throw new Error(message);
  }
}

export async function uploadMyWorkManuscript(
  workId: string,
  file: File
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  if (!file || file.size <= 0) {
    throw new Error("El archivo está vacío.");
  }

  if (file.size > MAX_MANUSCRIPT_BYTES) {
    throw new Error("El manuscrito no puede superar 50 MB.");
  }

  const fileInfo = getManuscriptFileInfo(file);

  let pdfPageCount: number | null = null;

  if (fileInfo.contentFormat === "pdf") {
    pdfPageCount = await countPdfPages(
      await file.arrayBuffer()
    );
  }

  const { data: work, error: workError } = await supabase
    .from("works")
    .select(
      "id, author_id, publication_status, source_file_path"
    )
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
    work.publication_status === "in_review" ||
    work.publication_status === "human_review"
  ) {
    throw new Error(
      "No puedes reemplazar el manuscrito mientras la obra está en revisión."
    );
  }

  if (work.publication_status === "published") {
    throw new Error(
      "La sustitución de manuscritos de obras publicadas se gestionará mediante versiones."
    );
  }

  const path = `${user.id}/${workId}/${Date.now()}.${fileInfo.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(MANUSCRIPT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: fileInfo.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const oldPath = work.source_file_path
    ? String(work.source_file_path)
    : null;

  try {
    const updated = await updateMyWork(workId, {
      content_format: fileInfo.contentFormat,
      reading_mode: fileInfo.readingMode,
      source_file_path: path,
      source_file_name: file.name.slice(0, 255),
      source_file_size: file.size,
      source_uploaded_at: new Date().toISOString(),
      processing_status:
        fileInfo.contentFormat === "pdf"
          ? "ready"
          : "pending",
      processing_error: null,
      page_count:
        fileInfo.contentFormat === "pdf"
          ? pdfPageCount
          : null,
    });

    if (oldPath && oldPath !== path) {
      await supabase.storage
        .from(MANUSCRIPT_BUCKET)
        .remove([oldPath]);
    }

    if (
      fileInfo.contentFormat === "epub"
    ) {
      return await processMyWorkEpub(
        workId
      );
    }

    return updated;
  } catch (err) {
    await supabase.storage
      .from(MANUSCRIPT_BUCKET)
      .remove([path]);

    throw err;
  }
}

export async function removeMyWorkManuscript(
  workId: string
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data: work, error } = await supabase
    .from("works")
    .select(
      "source_file_path, publication_status"
    )
    .eq("id", workId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!work) {
    throw new Error("Obra no encontrada.");
  }

  if (
    work.publication_status === "in_review" ||
    work.publication_status === "human_review"
  ) {
    throw new Error(
      "No puedes eliminar el manuscrito mientras la obra está en revisión."
    );
  }

  if (work.publication_status === "published") {
    throw new Error(
      "El manuscrito de una obra publicada no puede eliminarse directamente."
    );
  }

  const oldPath = work.source_file_path
    ? String(work.source_file_path)
    : null;

  const updated = await updateMyWork(workId, {
    content_format: "native",
    reading_mode: "reflowable",
    source_file_path: null,
    source_file_name: null,
    source_file_size: null,
    source_uploaded_at: null,
    processing_status: "none",
    processing_error: null,
    page_count: null,
  });

  if (oldPath) {
    const { error: removeError } = await supabase.storage
      .from(MANUSCRIPT_BUCKET)
      .remove([oldPath]);

    if (removeError) {
      throw new Error(
        `La ficha se actualizó, pero no se pudo borrar el archivo anterior: ${removeError.message}`
      );
    }
  }

  return updated;
}

export async function getPublishedWorkManuscriptUrl(
  slug: string,
  expiresIn = 3600
) {
  const supabase = client();

  const { data: work, error } = await supabase
    .from("works")
    .select(
      "source_file_path, content_format, publication_status"
    )
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    !work?.source_file_path ||
    work.content_format !== "pdf"
  ) {
    return null;
  }

  const safeExpiresIn = Math.max(
    60,
    Math.min(86400, Math.round(expiresIn))
  );

  const {
    data,
    error: signedError,
  } = await supabase.storage
    .from(MANUSCRIPT_BUCKET)
    .createSignedUrl(
      String(work.source_file_path),
      safeExpiresIn
    );

  if (signedError) {
    throw new Error(signedError.message);
  }

  return data.signedUrl;
}

export async function getMyWorkManuscriptUrl(
  workId: string,
  expiresIn = 3600
) {
  const supabase = client();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const { data: work, error } = await supabase
    .from("works")
    .select("source_file_path")
    .eq("id", workId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!work?.source_file_path) {
    return null;
  }

  const safeExpiresIn = Math.max(
    60,
    Math.min(86400, Math.round(expiresIn))
  );

  const { data, error: signedError } = await supabase.storage
    .from(MANUSCRIPT_BUCKET)
    .createSignedUrl(
      String(work.source_file_path),
      safeExpiresIn
    );

  if (signedError) {
    throw new Error(signedError.message);
  }

  return data.signedUrl;
}

export async function setMyWorkProcessingState(
  workId: string,
  patch: {
    processing_status: ProcessingStatus;
    processing_error?: string | null;
    page_count?: number | null;
  }
) {
  const workPatch: WorkPatch = {
    processing_status: patch.processing_status,
  };

  if (patch.processing_error !== undefined) {
    workPatch.processing_error =
      patch.processing_error;
  }

  if (patch.page_count !== undefined) {
    workPatch.page_count =
      patch.page_count === null
        ? null
        : Math.max(
            1,
            Math.round(patch.page_count)
          );
  }

  return updateMyWork(
    workId,
    workPatch
  );
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

export async function getPublishedWorks(
  options: {
    includeTest?: boolean;
  } = {}
): Promise<
  Array<
    PublishedWork & {
      author_name: string;
    }
  >
> {
  const supabase = client();

  let query = supabase
    .from("works")
    .select("*")
    .eq(
      "publication_status",
      "published"
    );

  if (!options.includeTest) {
    query = query.eq("is_test", false);
  }

  const { data, error } =
    await query.order(
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
