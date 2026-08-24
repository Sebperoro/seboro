import Link from "next/link";
import { notFound } from "next/navigation";
import TopNav from "@/components/TopNav";
import BookTracker from "@/components/BookTracker";
import PublicBookDetails from "@/components/PublicBookDetails";
import { getBook } from "@/data/books";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = getBook(slug);

  if (!book) notFound();

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />
      <BookTracker slug={book.slug} />

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-10 md:grid-cols-[280px_1fr]">
          <div
            className="aspect-[2/3] rounded-3xl shadow-2xl ring-1 ring-white/10"
            style={{ background: book.cover }}
          />

          <PublicBookDetails book={book} />
        </div>

        <section className="mt-16 border-t border-white/10 pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Comunidad
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Lo que comentan los lectores
              </h2>
            </div>

            <Link
              href={`/comunidad/${book.slug}`}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Ver comunidad
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "La atmósfera me atrapó desde el primer capítulo.",
              "No esperaba que la historia tomara ese rumbo.",
              "Me gustó que no explicara todo de inmediato.",
            ].map((text, index) => (
              <article
                key={index}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="leading-7 text-zinc-300">“{text}”</p>
                <div className="mt-4 text-xs text-zinc-500">
                  ❤️ {18 + index * 7} · 😮 {5 + index * 2}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
