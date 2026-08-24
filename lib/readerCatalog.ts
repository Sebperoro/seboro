import { books } from "@/data/books";
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
  source: "prototype" | "published";
};

export async function getReaderCatalog(): Promise<
  ReaderCatalogItem[]
> {
  const staticItems: ReaderCatalogItem[] =
    books.map((book) => ({
      slug: book.slug,
      title: book.title,
      author: book.author,
      author_id: null,
      genre: book.genre,
      cover: book.cover,
      href: `/obra/${book.slug}`,
      community_href: `/comunidad/${book.slug}`,
      source: "prototype",
    }));

  let published: ReaderCatalogItem[] = [];

  try {
    const works = await getPublishedWorks();

    published = works.map((work) => ({
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
    published = [];
  }

  const map = new Map<string, ReaderCatalogItem>();

  for (const item of staticItems) {
    map.set(item.slug, item);
  }

  for (const item of published) {
    map.set(item.slug, item);
  }

  return [...map.values()];
}
