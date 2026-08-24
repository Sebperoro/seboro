import TopNav from "@/components/TopNav";
import DiscoverCatalog from "@/components/DiscoverCatalog";
import RandomDiscoveryButton from "@/components/RandomDiscoveryButton";

export default function DescubrePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 pb-20 md:px-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Descubre
          </p>
          <div className="mt-2 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-3xl text-4xl font-black md:text-5xl">
                Busca directamente o deja que una historia te encuentre.
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                Este catálogo ya conecta búsqueda, filtros y descubrimiento con las páginas de obra, lectura, biblioteca y comunidad.
              </p>
            </div>

            <RandomDiscoveryButton />
          </div>
        </section>

        <DiscoverCatalog />
      </div>
    </main>
  );
}
