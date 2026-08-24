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
        setMessage("Cuenta creada. Revisa tu correo para confirmar el registro.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setMessage(error ? error.message : "Sesión iniciada correctamente.");
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
      // Mensaje neutro para no revelar si un correo existe o no.
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
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-7 md:p-10">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Cuenta SEBORO
          </p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">
            {currentEmail ? "Tu sesión está activa." : "Entra a tu biblioteca personal."}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Con una cuenta, la biblioteca y el progreso pueden pertenecer a un usuario real en lugar de depender únicamente de este navegador.
          </p>
        </section>

        {!configured ? (
          <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            <h2 className="text-xl font-bold">Todavía falta conectar Supabase</h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/80">
              El código ya está preparado. Falta agregar el Project URL y la Publishable key en el archivo .env.local.
            </p>
          </div>
        ) : currentEmail ? (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-500">Sesión iniciada como</p>
            <p className="mt-2 text-xl font-bold">{currentEmail}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/biblioteca"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
              >
                Abrir mi biblioteca
              </a>
              <button
                onClick={signOut}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
              >
                Cerrar sesión
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Acceso
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
              </h2>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    setMode("signin");
                    setMessage("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    mode === "signin" ? "bg-white text-black" : "border border-white/10"
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setMode("signup");
                    setMessage("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    mode === "signup" ? "bg-white text-black" : "border border-white/10"
                  }`}
                >
                  Registrarme
                </button>
              </div>
            </div>

            <form
              onSubmit={submit}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              <label className="text-sm font-semibold">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-white/25"
                placeholder="tu@correo.com"
              />

              <label className="mt-5 block text-sm font-semibold">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-white/25"
                placeholder="Mínimo 6 caracteres"
              />

              <button
                disabled={busy}
                className="mt-6 rounded-full bg-white px-6 py-3 font-bold text-black disabled:opacity-50"
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
                  className="ml-3 mt-6 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                >
                  {recoveryBusy
                    ? "Enviando..."
                    : "Olvidé mi contraseña"}
                </button>
              )}

              {message && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  {message}
                </div>
              )}
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
