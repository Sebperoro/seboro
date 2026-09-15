"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  ensureMyProfile,
  type SeboroProfile,
} from "@/lib/profiles";

export default function AuthorConfigurationPage() {
  const [profile, setProfile] =
    useState<SeboroProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const current =
          await ensureMyProfile();

        if (active) {
          setProfile(current);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la configuración."
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

  const roleLabel =
    profile?.role === "admin"
      ? "Administrador"
      : profile?.role === "author"
      ? "Autor"
      : "Lector";

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <Link
          href="/autor"
          className="inline-flex items-center gap-2 text-sm font-black text-[#7d7169] transition hover:text-[#b95016]"
        >
          ← Panel del autor
        </Link>

        <section className="mt-5 overflow-hidden rounded-[32px] border border-[#e1cbb9] bg-gradient-to-br from-[#fff8f1] via-[#fff4e9] to-[#f8d7bf] shadow-[0_18px_45px_rgba(105,72,47,0.08)]">
          <div className="grid gap-6 px-7 py-8 md:px-9 md:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c95f1f]">
                SEBORO · CUENTA DE AUTOR
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-5xl">
                Configuración
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#756961] md:text-base">
                Gestiona tu identidad pública, tus avisos y los datos relacionados
                con tu actividad como autor.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#e2cdbd] bg-white/75 px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9b897d]">
                Estado de cuenta
              </p>

              <p className="mt-1 font-black text-[#3e352f]">
                {loading
                  ? "Cargando..."
                  : profile
                  ? roleLabel
                  : "Sin sesión"}
              </p>

              {profile?.display_name && (
                <p className="mt-1 text-xs font-semibold text-[#887a71]">
                  {profile.display_name}
                </p>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-[20px] border border-[#e7c4be] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
            {error}
          </div>
        )}

        {!loading &&
        profile &&
        profile.role === "reader" ? (
          <section className="mt-7 rounded-[24px] border border-[#ead6b3] bg-[#fff9eb] p-6">
            <p className="font-black text-[#805f26]">
              Esta cuenta todavía no tiene acceso de autor.
            </p>

            <p className="mt-2 text-sm leading-6 text-[#8b744e]">
              El acceso de autor se activa desde el proceso de solicitud y aprobación
              de SEBORO. No es necesario vincular obras manualmente.
            </p>
          </section>
        ) : (
          <section className="mt-7 grid gap-4 md:grid-cols-2">
            <Link
              href="/autor/perfil"
              className="group rounded-[26px] border border-[#ded6cf] bg-white p-6 shadow-[0_8px_24px_rgba(62,45,34,0.035)] transition hover:-translate-y-0.5 hover:border-[#d3a98d] hover:shadow-[0_14px_32px_rgba(62,45,34,0.07)]"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#d96822]">
                    Perfil
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                    Identidad pública
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7d736c]">
                    Edita tu seudónimo, biografía, géneros, ubicación pública
                    y sitio web.
                  </p>
                </div>

                <span className="text-xl font-black text-[#d96822] transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>

            <Link
              href="/notificaciones/configuracion"
              className="group rounded-[26px] border border-[#ded6cf] bg-white p-6 shadow-[0_8px_24px_rgba(62,45,34,0.035)] transition hover:-translate-y-0.5 hover:border-[#9eb8c1] hover:shadow-[0_14px_32px_rgba(62,45,34,0.07)]"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#428397]">
                    Avisos
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                    Notificaciones
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7d736c]">
                    Decide qué novedades editoriales, de comunidad y de seguidores
                    quieres recibir.
                  </p>
                </div>

                <span className="text-xl font-black text-[#428397] transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>

            <Link
              href="/autor/publicar"
              className="group rounded-[26px] border border-[#ded6cf] bg-white p-6 shadow-[0_8px_24px_rgba(62,45,34,0.035)] transition hover:-translate-y-0.5 hover:border-[#9eb89f] hover:shadow-[0_14px_32px_rgba(62,45,34,0.07)]"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#4f7951]">
                    Obras
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                    Mis publicaciones
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7d736c]">
                    Crea y administra tus obras. Cada obra nueva queda ligada
                    automáticamente a tu cuenta.
                  </p>
                </div>

                <span className="text-xl font-black text-[#4f7951] transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>

            <div className="rounded-[26px] border border-[#e3ddd7] bg-[#f4f1ed] p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#9b8f87]">
                    Ventas
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#5f5751]">
                    Cobros y pagos
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#8d837c]">
                    Aquí podrás administrar información de cobro y pagos de autor
                    cuando el sistema comercial de SEBORO esté habilitado.
                  </p>

                  <span className="mt-4 inline-flex rounded-full border border-[#d8d0ca] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#948981]">
                    Próximamente
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-7 rounded-[24px] border border-[#ddd5cf] bg-white p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8d827a]">
            Cómo funciona
          </p>

          <h2 className="mt-2 text-xl font-black">
            Las obras ya no se vinculan manualmente.
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7b716a]">
            Cuando creas una obra desde tu panel, SEBORO la registra directamente
            bajo tu cuenta de autor. La aprobación editorial cambia su estado de
            publicación, pero no requiere que escribas un slug ni que hagas una
            vinculación adicional.
          </p>
        </section>
      </div>
    </main>
  );
}
