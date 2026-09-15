"use client";

import Link from "next/link";
import {
  useParams,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  getPublishedWorkBySlug,
  type PublicWorkBundle,
  type WorkChapter,
} from "@/lib/publishedWorks";

import {
  getWorkAccess,
  type WorkAccess,
} from "@/lib/workAccess";

import {
  getCurrentUser,
  getUserBook,
  patchUserBook,
} from "@/lib/userBooks";

import {
  getUserFeedback,
  upsertUserFeedback,
} from "@/lib/userFeedback";

import {
  rateFinishedPublishedWork,
} from "@/lib/workRatings";

import {
  getSupabaseBrowserClient,
} from "@/lib/supabase/client";

import {
  createReaderHighlight,
  deleteReaderAnnotation,
  getReaderAnnotations,
  toggleReaderBookmark,
  type PdfHighlightRect,
  type ReaderAnnotation,
} from "@/lib/readerAnnotations";

type ReaderTheme =
  | "offwhite"
  | "ivory"
  | "warmgray"
  | "dark";

type SpreadMode =
  | "auto"
  | "single"
  | "double";

type PdfZoomMode =
  | "page"
  | "width"
  | "custom";

type ReaderSettings = {
  pdfZoomMode: PdfZoomMode;
  pdfZoom: number;
  textScale: number;
  theme: ReaderTheme;
  spread: SpreadMode;
};

type TextReaderPage = {
  chapterIndex: number;
  chapterNumber: number;
  chapterTitle: string;
  pageInChapter: number;
  pageCountInChapter: number;
  startOffset: number;
  text: string;
};

type PdfDocumentLike = {
  numPages: number;
  getPage: (
    pageNumber: number
  ) => Promise<{
    getViewport: (options: {
      scale: number;
    }) => {
      width: number;
      height: number;
      transform?: number[];
    };
    getTextContent?: () => Promise<{
      items: Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      }>;
    }>;
    render: (options: {
      canvasContext: CanvasRenderingContext2D;
      viewport: {
        width: number;
        height: number;
      };
    }) => {
      promise: Promise<unknown>;
      cancel?: () => void;
    };
  }>;
  destroy?: () => Promise<void> | void;
};

const DEFAULT_SETTINGS: ReaderSettings = {
  pdfZoomMode: "page",
  pdfZoom: 1,
  textScale: 1,
  theme: "offwhite",
  spread: "auto",
};

const TEXT_PAGE_CHARS = 1350;

const RATING_KEY =
  "seboro-ratings";
const REACTIONS_KEY =
  "seboro-reactions";
const REVIEWS_KEY =
  "seboro-reviews";

const reactionOptions = [
  {
    id: "love",
    emoji: "❤️",
    label: "Me encantó",
  },
  {
    id: "moved",
    emoji: "😢",
    label: "Me emocionó",
  },
  {
    id: "surprised",
    emoji: "😮",
    label: "Me sorprendió",
  },
  {
    id: "funny",
    emoji: "😂",
    label: "Me hizo reír",
  },
  {
    id: "annoyed",
    emoji: "😡",
    label: "Me molestó",
  },
];

function readObject<T>(
  key: string,
  fallback: T
): T {
  try {
    return JSON.parse(
      localStorage.getItem(key) ||
        JSON.stringify(fallback)
    );
  } catch {
    return fallback;
  }
}

function updateLocalHistory(
  slug: string
) {
  try {
    const current: string[] =
      JSON.parse(
        localStorage.getItem(
          "seboro-history"
        ) || "[]"
      );

    const next = [
      slug,
      ...current.filter(
        (item) => item !== slug
      ),
    ].slice(0, 100);

    localStorage.setItem(
      "seboro-history",
      JSON.stringify(next)
    );
  } catch {
    localStorage.setItem(
      "seboro-history",
      JSON.stringify([slug])
    );
  }

  window.dispatchEvent(
    new Event(
      "seboro-library-updated"
    )
  );
}

