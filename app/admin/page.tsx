"use client";

import { useState } from "react";
import Link from "next/link";

import TopNav from "@/components/TopNav";
import RoleGate from "@/components/RoleGate";

type AdminTab =
  | "Resumen"
  | "Editorial"
  | "Autores"
  | "Comunidad"
  | "Correcciones"
  | "Pagos"
  | "Beta";

type Section = {
  id: Exclude<AdminTab, "Resumen">;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;

  colors: {
    main: string;
    soft: string;
    border: string;
    text: string;
  };
};

const sections: Section[] = [
  {
    id: "Editorial",
    icon: "✦",
    eyebrow: "Control editorial",
    title: "Revisión de obras",
    description:
      "Revisa las obras que superaron el control técnico, compara su preparación y decide si pueden avanzar hacia publicación.",
    href: "/admin/revision",
    action: "Abrir revisión editorial",

    colors: {
      main: "#39759a",
      soft: "#eef6fb",
      border: "#c9ddea",
      text: "#315f7b",
    },
  },

  {
    id: "Autores",
    icon: "✎",
    eyebrow: "Gestión de creadores",
    title: "Solicitudes de autor",
    description:
      "Revisa qué lectores solicitaron convertirse en autores y decide quién puede activar las herramientas de publicación.",
    href: "/admin/autores",
    action: "Gestionar autores",

    colors: {
      main: "#5b5048",
      soft: "#f5f2ef",
      border: "#e4ddd7",
      text: "#7d7169",
    },
  },

  {
    id: "Comunidad",
    icon: "◉",
    eyebrow: "Seguridad y convivencia",
    title: "Moderación de comunidad",
    description:
      "Gestiona reportes, advertencias, restricciones y auditoría para mantener sana la conversación dentro de SEBORO.",
    href: "/admin/moderacion",
    action: "Abrir moderación",

    colors: {
      main: "#5b3f8c",
      soft: "#f5f1fb",
      border: "#d8cbea",
      text: "#4a3273",
    },
  },

  {
    id: "Correcciones",
    icon: "↺",
    eyebrow: "Versionado editorial",
    title: "Correcciones versionadas",
    description:
      "Compara la versión pública con la propuesta del autor y aprueba nuevas versiones sin perder el historial anterior.",
    href: "/admin/correcciones",
    action: "Revisar correcciones",

    colors: {
      main: "#3d8060",
      soft: "#eef8f1",
      border: "#c5dfcf",
      text: "#32694e",
    },
  },

  {
    id: "Pagos",
    icon: "$",
    eyebrow: "Comisión y saldo",
    title: "Pagos a autores",
    description:
      "Consulta el saldo disponible de cada autor, revisa sus datos bancarios y marca como pagado después de transferir por fuera del sistema.",
    href: "/admin/pagos",
    action: "Abrir pagos a autores",

    colors: {
      main: "#87672e",
      soft: "#fff8e8",
      border: "#ead5aa",
      text: "#87672e",
    },
  },

  {
    id: "Beta",
    icon: "◇",
    eyebrow: "Lanzamiento",
    title: "Preparación de beta",
    description:
      "Consulta la auditoría automática, checklist de lanzamiento y feedback recibido durante las pruebas de SEBORO.",
    href: "/admin/beta",
    action: "Abrir preparación de beta",

    colors: {
      main: "#428397",
      soft: "#eef8fa",
      border: "#c7e0e6",
      text: "#366c7b",
    },
  },
];

