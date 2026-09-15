"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type PdfHighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReaderAnnotation = {
  id: string;
  userId: string;
  workId: string;
  bookSlug: string;
  annotationType: "bookmark" | "highlight";
  contentFormat: "native" | "epub" | "pdf";
  pageNumber: number | null;
  chapterNumber: number | null;
  startOffset: number | null;
  endOffset: number | null;
  selectedText: string | null;
  rects: PdfHighlightRect[];
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type HighlightDraft = {
  workId: string;
  bookSlug: string;
  contentFormat: "native" | "epub" | "pdf";
  pageNumber: number;
  chapterNumber?: number | null;
  startOffset?: number | null;
  endOffset?: number | null;
  selectedText: string;
  rects?: PdfHighlightRect[];
  color?: string;
};

export type BookmarkDraft = {
  workId: string;
  bookSlug: string;
  contentFormat: "native" | "epub" | "pdf";
  pageNumber: number;
  chapterNumber?: number | null;
  startOffset?: number | null;
};

const LOCAL_PREFIX = "seboro-reader-annotations:";

function normalizeRects(value: unknown): PdfHighlightRect[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const x = Number(row.x);
      const y = Number(row.y);
      const width = Number(row.width);
      const height = Number(row.height);

      if (![x, y, width, height].every(Number.isFinite)) return null;

      return {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(0, width),
        height: Math.max(0, height),
      };
    })
    .filter((item): item is PdfHighlightRect => Boolean(item));
}

function normalizeAnnotation(row: Record<string, unknown>): ReaderAnnotation {
  return {
    id: String(row.id || ""),
    userId: String(row.user_id || "local"),
    workId: String(row.work_id || ""),
    bookSlug: String(row.book_slug || ""),
    annotationType:
      String(row.annotation_type) === "bookmark" ? "bookmark" : "highlight",
    contentFormat: String(row.content_format || "native") as ReaderAnnotation["contentFormat"],
    pageNumber:
      row.page_number === null || row.page_number === undefined
        ? null
        : Number(row.page_number),
    chapterNumber:
      row.chapter_number === null || row.chapter_number === undefined
        ? null
        : Number(row.chapter_number),
    startOffset:
      row.start_offset === null || row.start_offset === undefined
        ? null
        : Number(row.start_offset),
    endOffset:
      row.end_offset === null || row.end_offset === undefined
        ? null
        : Number(row.end_offset),
    selectedText: row.selected_text ? String(row.selected_text) : null,
    rects: normalizeRects(row.rects),
    color: String(row.color || "yellow"),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function localKey(slug: string) {
  return `${LOCAL_PREFIX}${slug}`;
}

function readLocal(slug: string): ReaderAnnotation[] {
  try {
    const raw = localStorage.getItem(localKey(slug));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => normalizeAnnotation(item as Record<string, unknown>));
  } catch {
    return [];
  }
}

function writeLocal(slug: string, annotations: ReaderAnnotation[]) {
  localStorage.setItem(localKey(slug), JSON.stringify(annotations));
}

async function currentUserId(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export async function getReaderAnnotations(
  slug: string
): Promise<ReaderAnnotation[]> {
  const supabase = getSupabaseBrowserClient();
  const userId = await currentUserId();

  if (!supabase || !userId) {
    return readLocal(slug).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }

  const { data, error } = await supabase
    .from("reader_annotations")
    .select("*")
    .eq("book_slug", slug)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Record<string, unknown>[]).map(normalizeAnnotation);
}

export async function toggleReaderBookmark(
  draft: BookmarkDraft
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const userId = await currentUserId();

  if (!supabase || !userId) {
    const current = readLocal(draft.bookSlug);
    const existing = current.find(
      (item) =>
        item.annotationType === "bookmark" &&
        item.pageNumber === draft.pageNumber &&
        (draft.contentFormat === "pdf" ||
          item.chapterNumber === (draft.chapterNumber ?? null))
    );

    if (existing) {
      writeLocal(
        draft.bookSlug,
        current.filter((item) => item.id !== existing.id)
      );
      return;
    }

    const now = new Date().toISOString();
    const next: ReaderAnnotation = {
      id: `local-${crypto.randomUUID()}`,
      userId: "local",
      workId: draft.workId,
      bookSlug: draft.bookSlug,
      annotationType: "bookmark",
      contentFormat: draft.contentFormat,
      pageNumber: draft.pageNumber,
      chapterNumber: draft.chapterNumber ?? null,
      startOffset: draft.startOffset ?? null,
      endOffset: null,
      selectedText: null,
      rects: [],
      color: "yellow",
      createdAt: now,
      updatedAt: now,
    };

    writeLocal(draft.bookSlug, [...current, next]);
    return;
  }

  let query = supabase
    .from("reader_annotations")
    .select("id")
    .eq("annotation_type", "bookmark")
    .eq("book_slug", draft.bookSlug)
    .eq("page_number", draft.pageNumber)
    .limit(1);

  if (draft.contentFormat !== "pdf" && draft.chapterNumber != null) {
    query = query.eq("chapter_number", draft.chapterNumber);
  }

  const { data: existing, error: lookupError } = await query.maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("reader_annotations")
      .delete()
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("reader_annotations").insert({
    user_id: userId,
    work_id: draft.workId,
    book_slug: draft.bookSlug,
    annotation_type: "bookmark",
    content_format: draft.contentFormat,
    page_number: draft.pageNumber,
    chapter_number: draft.chapterNumber ?? null,
    start_offset: draft.startOffset ?? null,
    end_offset: null,
    selected_text: null,
    rects: [],
    color: "yellow",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createReaderHighlight(
  draft: HighlightDraft
): Promise<void> {
  const selectedText = draft.selectedText.trim();
  if (!selectedText) {
    throw new Error("Selecciona texto antes de subrayar.");
  }

  const supabase = getSupabaseBrowserClient();
  const userId = await currentUserId();

  if (!supabase || !userId) {
    const current = readLocal(draft.bookSlug);
    const now = new Date().toISOString();

    const next: ReaderAnnotation = {
      id: `local-${crypto.randomUUID()}`,
      userId: "local",
      workId: draft.workId,
      bookSlug: draft.bookSlug,
      annotationType: "highlight",
      contentFormat: draft.contentFormat,
      pageNumber: draft.pageNumber,
      chapterNumber: draft.chapterNumber ?? null,
      startOffset: draft.startOffset ?? null,
      endOffset: draft.endOffset ?? null,
      selectedText,
      rects: draft.rects || [],
      color: draft.color || "yellow",
      createdAt: now,
      updatedAt: now,
    };

    writeLocal(draft.bookSlug, [...current, next]);
    return;
  }

  const { error } = await supabase.from("reader_annotations").insert({
    user_id: userId,
    work_id: draft.workId,
    book_slug: draft.bookSlug,
    annotation_type: "highlight",
    content_format: draft.contentFormat,
    page_number: draft.pageNumber,
    chapter_number: draft.chapterNumber ?? null,
    start_offset: draft.startOffset ?? null,
    end_offset: draft.endOffset ?? null,
    selected_text: selectedText,
    rects: draft.rects || [],
    color: draft.color || "yellow",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteReaderAnnotation(
  slug: string,
  id: string
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const userId = await currentUserId();

  if (!supabase || !userId || id.startsWith("local-")) {
    writeLocal(
      slug,
      readLocal(slug).filter((item) => item.id !== id)
    );
    return;
  }

  const { error } = await supabase
    .from("reader_annotations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
