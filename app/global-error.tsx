"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="m-0 bg-[#f4f1ea] font-sans text-[#25231f]">
        <main className="flex min-h-screen items-center justify-center px-5">
          <div className="w-full max-w-xl rounded-[28px] border border-[#d8d2c8] bg-white p-8 text-center shadow-[0_10px_30px_rgba(56,48,40,0.05)]">
            <p className="text-sm font-black tracking-[0.25em] text-[#8b837b]">
              SEBORO
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em]">
              No pudimos cargar SEBORO
            </h1>

            <p className="mt-4 leading-7 text-[#746d65]">
              Ocurrió un error general. Intenta recargar la aplicación.
            </p>

            <button
              onClick={reset}
              className="mt-6 rounded-full bg-[#2f2d29] px-6 py-3 font-black text-white transition hover:bg-[#1f1e1b]"
            >
              Volver a intentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}