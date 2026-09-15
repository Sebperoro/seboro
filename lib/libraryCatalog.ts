import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublishedWorks, getWorkCoverBackground } from "@/lib/publishedWorks";

export type PublishedLibraryItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  genre: string;
  cover: string;
  chapter_count: number;
  work_status: "ongoing" | "finished";
  href: string;
  reader_href: string;
};

export async function getPublishedLibraryCatalog(): Promise<
  PublishedLibraryItem[]
> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const works = await getPublishedWorks({ includeTest: true });
  if (works.length === 0) return [];

  const ids = works.map((work) => work.id);

  const { data: chapters, error } = await supabase
    .from("work_chapters")
    .select("work_id, chapter_number")
    .in("work_id", ids);

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();

  for (const chapter of chapters || []) {
    const workId = String(chapter.work_id);
    counts.set(workId, (counts.get(workId) || 0) + 1);
  }

  return works.map((work) => ({
    id: work.id,
    slug: work.slug,
    title: work.title,
    author: work.author_name,
    genre: work.genre,
    cover: getWorkCoverBackground(work),
    chapter_count: counts.get(work.id) || 0,
    work_status: work.work_status,
    href: `/publicaciones/${work.slug}`,
    reader_href: `/leer-publicado/${work.slug}`,
  }));
}
