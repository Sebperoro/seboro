"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import {
  createMyWork,
  getMyWorks,
  type PublishedWork,
  type WorkStatus,
} from "@/lib/publishedWorks";

const covers = [
  "linear-gradient(135deg,#312e81,#020617)",
  "linear-gradient(135deg,#7c2d12,#111827)",
  "linear-gradient(135deg,#064e3b,#0f172a)",
  "linear-gradient(135deg,#831843,#18181b)",
  "linear-gradient(135deg,#334155,#030712)",
];

export default function PublicarPage() {
  const router = useRouter();

  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Fantasía");
  const [synopsis, setSynopsis] = useState("");
  const [status, setStatus] = useState<WorkStatus>("ongoing");
  const [price, setPrice] = useState("0");
  const [cover, setCover] = useState(covers[0]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getMyWorks();
        if (active) setWorks(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "No se pudieron cargar tus obras."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function create() {
    setBusy(true);
    setError("");

    try {
      const work = await createMyWork({
        title,
        genre,
        synopsis,
        work_status: status,
        price_mxn: Number(price) || 0,
        cover_style: cover,
      });

      router.push(`/autor/publicar/${work.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la obra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Estudio del autor
            </p>
            <h1 className="mt-2 text-4xl font-black">Publicar una obra</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Crea la ficha, escribe capítulos y publícala en el catálogo real de
              SEBORO.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/autor"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold"
            >
              Panel del autor
            </Link>
            <Link
              href="/publicaciones"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Ver catálogo real
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-200">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:grid-cols-[220px_1fr]">
          <div>
            <div
              className="aspect-[2/3] rounded-3xl shadow-2xl ring-1 ring-white/10"
              style={{ background: cover }}
            />

            <p className="mt-4 text-sm font-semibold">Portada provisional</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {covers.map((item) => (
                <button
                  key={item}
                  onClick={() => setCover(item)}
                  className={`aspect-square rounded-xl border ${
                    cover === item ? "border-white" : "border-white/10"
                  }`}
                  style={{ background: item }}
                  aria-label="Elegir portada"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="text-sm font-semibold">Título</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título de la obra"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="text-sm font-semibold">Género</label>
                <select
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none"
                >
                  <option>Fantasía</option>
                  <option>Terror</option>
                  <option>Romance</option>
                  <option>Misterio</option>
                  <option>Ciencia ficción</option>
                  <option>Aventura</option>
                  <option>Drama</option>
                  <option>Otro</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Estado</label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as WorkStatus)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none"
                >
                  <option value="ongoing">En proceso</option>
                  <option value="finished">Terminada</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Precio</label>
                <div className="mt-2 flex rounded-2xl border border-white/10 bg-black/20 px-4">
                  <span className="self-center text-zinc-500">$</span>
                  <input
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="min-w-0 flex-1 bg-transparent px-2 py-3 outline-none"
                  />
                  <span className="self-center text-zinc-500">MXN</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Sinopsis</label>
              <textarea
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                placeholder="Describe la obra sin revelar demasiado..."
                className="mt-2 min-h-40 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
              />
            </div>

            <div>
              <button
                onClick={create}
                disabled={
                  busy ||
                  !title.trim() ||
                  !genre.trim() ||
                  !synopsis.trim()
                }
                className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
              >
                {busy ? "Creando..." : "Crear borrador y añadir capítulos"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Tus borradores y publicaciones
              </p>
              <h2 className="mt-2 text-2xl font-bold">Obras creadas en Supabase</h2>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-white/10 p-6 text-zinc-500">
              Cargando...
            </div>
          ) : works.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 p-6 text-zinc-500">
              Todavía no has creado una obra dinámica.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {works.map((work) => (
                <Link
                  key={work.id}
                  href={`/autor/publicar/${work.id}`}
                  className="grid grid-cols-[80px_1fr] gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/25"
                >
                  <div
                    className="aspect-[2/3] rounded-xl"
                    style={{ background: work.cover_style }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                        {work.publication_status === "published"
                          ? "Publicada"
                          : "Borrador"}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-lg font-bold">{work.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {work.genre} ·{" "}
                      {work.work_status === "ongoing" ? "En proceso" : "Terminada"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
