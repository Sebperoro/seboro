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
    <main className="min-h-screen bg-[#f5f5f7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-7 md:px-8">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-2 text-sm font-black text-[#7f7a83] transition hover:text-[#4a3273]"
        >
          ← Mi perfil
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          {/* Identidad: bloque suave gris/lavanda, sin repetir negro */}
          <section className="rounded-[30px] border border-[#dcd8e7] bg-gradient-to-br from-[#fbfaff] via-[#f7f5fb] to-[#eeedf5] p-6 shadow-[0_14px_35px_rgba(74,61,94,0.06)] md:p-8">
            <div className="sticky top-28">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#5b3f8c]">
                  SEBORO · IDENTIDAD
                </p>

                <span className="rounded-full border border-[#d8d1e6] bg-white/80 px-3 py-1 text-[9px] font-black text-[#5b3f8c]">
                  Lector
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.045em]">
                Tu perfil, a tu manera.
              </h1>

              <p className="mt-4 text-sm leading-7 text-[#756e7d]">
                Define cómo te presentas ante otros lectores y decide qué partes
                de tu actividad quieres compartir.
              </p>

              <div className="mt-7 rounded-[20px] border border-white/80 bg-white/70 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a8291]">
                  Siempre privado
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    "Correo y acceso",
                    "Datos de pago",
                    "Métricas internas",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-bold text-[#5f5965]"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ebe7f3] text-[10px] font-black text-[#5b3f8c]">
                        ✓
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {userId && (
                <Link
                  href={`/usuarios/${userId}`}
                  className="mt-5 inline-flex rounded-[15px] border border-[#cfc6de] bg-white px-5 py-3 text-sm font-black text-[#4a3273] transition hover:bg-[#faf8fd]"
                >
                  Ver perfil público →
                </Link>
              )}
            </div>
          </section>

          <div className="space-y-6">
            {loading ? (
              <section className="rounded-[26px] border border-[#dedde3] bg-white p-7">
                <div className="h-5 w-40 animate-pulse rounded-full bg-[#ecebf0]" />
                <div className="mt-5 h-52 animate-pulse rounded-[20px] bg-[#f5f4f7]" />
              </section>
            ) : (
              <>
                <section className="rounded-[26px] border border-[#dedde3] bg-white p-6 shadow-[0_8px_24px_rgba(70,64,80,0.035)] md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5b3f8c]">
                        Presentación
                      </p>

                      <h2 className="mt-1 text-2xl font-black">
                        Información pública
                      </h2>
                    </div>

                    <span className="rounded-full border border-[#e1dce9] bg-[#faf8fd] px-3 py-1.5 text-[10px] font-black text-[#7d6c95]">
                      Editable
                    </span>
                  </div>

                  <div className="mt-6 space-y-6">
                    <div>
                      <label className="text-sm font-black text-[#514c55]">
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
                        className="mt-2 w-full rounded-[16px] border border-[#dcd9e1] bg-[#fdfcff] px-4 py-3 text-sm outline-none transition focus:border-[#aa98c7]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-black text-[#514c55]">
                          Sobre mí
                        </label>

                        <span className="text-[10px] font-bold text-[#aaa4ae]">
                          {bio.length}/800
                        </span>
                      </div>

                      <textarea
                        value={bio}
                        maxLength={800}
                        onChange={(event) =>
                          setBio(
                            event.target.value
                          )
                        }
                        placeholder="Cuéntales a otros lectores qué historias buscas o qué te gusta leer."
                        className="mt-2 min-h-36 w-full rounded-[16px] border border-[#dcd9e1] bg-[#fdfcff] p-4 text-sm leading-7 outline-none transition placeholder:text-[#aaa4ae] focus:border-[#aa98c7]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-black text-[#514c55]">
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
                        className="mt-2 w-full rounded-[16px] border border-[#dcd9e1] bg-[#fdfcff] px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa4ae] focus:border-[#aa98c7]"
                      />

                      <p className="mt-2 text-xs text-[#98919b]">
                        Separa los géneros con comas.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[26px] border border-[#d9e2e8] bg-[#f7fbfd] p-6 md:p-8">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#428397]">
                        Privacidad
                      </p>

                      <h2 className="mt-1 text-2xl font-black">
                        Decide qué pueden ver
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-[#6f8188]">
                        Si desactivas el perfil público, los demás usuarios no
                        podrán ver tu perfil aunque tus datos sigan guardados.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setIsPublic(
                          (value) => !value
                        )
                      }
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                        isPublic
                          ? "bg-[#428397] text-white"
                          : "border border-[#bfcfd6] bg-white text-[#667981]"
                      }`}
                    >
                      {isPublic
                        ? "Perfil público"
                        : "Perfil privado"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {privacyOptions.map(
                      (option) => (
                        <div
                          key={option.label}
                          className="grid gap-4 rounded-[18px] border border-[#dce6ea] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div>
                            <p className="font-black text-[#3f4f55]">
                              {option.label}
                            </p>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#77888e]">
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
                            className={`w-fit rounded-full px-3 py-1.5 text-xs font-black transition disabled:opacity-30 ${
                              option.value
                                ? "bg-[#e7f2f5] text-[#356d7d]"
                                : "border border-[#ccd9de] bg-white text-[#7f8d92]"
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

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-[16px] bg-[#d96822] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#be5717] disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>

                  <Link
                    href="/perfil"
                    className="rounded-[16px] border border-[#d8d3de] bg-white px-6 py-3.5 text-sm font-black text-[#6e6773] transition hover:bg-[#faf9fb]"
                  >
                    Volver al perfil
                  </Link>
                </div>

                {message && (
                  <div className="rounded-[16px] border border-[#d9e2e8] bg-white p-4 text-sm font-bold text-[#667981]">
                    {message}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
