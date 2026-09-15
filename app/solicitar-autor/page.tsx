"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  getAccessProfile,
  type AccessProfile,
} from "@/lib/access";
import {
  getMyAuthorApplications,
  submitAuthorApplication,
  type AuthorApplication,
} from "@/lib/authorApplications";

export default function SolicitarAutorPage() {
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [applications, setApplications] = useState<AuthorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [penName, setPenName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const current = await getAccessProfile();
      setProfile(current);

      if (current) {
        setPenName((value) => value || current.display_name);
        setApplications(await getMyAuthorApplications());
      } else {
        setApplications([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la solicitud."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () =>
      applications.find(
        (item) => item.status === "pending"
      ) || null,
    [applications]
  );

  const latest = applications[0] || null;

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await submitAuthorApplication({
        pen_name: penName,
        motivation,
        experience,
      });

      setMessage("Solicitud enviada correctamente.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la solicitud."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-8">
        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          {/* Lado editorial */}
          <section className="relative overflow-hidden rounded-[30px] border border-[#d9e1e6] bg-gradient-to-br from-[#eaf4f8] via-[#f4f8fa] to-[#fdfefe] p-7 md:p-9">
            <div className="absolute -right-16 top-12 h-44 w-44 rounded-full border border-[#b9d5df] opacity-50" />
            <div className="absolute -right-6 top-28 h-24 w-24 rounded-full bg-[#cfe4eb]/70" />

            <div className="relative">
              <Link
                href="/"
                className="inline-flex text-sm font-black text-[#5c7883] transition hover:text-[#39759a]"
              >
                ← Volver
              </Link>

              <p className="mt-10 text-[10px] font-black uppercase tracking-[0.2em] text-[#39759a]">
                SEBORO · AUTORES
              </p>

              <h1 className="mt-3 max-w-lg text-4xl font-black tracking-[-0.05em] md:text-5xl">
                Da el paso de lector a autor.
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-7 text-[#6f8087]">
                Antes de abrir las herramientas de publicación, SEBORO revisa
                una solicitud breve para mantener una comunidad de autores
                identificados y una experiencia editorial cuidada.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  ["01", "Crea tu identidad de autor"],
                  ["02", "Cuéntanos qué quieres publicar"],
                  ["03", "SEBORO revisa tu solicitud"],
                  ["04", "Accede al estudio del autor"],
                ].map(([number, label]) => (
                  <div
                    key={number}
                    className="flex items-center gap-4 rounded-[18px] border border-[#d5e5eb] bg-white/75 p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#39759a] text-xs font-black text-white">
                      {number}
                    </span>

                    <p className="text-sm font-black text-[#42555d]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Lado funcional */}
          <section className="rounded-[30px] border border-[#e4ddd7] bg-white p-6 shadow-[0_12px_35px_rgba(62,45,34,0.045)] md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96822]">
                  Solicitud de autor
                </p>

                <h2 className="mt-1 text-3xl font-black tracking-[-0.035em]">
                  Publica en SEBORO
                </h2>
              </div>

              <span className="rounded-full border border-[#e4ddd7] bg-[#faf8f6] px-3 py-1.5 text-[10px] font-black text-[#81766e]">
                Revisión humana
              </span>
            </div>

            {error && (
              <div className="mt-5 rounded-[16px] border border-[#efc1b9] bg-[#fff2ef] p-4 text-sm font-bold text-[#a34d43]">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-[16px] border border-[#c5dfcf] bg-[#eef8f1] p-4 text-sm font-bold text-[#397053]">
                ✓ {message}
              </div>
            )}

            {loading ? (
              <div className="mt-7 rounded-[20px] border border-[#e4ddd7] bg-[#faf8f6] p-6">
                <div className="h-5 w-36 animate-pulse rounded-full bg-[#ece7e3]" />
                <div className="mt-5 h-44 animate-pulse rounded-[18px] bg-[#f3efec]" />
              </div>
            ) : !profile ? (
              <div className="mt-7 rounded-[22px] border border-[#ead5aa] bg-[#fffaf0] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a682d]">
                  Primero inicia sesión
                </p>

                <h3 className="mt-2 text-2xl font-black text-[#725a30]">
                  Necesitas una cuenta de lector
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#806f52]">
                  La solicitud queda asociada a tu cuenta y no puede enviarse
                  de forma anónima.
                </p>

                <Link
                  href="/cuenta"
                  className="mt-5 inline-flex rounded-[15px] bg-[#d96822] px-5 py-3 text-sm font-black text-white transition hover:bg-[#b95016]"
                >
                  Ir a Cuenta
                </Link>
              </div>
            ) : profile.role === "author" || profile.role === "admin" ? (
              <div className="mt-7 rounded-[22px] border border-[#c5dfcf] bg-[#eef8f1] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#397053]">
                  Acceso concedido
                </p>

                <h3 className="mt-2 text-2xl font-black text-[#345e46]">
                  Tu cuenta ya puede publicar
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#668071]">
                  No necesitas enviar una solicitud nueva.
                </p>

                <Link
                  href="/autor"
                  className="mt-5 inline-flex rounded-[15px] bg-[#397053] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2f6046]"
                >
                  Ir al Centro del creador
                </Link>
              </div>
            ) : pending ? (
              <div className="mt-7 rounded-[22px] border border-[#c9ddea] bg-[#eef6fb] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#39759a]">
                      Solicitud enviada
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-[#315f7b]">
                      Pendiente de revisión
                    </h3>
                  </div>

                  <span className="rounded-full border border-[#c9ddea] bg-white px-3 py-1.5 text-[10px] font-black text-[#39759a]">
                    En cola
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#315f7b]">
                  El administrador todavía no ha tomado una decisión.
                </p>

                <div className="mt-5 rounded-[18px] border border-[#c9ddea] bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#315f7b]">
                    Nombre de autor
                  </p>

                  <p className="mt-1 font-black text-[#315f7b]">
                    {pending.pen_name}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {latest?.status === "rejected" && (
                  <div className="mt-7 rounded-[20px] border border-[#ead5aa] bg-[#fffaf0] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a682d]">
                      Solicitud anterior
                    </p>

                    <h3 className="mt-2 text-xl font-black text-[#725a30]">
                      Necesitó cambios
                    </h3>

                    {latest.admin_notes && (
                      <p className="mt-3 text-sm leading-6 text-[#806f52]">
                        Nota del administrador: {latest.admin_notes}
                      </p>
                    )}

                    <p className="mt-3 text-sm text-[#8a795d]">
                      Puedes enviar una nueva solicitud.
                    </p>
                  </div>
                )}

                <div className="mt-7 grid gap-6">
                  <div>
                    <label className="text-sm font-black text-[#514841]">
                      Nombre con el que publicarás
                    </label>

                    <input
                      value={penName}
                      onChange={(event) =>
                        setPenName(event.target.value)
                      }
                      placeholder="Nombre o seudónimo"
                      className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-black text-[#514841]">
                        ¿Por qué quieres publicar en SEBORO?
                      </label>

                      <span className="text-[10px] font-bold text-[#aaa099]">
                        {motivation.length} caracteres
                      </span>
                    </div>

                    <textarea
                      value={motivation}
                      onChange={(event) =>
                        setMotivation(event.target.value)
                      }
                      placeholder="Cuéntanos qué tipo de historias quieres compartir..."
                      className="mt-2 min-h-40 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] p-4 text-sm leading-7 outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                    />

                    <p className="mt-2 text-xs text-[#9a9088]">
                      Mínimo 30 caracteres.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-black text-[#514841]">
                      Experiencia escribiendo
                      <span className="ml-2 font-medium text-[#aaa099]">
                        opcional
                      </span>
                    </label>

                    <textarea
                      value={experience}
                      onChange={(event) =>
                        setExperience(event.target.value)
                      }
                      placeholder="Puedes contar si ya has escrito novelas, relatos, fanfiction, blogs, etc."
                      className="mt-2 min-h-32 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] p-4 text-sm leading-7 outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-[#eee8e3] pt-5">
                    <button
                      onClick={submit}
                      disabled={
                        busy ||
                        penName.trim().length < 2 ||
                        motivation.trim().length < 30
                      }
                      className="rounded-[16px] bg-[#39759a] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#2d617f] disabled:opacity-40"
                    >
                      {busy
                        ? "Enviando..."
                        : "Enviar solicitud"}
                    </button>

                    <p className="text-xs leading-5 text-[#9a9088]">
                      La solicitud será revisada antes de habilitar las herramientas de autor.
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
