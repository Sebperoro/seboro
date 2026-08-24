"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import TopNav from "@/components/TopNav";
import {
  getMyReaderProfile,
  saveMyReaderProfile,
} from "@/lib/readerProfiles";

export default function EditReaderProfilePage() {
  const [userId, setUserId] =
    useState<string | null>(null);
  const [publicName, setPublicName] =
    useState("");
  const [bio, setBio] =
    useState("");
  const [genres, setGenres] =
    useState("");
  const [isPublic, setIsPublic] =
    useState(true);
  const [showFavorites, setShowFavorites] =
    useState(true);
  const [showFinished, setShowFinished] =
    useState(true);
  const [showReviews, setShowReviews] =
    useState(true);
  const [showActivity, setShowActivity] =
    useState(true);
  const [showHistory, setShowHistory] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile =
          await getMyReaderProfile();

        if (!active) return;

        if (!profile) {
          setMessage(
            "Debes iniciar sesión."
          );
          return;
        }

        setUserId(profile.user_id);
        setPublicName(profile.public_name);
        setBio(profile.bio);
        setGenres(
          profile.favorite_genres.join(
            ", "
          )
        );
        setIsPublic(profile.is_public);
        setShowFavorites(
          profile.show_favorites
        );
        setShowFinished(
          profile.show_finished
        );
        setShowReviews(
          profile.show_reviews
        );
        setShowActivity(
          profile.show_activity
        );
        setShowHistory(
          profile.show_history
        );
      } catch (err) {
        if (active) {
          setMessage(
            err instanceof Error
              ? err.message
              : "No se pudo cargar."
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

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      await saveMyReaderProfile({
        public_name: publicName,
        bio,
        favorite_genres: genres
          .split(",")
          .map((item) =>
            item.trim()
          ),
        is_public: isPublic,
        show_favorites: showFavorites,
        show_finished: showFinished,
        show_reviews: showReviews,
        show_activity: showActivity,
        show_history: showHistory,
      });

      setMessage(
        "✓ Perfil y privacidad guardados."
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

  const privacyOptions = [
    {
      label: "Mostrar favoritas",
      description:
        "Permite que otros vean las obras que marcaste como favoritas.",
      value: showFavorites,
      set: setShowFavorites,
    },
    {
      label: "Mostrar obras terminadas",
      description:
        "Comparte qué historias has terminado.",
      value: showFinished,
      set: setShowFinished,
    },
    {
      label: "Mostrar críticas",
      description:
        "Tus críticas escritas aparecerán en tu perfil.",
      value: showReviews,
      set: setShowReviews,
    },
    {
      label: "Mostrar actividad en comunidad",
      description:
        "Enlaza tus comentarios y respuestas públicas recientes.",
      value: showActivity,
      set: setShowActivity,
    },
    {
      label: "Mostrar historial reciente",
      description:
        "Esta opción es privada por defecto. Actívala solo si quieres compartir las obras que has abierto recientemente.",
      value: showHistory,
      set: setShowHistory,
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <Link
          href="/perfil"
          className="text-sm font-semibold text-zinc-400"
        >
          ← Mi perfil
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-500">
          Identidad y privacidad
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Perfil público de lector
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          Tú decides qué partes de tu
          actividad aparecen públicamente.
          Tu correo, datos de pago y métricas
          privadas nunca se muestran aquí.
        </p>

        {loading ? (
          <div className="mt-8 text-zinc-500">
            Cargando...
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold">
                    Nombre público
                  </label>

                  <input
                    value={publicName}
                    maxLength={60}
                    onChange={(event) =>
                      setPublicName(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Sobre mí
                  </label>

                  <textarea
                    value={bio}
                    maxLength={800}
                    onChange={(event) =>
                      setBio(
                        event.target.value
                      )
                    }
                    placeholder="Cuéntales a otros lectores qué historias buscas o qué te gusta leer."
                    className="mt-2 min-h-36 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none placeholder:text-zinc-600"
                  />

                  <p className="mt-2 text-right text-xs text-zinc-600">
                    {bio.length}/800
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Géneros favoritos
                  </label>

                  <input
                    value={genres}
                    onChange={(event) =>
                      setGenres(
                        event.target.value
                      )
                    }
                    placeholder="Misterio, Fantasía, Romance"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-zinc-600"
                  />

                  <p className="mt-2 text-xs text-zinc-600">
                    Separa los géneros con
                    comas.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Perfil público
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Si lo desactivas, otros
                    usuarios no podrán ver tu
                    perfil aunque conserves
                    todos tus datos.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setIsPublic(
                      (value) => !value
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    isPublic
                      ? "bg-emerald-200 text-emerald-950"
                      : "border border-white/15 text-zinc-300"
                  }`}
                >
                  {isPublic
                    ? "Público"
                    : "Privado"}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {privacyOptions.map(
                  (option) => (
                    <div
                      key={option.label}
                      className="flex items-start justify-between gap-5 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {option.label}
                        </p>

                        <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
                          {
                            option.description
                          }
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          option.set(
                            !option.value
                          )
                        }
                        disabled={!isPublic}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-30 ${
                          option.value
                            ? "bg-white text-black"
                            : "border border-white/15 text-zinc-400"
                        }`}
                      >
                        {option.value
                          ? "Visible"
                          : "Oculto"}
                      </button>
                    </div>
                  )
                )}
              </div>
            </section>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

              {userId && (
                <Link
                  href={`/usuarios/${userId}`}
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
          </>
        )}
      </div>
    </main>
  );
}
