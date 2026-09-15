import Link from "next/link";

import TopNav from "@/components/TopNav";
import RandomDiscoveryButton from "@/components/RandomDiscoveryButton";
import HomeMaturityDiscovery from "@/components/HomeMaturityDiscovery";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#211f1c]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <section className="relative mt-8 overflow-hidden rounded-[32px] border border-[#e3a97d] bg-gradient-to-br from-[#fff8f2] via-[#fff0e4] to-[#f6c29c] px-7 py-6 shadow-[0_18px_60px_rgba(151,78,27,0.13)] md:px-12 md:py-11">
          <div
            className="pointer-events-none absolute -right-12 -top-24 h-[370px] w-[370px] rounded-full bg-[#e5661d]/35 blur-3xl"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute bottom-[-170px] right-[20%] h-[330px] w-[330px] rounded-full bg-[#f08a43]/25 blur-3xl"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute right-12 top-10 hidden h-52 w-52 rotate-12 rounded-[44px] border border-white/30 bg-[#d95d17]/15 lg:block"
            aria-hidden="true"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex rounded-full border border-[#dc884e] bg-[#d96822] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm">
              Historias que merecen ser descubiertas
            </span>

            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.03em] text-[#201b17] md:mt-5 md:text-5xl lg:text-[58px]">
              Encuentra tu próxima historia antes que todos.
            </h1>

            <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#65574d] md:mt-4 md:text-lg md:leading-7">
              SEBORO conecta lectores con nuevas obras,
              autores y comunidades donde las historias
              pueden crecer por mérito.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-7">
              <Link
                href="/descubre"
                className="rounded-full bg-[#d95f19] px-6 py-3 font-bold text-white shadow-[0_8px_20px_rgba(194,82,21,0.22)] transition hover:bg-[#bb4e12]"
              >
                Buscar historias
              </Link>

              <RandomDiscoveryButton />

              <Link
                href="/comunidad"
                className="px-2 py-3 text-sm font-semibold text-[#8a5c37] underline decoration-[#d99768] decoration-2 underline-offset-4 transition hover:text-[#6b4527]"
              >
                Ver comunidad
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 h-[5px] w-full bg-gradient-to-r from-[#d96822] via-[#f19250] to-transparent" />
        </section>

        <HomeMaturityDiscovery />

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <Link
            href="/comunidad"
            className="rounded-3xl border border-[#e8c9b1] bg-[#fff9f4] p-6 transition hover:-translate-y-0.5 hover:border-[#dca273]"
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c45b1b]">
              Comunidad
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#211f1c]">
              Habla sobre las historias
            </h2>

            <p className="mt-3 leading-6 text-[#71675f]">
              Comentarios, preguntas para autores,
              críticas y conversaciones por obra.
            </p>
          </Link>

          <Link
            href="/biblioteca"
            className="rounded-3xl border border-[#e8c9b1] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#dca273]"
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c45b1b]">
              Biblioteca
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#211f1c]">
              Continúa donde te quedaste
            </h2>

            <p className="mt-3 leading-6 text-[#71675f]">
              Mis libros, leyendo, guardadas, terminadas
              e historial en un solo lugar.
            </p>
          </Link>

          <Link
            href="/descubre"
            className="rounded-3xl border border-[#e8c9b1] bg-[#fff9f4] p-6 transition hover:-translate-y-0.5 hover:border-[#dca273]"
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c45b1b]">
              Explora
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#211f1c]">
              Encuentra algo diferente
            </h2>

            <p className="mt-3 leading-6 text-[#71675f]">
              Busca historias, explora categorías
              y descubre obras nuevas.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
