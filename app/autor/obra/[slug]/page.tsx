import TopNav from "@/components/TopNav";
import AuthorWorkPanel from "@/components/AuthorWorkPanel";

export default async function AutorObraPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#211f1c]">
      <TopNav />

      <AuthorWorkPanel slug={slug} />
    </main>
  );
}