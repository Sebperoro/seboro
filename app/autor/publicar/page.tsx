"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import {
  createMyWork,
  getCoverRatioWarning,
  getImageAspectRatio,
  getMyWorks,
  uploadMyWorkCover,
  validateCoverFile,
  type PublishedWork,
  type WorkStatus,
} from "@/lib/publishedWorks";

// Paleta de respaldo silenciosa: si el autor no sube portada, se asigna una
// al azar. Ya no es una elección visible del autor (ver getWorkCoverBackground).
const fallbackCovers = [
  "linear-gradient(135deg,#312e81,#020617)",
  "linear-gradient(135deg,#7c2d12,#111827)",
  "linear-gradient(135deg,#064e3b,#0f172a)",
  "linear-gradient(135deg,#831843,#18181b)",
  "linear-gradient(135deg,#334155,#030712)",
];

const genres = [
  "Fantasía",
  "Terror",
  "Romance",
  "Misterio",
  "Ciencia ficción",
  "Aventura",
  "Drama",
  "Otro",
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
  const [creationMode, setCreationMode] =
    useState<"upload" | "native">("upload");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverWarning, setCoverWarning] = useState("");

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getMyWorks();

        if (active) {
          setWorks(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar tus obras."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;
    event.currentTarget.value = "";

    if (!file) return;

    setError("");
    setCoverWarning("");

    const validationError = validateCoverFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));

    try {
      const ratio = await getImageAspectRatio(file);
      setCoverWarning(getCoverRatioWarning(ratio) || "");
    } catch {
      // Si no se puede leer la proporción, no bloqueamos la subida.
    }
  }

  function removeCoverFile() {
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverFile(null);
    setCoverPreviewUrl(null);
    setCoverWarning("");
  }

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
        cover_style:
          fallbackCovers[
            Math.floor(Math.random() * fallbackCovers.length)
          ],
      });

      let coverFailed = false;

      if (coverFile) {
        try {
          await uploadMyWorkCover(work.id, coverFile);
        } catch {
          coverFailed = true;
        }
      }

      const mode = creationMode === "upload" ? "manuscrito" : "nativo";

      router.push(
        `/autor/publicar/${work.id}?inicio=${mode}${
          coverFailed ? "&coverError=1" : ""
        }`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la obra."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#91867e]">
              Estudio del autor
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Publicar una obra
            </h1>

            <p className="mt-3 max-w-2xl text-[#7f756e]">
              Empieza subiendo un manuscrito profesional o crea tu obra dentro de
              SEBORO. Ambas opciones terminarán en la misma experiencia de lectura
              tipo libro.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/autor"
              className="rounded-full border border-[#e4ddd7] px-5 py-2.5 text-sm font-semibold"
            >
              Panel del autor
            </Link>

            <Link
              href="/publicaciones"
              className="rounded-full border border-[#ebcdb8] bg-white px-5 py-2.5 text-sm font-black text-[#b95016] transition hover:bg-[#fff5ee]"
            >
              Ver catálogo real
            </Link>
          </div>
        </div>

        <section className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#91867e]">
            Cómo quieres comenzar
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setCreationMode("upload")
              }
              className={`min-h-[280px] rounded-[30px] border p-8 text-left transition md:p-9 ${
                creationMode === "upload"
                  ? "border-[#d96822] bg-[#fff8f2] shadow-[0_10px_26px_rgba(217,104,34,0.08)]"
                  : "border-[#e4ddd7] bg-white hover:border-[#d6c4b6]"
              }`}
            >
              <div className="flex h-full items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b85a1e]">
                    Recomendado
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.025em]">
                    Subir manuscrito
                  </h2>

                  <p className="mt-5 max-w-xl text-base leading-7 text-[#7f756e]">
                    Sube un PDF o EPUB. SEBORO conservará o preparará el contenido
                    para que después se lea como un libro digital con páginas.
                  </p>

                  <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[#91867e]">
                    PDF · EPUB
                  </p>
                </div>

                <span
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border ${
                    creationMode === "upload"
                      ? "border-[#d96822] bg-[#d96822] text-white"
                      : "border-[#d8d0c8] text-transparent"
                  }`}
                >
                  ✓
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setCreationMode("native")
              }
              className={`min-h-[280px] rounded-[30px] border p-8 text-left transition md:p-9 ${
                creationMode === "native"
                  ? "border-[#2f2d29] bg-[#f7f5f1] shadow-[0_10px_26px_rgba(47,45,41,0.06)]"
                  : "border-[#e4ddd7] bg-white hover:border-[#d6c4b6]"
              }`}
            >
              <div className="flex h-full items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#91867e]">
                    Alternativa
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.025em]">
                    Crear dentro de SEBORO
                  </h2>

                  <p className="mt-5 max-w-xl text-base leading-7 text-[#7f756e]">
                    Escribe, pega o administra capítulos manualmente. Cuando se
                    publique, SEBORO también la mostrará con la misma experiencia
                    de lectura tipo libro.
                  </p>

                  <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[#91867e]">
                    Editor por capítulos
                  </p>
                </div>

                <span
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border ${
                    creationMode === "native"
                      ? "border-[#2f2d29] bg-[#2f2d29] text-white"
                      : "border-[#d8d0c8] text-transparent"
                  }`}
                >
                  ✓
                </span>
              </div>
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-semibold text-[#a34d43]">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 rounded-3xl border border-[#e4ddd7] bg-white p-4 md:p-6 lg:grid-cols-[220px_1fr]">
          <div>
            {coverPreviewUrl ? (
              <div
                className="aspect-[2/3] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-[#e2d9d2]"
                style={{
                  background: `url("${coverPreviewUrl}") center / cover no-repeat`,
                }}
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center rounded-3xl border-2 border-dashed border-[#ddd6d0] bg-[#faf8f6] text-center">
                <p className="px-4 text-xs font-semibold text-[#9a9089]">
                  Sin portada todavía
                </p>
              </div>
            )}

            <p className="mt-4 text-sm font-semibold">
              Portada de la obra
            </p>

            <p className="mt-1 text-xs text-[#9a9089]">
              JPG, PNG o WEBP · recomendado 2:3 · hasta 5 MB
            </p>

            {coverWarning && (
              <p className="mt-2 text-xs font-semibold text-[#a3702f]">
                {coverWarning}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-full bg-[#d96822] px-4 py-2 text-xs font-black text-white transition hover:bg-[#b95016]">
                {coverFile ? "Cambiar portada" : "Subir portada"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </label>

              {coverFile && (
                <button
                  type="button"
                  onClick={removeCoverFile}
                  className="rounded-full border border-[#efc1b9] bg-[#fff7f5] px-4 py-2 text-xs font-black text-[#a34d43] transition hover:bg-[#fff0ed]"
                >
                  Quitar portada
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <div>
              <label className="text-sm font-semibold">
                Título
              </label>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Título de la obra"
                className="mt-2 w-full rounded-2xl border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 outline-none transition focus:border-[#d79a73] focus:ring-4 focus:ring-[#d96822]/[0.07]"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <label className="text-sm font-semibold">
                    Género
                  </label>

                  <p className="mt-1 text-xs text-[#9a9089]">
                    Elige el que mejor describa la obra.
                  </p>
                </div>

                <span className="rounded-full bg-[#f7f3ef] px-3 py-1 text-xs font-bold text-[#81766e]">
                  {genre}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {genres.map((item) => {
                  const selected =
                    genre === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setGenre(item)
                      }
                      className={[
                        "rounded-full border px-4 py-2.5 text-sm font-bold transition",
                        selected
                          ? "border-[#d96822] bg-[#fff1e6] text-[#a84f18] shadow-[0_5px_14px_rgba(217,104,34,0.08)]"
                          : "border-[#ddd6d0] bg-[#fffefd] text-[#665d57] hover:border-[#d3b39d] hover:bg-[#fff9f4]",
                      ].join(" ")}
                    >
                      {selected && (
                        <span className="mr-1.5">
                          ✓
                        </span>
                      )}

                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div>
                <label className="text-sm font-semibold">
                  Estado de la obra
                </label>

                <p className="mt-1 text-xs text-[#9a9089]">
                  Puedes cambiarlo después.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setStatus("ongoing")
                    }
                    className={[
                      "rounded-[18px] border p-4 text-left transition",
                      status === "ongoing"
                        ? "border-[#d96822] bg-[#fff5ed] shadow-[0_6px_18px_rgba(217,104,34,0.07)]"
                        : "border-[#ddd6d0] bg-[#fffefd] hover:border-[#d3b39d]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black">
                        En proceso
                      </span>

                      <span
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                          status === "ongoing"
                            ? "border-[#d96822] bg-[#d96822] text-white"
                            : "border-[#d4cbc5] text-transparent",
                        ].join(" ")}
                      >
                        ✓
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-[#8a7f78]">
                      Todavía estás publicando o terminando capítulos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatus("finished")
                    }
                    className={[
                      "rounded-[18px] border p-4 text-left transition",
                      status === "finished"
                        ? "border-[#4f7951] bg-[#f2f8f1] shadow-[0_6px_18px_rgba(79,121,81,0.07)]"
                        : "border-[#ddd6d0] bg-[#fffefd] hover:border-[#b8cbb8]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black">
                        Terminada
                      </span>

                      <span
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                          status === "finished"
                            ? "border-[#4f7951] bg-[#4f7951] text-white"
                            : "border-[#d4cbc5] text-transparent",
                        ].join(" ")}
                      >
                        ✓
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-[#8a7f78]">
                      El manuscrito completo ya está listo.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Precio
                </label>

                <p className="mt-1 text-xs text-[#9a9089]">
                  Usa 0 si quieres publicarla gratis.
                </p>

                <div className="mt-3 flex min-h-[78px] items-center rounded-[18px] border border-[#ddd6d0] bg-[#fffefd] px-5 transition focus-within:border-[#d79a73] focus-within:ring-4 focus-within:ring-[#d96822]/[0.07]">
                  <span className="text-lg font-black text-[#91867e]">
                    $
                  </span>

                  <input
                    value={price}
                    inputMode="decimal"
                    onChange={(event) =>
                      setPrice(
                        event.target.value.replace(
                          /[^0-9.]/g,
                          ""
                        )
                      )
                    }
                    className="min-w-0 flex-1 bg-transparent px-3 text-xl font-black outline-none"
                  />

                  <span className="text-sm font-bold text-[#91867e]">
                    MXN
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Sinopsis
              </label>

              <textarea
                value={synopsis}
                onChange={(event) =>
                  setSynopsis(event.target.value)
                }
                placeholder="Describe la obra sin revelar demasiado..."
                className="mt-2 min-h-40 w-full rounded-2xl border border-[#ddd6d0] bg-[#fffefd] p-4 outline-none transition focus:border-[#d79a73] focus:ring-4 focus:ring-[#d96822]/[0.07]"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={create}
                disabled={
                  busy ||
                  !title.trim() ||
                  !genre.trim() ||
                  !synopsis.trim()
                }
                className="rounded-full bg-[#d96822] px-6 py-3 font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
              >
                {busy
                  ? "Creando..."
                  : creationMode === "upload"
                  ? "Crear borrador y subir manuscrito"
                  : "Crear borrador y añadir capítulos"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#91867e]">
                Tus borradores y publicaciones
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Tus obras
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-[#e4ddd7] p-6 text-[#91867e]">
              Cargando...
            </div>
          ) : works.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#e4ddd7] p-6 text-[#91867e]">
              Todavía no has creado una obra dinámica.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {works.map((work) => (
                <Link
                  key={work.id}
                  href={`/autor/publicar/${work.id}`}
                  className="grid grid-cols-[80px_1fr] gap-4 rounded-3xl border border-[#e4ddd7] bg-white p-4 hover:border-[#d6a985]"
                >
                  <div
                    className="aspect-[2/3] rounded-xl"
                    style={{
                      background:
                        work.cover_style,
                    }}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#e4ddd7] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7f756e]">
                        {work.publication_status ===
                        "published"
                          ? "Publicada"
                          : "Borrador"}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate text-lg font-bold">
                      {work.title}
                    </h3>

                    <p className="mt-1 text-sm text-[#91867e]">
                      {work.genre} ·{" "}
                      {work.work_status ===
                      "ongoing"
                        ? "En proceso"
                        : "Terminada"}
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
