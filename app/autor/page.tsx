import Link from "next/link";
import TopNav from "@/components/TopNav";
import AuthorDashboard from "@/components/AuthorDashboard";

export default function AutorPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-5 pt-8 md:px-8">
        <Link
          href="/autor/publicar"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
        >
          + Crear obra real
        </Link>

        <Link
          href="/autor/perfil"
          className="rounded-full border border-violet-300/20 bg-violet-300/10 px-5 py-2.5 text-sm font-semibold text-violet-100"
        >
          Editar perfil público
        </Link>

        <Link
          href="/publicaciones"
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
        >
          Ver catálogo real
        </Link>
      </div>

      <AuthorDashboard />
    </main>
  );
}