function loadSettings(
  defaultZoomMode: PdfZoomMode = DEFAULT_SETTINGS.pdfZoomMode
): ReaderSettings {
  try {
    const raw =
      localStorage.getItem(
        "seboro-book-reader-settings"
      );

    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        pdfZoomMode: defaultZoomMode,
      };
    }

    const parsed =
      JSON.parse(raw);

    const legacyZoom =
      Number(parsed.zoom);

    const pdfZoom =
      Number(parsed.pdfZoom);

    const textScale =
      Number(parsed.textScale);

    return {
      pdfZoomMode:
        ["page", "width", "custom"].includes(
          parsed.pdfZoomMode
        )
          ? parsed.pdfZoomMode
          : Number.isFinite(legacyZoom)
          ? "custom"
          : defaultZoomMode,

      pdfZoom:
        Number.isFinite(pdfZoom) &&
        pdfZoom >= 1 &&
        pdfZoom <= 2
          ? pdfZoom
          : Number.isFinite(legacyZoom) &&
            legacyZoom >= 0.8 &&
            legacyZoom <= 2
          ? legacyZoom
          : DEFAULT_SETTINGS.pdfZoom,

      textScale:
        Number.isFinite(textScale) &&
        textScale >= 0.85 &&
        textScale <= 1.4
          ? textScale
          : DEFAULT_SETTINGS.textScale,

      theme:
        parsed.theme === "paper"
          ? "offwhite"
          : parsed.theme === "sepia"
          ? "ivory"
          : [
              "offwhite",
              "ivory",
              "warmgray",
              "dark",
            ].includes(parsed.theme)
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,

      spread:
        ["auto", "single", "double"].includes(
          parsed.spread
        )
          ? parsed.spread
          : DEFAULT_SETTINGS.spread,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function splitTextIntoChunks(
  value: string,
  maxChars: number
) {
  const clean =
    value
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  if (!clean) return [];

  const paragraphs =
    clean
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  function pushCurrent() {
    const normalized =
      current.trim();

    if (normalized) {
      chunks.push(normalized);
    }

    current = "";
  }

  for (const paragraph of paragraphs) {
    if (
      paragraph.length <= maxChars
    ) {
      const candidate =
        current
          ? `${current}\n\n${paragraph}`
          : paragraph;

      if (
        candidate.length <= maxChars
      ) {
        current = candidate;
      } else {
        pushCurrent();
        current = paragraph;
      }

      continue;
    }

    pushCurrent();

    const words =
      paragraph.split(/\s+/);

    let oversized = "";

    for (const word of words) {
      const candidate =
        oversized
          ? `${oversized} ${word}`
          : word;

      if (
        candidate.length >
        maxChars
      ) {
        if (oversized) {
          chunks.push(
            oversized.trim()
          );
        }

        oversized = word;
      } else {
        oversized = candidate;
      }
    }

    if (oversized.trim()) {
      current =
        oversized.trim();
    }
  }

  pushCurrent();

  return chunks;
}

function normalizeReaderHeading(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

function cleanChapterContentForReader(chapter: WorkChapter) {
  const original = String(chapter.content || "");
  const titleSignature = normalizeReaderHeading(chapter.title || "");

  if (!original.trim() || !titleSignature) {
    return { text: original, removedChars: 0 };
  }

  let cursor = 0;
  let removedCopies = 0;

  while (removedCopies < 3 && cursor < original.length) {
    const rest = original.slice(cursor);
    const match = rest.match(/^\s*([^\n\r]+)(?:\r?\n|$)/);

    if (!match) break;

    const line = String(match[1] || "");
    if (normalizeReaderHeading(line) !== titleSignature) break;

    cursor += match[0].length;
    removedCopies += 1;
  }

  if (removedCopies === 0) {
    return { text: original, removedChars: 0 };
  }

  while (cursor < original.length && /\s/.test(original[cursor])) {
    cursor += 1;
  }

  return {
    text: original.slice(cursor),
    removedChars: cursor,
  };
}

function buildTextPages(
  chapters: WorkChapter[],
  textScale = 1
): TextReaderPage[] {
  const pages: TextReaderPage[] = [];

  const pageChars =
    Math.max(
      650,
      Math.round(
        TEXT_PAGE_CHARS /
          Math.pow(
            textScale,
            1.65
          )
      )
    );

  chapters.forEach(
    (chapter, chapterIndex) => {
      const cleaned =
        cleanChapterContentForReader(
          chapter
        );

      const chunks =
        splitTextIntoChunks(
          cleaned.text,
          pageChars
        );

      const safeChunks =
        chunks.length > 0
          ? chunks
          : [""];

      let searchFrom = 0;

      safeChunks.forEach(
        (text, pageInChapter) => {
          const foundAt =
            cleaned.text.indexOf(
              text,
              searchFrom
            );

          const localStart =
            foundAt >= 0
              ? foundAt
              : searchFrom;

          const startOffset =
            cleaned.removedChars +
            localStart;

          pages.push({
            chapterIndex,
            chapterNumber:
              chapter.chapter_number,
            chapterTitle:
              chapter.title,
            pageInChapter,
            pageCountInChapter:
              safeChunks.length,
            startOffset,
            text,
          });

          searchFrom =
            localStart + text.length;
        }
      );
    }
  );

  return pages;
}

function clampPageIndex(
  value: number,
  totalPages: number
) {
  if (totalPages <= 0) {
    return 0;
  }

  return Math.min(
    Math.max(
      0,
      Math.round(value)
    ),
    totalPages - 1
  );
}

type SelectionDraft = {
  contentFormat: "native" | "epub" | "pdf";
  pageNumber: number;
  chapterNumber: number | null;
  startOffset: number | null;
  endOffset: number | null;
  selectedText: string;
  rects: PdfHighlightRect[];
  screenX: number;
  screenY: number;
};

type HighlightActionDraft = {
  annotation: ReaderAnnotation;
  screenX: number;
  screenY: number;
};

function getTextOffset(
  container: HTMLElement,
  node: Node,
  offset: number
) {
  const range = document.createRange();
  range.selectNodeContents(container);

  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }

  return range.toString().length;
}

function multiplyPdfTransforms(
  first: number[],
  second: number[]
) {
  return [
    first[0] * second[0] + first[2] * second[1],
    first[1] * second[0] + first[3] * second[1],
    first[0] * second[2] + first[2] * second[3],
    first[1] * second[2] + first[3] * second[3],
    first[0] * second[4] + first[2] * second[5] + first[4],
    first[1] * second[4] + first[3] * second[5] + first[5],
  ];
}

function TextBookPage({
  page,
  absolutePage,
  textScale,
  theme,
  compact,
  contentFormat,
  highlights,
  onSelection,
  onHighlightClick,
}: {
  page: TextReaderPage;
  absolutePage: number;
  textScale: number;
  theme: ReaderTheme;
  compact: boolean;
  contentFormat: "native" | "epub";
  highlights: ReaderAnnotation[];
  onSelection: (draft: SelectionDraft) => void;
  onHighlightClick: (draft: HighlightActionDraft) => void;
}) {
  const textRef = useRef<HTMLDivElement | null>(null);

  const pageTheme =
    theme === "dark"
      ? "border-white/10 bg-[#1E1E1E] text-[#ECEAE5] shadow-black/30"
      : theme === "ivory"
      ? "border-[#ddd1bb] bg-[#F3EAD8] text-[#332d26] shadow-[#6b5630]/12"
      : theme === "warmgray"
      ? "border-[#d8d1c8] bg-[#ECE7DF] text-[#302d29] shadow-[#554c43]/10"
      : "border-[#e2dcd3] bg-[#F7F4EE] text-[#302c28] shadow-[#594b3d]/10";

  const muted =
    theme === "dark"
      ? "text-[#9D9D9D]"
      : theme === "ivory"
      ? "text-[#85725b]"
      : theme === "warmgray"
      ? "text-[#827b73]"
      : "text-[#928a82]";

  const width = compact ? 690 : 760;
  const pageEndOffset = page.startOffset + page.text.length;

  const pageHighlights = highlights
    .filter(
      (item) =>
        item.annotationType === "highlight" &&
        item.contentFormat !== "pdf" &&
        item.chapterNumber === page.chapterNumber &&
        item.startOffset !== null &&
        item.endOffset !== null &&
        item.endOffset > page.startOffset &&
        item.startOffset < pageEndOffset
    )
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  const renderedText = (() => {
    if (pageHighlights.length === 0) return page.text;

    const nodes = [];
    let cursor = 0;

    for (const item of pageHighlights) {
      const rawStart = Math.max(
        0,
        (item.startOffset || 0) - page.startOffset
      );
      const rawEnd = Math.min(
        page.text.length,
        (item.endOffset || 0) - page.startOffset
      );

      const start = Math.max(cursor, rawStart);
      const end = Math.max(start, rawEnd);

      if (start > cursor) {
        nodes.push(page.text.slice(cursor, start));
      }

      if (end > start) {
        nodes.push(
          <span
            key={`${item.id}-${start}`}
            className="cursor-pointer rounded-[3px] bg-[#f0c84b]/30 box-decoration-clone transition hover:bg-[#f0c84b]/40"
            title="Subrayado guardado"
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              onHighlightClick({
                annotation: item,
                screenX: Math.min(
                  window.innerWidth - 100,
                  Math.max(100, rect.left + rect.width / 2)
                ),
                screenY: Math.max(70, rect.top - 8),
              });
            }}
          >
            {page.text.slice(start, end)}
          </span>
        );
      }

      cursor = Math.max(cursor, end);
    }

    if (cursor < page.text.length) {
      nodes.push(page.text.slice(cursor));
    }

    return nodes;
  })();

  function captureSelection() {
    const container = textRef.current;
    const selection = window.getSelection();

    if (!container || !selection || selection.isCollapsed || selection.rangeCount < 1) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (
      !container.contains(range.startContainer) ||
      !container.contains(range.endContainer)
    ) {
      return;
    }

    let localStart = getTextOffset(
      container,
      range.startContainer,
      range.startOffset
    );
    let localEnd = getTextOffset(
      container,
      range.endContainer,
      range.endOffset
    );

    if (localEnd < localStart) {
      [localStart, localEnd] = [localEnd, localStart];
    }

    localStart = Math.max(0, Math.min(localStart, page.text.length));
    localEnd = Math.max(localStart, Math.min(localEnd, page.text.length));

    const selectedText = page.text.slice(localStart, localEnd).trim();
    if (!selectedText) return;

    const rect = range.getBoundingClientRect();

    onSelection({
      contentFormat,
      pageNumber: absolutePage,
      chapterNumber: page.chapterNumber,
      startOffset: page.startOffset + localStart,
      endOffset: page.startOffset + localEnd,
      selectedText,
      rects: [],
      screenX: Math.min(window.innerWidth - 90, Math.max(90, rect.left + rect.width / 2)),
      screenY: Math.max(70, rect.top - 10),
    });
  }

  return (
    <article
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-[4px] border shadow-[0_18px_42px_rgba(55,43,33,0.11)] ${pageTheme}`}
      style={{
        width: compact
          ? `min(${width}px, calc(50vw - 14px))`
          : `min(${width}px, calc(100vw - 24px))`,
        aspectRatio: "2 / 3",
      }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          padding: compact
            ? "clamp(20px, 3vw, 38px)"
            : "clamp(24px, 4vw, 52px)",
        }}
      >
        {page.pageInChapter === 0 ? (
          <header className="mb-6">
            <h1
              className="font-serif font-semibold leading-tight"
              style={{
                fontSize: `clamp(${Math.round(18 * textScale)}px, ${
                  3 * textScale
                }vw, ${Math.round(30 * textScale)}px)`,
              }}
            >
              {page.chapterTitle}
            </h1>

            <div
              className={`mt-5 h-px ${
                theme === "dark" ? "bg-white/10" : "bg-black/10"
              }`}
            />
          </header>
        ) : null}

        <div
          ref={textRef}
          onMouseUp={captureSelection}
          onTouchEnd={() => window.setTimeout(captureSelection, 0)}
          className="min-h-0 flex-1 select-text overflow-hidden whitespace-pre-line font-serif"
          style={{
            fontSize: `clamp(${(11 * textScale).toFixed(1)}px, ${
              1.55 * textScale
            }vw, ${(17 * textScale).toFixed(1)}px)`,
            lineHeight: 1.72,
          }}
        >
          {renderedText}
        </div>

        <footer className={`mt-4 flex items-center justify-between text-[9px] font-semibold ${muted}`}>
          <span>
            {page.pageInChapter + 1}/{page.pageCountInChapter}
          </span>
          <span>{absolutePage}</span>
        </footer>
      </div>
    </article>
  );
}

type PdfTextSpan = {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
};

// Espacio que cada página reserva para su propia leyenda ("Página N") y el
// padding vertical de la sección que la contiene. No es medible vía ref
// porque vive dentro del propio elemento que se está dimensionando, así que
// se deja como un margen fijo pequeño (a diferencia del antiguo offset de
// 110px, que intentaba adivinar también la altura del header).
const PDF_PAGE_CHROME_RESERVE = 32;

function PdfBookPage({
  document,
  pageNumber,
  zoomMode,
  zoom,
  compact,
  isDesktop,
  chromeRef,
  highlights,
  onSelection,
  onHighlightClick,
}: {
  document: PdfDocumentLike;
  pageNumber: number;
  zoomMode: PdfZoomMode;
  zoom: number;
  compact: boolean;
  isDesktop: boolean;
  chromeRef: RefObject<HTMLDivElement | null>;
  highlights: ReaderAnnotation[];
  onSelection: (draft: SelectionDraft) => void;
  onHighlightClick: (draft: HighlightActionDraft) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);

  const [renderError, setRenderError] = useState("");
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [textSpans, setTextSpans] = useState<PdfTextSpan[]>([]);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    // resize y orientationchange casi siempre llegan juntos en una rotación
    // real; los dos pasan por el mismo debounce para que solo dispare UN
    // recálculo (si cada uno programara el suyo por separado, dos renders
    // del PDF quedarían compitiendo por el mismo canvas).
    function scheduleRecompute() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setResizeTick((tick) => tick + 1);
      }, 200);
    }

    window.addEventListener("resize", scheduleRecompute);
    window.addEventListener("orientationchange", scheduleRecompute);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleRecompute);
      window.removeEventListener("orientationchange", scheduleRecompute);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let renderTask:
      | {
          promise: Promise<unknown>;
          cancel?: () => void;
        }
      | null = null;

    async function renderPage() {
      try {
        setRenderError("");
        setTextSpans([]);

        const pdfPage = await document.getPage(pageNumber);
        if (!active) return;

        const firstViewport = pdfPage.getViewport({ scale: 1 });

        const viewportWidthLimit = compact
          ? Math.max(280, (window.innerWidth - 36) / 2)
          : Math.max(280, window.innerWidth - 24);

        // El escritorio conserva exactamente el cálculo anterior (offset fijo
        // de 110px) para no alterar su comportamiento. Fuera de escritorio,
        // en vez de adivinar la altura del header, se mide la real.
        const viewportHeightLimit = isDesktop
          ? Math.max(420, window.innerHeight - 110)
          : Math.max(
              420,
              window.innerHeight -
                (chromeRef.current?.getBoundingClientRect().height ?? 0) -
                PDF_PAGE_CHROME_RESERVE
            );

        const fitPageWidthByHeight =
          viewportHeightLimit * (firstViewport.width / firstViewport.height);

        const comfortablePageWidth = compact
          ? fitPageWidthByHeight * 1.28
          : fitPageWidthByHeight * 1.08;

        const targetWidth =
          zoomMode === "page"
            ? Math.min(viewportWidthLimit, comfortablePageWidth)
            : zoomMode === "width"
            ? viewportWidthLimit
            : firstViewport.width * zoom;

        const scale = targetWidth / firstViewport.width;
        const viewport = pdfPage.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("No se pudo preparar el lienzo del PDF.");
        }

        const outputScale = Math.min(2, window.devicePixelRatio || 1);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setViewportSize({ width: viewport.width, height: viewport.height });

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!active || !pdfPage.getTextContent) return;

        try {
          const textContent = await pdfPage.getTextContent();
          if (!active) return;

          const viewportTransform =
            Array.isArray(viewport.transform) && viewport.transform.length >= 6
              ? viewport.transform
              : [scale, 0, 0, -scale, 0, viewport.height];

          const nextSpans: PdfTextSpan[] = [];

          textContent.items.forEach((item, index) => {
            const text = String(item.str || "");
            const itemTransform = item.transform;

            if (!text || !Array.isArray(itemTransform) || itemTransform.length < 6) {
              return;
            }

            const tx = multiplyPdfTransforms(viewportTransform, itemTransform);
            const fontHeight = Math.max(6, Math.hypot(tx[2], tx[3]));
            const angle = Math.atan2(tx[1], tx[0]);
            const itemWidth = Math.max(fontHeight * 0.25, Number(item.width || 0) * scale);

            nextSpans.push({
              id: `${pageNumber}-${index}`,
              text,
              left: tx[4],
              top: tx[5] - fontHeight,
              width: itemWidth,
              height: fontHeight * 1.18,
              angle,
            });
          });

          setTextSpans(nextSpans);
        } catch (textError) {
          console.warn("SEBORO PDF text layer unavailable:", textError);
          setTextSpans([]);
        }
      } catch (error) {
        if (!active) return;

        setRenderError(
          error instanceof Error ? error.message : "No se pudo renderizar la página."
        );
      }
    }

    renderPage();

    return () => {
      active = false;
      try {
        renderTask?.cancel?.();
      } catch {
        // Nada.
      }
    };
  }, [document, pageNumber, zoomMode, zoom, compact, isDesktop, resizeTick]);

  const pageHighlights = highlights.filter(
    (item) =>
      item.annotationType === "highlight" &&
      item.contentFormat === "pdf" &&
      item.pageNumber === pageNumber
  );

  function capturePdfSelection() {
    const pageElement = pageRef.current;
    const textLayer = textLayerRef.current;
    const selection = window.getSelection();

    if (
      !pageElement ||
      !textLayer ||
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount < 1
    ) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (
      !textLayer.contains(range.startContainer) ||
      !textLayer.contains(range.endContainer)
    ) {
      return;
    }

    const selectedText = selection.toString().replace(/\s+/g, " ").trim();
    if (!selectedText) return;

    const pageRect = pageElement.getBoundingClientRect();
    if (pageRect.width <= 0 || pageRect.height <= 0) return;

    const rects = Array.from(range.getClientRects())
      .map((rect) => {
        const left = Math.max(rect.left, pageRect.left);
        const top = Math.max(rect.top, pageRect.top);
        const right = Math.min(rect.right, pageRect.right);
        const bottom = Math.min(rect.bottom, pageRect.bottom);

        if (right <= left || bottom <= top) return null;

        return {
          x: (left - pageRect.left) / pageRect.width,
          y: (top - pageRect.top) / pageRect.height,
          width: (right - left) / pageRect.width,
          height: (bottom - top) / pageRect.height,
        };
      })
      .filter((item): item is PdfHighlightRect => Boolean(item));

    if (rects.length === 0) return;

    const rect = range.getBoundingClientRect();

    onSelection({
      contentFormat: "pdf",
      pageNumber,
      chapterNumber: null,
      startOffset: null,
      endOffset: null,
      selectedText,
      rects,
      screenX: Math.min(window.innerWidth - 90, Math.max(90, rect.left + rect.width / 2)),
      screenY: Math.max(70, rect.top - 10),
    });
  }

  function handlePdfHighlightClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const pageElement = pageRef.current;
    if (!pageElement || pageHighlights.length === 0) return;

    const pageRect = pageElement.getBoundingClientRect();
    if (pageRect.width <= 0 || pageRect.height <= 0) return;

    const x = (event.clientX - pageRect.left) / pageRect.width;
    const y = (event.clientY - pageRect.top) / pageRect.height;

    const annotation = pageHighlights.find((item) =>
      item.rects.some(
        (rect) =>
          x >= rect.x &&
          x <= rect.x + rect.width &&
          y >= rect.y &&
          y <= rect.y + rect.height
      )
    );

    if (!annotation) return;

    onHighlightClick({
      annotation,
      screenX: Math.min(
        window.innerWidth - 100,
        Math.max(100, event.clientX)
      ),
      screenY: Math.max(70, event.clientY - 12),
    });
  }

  return (
    <div className="relative shrink-0">
      <div
        className="overflow-auto rounded-[8px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.16)]"
        style={{ maxWidth: "calc(100vw - 24px)" }}
      >
        <div
          ref={pageRef}
          className="relative"
          style={{
            width: viewportSize.width || undefined,
            height: viewportSize.height || undefined,
          }}
        >
          <canvas ref={canvasRef} className="block" />

          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            {pageHighlights.flatMap((item) =>
              item.rects.map((rect, index) => (
                <span
                  key={`${item.id}-${index}`}
                  className="absolute rounded-[2px] bg-[#f0c84b]/30"
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.width * 100}%`,
                    height: `${rect.height * 100}%`,
                  }}
                />
              ))
            )}
          </div>

          <div
            ref={textLayerRef}
            onMouseUp={capturePdfSelection}
            onClick={handlePdfHighlightClick}
            onTouchEnd={() => window.setTimeout(capturePdfSelection, 0)}
            className="absolute inset-0 z-20 overflow-hidden"
            aria-label="Capa de selección de texto del PDF"
          >
            {textSpans.map((item) => (
              <span
                key={item.id}
                className="absolute block select-text whitespace-pre text-transparent"
                style={{
                  left: item.left,
                  top: item.top,
                  width: item.width,
                  height: item.height,
                  fontSize: item.height / 1.18,
                  lineHeight: 1,
                  fontFamily: "serif",
                  transform: `rotate(${item.angle}rad)`,
                  transformOrigin: "0 0",
                  cursor: "text",
                }}
              >
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-white/95 p-6 text-center text-sm font-semibold text-red-700">
          {renderError}
        </div>
      )}

      <p className="mt-2 text-center text-xs font-semibold text-current/50">
        {pageNumber}
      </p>
    </div>
  );
}


