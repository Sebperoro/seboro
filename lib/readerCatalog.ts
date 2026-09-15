import { getPublishedWorks, getWorkCoverBackground } from "@/lib/publishedWorks";

export type ReaderCatalogItem = {
  slug: string;
  title: string;
  author: string;
  author_id: string | null;
  genre: string;
  cover: string;
  href: string;
  community_href: string;
  source: "published";
};

export async function getReaderCatalog(): Promise<
  ReaderCatalogItem[]
> {
  try {
    const works = await getPublishedWorks({ includeTest: true });

    return works.map((work) => ({
      slug: work.slug,
      title: work.title,
      author: work.author_name,
      author_id: work.author_id,
      genre: work.genre,
      cover: getWorkCoverBackground(work),
      href: `/publicaciones/${work.slug}`,
      community_href: `/comunidad/${work.slug}`,
      source: "published",
    }));
  } catch {
    return [];
  }
}
