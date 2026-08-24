import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
        <p className="text-sm font-bold tracking-[0.25em] text-zinc-500">404</p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-zinc-400">
          Puede que el enlace haya cambiado o que el contenido ya no esté disponible.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-3 font-bold text-black"
          >
            Inicio
          </Link>
          <Link
            href="/descubre"
            className="rounded-full border border-white/10 px-6 py-3 font-semibold"
          >
            Explorar catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
