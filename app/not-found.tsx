import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#25231f]">
      <TopNav />

      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
        <p className="text-sm font-black tracking-[0.25em] text-[#8b837b]">
          404
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">
          Esta página no existe
        </h1>

        <p className="mt-4 max-w-xl leading-7 text-[#746d65]">
          Puede que el enlace haya cambiado o que el contenido ya no esté disponible.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#2f2d29] px-6 py-3 font-black text-white transition hover:bg-[#1f1e1b]"
          >
            Inicio
          </Link>

          <Link
            href="/descubre"
            className="rounded-full border border-[#cfc7bd] bg-white px-6 py-3 font-black text-[#57514b] transition hover:border-[#aaa096] hover:text-[#2d2a26]"
          >
            Explorar catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}