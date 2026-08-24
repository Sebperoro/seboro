import { notFound } from "next/navigation";
import TopNav from "@/components/TopNav";
import AuthorWorkPanel from "@/components/AuthorWorkPanel";
import { getBook } from "@/data/books";

export default async function AutorObraPage({
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
      <AuthorWorkPanel book={book} />
    </main>
  );
}
