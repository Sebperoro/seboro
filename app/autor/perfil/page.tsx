"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  getMyAuthorProfile,
  saveMyAuthorProfile,
} from "@/lib/authorProfiles";

export default function AuthorProfileEditorPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [penName, setPenName] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile = await getMyAuthorProfile();

        if (!active) return;

        if (!profile) {
          setAllowed(false);
          return;
        }

        setUserId(profile.user_id);
        setPenName(profile.pen_name);
        setBio(profile.bio);
        setGenres(profile.genres.join(", "));
        setWebsite(profile.website_url || "");
        setLocation(profile.location_text || "");
      } catch (err) {
        if (active) {
          setMessage(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el perfil."
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

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      await saveMyAuthorProfile({
        pen_name: penName,
        bio,
        genres: genres
          .split(",")
          .map((item) => item.trim()),
        website_url: website,
        location_text: location,
      });

      setMessage("✓ Perfil público actualizado.");

      window.dispatchEvent(
        new Event("seboro-profile-updated")
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 pb-16 pt-7 md:px-8">
        <Link
          href="/autor"
          className="inline-flex items-center gap-2 text-sm font-black text-[#877a72] transition hover:text-[#d96822]"
        >
          ← Panel del autor
        </Link>

        <section className="mt-4 overflow-hidden rounded-[30px] border border-[#ebcdb8] bg-gradient-to-br from-white via-[#fffaf6] to-[#fff0e5] px-6 py-7 shadow-[0_10px_30px_rgba(217,104,34,0.04)] md:px-8 md:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d96822]">
                  SEBORO · IDENTIDAD PÚBLICA
                </p>

                <span className="rounded-full border border-[#ebcdb8] bg-white/85 px-3 py-1 text-[9px] font-black text-[#b95016]">
                  Perfil de autor
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                Tu identidad como autor
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7f756e] md:text-base">
                Esta información será visible para los lectores. Tu correo,
                métricas privadas, ventas y datos personales de la cuenta no
                aparecen aquí.
              </p>
            </div>

            {userId && (
              <Link
                href={`/autores/${userId}`}
                className="inline-flex w-fit items-center justify-center rounded-full border border-[#ebcdb8] bg-white px-5 py-2.5 text-sm font-black text-[#b95016] transition hover:bg-[#fff5ee]"
              >
                Ver perfil público →
              </Link>
            )}
          </div>
        </section>

        {loading ? (
          <section className="mt-6 rounded-[24px] border border-[#e4ddd7] bg-white p-7">
            <div className="h-5 w-44 animate-pulse rounded-full bg-[#eee9e5]" />
            <div className="mt-5 h-48 animate-pulse rounded-[20px] bg-[#f5f2ef]" />
          </section>
        ) : !allowed ? (
          <section className="mt-6 rounded-[24px] border border-[#efc1b9] bg-[#fff2ef] p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#a34d43]">
              Acceso restringido
            </p>
            <h2 className="mt-2 text-xl font-black text-[#7f3f38]">
              Esta sección es exclusiva para autores
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#8a625d]">
              Necesitas una cuenta con rol de autor o administrador para editar
              esta identidad pública.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-[26px] border border-[#e4ddd7] bg-white p-6 shadow-[0_8px_24px_rgba(64,43,29,0.035)] md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d96822]">
                    Presentación pública
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Cómo te verán los lectores
                  </h2>
                </div>

                <span className="rounded-full border border-[#e4ddd7] bg-[#faf9f7] px-3 py-1.5 text-[10px] font-black text-[#80766f]">
                  Datos públicos
                </span>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-black text-[#514841]">
                    Nombre público o seudónimo
                  </label>

                  <input
                    value={penName}
                    maxLength={60}
                    onChange={(event) =>
                      setPenName(event.target.value)
                    }
                    placeholder="Nombre con el que quieres publicar"
                    className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-black text-[#514841]">
                      Biografía
                    </label>

                    <span className="text-[10px] font-bold text-[#aaa099]">
                      {bio.length}/800
                    </span>
                  </div>

                  <textarea
                    value={bio}
                    maxLength={800}
                    onChange={(event) =>
                      setBio(event.target.value)
                    }
                    placeholder="Cuéntales a los lectores qué escribes y qué te interesa como autor."
                    className="mt-2 min-h-40 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] p-4 text-sm leading-7 outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                  />
                </div>

                <div>
                  <label className="text-sm font-black text-[#514841]">
                    Géneros
                  </label>

                  <input
                    value={genres}
                    onChange={(event) =>
                      setGenres(event.target.value)
                    }
                    placeholder="Misterio, Fantasía, Terror"
                    className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                  />

                  <p className="mt-2 text-xs text-[#9a9088]">
                    Separa los géneros con comas.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-black text-[#514841]">
                    Ubicación pública
                  </label>

                  <input
                    value={location}
                    maxLength={80}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    placeholder="Guadalajara, México"
                    className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                  />

                  <p className="mt-2 text-xs text-[#9a9088]">
                    Opcional. Solo se mostrará lo que escribas aquí.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-black text-[#514841]">
                    Sitio web
                  </label>

                  <input
                    value={website}
                    onChange={(event) =>
                      setWebsite(event.target.value)
                    }
                    placeholder="https://..."
                    className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                  />
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-full bg-[#d96822] px-6 py-3 text-sm font-black text-white transition hover:bg-[#b95016] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving
                    ? "Guardando..."
                    : "Guardar perfil"}
                </button>

                {userId && (
                  <Link
                    href={`/autores/${userId}`}
                    className="rounded-full border border-[#ebcdb8] bg-[#fffaf6] px-6 py-3 text-sm font-black text-[#b95016] transition hover:bg-[#fff3ea]"
                  >
                    Ver perfil público
                  </Link>
                )}
              </div>

              {message && (
                <div className="mt-5 rounded-[16px] border border-[#c5dfcf] bg-[#eef8f1] p-4 text-sm font-bold text-[#397053]">
                  {message}
                </div>
              )}
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91867e]">
                  Visible
                </p>
                <p className="mt-2 text-lg font-black">
                  Nombre y biografía
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8a8078]">
                  La base de tu identidad pública dentro de SEBORO.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7d7169]">
                  Contexto
                </p>
                <p className="mt-2 text-lg font-black">
                  Géneros y ubicación
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8a8078]">
                  Ayudan a que los lectores entiendan mejor quién eres.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#e4ddd7] bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5b5048]">
                  Privado
                </p>
                <p className="mt-2 text-lg font-black">
                  Cuenta y ventas
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8a8078]">
                  Correo, ingresos y métricas internas no forman parte del perfil.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
