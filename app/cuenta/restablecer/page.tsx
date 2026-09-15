"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const RECOVERY_FLAG_KEY = "seboro-password-recovery-active";
const RECOVERY_CHECK_TIMEOUT_MS = 2000;

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

    // Un link de recuperación inválido o expirado siempre vuelve con
    // #error=... en el hash, y Supabase no crea ninguna sesión para ese
    // caso. Si está presente, no hay nada que evaluar: una sesión ambiente
    // de un login normal ya activo en este navegador NO cuenta como una
    // recuperación válida para este link.
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );

    if (hashParams.get("error")) {
      setChecking(false);
      setReady(false);
      return;
    }

    const client = supabase;
    let mounted = true;
    let resolved = false;

    function markResolved(isReady: boolean) {
      if (!mounted || resolved) return;
      resolved = true;
      setReady(isReady);
      setChecking(false);
    }

    // Solo el evento PASSWORD_RECOVERY confirma que la sesión activa
    // proviene de este link — no basta con "existe alguna sesión", que es
    // lo que causaba el bug original.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        try {
          sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
        } catch {
          // sessionStorage puede no estar disponible (modo privado, etc.);
          // solo se pierde la resiliencia a un refresh, no es crítico.
        }

        markResolved(Boolean(session));
      }
    });

    // Si el usuario recarga la pestaña a mitad del flujo, Supabase ya
    // limpió el hash y PASSWORD_RECOVERY no vuelve a dispararse — solo
    // queda la sesión persistida. La marca en sessionStorage (acotada a
    // esta pestaña, se borra al cerrarla) confirma que esa sesión sí pasó
    // por una recuperación real en algún momento, sin volver a confiar en
    // cualquier sesión ambiente de otro contexto.
    async function checkRefreshedRecovery() {
      let hasFlag = false;

      try {
        hasFlag = sessionStorage.getItem(RECOVERY_FLAG_KEY) === "1";
      } catch {
        hasFlag = false;
      }

      if (!hasFlag) return;

      const { data } = await client.auth.getSession();

      if (data.session) {
        markResolved(true);
      }
    }

    checkRefreshedRecovery();

    const timeout = window.setTimeout(() => {
      markResolved(false);
    }, RECOVERY_CHECK_TIMEOUT_MS);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
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
    <main className="min-h-screen bg-[#f6f3ef] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8">
        <div className="grid overflow-hidden rounded-[32px] border border-[#ded6cf] bg-white shadow-[0_20px_55px_rgba(62,45,34,0.08)] lg:grid-cols-[0.8fr_1.2fr]">
          <section className="relative overflow-hidden bg-[#2a2521] p-8 text-white md:p-10">
            <div className="absolute -right-20 top-[-60px] h-64 w-64 rounded-full bg-[#d96822]/20 blur-3xl" />
            <div className="absolute -bottom-20 left-[-80px] h-64 w-64 rounded-full bg-[#8f4e2d]/15 blur-3xl" />

            <div className="relative flex h-full min-h-[420px] flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2a36f]">
                  SEBORO · SEGURIDAD
                </p>

                <h1 className="mt-4 max-w-md text-4xl font-black tracking-[-0.05em] md:text-5xl">
                  Recupera el acceso sin perder tu historia.
                </h1>

                <p className="mt-4 max-w-md text-sm leading-7 text-[#c9beb6]">
                  Cambia tu contraseña y vuelve a tu biblioteca, progreso y perfil
                  sin alterar el resto de tu cuenta.
                </p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.05] p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9f928a]">
                  Seguridad de cuenta
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  Los enlaces de recuperación son temporales y de un solo uso.
                </p>
              </div>
            </div>
          </section>

          <section className="p-7 md:p-10 lg:p-12">
            <div className="mx-auto max-w-lg">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#d96822]">
                Restablecer acceso
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                Nueva contraseña
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#81766e]">
                Elige una contraseña nueva para volver a entrar normalmente a tu cuenta.
              </p>

              <div className="mt-7">
                {checking ? (
                  <div className="rounded-[18px] border border-[#e4ddd7] bg-[#faf8f6] p-5 text-sm font-bold text-[#746a63]">
                    Validando el enlace de recuperación...
                  </div>
                ) : success ? (
                  <div>
                    <div className="rounded-[20px] border border-[#c5dfcf] bg-[#eef8f1] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#397053]">
                        Contraseña actualizada
                      </p>

                      <h3 className="mt-2 text-xl font-black text-[#345e46]">
                        Ya puedes volver a entrar
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#668071]">
                        Tu nueva contraseña ya está activa.
                      </p>
                    </div>

                    <Link
                      href="/cuenta"
                      className="mt-5 inline-flex rounded-[16px] bg-[#d96822] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#b95016]"
                    >
                      Volver a iniciar sesión
                    </Link>
                  </div>
                ) : ready ? (
                  <form onSubmit={updatePassword}>
                    <label className="text-sm font-black text-[#514841]">
                      Nueva contraseña
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

                    <label className="mt-5 block text-sm font-black text-[#514841]">
                      Repite la contraseña
                    </label>

                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="mt-2 w-full rounded-[16px] border border-[#ddd6d0] bg-[#fffefd] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a985]"
                      placeholder="Repite la contraseña"
                    />

                    <button
                      disabled={busy}
                      className="mt-6 w-full rounded-[16px] bg-[#d96822] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#b95016] disabled:opacity-50"
                    >
                      {busy
                        ? "Actualizando..."
                        : "Guardar nueva contraseña"}
                    </button>

                    {message && (
                      <div className="mt-5 rounded-[16px] border border-[#e4ddd7] bg-[#faf8f6] p-4 text-sm font-bold leading-6 text-[#6f655e]">
                        {message}
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="rounded-[20px] border border-[#ead5aa] bg-[#fffaf0] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a682d]">
                      Enlace inválido
                    </p>

                    <h3 className="mt-2 text-xl font-black text-[#725a30]">
                      Este enlace ya no tiene una sesión válida
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#806f52]">
                      Solicita uno nuevo desde la pantalla de inicio de sesión.
                      Los enlaces caducan y solo deben utilizarse una vez.
                    </p>

                    <Link
                      href="/cuenta"
                      className="mt-5 inline-flex rounded-[15px] border border-[#dec99c] bg-white px-5 py-3 text-sm font-black text-[#80642c] transition hover:bg-[#fffdf8]"
                    >
                      Volver a Cuenta
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-[#eee8e3] pt-5">
                <p className="text-xs leading-5 text-[#9a9088]">
                  Cambiar la contraseña no modifica tu biblioteca, perfil ni progreso de lectura.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
