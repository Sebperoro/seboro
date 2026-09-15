"use client";

import { FormEvent, useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CuentaPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setConfigured(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentEmail(session?.user.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Falta conectar SEBORO con Supabase.");
      return;
    }

    setBusy(true);
    setMessage("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        setMessage("Cuenta creada. Ya has iniciado sesión.");
      } else {
        setMessage(
          "Cuenta creada. Revisa tu correo para confirmar el registro."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setMessage(
        error
          ? error.message
          : "Sesión iniciada correctamente."
      );
    }

    setBusy(false);
  }

  async function sendPasswordRecovery() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Falta conectar SEBORO con Supabase.");
      return;
    }

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage("Escribe primero el correo de tu cuenta.");
      return;
    }

    setRecoveryBusy(true);
    setMessage("");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/cuenta/restablecer`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(
      cleanEmail,
      redirectTo ? { redirectTo } : undefined
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña."
      );
    }

    setRecoveryBusy(false);
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    setCurrentEmail(null);
    setMessage("Sesión cerrada.");
  }

  return (
    <main className="min-h-screen bg-[#f6f3ef] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-8">
        {!configured ? (
          <section className="mx-auto max-w-3xl rounded-[28px] border border-[#ead5aa] bg-[#fffaf0] p-7 md:p-9">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a682d]">
              Configuración pendiente
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Todavía falta conectar Supabase
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#806f52]">
              El código ya está preparado. Falta agregar el Project URL y la
              Publishable key en el archivo .env.local.
            </p>
          </section>
        ) : currentEmail ? (
          <div className="grid overflow-hidden rounded-[32px] border border-[#ded6cf] bg-white shadow-[0_20px_50px_rgba(62,45,34,0.08)] lg:grid-cols-[0.85fr_1.15fr]">
            <section className="relative overflow-hidden bg-[#24201d] p-8 text-white md:p-10">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d96822]/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#f0a06b]/10 blur-3xl" />

              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2a36f]">
                  SEBORO · CUENTA
                </p>

                <h1 className="mt-4 max-w-lg text-4xl font-black tracking-[-0.045em] md:text-5xl">
                  Tu cuenta está conectada.
                </h1>

                <p className="mt-4 max-w-lg text-sm leading-7 text-[#c9beb6]">
                  Desde aquí se sincronizan tu biblioteca, progreso, perfil y
                  preferencias entre dispositivos.
                </p>

                <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.05] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9f928a]">
                    Sesión iniciada como
                  </p>

                  <p className="mt-2 break-all text-lg font-black">
                    {currentEmail}
                  </p>
                </div>
              </div>
            </section>

            <section className="p-8 md:p-10">
              <div className="max-w-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#d96822]">
                  Acceso personal
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">
                  Continúa donde lo dejaste
                </h2>

                <p className="mt-3 text-sm leading-7 text-[#81766e]">
                  Tu cuenta mantiene sincronizada tu experiencia de lectura.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <a
                    href="/biblioteca"
                    className="rounded-[18px] bg-[#d96822] px-5 py-4 text-center text-sm font-black text-white transition hover:bg-[#b95016]"
                  >
                    Abrir mi biblioteca
                  </a>

                  <button
                    onClick={signOut}
                    className="rounded-[18px] border border-[#ddd5cf] bg-[#faf8f6] px-5 py-4 text-sm font-black text-[#625851] transition hover:border-[#cbbdb3] hover:bg-white"
                  >
                    Cerrar sesión
                  </button>
                </div>

                {message && (
                  <div className="mt-5 rounded-[16px] border border-[#d7e0d9] bg-[#f2f8f3] p-4 text-sm font-bold text-[#486b55]">
                    {message}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid overflow-hidden rounded-[32px] border border-[#ded6cf] bg-white shadow-[0_20px_55px_rgba(62,45,34,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
            {/* Lado visual: distinto al resto del sitio */}
            <section className="relative order-2 min-h-0 overflow-hidden bg-[#24201d] p-8 text-white md:p-10 lg:order-1 lg:min-h-[560px]">
              <div className="absolute inset-0">
                <div className="absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full bg-[#d96822]/25 blur-3xl" />
                <div className="absolute bottom-[-100px] left-[-70px] h-72 w-72 rounded-full bg-[#8f4e2d]/20 blur-3xl" />
              </div>

              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2a36f]">
                    SEBORO · TU ESPACIO
                  </p>

                  <h1 className="mt-4 max-w-lg text-4xl font-black tracking-[-0.05em] md:text-6xl">
                    Tu biblioteca viaja contigo.
                  </h1>

                  <p className="mt-5 max-w-lg text-sm leading-7 text-[#c9beb6] md:text-base">
                    Guarda historias, continúa lecturas y conserva tu identidad
                    de lector desde cualquier dispositivo.
                  </p>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {[
                    ["01", "Biblioteca sincronizada"],
                    ["02", "Progreso guardado"],
                    ["03", "Perfil y comunidad"],
                  ].map(([number, label]) => (
                    <div
                      key={number}
                      className="rounded-[18px] border border-white/10 bg-white/[0.05] p-4"
                    >
                      <p className="text-[9px] font-black text-[#f2a36f]">
                        {number}
                      </p>

                      <p className="mt-2 text-sm font-black text-white">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Lado funcional */}
            <section className="order-1 p-7 md:p-10 lg:order-2 lg:p-12">
              <div className="mx-auto max-w-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#d96822]">
                      Acceso
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                      {mode === "signin"
                        ? "Bienvenido de nuevo"
                        : "Crea tu cuenta"}
                    </h2>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 rounded-[16px] bg-[#f2eeea] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setMessage("");
                    }}
                    className={`rounded-[13px] px-4 py-2.5 text-sm font-black transition ${
                      mode === "signin"
                        ? "bg-white text-[#2b2521] shadow-sm"
                        : "text-[#8a8078]"
                    }`}
                  >
                    Entrar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                    className={`rounded-[13px] px-4 py-2.5 text-sm font-black transition ${
                      mode === "signup"
                        ? "bg-white text-[#2b2521] shadow-sm"
                        : "text-[#8a8078]"
                    }`}
                  >
                    Registrarme
                  </button>
                </div>

                <form onSubmit={submit} className="mt-7">
                  <label className="text-sm font-black text-[#514841]">
                    Correo
                  </label>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                    placeholder="tu@correo.com"
                  />

                  <label className="mt-5 block text-sm font-black text-[#514841]">
                    Contraseña
                  </label>

                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                    placeholder="Mínimo 6 caracteres"
                  />

                  <button
                    disabled={busy}
                    className="mt-6 w-full rounded-[16px] bg-[#d96822] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#b95016] disabled:opacity-50"
                  >
                    {busy
                      ? "Procesando..."
                      : mode === "signin"
                      ? "Iniciar sesión"
                      : "Crear cuenta"}
                  </button>

                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={sendPasswordRecovery}
                      disabled={recoveryBusy}
                      className="mt-3 w-full rounded-[16px] border border-[#ddd5cf] bg-[#faf8f6] px-5 py-3.5 text-sm font-black text-[#6f655e] transition hover:bg-white disabled:opacity-50"
                    >
                      {recoveryBusy
                        ? "Enviando..."
                        : "Olvidé mi contraseña"}
                    </button>
                  )}

                  {message && (
                    <div className="mt-5 rounded-[16px] border border-[#e4ddd7] bg-[#faf8f6] p-4 text-sm font-bold leading-6 text-[#6f655e]">
                      {message}
                    </div>
                  )}
                </form>

                <p className="mt-7 text-center text-xs leading-5 text-[#9a9088]">
                  Tu correo y contraseña nunca forman parte de tu perfil público.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
