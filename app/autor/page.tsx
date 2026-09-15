import TopNav from "@/components/TopNav";
import AuthorDashboard from "@/components/AuthorDashboard";

export default function AutorPage() {
  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#211f1c]">
      <TopNav />

      <AuthorDashboard />
    </main>
  );
}