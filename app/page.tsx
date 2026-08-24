import Link from "next/link";
import BookCard from "@/components/BookCard";
import TopNav from "@/components/TopNav";
import RandomDiscoveryButton from "@/components/RandomDiscoveryButton";
import RealPublishedRow from "@/components/RealPublishedRow";
import TopRatedPublishedRow from "@/components/TopRatedPublishedRow";
import AuthorDiscoveryRow from "@/components/AuthorDiscoveryRow";
import { books } from "@/data/books";

function BookRow({
  title,
  description,
  items = books,
}: {
  title: string;
  description?: string;
  items?: typeof books;
}) {
  return (
    <section className="mt-11">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-zinc-500">
              {description}
            </p>
          )}
        </div>

        <Link
          href="/descubre"
          className="shrink-0 text-sm text-zinc-400 hover:text-white"
        >
          Ver más
        </Link>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4">
        {items.map((book) => (
          <BookCard
            key={`${title}-${book.slug}`}
            book={book}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <section className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-8 md:p-14">
          <div className="max-w-2xl">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-zinc-300">
              Historias que merecen ser
              descubiertas
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
              Encuentra tu próxima
              historia antes que todos.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 md:text-lg">
              SEBORO conecta lectores
              con nuevas obras, autores
              y comunidades donde las
              historias pueden crecer
              por mérito.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/descubre"
                className="rounded-full bg-white px-6 py-3 font-semibold text-black"
              >
                Explorar catálogo
              </Link>

              <Link
                href="/autores"
                className="rounded-full border border-white/15 px-6 py-3 font-semibold"
              >
                Descubrir autores
              </Link>

              <RandomDiscoveryButton />
            </div>
          </div>
        </section>

        <RealPublishedRow />
        <TopRatedPublishedRow />
        <AuthorDiscoveryRow />

        <BookRow
          title="Historias de muestra"
          description="Contenido de demostración que mantenemos mientras el catálogo real de autores sigue creciendo."
          items={books.slice(0, 6)}
        />

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <Link
            href="/comunidad"
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25"
          >
            <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
              Comunidad
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Habla sobre las historias
            </h2>

            <p className="mt-3 leading-6 text-zinc-400">
              Comentarios, preguntas
              para autores, críticas y
              conversaciones por obra.
            </p>
          </Link>

          <Link
            href="/biblioteca"
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25"
          >
            <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
              Biblioteca
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Continúa donde te
              quedaste
            </h2>

            <p className="mt-3 leading-6 text-zinc-400">
              Leyendo, guardadas,
              terminadas, compradas e
              historial en un solo
              lugar.
            </p>
          </Link>

          <Link
            href="/autores"
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25"
          >
            <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
              Autores
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Sigue a quienes quieres
              volver a leer
            </h2>

            <p className="mt-3 leading-6 text-zinc-400">
              Cada autor tiene ahora
              identidad pública y sus
              obras reunidas en un solo
              perfil.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
