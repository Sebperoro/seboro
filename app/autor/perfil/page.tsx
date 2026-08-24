"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getMyAuthorProfile,
  saveMyAuthorProfile,
} from "@/lib/authorProfiles";

export default function AuthorProfileEditorPage() {
  const [userId, setUserId] =
    useState<string | null>(null);

  const [penName, setPenName] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [genres, setGenres] =
    useState("");

  const [website, setWebsite] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [allowed, setAllowed] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile =
          await getMyAuthorProfile();

        if (!active) return;

        if (!profile) {
          setAllowed(false);
          return;
        }

        setUserId(profile.user_id);
        setPenName(profile.pen_name);
        setBio(profile.bio);
        setGenres(
          profile.genres.join(", ")
        );
        setWebsite(
          profile.website_url || ""
        );
        setLocation(
          profile.location_text || ""
        );
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
          .map((item) =>
            item.trim()
          ),
        website_url: website,
        location_text: location,
      });

      setMessage(
        "✓ Perfil público actualizado."
      );

      window.dispatchEvent(
        new Event(
          "seboro-profile-updated"
        )
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
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link
          href="/autor"
          className="text-sm font-semibold text-zinc-400"
        >
          ← Panel del autor
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-500">
          Identidad pública
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Perfil de autor
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          Esta información será visible
          para los lectores. No incluye
          correo, métricas privadas,
          ventas ni datos personales de
          tu cuenta.
        </p>

        {loading ? (
          <div className="mt-8 text-zinc-500">
            Cargando...
          </div>
        ) : !allowed ? (
          <div className="mt-8 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-7 text-rose-100">
            Esta sección es exclusiva
            para cuentas de autor o
            administrador.
          </div>
        ) : (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold">
                  Nombre público o
                  seudónimo
                </label>

                <input
                  value={penName}
                  maxLength={60}
                  onChange={(event) =>
                    setPenName(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold">
                  Biografía
                </label>

                <textarea
                  value={bio}
                  maxLength={800}
                  onChange={(event) =>
                    setBio(
                      event.target.value
                    )
                  }
                  placeholder="Cuéntales a los lectores qué escribes y qué te interesa como autor."
                  className="mt-2 min-h-40 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none placeholder:text-zinc-600"
                />

                <p className="mt-2 text-right text-xs text-zinc-600">
                  {bio.length}/800
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Géneros
                </label>

                <input
                  value={genres}
                  onChange={(event) =>
                    setGenres(
                      event.target.value
                    )
                  }
                  placeholder="Misterio, Fantasía, Terror"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-zinc-600"
                />

                <p className="mt-2 text-xs text-zinc-600">
                  Separa los géneros con
                  comas.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Ubicación pública
                </label>

                <input
                  value={location}
                  maxLength={80}
                  onChange={(event) =>
                    setLocation(
                      event.target.value
                    )
                  }
                  placeholder="Guadalajara, México"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-zinc-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold">
                  Sitio web
                </label>

                <input
                  value={website}
                  onChange={(event) =>
                    setWebsite(
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : "Guardar perfil"}
              </button>

              {userId && (
                <Link
                  href={`/autores/${userId}`}
                  className="rounded-full border border-white/15 px-6 py-3 font-semibold"
                >
                  Ver perfil público
                </Link>
              )}
            </div>

            {message && (
              <p className="mt-5 text-sm text-zinc-300">
                {message}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
