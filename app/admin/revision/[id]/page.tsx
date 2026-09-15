"use client";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TopNav from "@/components/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  decideHumanReview,
  getModerationBundle,
  getMyRole,
} from "@/lib/moderation";

import {
  getWorkCoverBackground,
  getWorkReadingStats,
  type PublishedWork,
  type WorkChapter,
} from "@/lib/publishedWorks";

type ManuscriptInfo = {
  content_format:
    | "native"
    | "epub"
    | "pdf";
  reading_mode:
    | "reflowable"
    | "fixed";
  source_file_path:
    | string
    | null;
  source_file_name:
    | string
    | null;
  source_file_size:
    | number
    | null;
  source_uploaded_at:
    | string
    | null;
  processing_status:
    | "none"
    | "pending"
    | "processing"
    | "ready"
    | "error";
  processing_error:
    | string
    | null;
  page_count:
    | number
    | null;
};

function formatBytes(
  bytes: number | null
) {
  if (
    bytes === null ||
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "Tamaño no disponible";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function processingLabel(
  status:
    ManuscriptInfo["processing_status"]
) {
  if (status === "ready") {
    return "Listo";
  }

  if (
    status === "pending"
  ) {
    return "Pendiente";
  }

  if (
    status === "processing"
  ) {
    return "Procesando";
  }

  if (status === "error") {
    return "Error";
  }

  return "Sin procesar";
}

function workStatusLabel(
  work: PublishedWork
) {
  return work.work_status ===
    "ongoing"
    ? "En proceso"
    : "Terminada";
}

export default function AdminReviewDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const router =
    useRouter();

  const [
    role,
    setRole,
  ] =
    useState<string | null>(
      null
    );

  const [
    work,
    setWork,
  ] =
    useState<PublishedWork | null>(
      null
    );

  const [
    chapters,
    setChapters,
  ] =
    useState<WorkChapter[]>(
      []
    );

  const [
    authorName,
    setAuthorName,
  ] =
    useState("Autor");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    manuscriptInfo,
    setManuscriptInfo,
  ] =
    useState<ManuscriptInfo | null>(
      null
    );

  const [
    manuscriptError,
    setManuscriptError,
  ] =
    useState("");

  const [
    openingManuscript,
    setOpeningManuscript,
  ] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const currentRole =
          await getMyRole();

        if (!active) {
          return;
        }

        setRole(
          currentRole
        );

        if (
          currentRole !==
          "admin"
        ) {
          return;
        }

        const bundle =
          await getModerationBundle(
            params.id
          );

        if (
          !active ||
          !bundle
        ) {
          return;
        }

        const supabase =
          getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(
            "Supabase no está configurado."
          );
        }

        const {
          data:
            manuscriptRow,
          error:
            manuscriptQueryError,
        } =
          await supabase
            .from("works")
            .select(
              [
                "content_format",
                "reading_mode",
                "source_file_path",
                "source_file_name",
                "source_file_size",
                "source_uploaded_at",
                "processing_status",
                "processing_error",
                "page_count",
              ].join(",")
            )
            .eq(
              "id",
              params.id
            )
            .maybeSingle();

        const manuscriptData =
          manuscriptRow as unknown as
            | Record<string, unknown>
            | null;

        if (
          manuscriptQueryError
        ) {
          throw new Error(
            manuscriptQueryError.message
          );
        }

        if (!active) {
          return;
        }

        setWork(
          bundle.work
        );

        setManuscriptInfo(
          manuscriptData
            ? {
                content_format:
                  String(
                    manuscriptData.content_format ||
                      "native"
                  ) as ManuscriptInfo["content_format"],
                reading_mode:
                  String(
                    manuscriptData.reading_mode ||
                      "reflowable"
                  ) as ManuscriptInfo["reading_mode"],
                source_file_path:
                  manuscriptData.source_file_path
                    ? String(
                        manuscriptData.source_file_path
                      )
                    : null,
                source_file_name:
                  manuscriptData.source_file_name
                    ? String(
                        manuscriptData.source_file_name
                      )
                    : null,
                source_file_size:
                  manuscriptData.source_file_size ===
                    null ||
                  manuscriptData.source_file_size ===
                    undefined
                    ? null
                    : Number(
                        manuscriptData.source_file_size
                      ),
                source_uploaded_at:
                  manuscriptData.source_uploaded_at
                    ? String(
                        manuscriptData.source_uploaded_at
                      )
                    : null,
                processing_status:
                  String(
                    manuscriptData.processing_status ||
                      "none"
                  ) as ManuscriptInfo["processing_status"],
                processing_error:
                  manuscriptData.processing_error
                    ? String(
                        manuscriptData.processing_error
                      )
                    : null,
                page_count:
                  manuscriptData.page_count ===
                    null ||
                  manuscriptData.page_count ===
                    undefined
                    ? null
                    : Number(
                        manuscriptData.page_count
                      ),
              }
            : null
        );

        setChapters(
          bundle.chapters
        );

        setAuthorName(
          bundle.authorName
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la revisión."
          );
        }
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const readingStats =
    useMemo(
      () =>
        getWorkReadingStats(
          chapters
        ),
      [chapters]
    );

  const isPdf =
    manuscriptInfo?.content_format ===
    "pdf";

  const isEpub =
    manuscriptInfo?.content_format ===
    "epub";

  const pdfReady =
    isPdf &&
    manuscriptInfo?.processing_status ===
      "ready" &&
    Boolean(
      manuscriptInfo.source_file_path
    ) &&
    Number(
      manuscriptInfo.page_count ||
        0
    ) > 0;

  async function openManuscript() {
    if (
      !manuscriptInfo
        ?.source_file_path
    ) {
      setManuscriptError(
        "No hay un archivo de manuscrito disponible."
      );
      return;
    }

    setOpeningManuscript(
      true
    );
    setManuscriptError("");

    const previewWindow =
      window.open(
        "",
        "_blank"
      );

    try {
      const supabase =
        getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase no está configurado."
        );
      }

      const {
        data,
        error:
          signedUrlError,
      } =
        await supabase.storage
          .from(
            "book-manuscripts"
          )
          .createSignedUrl(
            manuscriptInfo
              .source_file_path,
            60 * 60
          );

      if (
        signedUrlError ||
        !data?.signedUrl
      ) {
        throw new Error(
          signedUrlError?.message ||
            "No se pudo abrir el manuscrito."
        );
      }

      if (previewWindow) {
        previewWindow.opener =
          null;
        previewWindow.location.href =
          data.signedUrl;
      } else {
        setManuscriptError(
          "El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para localhost y vuelve a intentarlo."
        );
      }
    } catch (err) {
      if (previewWindow) {
        previewWindow.close();
      }

      setManuscriptError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el manuscrito."
      );
    } finally {
      setOpeningManuscript(
        false
      );
    }
  }

  async function decide(
    decision:
      | "approved"
      | "changes_requested"
  ) {
    if (!work) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await decideHumanReview(
        work.id,
        decision,
        notes
      );

      router.push(
        "/admin/revision"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la decisión."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-7 md:px-8">
        {/* VOLVER */}

        <Link
          href="/admin/revision"
          className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#39759a]"
        >
          ← Volver a revisión
        </Link>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-[18px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
            {error}
          </div>
        )}

        {/* CARGANDO */}

        {loading ? (
          <div className="mt-5 space-y-4">
            <div className="h-64 animate-pulse rounded-[28px] border border-[#e4ddd7] bg-white" />

            <div className="h-96 animate-pulse rounded-[28px] border border-[#e4ddd7] bg-white" />
          </div>
        ) : role !==
          "admin" ? (
          <section className="mt-5 rounded-[24px] border border-[#ead5aa] bg-[#fff9eb] p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff2cf] text-lg font-black text-[#8a682d]">
              !
            </div>

            <h2 className="mt-4 text-xl font-black">
              Acceso reservado
            </h2>

            <p className="mt-2 text-sm text-[#89785d]">
              No tienes permisos de administrador para revisar esta obra.
            </p>
          </section>
        ) : !work ? (
          <section className="mt-5 rounded-[24px] border border-[#e4ddd7] bg-white p-8">
            <h2 className="text-xl font-black">
              Obra no encontrada
            </h2>

            <p className="mt-2 text-sm text-[#8b8078]">
              La obra ya no está disponible o no pertenece a la cola editorial.
            </p>
          </section>
        ) : (
          <>
            {/* CABECERA DE LA OBRA */}

            <section className="mt-5 overflow-hidden rounded-[30px] border border-[#c9ddea] bg-gradient-to-br from-white via-[#fbfdff] to-[#eef6fb] p-5 shadow-[0_10px_30px_rgba(57,117,154,0.04)] md:p-7">
              <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[170px_minmax(0,1fr)_220px]">
                <div
                  className="aspect-[2/3] w-full max-w-[170px] rounded-[18px] border border-[#d9d2cc] shadow-[0_12px_26px_rgba(54,39,29,0.12)]"
                  style={{
                    background:
                      getWorkCoverBackground(
                        work
                      ),
                  }}
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#c9ddea] bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#39759a]">
                      Revisión humana
                    </span>

                    <span className="rounded-full border border-[#e0d9d3] bg-white/80 px-3 py-1 text-[9px] font-black text-[#766c65]">
                      {workStatusLabel(
                        work
                      )}
                    </span>
                  </div>

                  <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] md:text-4xl lg:text-5xl">
                    {
                      work.title
                    }
                  </h1>

                  {work.subtitle && (
                    <p className="mt-2 text-lg font-semibold text-[#315f7b]">
                      {
                        work.subtitle
                      }
                    </p>
                  )}

                  <p className="mt-3 text-sm text-[#7d746d]">
                    por{" "}
                    <b className="text-[#403832]">
                      {
                        authorName
                      }
                    </b>
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {work.tags.map(
                      (tag) => (
                        <span
                          key={
                            tag
                          }
                          className="rounded-full border border-[#c9ddea] bg-white/70 px-3 py-1 text-[10px] font-black text-[#315f7b]"
                        >
                          #
                          {
                            tag
                          }
                        </span>
                      )
                    )}

                    <span className="rounded-full border border-[#dfd8d2] bg-white/70 px-3 py-1 text-[10px] font-black text-[#81766e]">
                      {
                        work.age_rating
                      }
                    </span>

                    <span className="rounded-full border border-[#dfd8d2] bg-white/70 px-3 py-1 text-[10px] font-black text-[#81766e]">
                      {work.language_code.toUpperCase()}
                    </span>
                  </div>

                  <p className="mt-6 max-w-3xl text-sm leading-7 text-[#315f7b]">
                    {
                      work.synopsis
                    }
                  </p>

                  {work.content_warnings.length >
                    0 && (
                    <div className="mt-5 rounded-[16px] border border-[#ead7ad] bg-[#fff9e9] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#8a682d]">
                        Advertencias de contenido
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#806f52]">
                        {work.content_warnings.join(
                          " · "
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* DATOS RÁPIDOS */}

                <aside className="grid grid-cols-2 gap-3 self-start md:col-span-2 lg:col-span-1 lg:grid-cols-1">
                  {isPdf ? (
                    <>
                      <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#315f7b]">
                          Formato
                        </p>

                        <p className="mt-1 text-xl font-black text-[#39759a]">
                          PDF
                        </p>

                        <p className="mt-1 text-[10px] font-bold text-[#315f7b]">
                          Diseño fijo
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#315f7b]">
                          Páginas
                        </p>

                        <p className="mt-1 text-2xl font-black text-[#39759a]">
                          {manuscriptInfo?.page_count ??
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#315f7b]">
                          Archivo
                        </p>

                        <p className="mt-1 text-sm font-black text-[#39759a]">
                          {processingLabel(
                            manuscriptInfo
                              ?.processing_status ||
                              "none"
                          )}
                        </p>

                        <p className="mt-1 truncate text-[10px] font-bold text-[#315f7b]">
                          {formatBytes(
                            manuscriptInfo
                              ?.source_file_size ??
                              null
                          )}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#315f7b]">
                          {isEpub
                            ? "Capítulos importados"
                            : "Capítulos"}
                        </p>

                        <p className="mt-1 text-2xl font-black text-[#39759a]">
                          {
                            chapters.length
                          }
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#315f7b]">
                          Palabras
                        </p>

                        <p className="mt-1 text-2xl font-black text-[#39759a]">
                          {readingStats.wordCount.toLocaleString(
                            "es-MX"
                          )}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-[#c9ddea] bg-white/85 p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#315f7b]">
                          Lectura estimada
                        </p>

                        <p className="mt-1 text-lg font-black text-[#39759a]">
                          ≈{" "}
                          {
                            readingStats.readMinutes
                          }{" "}
                          min
                        </p>
                      </div>
                    </>
                  )}

                  <div className="rounded-[18px] border border-[#d8e4db] bg-[#f5faf6] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6c8374]">
                      Precio
                    </p>

                    <p className="mt-1 text-lg font-black text-[#397053]">
                      $
                      {
                        work.price_mxn
                      }{" "}
                      MXN
                    </p>
                  </div>
                </aside>
              </div>
            </section>

            {/* BARRA DE REVISIÓN */}

            <section className="mt-5 rounded-[20px] border border-[#e3ddd7] bg-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#39759a]">
                    Revisión editorial
                  </p>

                  <p className="mt-1 text-sm font-black">
                    Lee la obra antes de emitir una decisión.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-black">
                  <span className="rounded-full bg-[#eef6fb] px-3 py-1.5 text-[#39759a]">
                    1. Revisar contenido
                  </span>

                  <span className="rounded-full bg-[#f5f2ef] px-3 py-1.5 text-[#81766e]">
                    2. Escribir notas
                  </span>

                  <span className="rounded-full bg-[#eef8f1] px-3 py-1.5 text-[#397053]">
                    3. Decidir
                  </span>
                </div>
              </div>
            </section>

            {/* CONTENIDO PARA REVISIÓN */}

            <section className="mt-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#39759a]">
                  Contenido
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Lectura editorial
                </h2>

                <p className="mt-1 text-sm text-[#8b8078]">
                  {isPdf
                    ? "Abre el PDF y revisa sus páginas originales antes de emitir una decisión."
                    : isEpub
                    ? "Revisa los capítulos importados desde el EPUB tal como los recibirá el lector."
                    : "Revisa los capítulos tal como fueron enviados por el autor."}
                </p>
              </div>

              {isPdf ? (
                <div className="mt-5 overflow-hidden rounded-[24px] border border-[#c9ddea] bg-white shadow-[0_8px_24px_rgba(57,117,154,0.04)]">
                  <div className="border-b border-[#c9ddea] bg-[#eef6fb] px-5 py-4 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#c9ddea] bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#39759a]">
                            PDF · Diseño fijo
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                              pdfReady
                                ? "border-[#bddbc7] bg-[#eef8f1] text-[#397053]"
                                : "border-[#ead5aa] bg-[#fff9eb] text-[#8a682d]"
                            }`}
                          >
                            {processingLabel(
                              manuscriptInfo
                                ?.processing_status ||
                                "none"
                            )}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-lg font-black text-[#403832]">
                          {manuscriptInfo
                            ?.source_file_name ||
                            "Manuscrito PDF"}
                        </h3>

                        <p className="mt-1 text-sm text-[#315f7b]">
                          {manuscriptInfo?.page_count ??
                            "—"}{" "}
                          páginas ·{" "}
                          {formatBytes(
                            manuscriptInfo
                              ?.source_file_size ??
                              null
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          openManuscript
                        }
                        disabled={
                          openingManuscript ||
                          !manuscriptInfo
                            ?.source_file_path
                        }
                        className="rounded-full bg-[#39759a] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2d617f] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {openingManuscript
                          ? "Abriendo..."
                          : "Abrir manuscrito"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
                    <div className="rounded-[18px] border border-[#e4ddd7] bg-[#fcfaf8] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b8179]">
                        Presentación
                      </p>

                      <p className="mt-2 text-sm font-black text-[#4f4741]">
                        Maquetación original
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#8b8078]">
                        La tipografía, imágenes, márgenes y saltos de página deben conservarse.
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#e4ddd7] bg-[#fcfaf8] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b8179]">
                        Extensión
                      </p>

                      <p className="mt-2 text-sm font-black text-[#4f4741]">
                        {manuscriptInfo?.page_count ??
                          "—"}{" "}
                        páginas
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#8b8078]">
                        Recorre el inicio, varias páginas intermedias y el final antes de decidir.
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#e4ddd7] bg-[#fcfaf8] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b8179]">
                        Estado técnico
                      </p>

                      <p className="mt-2 text-sm font-black text-[#4f4741]">
                        {processingLabel(
                          manuscriptInfo
                            ?.processing_status ||
                            "none"
                        )}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#8b8078]">
                        {pdfReady
                          ? "El archivo está procesado y disponible para revisión."
                          : "No apruebes la obra hasta que el archivo esté listo."}
                      </p>
                    </div>
                  </div>

                  {manuscriptInfo
                    ?.processing_error && (
                    <div className="mx-5 mb-5 rounded-[16px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43] md:mx-6 md:mb-6">
                      {
                        manuscriptInfo.processing_error
                      }
                    </div>
                  )}

                  {manuscriptError && (
                    <div className="mx-5 mb-5 rounded-[16px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43] md:mx-6 md:mb-6">
                      {
                        manuscriptError
                      }
                    </div>
                  )}
                </div>
              ) : chapters.length ===
                0 ? (
                <div className="mt-5 rounded-[24px] border border-[#ead5aa] bg-[#fff9eb] p-6">
                  <p className="font-black text-[#80652e]">
                    {isEpub
                      ? "El EPUB todavía no contiene capítulos importados."
                      : "La obra no contiene capítulos."}
                  </p>

                  <p className="mt-2 text-sm text-[#8c7955]">
                    {isEpub
                      ? "Comprueba que el procesamiento del EPUB haya terminado correctamente antes de aprobar."
                      : "Esto debería considerarse antes de aprobar la publicación."}
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {chapters.map(
                    (
                      chapter
                    ) => (
                      <article
                        key={
                          chapter.id
                        }
                        className="overflow-hidden rounded-[24px] border border-[#e4ddd7] bg-white"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee7e2] bg-[#fcfaf8] px-5 py-4">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b8179]">
                              Capítulo{" "}
                              {
                                chapter.chapter_number
                              }
                            </p>

                            <h3 className="mt-1 text-lg font-black">
                              {
                                chapter.title
                              }
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#e0d9d3] bg-white px-3 py-1 text-[9px] font-black text-[#81766e]">
                              V
                              {
                                chapter.current_version
                              }
                            </span>

                            <span className="rounded-full border border-[#c9ddea] bg-[#eef6fb] px-3 py-1 text-[9px] font-black text-[#315f7b]">
                              {chapter.content
                                .trim()
                                .split(
                                  /\s+/
                                )
                                .filter(
                                  Boolean
                                )
                                .length.toLocaleString(
                                  "es-MX"
                                )}{" "}
                              palabras
                            </span>
                          </div>
                        </div>

                        <div className="max-h-[620px] overflow-y-auto whitespace-pre-wrap px-6 py-7 font-serif text-[16px] leading-8 text-[#4f4741] md:px-8">
                          {
                            chapter.content
                          }
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>

            {/* DECISIÓN */}

            <section className="mt-8 overflow-hidden rounded-[26px] border border-[#c9ddea] bg-white shadow-[0_10px_28px_rgba(57,117,154,0.04)]">
              <div className="border-b border-[#c9ddea] bg-[#eef6fb] px-5 py-5 md:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#39759a]">
                      Decisión editorial
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      ¿La obra está lista?
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#315f7b]">
                      Aprobar permite que la obra avance. Solicitar cambios devuelve observaciones concretas al autor.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#c9ddea] bg-white px-3 py-1.5 text-[9px] font-black text-[#315f7b]">
                    Decisión humana
                  </span>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[#81766e]">
                    Notas para el autor
                  </label>

                  <span className="text-[10px] font-bold text-[#9a9088]">
                    {
                      notes.length
                    }
                    /2000
                  </span>
                </div>

                <textarea
                  value={
                    notes
                  }
                  maxLength={
                    2000
                  }
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Explica qué observaste. Si solicitas cambios, indica con claridad qué debe corregir el autor antes de volver a enviar la obra."
                  className="mt-3 min-h-36 w-full resize-y rounded-[17px] border border-[#ddd6d0] bg-[#fffefd] p-4 text-sm leading-6 outline-none placeholder:text-[#aaa099] focus:border-[#8ab1c8]"
                />

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {/* APROBAR */}

                  <button
                    type="button"
                    onClick={() =>
                      decide(
                        "approved"
                      )
                    }
                    disabled={
                      busy ||
                      (isPdf &&
                        !pdfReady)
                    }
                    className="group rounded-[20px] border border-[#bcdac6] bg-[#eef8f1] p-5 text-left transition hover:border-[#8fc3a0] hover:bg-[#e8f5ec] disabled:opacity-40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-[#397053]">
                        ✓
                      </div>

                      <span className="text-sm font-black text-[#397053] transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>

                    <p className="mt-4 text-base font-black text-[#315e46]">
                      Aprobar obra
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#668071]">
                      La obra supera la revisión humana y podrá continuar hacia publicación.
                    </p>
                  </button>

                  {/* CAMBIOS */}

                  <button
                    type="button"
                    onClick={() =>
                      decide(
                        "changes_requested"
                      )
                    }
                    disabled={
                      busy
                    }
                    className="group rounded-[20px] border border-[#ead5aa] bg-[#fff9eb] p-5 text-left transition hover:border-[#d9bb7e] hover:bg-[#fff6df] disabled:opacity-40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-[#8a682d]">
                        ✎
                      </div>

                      <span className="text-sm font-black text-[#8a682d] transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>

                    <p className="mt-4 text-base font-black text-[#765a29]">
                      Solicitar cambios
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#8c7955]">
                      Devuelve la obra al autor junto con las observaciones editoriales.
                    </p>
                  </button>
                </div>

                {busy && (
                  <div className="mt-4 rounded-[15px] border border-[#c9ddea] bg-[#eef6fb] p-4 text-center text-xs font-black text-[#315f7b]">
                    Guardando decisión editorial...
                  </div>
                )}
              </div>
            </section>

            {/* PRINCIPIO */}

            <section className="mt-6 rounded-[22px] border border-[#e4ddd7] border-l-4 border-l-[#b5a99d] bg-[#f5f2ef] p-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e4ddd7] font-black text-[#5b5048]">
                  ◇
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                    Criterio editorial
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    La revisión no reescribe al autor
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8a8078]">
                    SEBORO puede aprobar o señalar problemas, pero las modificaciones de la obra corresponden al autor. La revisión debe explicar qué necesita mejorar sin reemplazar silenciosamente su texto.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}