export default function PublishedReaderPage() {
  const params =
    useParams<{ slug: string }>();

  const search =
    useSearchParams();

  const headerRef = useRef<HTMLDivElement | null>(null);

  const [
    bundle,
    setBundle,
  ] =
    useState<PublicWorkBundle | null>(
      null
    );

  const [
    access,
    setAccess,
  ] = useState<WorkAccess | null>(null);

  const [
    pdfAuthToken,
    setPdfAuthToken,
  ] = useState<string | null>(null);

  const [
    pageIndex,
    setPageIndex,
  ] = useState(0);

  const [
    loggedIn,
    setLoggedIn,
  ] = useState(false);

  const [
    userId,
    setUserId,
  ] =
    useState<string | null>(
      null
    );

  const [
    loaded,
    setLoaded,
  ] = useState(false);

  const [
    finished,
    setFinished,
  ] = useState(false);

  const [
    showFinish,
    setShowFinish,
  ] = useState(false);

  const [
    rating,
    setRating,
  ] = useState(0);

  const [
    reactions,
    setReactions,
  ] = useState<string[]>(
    []
  );

  const [
    review,
    setReview,
  ] = useState("");

  const [
    savingFeedback,
    setSavingFeedback,
  ] = useState(false);

  const [
    savedFeedback,
    setSavedFeedback,
  ] = useState(false);

  const [
    feedbackError,
    setFeedbackError,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    settingsOpen,
    setSettingsOpen,
  ] = useState(false);

  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [bookmarkPickerOpen, setBookmarkPickerOpen] = useState(false);
  const [annotationBusy, setAnnotationBusy] = useState(false);
  const [annotationError, setAnnotationError] = useState("");
  const [pendingHighlight, setPendingHighlight] = useState<SelectionDraft | null>(null);
  const [highlightAction, setHighlightAction] = useState<HighlightActionDraft | null>(null);
  const [showHighlightHint, setShowHighlightHint] = useState(false);

  const [
    settings,
    setSettings,
  ] =
    useState<ReaderSettings>(
      DEFAULT_SETTINGS
    );

  const [
    isDesktop,
    setIsDesktop,
  ] = useState(false);

  const [
    pdfUrl,
    setPdfUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    pdfDocument,
    setPdfDocument,
  ] =
    useState<PdfDocumentLike | null>(
      null
    );

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState(false);

  const textPages =
    useMemo(
      () =>
        bundle &&
        bundle.work
          .content_format !==
          "pdf"
          ? buildTextPages(
              bundle.chapters,
              settings.textScale
            )
          : [],
      [
        bundle,
        settings.textScale,
      ]
    );

  const isPdf =
    bundle?.work.content_format ===
    "pdf";

  const pdfPageCount =
    pdfDocument?.numPages ||
    bundle?.work.page_count ||
    0;

  const totalPages =
    isPdf
      ? pdfPageCount
      : textPages.length;

  const wantsDouble =
    settings.spread === "double" ||
    (
      settings.spread === "auto" &&
      isDesktop
    );

  const doublePage =
    wantsDouble &&
    isDesktop;

  const spreadCount =
    doublePage ? 2 : 1;

  useEffect(() => {
    // El modo inicial de zoom depende del dispositivo SOLO cuando no hay
    // preferencia guardada todavía (decisión #26-A): escritorio sigue
    // arrancando en "page", móvil arranca en "width". En cuanto exista una
    // preferencia guardada (el usuario ya cambió el zoom alguna vez, en
    // cualquier dispositivo), loadSettings la respeta y este default deja
    // de aplicar.
    const initialIsDesktop =
      window.innerWidth >= 1100;

    setSettings(
      loadSettings(
        initialIsDesktop ? "page" : "width"
      )
    );

    setIsDesktop(initialIsDesktop);

    function syncDesktop() {
      setIsDesktop(
        window.innerWidth >= 1100
      );
    }

    window.addEventListener(
      "resize",
      syncDesktop
    );

    return () => {
      window.removeEventListener(
        "resize",
        syncDesktop
      );
    };
  }, []);

  useEffect(() => {
    // "settings" todavía es el objeto DEFAULT_SETTINGS original (misma
    // referencia) hasta que el efecto de carga de arriba corre y aplica lo
    // leído de localStorage (o el default según dispositivo). Sin este
    // guard, este efecto puede persistir el default genérico ("page") antes
    // de que se resuelva el default específico de móvil ("width"),
    // pisándolo.
    if (settings === DEFAULT_SETTINGS) return;

    localStorage.setItem(
      "seboro-book-reader-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoaded(false);
      setError("");

      try {
        const [result, workAccess] =
          await Promise.all([
            getPublishedWorkBySlug(
              params.slug
            ),
            getWorkAccess(
              params.slug
            ),
          ]);

        if (!active) return;

        if (!result) {
          setBundle(null);
          setLoaded(true);
          return;
        }

        setBundle(result);
        setAccess(workAccess);

        const resultIsPdf =
          result.work
            .content_format ===
          "pdf";

        const resultTextPages =
          resultIsPdf
            ? []
            : buildTextPages(
                result.chapters
              );

        const knownTotal =
          resultIsPdf
            ? Math.max(
                1,
                workAccess?.fullAccess
                  ? workAccess.totalPages || result.work.page_count || 1
                  : Math.min(
                      workAccess?.samplePages || 1,
                      workAccess?.totalPages || result.work.page_count || 1
                    )
              )
            : Math.max(
                1,
                resultTextPages.length
              );

        const requestedPage =
          Number(
            search.get("pagina")
          );

        const requestedChapter =
          Number(
            search.get("capitulo")
          );

        let requestedIndex:
          | number
          | null = null;

        if (
          Number.isFinite(
            requestedPage
          ) &&
          requestedPage >= 1
        ) {
          requestedIndex =
            clampPageIndex(
              requestedPage - 1,
              knownTotal
            );
        } else if (
          !resultIsPdf &&
          Number.isFinite(
            requestedChapter
          ) &&
          requestedChapter >= 1
        ) {
          const found =
            resultTextPages.findIndex(
              (page) =>
                page.chapterIndex ===
                requestedChapter - 1
            );

          if (found >= 0) {
            requestedIndex =
              found;
          }
        }

        const user =
          await getCurrentUser();

        const supabase =
          getSupabaseBrowserClient();
        const sessionResult =
          await supabase?.auth.getSession();
        const accessToken =
          sessionResult?.data.session?.access_token || null;

        if (!active) return;

        setPdfAuthToken(accessToken);

        setLoggedIn(
          Boolean(user)
        );

        setUserId(
          user?.id || null
        );

        if (user) {
          const row =
            await getUserBook(
              result.work.slug
            );

          const extendedRow =
            row as
              | (
                  typeof row & {
                    progress_type?:
                      string;
                    progress_detail?:
                      Record<
                        string,
                        unknown
                      >;
                  }
                )
              | null;

          const storedProgress =
            typeof row?.progress ===
            "number"
              ? row.progress
              : 0;

          let storedIndex = 0;

          if (
            extendedRow
              ?.progress_type ===
              "page" ||
            resultIsPdf
          ) {
            storedIndex =
              clampPageIndex(
                storedProgress,
                knownTotal
              );
          } else if (
            !resultIsPdf
          ) {
            const found =
              resultTextPages.findIndex(
                (page) =>
                  page.chapterIndex ===
                  storedProgress
              );

            storedIndex =
              found >= 0
                ? found
                : 0;
          }

          setFinished(
            Boolean(
              row?.finished
            )
          );

          try {
            const feedback =
              await getUserFeedback(
                result.work.slug
              );

            if (
              active &&
              feedback
            ) {
              setRating(
                feedback.rating || 0
              );
              setReactions(
                feedback.reactions ||
                  []
              );
              setReview(
                feedback.review || ""
              );
            }
          } catch (feedbackLoadError) {
            console.error(
              "SEBORO feedback load failed:",
              feedbackLoadError
            );
          }

          setPageIndex(
            requestedIndex ??
              storedIndex
          );

          await patchUserBook(
            result.work.slug,
            {
              last_opened_at:
                new Date()
                  .toISOString(),
            }
          );
        } else {
          const progressKey =
            `seboro-progress:${result.work.slug}`;

          const typeKey =
            `seboro-progress-type:${result.work.slug}`;

          const raw =
            localStorage.getItem(
              progressKey
            );

          const stored =
            raw === null
              ? 0
              : Number(raw);

          const storedType =
            localStorage.getItem(
              typeKey
            );

          let storedIndex = 0;

          if (
            Number.isFinite(
              stored
            ) &&
            stored >= 0
          ) {
            if (
              storedType ===
                "page" ||
              resultIsPdf
            ) {
              storedIndex =
                clampPageIndex(
                  stored,
                  knownTotal
                );
            } else if (
              !resultIsPdf
            ) {
              const found =
                resultTextPages
                  .findIndex(
                    (page) =>
                      page.chapterIndex ===
                      stored
                  );

              storedIndex =
                found >= 0
                  ? found
                  : 0;
            }
          }

          setFinished(
            localStorage.getItem(
              `seboro-finished:${result.work.slug}`
            ) === "true"
          );

          const ratings =
            readObject<
              Record<
                string,
                number
              >
            >(
              RATING_KEY,
              {}
            );

          const reactionsMap =
            readObject<
              Record<
                string,
                string[]
              >
            >(
              REACTIONS_KEY,
              {}
            );

          const reviews =
            readObject<
              Record<
                string,
                string
              >
            >(
              REVIEWS_KEY,
              {}
            );

          setRating(
            ratings[
              result.work.slug
            ] || 0
          );

          setReactions(
            reactionsMap[
              result.work.slug
            ] || []
          );

          setReview(
            reviews[
              result.work.slug
            ] || ""
          );

          setPageIndex(
            requestedIndex ??
              storedIndex
          );

          updateLocalHistory(
            result.work.slug
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo abrir la obra."
          );
        }
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [
    params.slug,
    search,
  ]);

  useEffect(() => {
    if (!bundle) {
      setAnnotations([]);
      return;
    }

    let active = true;

    getReaderAnnotations(bundle.work.slug)
      .then((items) => {
        if (active) {
          setAnnotations(items);
          setAnnotationError("");
        }
      })
      .catch((annotationLoadError) => {
        if (active) {
          setAnnotationError(
            annotationLoadError instanceof Error
              ? annotationLoadError.message
              : "No se pudieron cargar tus marcadores y subrayados."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [bundle, loggedIn]);

  useEffect(() => {
    if (!bundle || !loggedIn) return;

    const key = "seboro-reader-highlight-hint-v1";
    if (localStorage.getItem(key) === "seen") return;

    const showTimer = window.setTimeout(() => {
      setShowHighlightHint(true);
      localStorage.setItem(key, "seen");
    }, 900);

    const hideTimer = window.setTimeout(() => {
      setShowHighlightHint(false);
    }, 7000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [bundle, loggedIn]);

  useEffect(() => {
    setPendingHighlight(null);
    setHighlightAction(null);
    setBookmarkPickerOpen(false);
  }, [pageIndex]);

  useEffect(() => {
    if (
      !bundle ||
      bundle.work.content_format !== "pdf"
    ) {
      setPdfUrl(null);
      setPdfDocument(null);
      return;
    }

    setPdfUrl(
      `/api/reader/pdf/${encodeURIComponent(bundle.work.slug)}`
    );
  }, [bundle]);

  useEffect(() => {
    if (!pdfUrl) {
      return;
    }

    const activePdfUrl = pdfUrl;
    let active = true;
    let loadingTask:
      | {
          promise:
            Promise<PdfDocumentLike>;
          destroy?: () => void;
        }
      | null = null;

    let loadedDocument:
      | PdfDocumentLike
      | null = null;

    async function loadPdf() {
      try {
        setPdfLoading(true);
        setError("");

        const pdfjs =
          await import(
            "pdfjs-dist"
          );

        if (
          !pdfjs
            .GlobalWorkerOptions
            .workerSrc
        ) {
          pdfjs
            .GlobalWorkerOptions
            .workerSrc =
            new URL(
              "pdfjs-dist/build/pdf.worker.min.mjs",
              import.meta.url
            ).toString();
        }

        loadingTask =
          pdfjs.getDocument({
            url: activePdfUrl,
            httpHeaders: pdfAuthToken
              ? { Authorization: `Bearer ${pdfAuthToken}` }
              : undefined,
          }) as unknown as {
            promise:
              Promise<PdfDocumentLike>;
            destroy?: () => void;
          };

        loadedDocument =
          await loadingTask.promise;

        if (!active) {
          await loadedDocument
            .destroy?.();
          return;
        }

        setPdfDocument(
          loadedDocument
        );

        setPageIndex(
          (current) =>
            clampPageIndex(
              current,
              loadedDocument
                ?.numPages || 1
            )
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el documento PDF."
          );
        }
      } finally {
        if (active) {
          setPdfLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      active = false;

      try {
        loadingTask?.destroy?.();
      } catch {
        // Nada.
      }

      try {
        loadedDocument
          ?.destroy?.();
      } catch {
        // Nada.
      }
    };
  }, [pdfUrl, pdfAuthToken]);

  useEffect(() => {
    if (
      !bundle ||
      !loaded ||
      totalPages <= 0
    ) {
      return;
    }

    const currentBundle =
      bundle;

    const safeIndex =
      clampPageIndex(
        pageIndex,
        totalPages
      );

    const timer =
      window.setTimeout(
        async () => {
          if (loggedIn) {
            await patchUserBook(
              currentBundle
                .work.slug,
              {
                progress:
                  safeIndex,
                last_opened_at:
                  new Date()
                    .toISOString(),
              }
            );

            if (userId) {
              const supabase =
                getSupabaseBrowserClient();

              if (supabase) {
                const detail =
                  currentBundle
                    .work
                    .content_format ===
                  "pdf"
                    ? {
                        page:
                          safeIndex +
                          1,
                        format:
                          "pdf",
                      }
                    : {
                        page:
                          safeIndex +
                          1,
                        format:
                          currentBundle
                            .work
                            .content_format,
                        chapter:
                          textPages[
                            safeIndex
                          ]
                            ?.chapterNumber ??
                          null,
                      };

                await supabase
                  .from(
                    "user_books"
                  )
                  .update({
                    progress_type:
                      "page",
                    progress_detail:
                      detail,
                  })
                  .eq(
                    "user_id",
                    userId
                  )
                  .eq(
                    "book_slug",
                    currentBundle
                      .work.slug
                  );
              }
            }
          } else {
            localStorage.setItem(
              `seboro-progress:${currentBundle.work.slug}`,
              String(safeIndex)
            );

            localStorage.setItem(
              `seboro-progress-type:${currentBundle.work.slug}`,
              "page"
            );

            updateLocalHistory(
              currentBundle
                .work.slug
            );
          }
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    bundle,
    pageIndex,
    loaded,
    loggedIn,
    totalPages,
    userId,
    textPages,
  ]);

  useEffect(() => {
    if (
      !bundle ||
      totalPages <= 0 ||
      showFinish
    ) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      const target =
        event.target as HTMLElement | null;

      if (
        target &&
        (
          target.tagName ===
            "INPUT" ||
          target.tagName ===
            "TEXTAREA" ||
          target.tagName ===
            "SELECT" ||
          target.isContentEditable
        )
      ) {
        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        event.preventDefault();

        setPageIndex(
          (index) =>
            Math.max(
              0,
              index -
                spreadCount
            )
        );
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        event.preventDefault();

        setPageIndex(
          (index) =>
            Math.min(
              Math.max(
                0,
                totalPages -
                  1
              ),
              index +
                spreadCount
            )
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    bundle,
    totalPages,
    spreadCount,
    showFinish,
  ]);

  const ownWork =
    Boolean(
      loggedIn &&
      userId &&
      bundle &&
      userId ===
        bundle.work.author_id
    );

  function toggleReaction(
    id: string
  ) {
    setReactions(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  async function saveFeedback() {
    if (!bundle) return;

    setSavingFeedback(true);
    setSavedFeedback(false);
    setFeedbackError("");

    try {
      if (loggedIn) {
        /*
         * El autor puede probar toda la pantalla,
         * pero su propia opinión no se registra:
         * así no altera valoración ni métricas.
         */
        if (ownWork) {
          setSavedFeedback(true);
          return;
        }

        /*
         * Las estrellas pasan por el RPC oficial.
         * Ese RPC valida que la obra esté terminada
         * y actualiza el promedio/ranking público.
         */
        if (rating > 0) {
          await rateFinishedPublishedWork(
            bundle.work.slug,
            rating
          );
        }

        /*
         * Reacciones y crítica se guardan aparte.
         * No mandamos "rating", por lo que nunca
         * sobrescribimos la estrella del RPC.
         */
        await upsertUserFeedback(
          bundle.work.slug,
          {
            reactions,
            review:
              review.trim()
                ? review.trim()
                : null,
          }
        );
      } else {
        const ratings =
          readObject<
            Record<
              string,
              number
            >
          >(
            RATING_KEY,
            {}
          );

        const reactionsMap =
          readObject<
            Record<
              string,
              string[]
            >
          >(
            REACTIONS_KEY,
            {}
          );

        const reviews =
          readObject<
            Record<
              string,
              string
            >
          >(
            REVIEWS_KEY,
            {}
          );

        if (rating > 0) {
          ratings[
            bundle.work.slug
          ] = rating;
        } else {
          delete ratings[
            bundle.work.slug
          ];
        }

        reactionsMap[
          bundle.work.slug
        ] = reactions;

        if (review.trim()) {
          reviews[
            bundle.work.slug
          ] = review.trim();
        } else {
          delete reviews[
            bundle.work.slug
          ];
        }

        localStorage.setItem(
          RATING_KEY,
          JSON.stringify(
            ratings
          )
        );

        localStorage.setItem(
          REACTIONS_KEY,
          JSON.stringify(
            reactionsMap
          )
        );

        localStorage.setItem(
          REVIEWS_KEY,
          JSON.stringify(
            reviews
          )
        );
      }

      setSavedFeedback(true);

      window.dispatchEvent(
        new Event(
          "seboro-library-updated"
        )
      );
    } catch (feedbackSaveError) {
      console.error(
        "SEBORO feedback save failed:",
        feedbackSaveError
      );

      setFeedbackError(
        feedbackSaveError
          instanceof Error
          ? feedbackSaveError.message
          : "No se pudo guardar la opinión."
      );
    } finally {
      setSavingFeedback(
        false
      );
    }
  }

  async function finishWork() {
    if (
      !bundle ||
      totalPages <= 0
    ) {
      return;
    }

    const lastIndex =
      totalPages - 1;

    if (loggedIn) {
      await patchUserBook(
        bundle.work.slug,
        {
          finished: true,
          progress:
            lastIndex,
          last_opened_at:
            new Date()
              .toISOString(),
        }
      );

      if (userId) {
        const supabase =
          getSupabaseBrowserClient();

        if (supabase) {
          await supabase
            .from("user_books")
            .update({
              progress_type:
                "page",
              progress_detail: {
                page: totalPages,
                format:
                  bundle.work
                    .content_format,
              },
            })
            .eq(
              "user_id",
              userId
            )
            .eq(
              "book_slug",
              bundle.work.slug
            );
        }
      }
    } else {
      localStorage.setItem(
        `seboro-finished:${bundle.work.slug}`,
        "true"
      );

      localStorage.setItem(
        `seboro-progress:${bundle.work.slug}`,
        String(lastIndex)
      );

      localStorage.setItem(
        `seboro-progress-type:${bundle.work.slug}`,
        "page"
      );

      updateLocalHistory(
        bundle.work.slug
      );
    }

    setFinished(true);
    setShowFinish(true);
    setSavedFeedback(false);
    setFeedbackError("");

    window.dispatchEvent(
      new Event(
        "seboro-library-updated"
      )
    );
  }

  async function refreshAnnotations() {
    if (!bundle) return;

    const items = await getReaderAnnotations(bundle.work.slug);
    setAnnotations(items);
  }

  function prepareHighlight(draft: SelectionDraft) {
    setHighlightAction(null);
    setPendingHighlight(draft);
    setAnnotationError("");
  }

  function prepareHighlightAction(draft: HighlightActionDraft) {
    setPendingHighlight(null);
    window.getSelection()?.removeAllRanges();
    setHighlightAction(draft);
    setAnnotationError("");
  }

  async function savePendingHighlight() {
    if (!bundle || !pendingHighlight) return;

    setAnnotationBusy(true);
    setAnnotationError("");

    try {
      await createReaderHighlight({
        workId: bundle.work.id,
        bookSlug: bundle.work.slug,
        contentFormat: pendingHighlight.contentFormat,
        pageNumber: pendingHighlight.pageNumber,
        chapterNumber: pendingHighlight.chapterNumber,
        startOffset: pendingHighlight.startOffset,
        endOffset: pendingHighlight.endOffset,
        selectedText: pendingHighlight.selectedText,
        rects: pendingHighlight.rects,
        color: "yellow",
      });

      await refreshAnnotations();
      setPendingHighlight(null);
      window.getSelection()?.removeAllRanges();
    } catch (annotationSaveError) {
      setAnnotationError(
        annotationSaveError instanceof Error
          ? annotationSaveError.message
          : "No se pudo guardar el subrayado."
      );
    } finally {
      setAnnotationBusy(false);
    }
  }

  async function removeSelectedHighlight() {
    if (!highlightAction) return;

    await removeAnnotation(highlightAction.annotation.id);
    setHighlightAction(null);
  }

  function bookmarkForPage(targetIndex: number) {
    const safeIndex = clampPageIndex(
      targetIndex,
      Math.max(1, totalPages)
    );

    if (isPdf) {
      return annotations.find(
        (item) =>
          item.annotationType === "bookmark" &&
          item.contentFormat === "pdf" &&
          item.pageNumber === safeIndex + 1
      );
    }

    const page = textPages[safeIndex];
    if (!page) return undefined;

    const pageEnd =
      page.startOffset +
      Math.max(page.text.length, 1);

    return annotations.find(
      (item) =>
        item.annotationType === "bookmark" &&
        item.contentFormat !== "pdf" &&
        item.chapterNumber === page.chapterNumber &&
        item.startOffset !== null &&
        item.startOffset >= page.startOffset &&
        item.startOffset < pageEnd
    );
  }

  function resolveAnnotationPageNumber(
    annotation: ReaderAnnotation
  ) {
    if (annotation.contentFormat === "pdf") {
      return annotation.pageNumber || 1;
    }

    if (annotation.chapterNumber !== null) {
      const targetOffset = annotation.startOffset ?? 0;
      const found = textPages.findIndex((page) => {
        if (page.chapterNumber !== annotation.chapterNumber) return false;

        const pageEnd =
          page.startOffset +
          Math.max(page.text.length, 1);

        return (
          targetOffset >= page.startOffset &&
          targetOffset < pageEnd
        );
      });

      if (found >= 0) {
        return found + 1;
      }
    }

    return annotation.pageNumber || 1;
  }

  async function toggleBookmarkAtPage(targetIndex: number) {
    if (!bundle || totalPages <= 0) return;

    const safeIndex = clampPageIndex(
      targetIndex,
      Math.max(1, totalPages)
    );

    const textPage = !isPdf ? textPages[safeIndex] : null;
    const existing = bookmarkForPage(safeIndex);

    setAnnotationBusy(true);
    setAnnotationError("");

    try {
      if (existing) {
        await deleteReaderAnnotation(
          bundle.work.slug,
          existing.id
        );
      } else {
        await toggleReaderBookmark({
          workId: bundle.work.id,
          bookSlug: bundle.work.slug,
          contentFormat: bundle.work.content_format as "native" | "epub" | "pdf",
          pageNumber: safeIndex + 1,
          chapterNumber: textPage?.chapterNumber ?? null,
          startOffset: textPage?.startOffset ?? null,
        });
      }

      await refreshAnnotations();
    } catch (bookmarkError) {
      setAnnotationError(
        bookmarkError instanceof Error
          ? bookmarkError.message
          : "No se pudo guardar el marcador."
      );
    } finally {
      setAnnotationBusy(false);
    }
  }

  async function removeAnnotation(id: string) {
    if (!bundle) return;

    setAnnotationBusy(true);
    setAnnotationError("");

    try {
      await deleteReaderAnnotation(bundle.work.slug, id);
      await refreshAnnotations();
    } catch (removeError) {
      setAnnotationError(
        removeError instanceof Error
          ? removeError.message
          : "No se pudo eliminar la anotación."
      );
    } finally {
      setAnnotationBusy(false);
    }
  }

  function jumpToAnnotation(annotation: ReaderAnnotation) {
    setAnnotationsOpen(false);
    setPendingHighlight(null);

    if (isPdf) {
      setPageIndex(
        clampPageIndex(
          (annotation.pageNumber || 1) - 1,
          Math.max(1, totalPages)
        )
      );
      return;
    }

    if (annotation.chapterNumber !== null) {
      const targetOffset = annotation.startOffset ?? 0;
      const found = textPages.findIndex((page) => {
        if (page.chapterNumber !== annotation.chapterNumber) return false;
        const end = page.startOffset + page.text.length;
        return targetOffset >= page.startOffset && targetOffset <= end;
      });

      if (found >= 0) {
        setPageIndex(found);
        return;
      }
    }

    setPageIndex(
      clampPageIndex(
        (annotation.pageNumber || 1) - 1,
        Math.max(1, totalPages)
      )
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#eee9e0] p-10 text-[#302c28]">
        Cargando lectura...
      </main>
    );
  }

  if (
    error &&
    !bundle
  ) {
    return (
      <main className="min-h-screen bg-[#eee9e0] p-10 text-[#302c28]">
        {error}
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="min-h-screen bg-[#eee9e0] p-10 text-[#302c28]">
        Obra no encontrada.
      </main>
    );
  }

  if (
    access &&
    !access.fullAccess &&
    !access.canReadSample
  ) {
    const freeLocked = Number(bundle.work.price_mxn || 0) <= 0;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eee9e0] px-5 text-[#302c28]">
        <section className="w-full max-w-xl rounded-[28px] border border-[#d8d0c7] bg-[#fffdf9] p-7 text-center shadow-[0_18px_50px_rgba(52,43,35,0.10)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a8d85]">
            Acceso a la obra
          </p>
          <h1 className="mt-3 text-2xl font-black">
            {freeLocked ? "Obtén la obra para leerla" : "Compra la obra para leerla"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#7d746e]">
            El autor no tiene una muestra activa para esta obra. El contenido completo se habilita cuando la obra queda adquirida en tu biblioteca.
          </p>
          <Link
            href={`/publicaciones/${bundle.work.slug}`}
            className="mt-6 inline-flex rounded-full bg-[#d96822] px-6 py-3 font-black text-white transition hover:bg-[#be5717]"
          >
            {freeLocked ? "Ir a Obtener" : `Ir a Comprar · $${Math.round(bundle.work.price_mxn)} MXN`}
          </Link>
        </section>
      </main>
    );
  }

  if (
    !isPdf &&
    textPages.length === 0
  ) {
    return (
      <main className="min-h-screen bg-[#eee9e0] p-10 text-[#302c28]">
        Esta obra todavía no tiene contenido legible.
      </main>
    );
  }

  const theme =
    settings.theme === "dark"
      ? {
          shell:
            "bg-[#151515] text-[#ECEAE5]",
          header:
            "border-white/10 bg-[#151515]/95",
          muted:
            "text-[#9D9D9D]",
          button:
            "border-white/15 bg-white/5 hover:bg-white/10",
          primary:
            "bg-[#ECEAE5] text-[#171717] hover:bg-white",
          stage:
            "bg-[#181818]",
          line:
            "border-white/10",
        }
      : settings.theme ===
        "ivory"
      ? {
          shell:
            "bg-[#e8decc] text-[#332d26]",
          header:
            "border-black/10 bg-[#eee5d5]/95",
          muted:
            "text-[#7d6d5a]",
          button:
            "border-black/15 bg-white/35 hover:bg-white/55",
          primary:
            "bg-[#332d26] text-white hover:bg-[#211d19]",
          stage:
            "bg-[#ddd2bf]",
          line:
            "border-black/10",
        }
      : settings.theme ===
        "warmgray"
      ? {
          shell:
            "bg-[#ded9d2] text-[#302d29]",
          header:
            "border-black/10 bg-[#e7e2db]/95",
          muted:
            "text-[#756f68]",
          button:
            "border-black/15 bg-white/35 hover:bg-white/60",
          primary:
            "bg-[#34312d] text-white hover:bg-[#23211e]",
          stage:
            "bg-[#d8d3cc]",
          line:
            "border-black/10",
        }
      : {
          shell:
            "bg-[#ebe7df] text-[#302c28]",
          header:
            "border-black/10 bg-[#F7F4EE]/95",
          muted:
            "text-[#817970]",
          button:
            "border-black/15 bg-white/60 hover:bg-white/90",
          primary:
            "bg-[#2f2d29] text-white hover:bg-[#1f1e1b]",
          stage:
            "bg-[#e4dfd7]",
          line:
            "border-black/10",
        };

  const safePageIndex =
    clampPageIndex(
      pageIndex,
      Math.max(
        1,
        totalPages
      )
    );

  const secondPageIndex =
    safePageIndex + 1;

  const hasSecondPage =
    doublePage &&
    secondPageIndex <
      totalPages;

  const visibleEnd =
    Math.min(
      totalPages,
      safePageIndex +
        spreadCount
    );

  const progressPercent =
    totalPages > 0
      ? (
          visibleEnd /
          totalPages
        ) * 100
      : 0;

  const isLastSpread =
    visibleEnd >=
    totalPages;

  const sampleLocked =
    Boolean(access) &&
    !access?.fullAccess;

  const isFreeWork =
    Number(bundle.work.price_mxn || 0) <= 0;

  const currentTextPage =
    !isPdf
      ? textPages[
          safePageIndex
        ]
      : null;

  const bookmarks = annotations.filter(
    (item) => item.annotationType === "bookmark"
  );

  const highlights = annotations.filter(
    (item) => item.annotationType === "highlight"
  );

  const firstVisibleBookmark = bookmarkForPage(safePageIndex);
  const secondVisibleBookmark = hasSecondPage
    ? bookmarkForPage(secondPageIndex)
    : undefined;
  const visibleHasBookmark = Boolean(
    firstVisibleBookmark || secondVisibleBookmark
  );

  const compact =
    doublePage;

  return (
    <main
      className={`min-h-screen ${theme.shell}`}
    >
      <div
        ref={headerRef}
        className={`sticky top-0 z-30 border-b backdrop-blur ${theme.header}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link
            href={`/publicaciones/${bundle.work.slug}`}
            className={`rounded-full border px-4 py-2 text-sm font-black transition ${theme.button}`}
          >
            ← Salir
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-black">
              {bundle.work.title}
            </p>

            <p
              className={`mt-0.5 truncate text-xs font-semibold ${theme.muted}`}
            >
              {isPdf
                ? "Edición original"
                : "Lectura"}

              {" · "}

              Página{" "}
              {safePageIndex + 1}

              {doublePage &&
                hasSecondPage
                ? `–${secondPageIndex + 1}`
                : ""}

              {" de "}
              {Math.max(
                totalPages,
                1
              )}

              {loggedIn
                ? " · sincronizado"
                : ""}
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBookmarkPickerOpen((value) => !value);
                setAnnotationsOpen(false);
                setSettingsOpen(false);
              }}
              aria-expanded={bookmarkPickerOpen}
              aria-label="Elegir página para marcador"
              title="Añadir o quitar marcador"
              className={`rounded-full border px-3 py-2 text-sm font-black transition ${
                visibleHasBookmark
                  ? "border-[#d96822] bg-[#fff1e7] text-[#b95016]"
                  : theme.button
              }`}
            >
              🔖
            </button>

            {bookmarkPickerOpen && (
              <div
                className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[290px] overflow-hidden rounded-[18px] border p-2 shadow-[0_18px_48px_rgba(47,41,37,0.18)] ${
                  settings.theme === "dark"
                    ? "border-white/10 bg-[#272727]"
                    : "border-black/10 bg-[#fffdf9]"
                }`}
              >
                <div className="px-3 pb-2 pt-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                    Marcar página
                  </p>
                  <p className="mt-1 text-xs font-semibold opacity-60">
                    Elige cuál de las páginas visibles quieres guardar.
                  </p>
                </div>

                {[safePageIndex, ...(hasSecondPage ? [secondPageIndex] : [])].map(
                  (targetIndex) => {
                    const targetBookmark = bookmarkForPage(targetIndex);
                    const targetTextPage = !isPdf ? textPages[targetIndex] : null;

                    return (
                      <button
                        key={targetIndex}
                        type="button"
                        disabled={annotationBusy}
                        onClick={async () => {
                          await toggleBookmarkAtPage(targetIndex);
                          setBookmarkPickerOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-[13px] px-3 py-3 text-left transition hover:bg-black/[0.05] disabled:opacity-50 dark:hover:bg-white/[0.06]"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-black">
                            Página {targetIndex + 1}
                          </span>
                          {targetTextPage ? (
                            <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-60">
                              Capítulo {targetTextPage.chapterNumber} · {targetTextPage.chapterTitle}
                            </span>
                          ) : null}
                        </span>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                            targetBookmark
                              ? "bg-[#fff1e7] text-[#b95016]"
                              : "bg-black/[0.05] opacity-70"
                          }`}
                        >
                          {targetBookmark ? "Quitar" : "Marcar"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setAnnotationsOpen((value) => !value);
                setBookmarkPickerOpen(false);
                setSettingsOpen(false);
              }}
              aria-expanded={annotationsOpen}
              aria-label="Abrir marcadores y subrayados"
              title="Marcadores y subrayados"
              className={`rounded-full border px-3 py-2 text-sm font-black transition ${theme.button}`}
            >
              <span aria-hidden="true">☰</span>
              <span className="ml-1 hidden sm:inline">Notas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSettingsOpen((value) => !value);
                setBookmarkPickerOpen(false);
                setAnnotationsOpen(false);
              }}
              aria-expanded={
                settingsOpen
              }
              className={`rounded-full border px-3 py-2 text-sm font-black transition ${theme.button}`}
            >
              Aa
            </button>

            <Link
              href="/biblioteca"
              className={`hidden rounded-full border px-4 py-2 text-sm font-black transition sm:block ${theme.button}`}
            >
              Biblioteca
            </Link>
          </div>
        </div>

        <div className="h-1 bg-black/10">
          <div
            className="h-full bg-current transition-all duration-300"
            style={{
              width:
                `${progressPercent}%`,
            }}
          />
        </div>

        {settingsOpen && (
          <div
            className={`border-t ${theme.line}`}
          >
            <div className="mx-auto grid max-w-5xl gap-5 px-5 py-4 sm:grid-cols-3">
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.16em] ${theme.muted}`}
                >
                  {isPdf
                    ? "Zoom"
                    : "Tamaño de texto"}
                </p>

                {isPdf ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings(
                          (current) => ({
                            ...current,
                            pdfZoomMode:
                              "page",
                          })
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                        settings.pdfZoomMode ===
                        "page"
                          ? theme.primary
                          : theme.button
                      }`}
                    >
                      Ajustar página
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings(
                          (current) => ({
                            ...current,
                            pdfZoomMode:
                              "width",
                          })
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                        settings.pdfZoomMode ===
                        "width"
                          ? theme.primary
                          : theme.button
                      }`}
                    >
                      Ajustar ancho
                    </button>

                    {isDesktop &&
                      [
                        1,
                        1.25,
                        1.5,
                        2,
                      ].map(
                        (value) => (
                          <button
                            key={
                              value
                            }
                            type="button"
                            onClick={() =>
                              setSettings(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  pdfZoomMode:
                                    "custom",
                                  pdfZoom:
                                    value,
                                })
                              )
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                              settings.pdfZoomMode ===
                                "custom" &&
                              settings.pdfZoom ===
                                value
                                ? theme.primary
                                : theme.button
                            }`}
                          >
                            {Math.round(
                              value *
                                100
                            )}
                            %
                          </button>
                        )
                      )}
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Reducir tamaño de texto"
                        onClick={() =>
                          setSettings(
                            (
                              current
                            ) => ({
                              ...current,
                              textScale:
                                Math.max(
                                  0.85,
                                  Number(
                                    (
                                      current.textScale -
                                      0.1
                                    ).toFixed(
                                      2
                                    )
                                  )
                                ),
                            })
                          )
                        }
                        disabled={
                          settings.textScale <=
                          0.85
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-black disabled:opacity-30 ${theme.button}`}
                      >
                        A−
                      </button>

                      <div
                        className={`min-w-16 text-center text-sm font-black ${theme.muted}`}
                      >
                        {Math.round(
                          settings.textScale *
                            100
                        )}
                        %
                      </div>

                      <button
                        type="button"
                        aria-label="Aumentar tamaño de texto"
                        onClick={() =>
                          setSettings(
                            (
                              current
                            ) => ({
                              ...current,
                              textScale:
                                Math.min(
                                  1.4,
                                  Number(
                                    (
                                      current.textScale +
                                      0.1
                                    ).toFixed(
                                      2
                                    )
                                  )
                                ),
                            })
                          )
                        }
                        disabled={
                          settings.textScale >=
                          1.4
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-black disabled:opacity-30 ${theme.button}`}
                      >
                        A+
                      </button>
                    </div>

                    <p
                      className={`mt-2 text-xs leading-5 ${theme.muted}`}
                    >
                      Al cambiar el texto,
                      SEBORO vuelve a
                      distribuir el contenido
                      entre las páginas.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.16em] ${theme.muted}`}
                >
                  Vista
                </p>

                <select
                  value={
                    settings.spread
                  }
                  onChange={(
                    event
                  ) =>
                    setSettings(
                      (
                        current
                      ) => ({
                        ...current,
                        spread:
                          event
                            .target
                            .value as SpreadMode,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-current/15 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
                >
                  <option value="auto">
                    Automática
                  </option>

                  <option value="single">
                    Una página
                  </option>

                  <option value="double">
                    Libro abierto
                  </option>
                </select>

                {!isDesktop &&
                  settings.spread ===
                    "double" && (
                    <p
                      className={`mt-2 text-xs ${theme.muted}`}
                    >
                      En pantallas
                      pequeñas se
                      usa una página.
                    </p>
                  )}
              </div>

              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.16em] ${theme.muted}`}
                >
                  {isPdf
                    ? "Ambiente"
                    : "Color de hoja"}
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "offwhite" as ReaderTheme,
                      label: "Blanco roto",
                      color: "#F7F4EE",
                    },
                    {
                      value: "ivory" as ReaderTheme,
                      label: "Marfil suave",
                      color: "#F3EAD8",
                    },
                    {
                      value: "warmgray" as ReaderTheme,
                      label: "Gris cálido",
                      color: "#ECE7DF",
                    },
                    {
                      value: "dark" as ReaderTheme,
                      label: "Oscuro",
                      color: "#1E1E1E",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setSettings(
                          (current) => ({
                            ...current,
                            theme:
                              option.value,
                          })
                        )
                      }
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${
                        settings.theme ===
                        option.value
                          ? "border-current"
                          : "border-current/15 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-black/15 shadow-sm"
                        style={{
                          backgroundColor:
                            option.color,
                        }}
                      />
                      <span>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>

                {isPdf && (
                  <p
                    className={`mt-2 text-xs leading-5 ${theme.muted}`}
                  >
                    En PDF cambia el entorno
                    del lector, no la página
                    original.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {annotationsOpen && (
        <div className="fixed right-4 top-[74px] z-50 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-black/10 bg-[#fffdf9] text-[#302c28] shadow-[0_24px_70px_rgba(38,31,25,0.22)]">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a8d85]">
                Tu lectura
              </p>
              <p className="mt-0.5 text-sm font-black">
                Marcadores y subrayados
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAnnotationsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg font-black transition hover:bg-[#f4eee7]"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4">
            <div className="mb-4 rounded-[14px] border border-[#eadfce] bg-[#fbf7ef] px-3 py-3 text-xs font-semibold leading-5 text-[#756b63]">
              <span className="font-black text-[#5e554f]">Cómo subrayar:</span>{" "}
              selecciona una frase mientras lees. La opción “Subrayar” aparecerá junto al texto sin activar ningún modo especial.
            </div>

            {annotationError && (
              <div className="mb-3 rounded-[14px] border border-[#e5c3c3] bg-[#fff8f8] px-3 py-2 text-xs font-semibold text-[#a84f58]">
                {annotationError}
              </div>
            )}

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#7e746d]">
                  Marcadores
                </h2>
                <span className="text-xs font-bold text-[#a0958d]">
                  {bookmarks.length}
                </span>
              </div>

              <div className="mt-2 space-y-2">
                {bookmarks.length === 0 ? (
                  <p className="rounded-[14px] bg-[#f7f3ed] px-3 py-3 text-xs font-semibold text-[#8a8079]">
                    Pulsa el 🔖 de la página exacta que quieras guardar.
                  </p>
                ) : (
                  bookmarks.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-[14px] border border-[#e5ddd5] bg-white p-2"
                    >
                      <button
                        type="button"
                        onClick={() => jumpToAnnotation(item)}
                        className="min-w-0 flex-1 rounded-[10px] px-2 py-2 text-left transition hover:bg-[#faf5ef]"
                      >
                        <span className="block text-xs font-black">
                          🔖 Página {resolveAnnotationPageNumber(item)}
                        </span>
                        {item.chapterNumber !== null && !isPdf && (
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#91867e]">
                            Capítulo {item.chapterNumber} · posición guardada
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeAnnotation(item.id)}
                        disabled={annotationBusy}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-[#9a8d85] transition hover:bg-[#f5ece5] hover:text-[#b95016] disabled:opacity-40"
                        aria-label="Eliminar marcador"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-5 border-t border-black/10 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#7e746d]">
                  Subrayados
                </h2>
                <span className="text-xs font-bold text-[#a0958d]">
                  {highlights.length}
                </span>
              </div>

              <div className="mt-2 space-y-2">
                {highlights.length === 0 ? (
                  <p className="rounded-[14px] bg-[#f7f3ed] px-3 py-3 text-xs font-semibold text-[#8a8079]">
                    Selecciona una frase mientras lees; aparecerá la opción “Subrayar” junto al texto.
                  </p>
                ) : (
                  highlights.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 rounded-[14px] border border-[#e5ddd5] bg-white p-2"
                    >
                      <button
                        type="button"
                        onClick={() => jumpToAnnotation(item)}
                        className="min-w-0 flex-1 rounded-[10px] px-2 py-2 text-left transition hover:bg-[#faf5ef]"
                      >
                        <span className="block text-[11px] font-black text-[#8d6e22]">
                          🖍 Página {resolveAnnotationPageNumber(item)}
                        </span>
                        <span className="mt-1 block line-clamp-3 text-xs font-semibold leading-5 text-[#655d57]">
                          “{item.selectedText || "Subrayado"}”
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeAnnotation(item.id)}
                        disabled={annotationBusy}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-[#9a8d85] transition hover:bg-[#f5ece5] hover:text-[#b95016] disabled:opacity-40"
                        aria-label="Eliminar subrayado"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {pendingHighlight && (
        <div
          className="fixed z-[70] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-black/10 bg-[#2f2d29] p-1.5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
          style={{
            left: pendingHighlight.screenX,
            top: pendingHighlight.screenY,
          }}
        >
          <button
            type="button"
            onClick={savePendingHighlight}
            disabled={annotationBusy}
            className="rounded-full px-3 py-1.5 text-xs font-black transition hover:bg-white/10 disabled:opacity-50"
          >
            {annotationBusy ? "Guardando…" : "Subrayar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingHighlight(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black transition hover:bg-white/10"
            aria-label="Cancelar subrayado"
          >
            ×
          </button>
        </div>
      )}

      {highlightAction && (
        <div
          className="fixed z-[70] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-black/10 bg-[#2f2d29] p-1.5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
          style={{
            left: highlightAction.screenX,
            top: highlightAction.screenY,
          }}
        >
          <button
            type="button"
            onClick={removeSelectedHighlight}
            disabled={annotationBusy}
            className="rounded-full px-3 py-1.5 text-xs font-black transition hover:bg-white/10 disabled:opacity-50"
          >
            {annotationBusy ? "Quitando…" : "Quitar subrayado"}
          </button>
          <button
            type="button"
            onClick={() => setHighlightAction(null)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black transition hover:bg-white/10"
            aria-label="Cerrar acción de subrayado"
          >
            ×
          </button>
        </div>
      )}

      {showHighlightHint && !pendingHighlight && !highlightAction && !annotationsOpen && (
        <div className="fixed bottom-5 left-1/2 z-[55] flex w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-[16px] border border-black/10 bg-[#2f2d29]/95 px-4 py-3 text-xs font-semibold leading-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur">
          <span className="text-base" aria-hidden="true">🖍</span>
          <span className="min-w-0 flex-1">Selecciona cualquier frase para subrayarla. Si tocas un subrayado guardado, podrás quitarlo.</span>
          <button
            type="button"
            onClick={() => setShowHighlightHint(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black transition hover:bg-white/10"
            aria-label="Cerrar ayuda de subrayado"
          >
            ×
          </button>
        </div>
      )}

      {annotationError && !annotationsOpen && (
        <div className="fixed right-4 top-[78px] z-[60] max-w-sm rounded-[14px] border border-[#e5c3c3] bg-[#fff8f8] px-3 py-2 text-xs font-semibold text-[#a84f58] shadow-lg">
          {annotationError}
        </div>
      )}

      {sampleLocked && access && (
        <div className="mx-auto mt-4 max-w-4xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#e6c9ae] bg-[#fff8f0] px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b35d25]">
                Muestra gratuita
              </p>
              <p className="mt-1 text-sm font-semibold text-[#7b6251]">
                {isPdf
                  ? `Puedes leer ${Math.min(access.samplePages, access.totalPages || access.samplePages)} páginas antes de ${isFreeWork ? "obtener la obra" : "comprar"}.`
                  : `Puedes leer ${Math.min(access.sampleChapters, access.totalChapters || access.sampleChapters)} ${access.sampleChapters === 1 ? "capítulo" : "capítulos"} antes de ${isFreeWork ? "obtener la obra" : "comprar"}.`}
              </p>
            </div>

            <Link
              href={`/publicaciones/${bundle.work.slug}`}
              className="rounded-full bg-[#d96822] px-4 py-2 text-xs font-black text-white transition hover:bg-[#be5717]"
            >
              {isFreeWork
                ? "Obtener obra"
                : `Comprar · $${Math.round(bundle.work.price_mxn)} MXN`}
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-5 max-w-3xl px-5">
          <div className="rounded-[18px] border border-[#e5c3c3] bg-[#fff8f8] p-4 text-sm font-semibold text-[#a84f58]">
            {error}
          </div>
        </div>
      )}

      <section
        className={`min-h-[calc(100vh-78px)] overflow-auto px-1 py-3 md:px-2 md:py-3 ${theme.stage}`}
      >
        <div className="mx-auto flex min-w-fit items-start justify-center gap-1">
          {isPdf ? (
            pdfLoading ||
            !pdfDocument ? (
              <div
                className={`rounded-3xl border p-8 text-center text-sm font-semibold ${theme.button}`}
              >
                Preparando páginas del PDF...
              </div>
            ) : (
              <>
                <PdfBookPage
                  document={
                    pdfDocument
                  }
                  pageNumber={
                    safePageIndex +
                    1
                  }
                  zoomMode={
                    settings.pdfZoomMode
                  }
                  zoom={
                    settings.pdfZoom
                  }
                  compact={
                    compact
                  }
                  isDesktop={isDesktop}
                  chromeRef={headerRef}
                  highlights={highlights}
                  onSelection={prepareHighlight}
                  onHighlightClick={prepareHighlightAction}
                />

                {hasSecondPage && (
                  <PdfBookPage
                    document={
                      pdfDocument
                    }
                    pageNumber={
                      secondPageIndex +
                      1
                    }
                    zoomMode={
                      settings.pdfZoomMode
                    }
                    zoom={
                      settings.pdfZoom
                    }
                    compact={
                      compact
                    }
                    isDesktop={isDesktop}
                    chromeRef={headerRef}
                    highlights={highlights}
                    onSelection={prepareHighlight}
                    onHighlightClick={prepareHighlightAction}
                  />
                )}
              </>
            )
          ) : (
            <>
              <TextBookPage
                page={
                  textPages[
                    safePageIndex
                  ]
                }
                absolutePage={
                  safePageIndex +
                  1
                }
                textScale={
                  settings.textScale
                }
                theme={
                  settings.theme
                }
                compact={
                  compact
                }
                contentFormat={bundle.work.content_format as "native" | "epub"}
                highlights={highlights}
                onSelection={prepareHighlight}
                onHighlightClick={prepareHighlightAction}
              />

              {hasSecondPage && (
                <TextBookPage
                  page={
                    textPages[
                      secondPageIndex
                    ]
                  }
                  absolutePage={
                    secondPageIndex +
                    1
                  }
                  textScale={
                    settings.textScale
                  }
                  theme={
                    settings.theme
                  }
                  compact={
                    compact
                  }
                  contentFormat={bundle.work.content_format as "native" | "epub"}
                  highlights={highlights}
                  onSelection={prepareHighlight}
                  onHighlightClick={prepareHighlightAction}
                />
              )}
            </>
          )}
        </div>
      </section>

      <div className="pointer-events-none fixed inset-y-20 left-0 z-20 flex w-16 items-center justify-start md:w-20">
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() =>
            setPageIndex(
              (index) =>
                Math.max(
                  0,
                  index - spreadCount
                )
            )
          }
          disabled={
            safePageIndex === 0
          }
          className={`pointer-events-auto ml-2 flex h-11 w-11 items-center justify-center rounded-full border text-xl font-black shadow-sm transition md:ml-3 md:opacity-0 md:hover:opacity-100 md:focus:opacity-100 disabled:pointer-events-none disabled:opacity-0 ${theme.button}`}
        >
          ‹
        </button>
      </div>

      <div className="pointer-events-none fixed inset-y-20 right-0 z-20 flex w-16 items-center justify-end md:w-20">
        {!isLastSpread ? (
          <button
            type="button"
            aria-label="Página siguiente"
            onClick={() =>
              setPageIndex(
                (index) =>
                  Math.min(
                    Math.max(
                      0,
                      totalPages - 1
                    ),
                    index + spreadCount
                  )
              )
            }
            className={`pointer-events-auto mr-2 flex h-11 w-11 items-center justify-center rounded-full border text-xl font-black shadow-sm transition md:mr-3 md:opacity-0 md:hover:opacity-100 md:focus:opacity-100 ${theme.button}`}
          >
            ›
          </button>
        ) : sampleLocked ? (
          <Link
            href={`/publicaciones/${bundle.work.slug}`}
            className={`pointer-events-auto mr-2 rounded-full px-4 py-2 text-xs font-black shadow-sm transition md:mr-3 ${theme.primary}`}
          >
            {isFreeWork ? "Obtener para continuar" : "Comprar para continuar"}
          </Link>
        ) : !finished ? (
          <button
            type="button"
            onClick={finishWork}
            className={`pointer-events-auto mr-2 rounded-full px-4 py-2 text-xs font-black shadow-sm transition md:mr-3 ${theme.primary}`}
          >
            Terminar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowFinish(true);
              setSavedFeedback(false);
              setFeedbackError("");
            }}
            className={`pointer-events-auto mr-2 rounded-full px-4 py-2 text-xs font-black shadow-sm transition md:mr-3 ${theme.primary}`}
          >
            Evaluar
          </button>
        )}
      </div>

      {showFinish && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 px-4 py-8 backdrop-blur-sm">
          <section className="mx-auto max-w-3xl rounded-[28px] border border-[#d7d0c7] bg-[#f7f4ee] p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5 border-b border-[#d9d3ca] pb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#81796f]">
                  Lectura completada
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#302c28] md:text-4xl">
                  Terminaste{" "}
                  {bundle?.work.title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#746d65]">
                  {ownWork
                    ? "La obra quedó marcada como terminada. Como esta es tu propia obra, puedes comprobar la interfaz, pero tu valoración, reacciones y crítica no se registrarán ni afectarán las métricas."
                    : "La obra quedó marcada como terminada. Puedes valorar, reaccionar y dejar una crítica opcional."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFinish(false)
                }
                aria-label="Cerrar evaluación"
                className="rounded-full border border-[#d2cbc2] bg-white px-3 py-2 text-sm font-black text-[#655f58] transition hover:border-[#aaa096]"
              >
                ✕
              </button>
            </div>

            <div className="mt-7 rounded-[22px] border border-[#d7d0c7] bg-white p-6">
              <h2 className="text-xl font-black text-[#302c28]">
                1. ¿Qué te pareció?
              </h2>

              {ownWork && (
                <div className="mt-4 rounded-[16px] border border-[#ead5aa] bg-[#fffaf0] px-4 py-3 text-sm font-semibold leading-6 text-[#806f52]">
                  Modo de prueba del autor: puedes usar los controles para revisar la experiencia, pero SEBORO no guardará esta opinión.
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setRating(star)
                      }
                      aria-label={`${star} estrella${star === 1 ? "" : "s"}`}
                      className={`text-3xl transition ${
                        star <= rating
                          ? "text-[#9b7a32]"
                          : "text-[#cfc7bd]"
                      }`}
                    >
                      ★
                    </button>
                  )
                )}
              </div>

              <h2 className="mt-8 text-xl font-black text-[#302c28]">
                2. ¿Qué te hizo sentir?
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {reactionOptions.map(
                  (reaction) => {
                    const active =
                      reactions.includes(
                        reaction.id
                      );

                    return (
                      <button
                        key={
                          reaction.id
                        }
                        type="button"
                        onClick={() =>
                          toggleReaction(
                            reaction.id
                          )
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                          active
                            ? "border-[#3a3732] bg-[#3a3732] text-white"
                            : "border-[#d8d0c7] bg-[#faf8f5] text-[#625c55] hover:border-[#bdb3a8]"
                        }`}
                      >
                        {
                          reaction.emoji
                        }{" "}
                        {
                          reaction.label
                        }
                      </button>
                    );
                  }
                )}
              </div>

              <h2 className="mt-8 text-xl font-black text-[#302c28]">
                3. Crítica opcional
              </h2>

              <textarea
                value={review}
                onChange={(event) =>
                  setReview(
                    event.target.value
                  )
                }
                placeholder="¿Qué destacarías de la obra?"
                className="mt-4 min-h-32 w-full rounded-[18px] border border-[#d8d0c7] bg-[#fbfaf8] p-4 text-[#34312d] outline-none transition placeholder:text-[#aaa39b] focus:border-[#aaa096] focus:bg-white"
              />

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveFeedback}
                  disabled={
                    savingFeedback
                  }
                  className="rounded-full bg-[#2f2d29] px-6 py-3 font-black text-white transition hover:bg-[#1f1e1b] disabled:opacity-50"
                >
                  {savingFeedback
                    ? "Guardando..."
                    : "Guardar opinión"}
                </button>

                <Link
                  href="/biblioteca"
                  className="rounded-full border border-[#cfc7bd] bg-white px-6 py-3 font-black text-[#57514b] transition hover:border-[#aaa096] hover:text-[#2d2a26]"
                >
                  Omitir y volver a biblioteca
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setShowFinish(false)
                  }
                  className="rounded-full border border-transparent px-4 py-3 font-black text-[#746d65] transition hover:text-[#302c28]"
                >
                  Volver al libro
                </button>
              </div>

              {savedFeedback && (
                <div className="mt-6 rounded-[18px] border border-[#cbdcc9] bg-[#f6faf5] p-4 text-sm font-semibold text-[#4f7951]">
                  {ownWork
                    ? "✓ Prueba completada. Tu opinión de autor no se registró ni modificó las métricas."
                    : "✓ Opinión guardada correctamente."}
                </div>
              )}

              {feedbackError && (
                <div className="mt-6 rounded-[18px] border border-[#e5c3c3] bg-[#fff8f8] p-4 text-sm font-semibold text-[#a84f58]">
                  ✕ No se pudo guardar:{" "}
                  {feedbackError}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
