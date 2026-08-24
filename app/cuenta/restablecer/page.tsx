"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RestablecerCuentaPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Falta conectar SEBORO con Supabase.");
      setChecking(false);
      return;
    }

    const client = supabase;
    let mounted = true;

    async function detectRecoverySession() {
      // Supabase puede entregar la recuperación por fragmento/hash
      // o por PKCE/código dependiendo de la configuración del proyecto.
      const { data } = await client.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        setReady(true);
        setChecking(false);
        return;
      }

      // onAuthStateChange capturará PASSWORD_RECOVERY cuando Supabase
      // termine de procesar el enlace.
      setChecking(false);
    }

    detectRecoverySession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(Boolean(session));
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: FormEvent) {
    event.preventDefault();

    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Falta conectar SEBORO con Supabase.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setSuccess(true);
      setMessage("Contraseña actualizada correctamente.");
    }

    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav />

      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-7 md:p-10">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Cuenta SEBORO
          </p>

          <h1 className="mt-2 text-4xl font-black md:text-5xl">
            Restablecer contraseña
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Crea una contraseña nueva para volver a acceder a tu biblioteca,
            progreso y perfil.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          {checking ? (
            <p className="text-zinc-400">
              Validando el enlace de recuperación...
            </p>
          ) : success ? (
            <div>
              <p className="text-lg font-bold text-emerald-200">
                Contraseña actualizada.
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Ya puedes iniciar sesión normalmente con tu nueva contraseña.
              </p>

              <Link
                href="/cuenta"
                className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-bold text-black"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : ready ? (
            <form onSubmit={updatePassword}>
              <label className="text-sm font-semibold">
                Nueva contraseña
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-white/25"
                placeholder="Mínimo 6 caracteres"
              />

              <label className="mt-5 block text-sm font-semibold">
                Repite la contraseña
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-white/25"
                placeholder="Repite la contraseña"
              />

              <button
                disabled={busy}
                className="mt-6 rounded-full bg-white px-6 py-3 font-bold text-black disabled:opacity-50"
              >
                {busy ? "Actualizando..." : "Guardar nueva contraseña"}
              </button>

              {message && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  {message}
                </div>
              )}
            </form>
          ) : (
            <div>
              <p className="font-bold">
                El enlace de recuperación no tiene una sesión válida.
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Solicita un enlace nuevo desde la pantalla de inicio de sesión.
                Los enlaces de recuperación caducan y solo deben usarse una vez.
              </p>

              <Link
                href="/cuenta"
                className="mt-6 inline-block rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
              >
                Volver a Cuenta
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
