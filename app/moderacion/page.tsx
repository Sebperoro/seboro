"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  acknowledgeCommunityWarning,
  getMyCommunityModerationStatus,
  type MyCommunityModerationStatus,
} from "@/lib/communityModeration";
import { getCurrentUser } from "@/lib/userBooks";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function severityLabel(severity: string) {
  if (severity === "final") return "Restricción";
  if (severity === "warning") return "Advertencia";
  return "Aviso";
}

export default function MyModerationPage() {
  const [data, setData] =
    useState<MyCommunityModerationStatus | null>(null);

  const [loggedIn, setLoggedIn] =
    useState<boolean | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const user =
        await getCurrentUser();

      setLoggedIn(Boolean(user));

      if (user) {
        setData(
          await getMyCommunityModerationStatus()
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar tu estado."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function acknowledge(
    warningId: string
  ) {
    try {
      await acknowledgeCommunityWarning(
        warningId
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo marcar el aviso."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-4xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <Link
          href="/notificaciones"
          className="inline-flex items-center gap-2 text-sm font-black text-[#7d736c] transition hover:text-[#2f2925]"
        >
          ← Notificaciones
        </Link>

        <div className="mt-7 border-b border-[#ddd5cf] pb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b817a]">
            Comunidad
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            Moderación y seguridad
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7c726b] md:text-base">
            Consulta avisos y restricciones aplicados a tu participación.
            Los reportes enviados por otras personas no se muestran públicamente.
          </p>
        </div>

        {loggedIn === false ? (
          <div className="mt-7 rounded-[22px] border border-[#ddd5cf] bg-white p-7">
            <p className="font-black">
              Inicia sesión para consultar esta información.
            </p>

            <Link
              href="/cuenta"
              className="mt-5 inline-flex rounded-full bg-[#2f2925] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f1b18]"
            >
              Ir a mi cuenta
            </Link>
          </div>
        ) : loading ? (
          <div className="mt-7 rounded-[20px] border border-[#ddd5cf] bg-white p-6 text-[#8f8580]">
            Cargando...
          </div>
        ) : error ? (
          <div className="mt-7 rounded-[20px] border border-[#e5c3c3] bg-white p-5 text-[#b24949]">
            {error}
          </div>
        ) : data ? (
          <>
            <section className="mt-7">
              {data.restriction ? (
                <div className="rounded-[22px] border border-[#dfb8bc] bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a84f58]">
                        Restricción activa
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        Participación temporalmente limitada
                      </h2>
                    </div>

                    <span className="rounded-full border border-[#e3c2c6] bg-[#fff7f7] px-3 py-1.5 text-xs font-black text-[#a84f58]">
                      Hasta {formatDate(
                        data.restriction.restricted_until
                      )}
                    </span>
                  </div>

                  <p className="mt-4 leading-7 text-[#625a55]">
                    No puedes publicar ni responder durante este periodo.
                  </p>

                  <div className="mt-4 rounded-[16px] border border-[#eee4e4] bg-[#fcfafa] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8c7e7f]">
                      Motivo
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#74686a]">
                      {data.restriction.reason}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] border border-[#d3ddd0] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c9d7c6] bg-[#f5f9f4] text-sm font-black text-[#4f7951]">
                      ✓
                    </span>

                    <div>
                      <p className="font-black">
                        Sin restricciones activas
                      </p>

                      <p className="mt-1 text-sm text-[#7f7a74]">
                        Puedes participar normalmente en la comunidad.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b817a]">
                    Historial personal
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Avisos de moderación · {data.warnings.length}
                  </h2>
                </div>
              </div>

              {data.warnings.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#ddd5cf] bg-white p-7 text-[#7f7771]">
                  No tienes avisos de moderación.
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-[22px] border border-[#ddd5cf] bg-white">
                  {data.warnings.map(
                    (warning, index) => {
                      const isPending =
                        !warning.acknowledged_at;

                      return (
                        <article
                          key={warning.id}
                          className={`px-5 py-5 ${
                            index > 0
                              ? "border-t border-[#eee8e2]"
                              : ""
                          } ${
                            isPending
                              ? "bg-[#fffaf4]"
                              : "bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                    warning.severity ===
                                    "final"
                                      ? "border-[#e3c2c6] bg-[#fff7f7] text-[#a84f58]"
                                      : warning.severity ===
                                        "warning"
                                      ? "border-[#ead5aa] bg-[#fffaf0] text-[#8a682d]"
                                      : "border-[#ddd5cf] bg-[#faf9f7] text-[#746b65]"
                                  }`}
                                >
                                  {severityLabel(
                                    warning.severity
                                  )}
                                </span>

                                {isPending && (
                                  <span className="rounded-full border border-[#ead5aa] bg-[#fffaf0] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a682d]">
                                    Pendiente
                                  </span>
                                )}
                              </div>

                              <p className="mt-3 leading-7 text-[#5f5752]">
                                {warning.reason}
                              </p>

                              <p className="mt-3 text-xs font-semibold text-[#9a9089]">
                                {formatDate(
                                  warning.created_at
                                )}
                              </p>
                            </div>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() =>
                                  acknowledge(
                                    warning.id
                                  )
                                }
                                className="rounded-full border border-[#d8cfc8] bg-white px-4 py-2 text-xs font-black text-[#6f655f] transition hover:border-[#c5ad9c] hover:text-[#2f2925]"
                              >
                                Entendido
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