export default function AdminPage() {
  const [tab, setTab] =
    useState<AdminTab>("Resumen");

  const selected =
    tab === "Resumen"
      ? null
      : sections.find(
          (section) =>
            section.id === tab
        ) || null;

  return (
    <RoleGate allow={["admin"]}>
      <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
        <TopNav />

        <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
          {/* CABECERA */}

          <section className="overflow-hidden rounded-[30px] border border-[#e5c6ae] bg-gradient-to-br from-white via-[#fffaf6] to-[#fff0e5] px-6 py-7 shadow-[0_10px_30px_rgba(91,60,37,0.04)] md:px-8 md:py-9">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b65b25]">
                    SEBORO · ADMINISTRACIÓN
                  </p>

                  <span className="rounded-full border border-[#efc7ab] bg-white/75 px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#a95a2c]">
                    Acceso administrador
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#29221e] md:text-5xl">
                  Centro de control
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#81756d] md:text-base">
                  Gestiona publicación, autores,
                  comunidad, versionado y preparación
                  de lanzamiento desde un único panel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <div className="rounded-[18px] border border-[#e5d8cf] bg-white/80 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#968981]">
                    Áreas
                  </p>

                  <p className="mt-1 text-lg font-black">
                    6
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#cce0d2] bg-[#f2faf4] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#64806d]">
                    Estado
                  </p>

                  <p className="mt-1 text-sm font-black text-[#37704d]">
                    Operativo
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* PESTAÑAS */}

          <section className="mt-5 overflow-hidden rounded-[22px] border border-[#e5d8cf] bg-white">
            <div className="flex overflow-x-auto px-2">
              {(
                [
                  "Resumen",
                  "Editorial",
                  "Autores",
                  "Comunidad",
                  "Correcciones",
                  "Pagos",
                  "Beta",
                ] as AdminTab[]
              ).map((item) => {
                const active =
                  tab === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setTab(item)
                    }
                    className={`relative shrink-0 px-4 py-4 text-sm transition ${
                      active
                        ? "font-black text-[#302923]"
                        : "font-semibold text-[#887c74] hover:text-[#554b44]"
                    }`}
                  >
                    {item}

                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-[#d96822]" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* CONTENIDO */}

          <section className="mt-5 min-h-[520px] rounded-[28px] border border-[#e7dcd4] bg-[#fbfaf9] p-5 shadow-[0_8px_26px_rgba(93,62,39,0.03)] md:p-7">
            {/* RESUMEN */}

            {tab === "Resumen" && (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a46c48]">
                      Panorama
                    </p>

                    <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] md:text-3xl">
                      Administración de SEBORO
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b8078]">
                      Cada área tiene una función
                      distinta. Elige una para trabajar
                      sin convertir el panel en una
                      página interminable.
                    </p>
                  </div>

                  <div className="rounded-full border border-[#ead7c8] bg-[#fff8f2] px-4 py-2 text-xs font-black text-[#a95a2c]">
                    Vista general
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sections.map(
                    (section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() =>
                          setTab(
                            section.id
                          )
                        }
                        className="group rounded-[22px] border bg-white p-5 text-left transition hover:-translate-y-[2px] hover:shadow-[0_12px_24px_rgba(64,43,29,0.06)]"
                        style={{
                          borderColor:
                            section.colors
                              .border,
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-[15px] text-lg font-black"
                            style={{
                              background:
                                section.colors
                                  .soft,
                              color:
                                section.colors
                                  .main,
                            }}
                          >
                            {
                              section.icon
                            }
                          </div>

                          <span
                            className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                            style={{
                              background:
                                section.colors
                                  .soft,
                              color:
                                section.colors
                                  .text,
                            }}
                          >
                            Abrir
                          </span>
                        </div>

                        <p
                          className="mt-5 text-[9px] font-black uppercase tracking-[0.15em]"
                          style={{
                            color:
                              section.colors
                                .text,
                          }}
                        >
                          {
                            section.eyebrow
                          }
                        </p>

                        <h3 className="mt-1 text-xl font-black tracking-[-0.025em]">
                          {
                            section.title
                          }
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#8a8078]">
                          {
                            section.description
                          }
                        </p>

                        <div className="mt-5 flex items-center gap-2 text-xs font-black text-[#5f554e]">
                          Ver sección
                          <span className="transition group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <article className="rounded-[22px] border border-[#e3ddd7] bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#80756d]">
                      Flujo editorial
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Publicar sin perder control
                    </h3>

                    <div className="mt-5 grid gap-3 sm:grid-cols-4">
                      {[
                        {
                          n: "1",
                          label:
                            "Autor envía",
                        },
                        {
                          n: "2",
                          label:
                            "SEBORO revisa",
                        },
                        {
                          n: "3",
                          label:
                            "Admin decide",
                        },
                        {
                          n: "4",
                          label:
                            "Se publica",
                        },
                      ].map(
                        (
                          step
                        ) => (
                          <div
                            key={
                              step.n
                            }
                            className="rounded-[16px] bg-[#f7f5f3] p-4"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff0e5] text-[10px] font-black text-[#b95016]">
                              {
                                step.n
                              }
                            </span>

                            <p className="mt-3 text-xs font-black">
                              {
                                step.label
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </article>

                  <article className="rounded-[22px] border border-[#d7e3da] bg-[#f8fbf9] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#5c7c68]">
                      Versionado
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Correcciones protegidas
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-[#708077]">
                      Las correcciones de capítulos
                      publicados pasan por revisión antes
                      de convertirse en una nueva versión.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setTab(
                          "Correcciones"
                        )
                      }
                      className="mt-5 rounded-full border border-[#bfd7c7] bg-white px-4 py-2 text-xs font-black text-[#397053]"
                    >
                      Ver versionado →
                    </button>
                  </article>
                </div>
              </div>
            )}

            {/* PESTAÑAS INTERNAS */}

            {selected && (
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setTab(
                      "Resumen"
                    )
                  }
                  className="text-xs font-black text-[#887c74] transition hover:text-[#b95016]"
                >
                  ← Volver al resumen
                </button>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <article
                    className="rounded-[26px] border bg-white p-6 md:p-8"
                    style={{
                      borderColor:
                        selected.colors
                          .border,
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-[18px] text-2xl font-black"
                        style={{
                          background:
                            selected.colors
                              .soft,
                          color:
                            selected.colors
                              .main,
                        }}
                      >
                        {
                          selected.icon
                        }
                      </div>

                      <span
                        className="rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em]"
                        style={{
                          background:
                            selected.colors
                              .soft,
                          color:
                            selected.colors
                              .text,
                        }}
                      >
                        Área administrativa
                      </span>
                    </div>

                    <p
                      className="mt-7 text-[10px] font-black uppercase tracking-[0.17em]"
                      style={{
                        color:
                          selected.colors
                            .text,
                      }}
                    >
                      {
                        selected.eyebrow
                      }
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                      {
                        selected.title
                      }
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#7f756e]">
                      {
                        selected.description
                      }
                    </p>

                    <Link
                      href={
                        selected.href
                      }
                      className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
                      style={{
                        background:
                          selected.colors
                            .main,
                      }}
                    >
                      {
                        selected.action
                      }
                      <span>
                        →
                      </span>
                    </Link>
                  </article>

                  <aside className="space-y-4">
                    <article
                      className="rounded-[22px] border p-5"
                      style={{
                        background:
                          selected.colors
                            .soft,
                        borderColor:
                          selected.colors
                            .border,
                      }}
                    >
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.15em]"
                        style={{
                          color:
                            selected.colors
                              .text,
                        }}
                      >
                        Objetivo
                      </p>

                      <p className="mt-2 text-lg font-black">
                        Mantener el control sin bloquear el flujo.
                      </p>

                      <p className="mt-3 text-sm leading-6 text-[#746a63]">
                        Esta área concentra las decisiones
                        que requieren supervisión
                        administrativa, mientras las tareas
                        normales continúan automatizadas.
                      </p>
                    </article>

                    <article className="rounded-[22px] border border-[#e3ddd7] bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#81766e]">
                        Navegación
                      </p>

                      <p className="mt-2 text-sm font-black">
                        No tienes que recorrer toda la página.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-[#91867e]">
                        Usa las pestañas superiores para
                        cambiar de área. Solo se muestra
                        una sección a la vez.
                      </p>
                    </article>
                  </aside>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#91867d]">
                    Otras áreas
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {sections
                      .filter(
                        (
                          section
                        ) =>
                          section.id !==
                          selected.id
                      )
                      .map(
                        (
                          section
                        ) => (
                          <button
                            key={
                              section.id
                            }
                            type="button"
                            onClick={() =>
                              setTab(
                                section.id
                              )
                            }
                            className="rounded-full border bg-white px-4 py-2 text-xs font-black transition hover:-translate-y-[1px]"
                            style={{
                              borderColor:
                                section
                                  .colors
                                  .border,
                              color:
                                section
                                  .colors
                                  .text,
                            }}
                          >
                            {
                              section.icon
                            }{" "}
                            {
                              section.id
                            }
                          </button>
                        )
                      )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </RoleGate>
  );
}