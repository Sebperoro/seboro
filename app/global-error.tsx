"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="m-0 bg-[#0a0a0b] font-sans text-white">
        <main className="flex min-h-screen items-center justify-center px-5">
          <div className="max-w-xl text-center">
            <p className="text-sm tracking-[0.25em] text-zinc-500">SEBORO</p>
            <h1 className="mt-4 text-4xl font-black">
              No pudimos cargar SEBORO
            </h1>
            <p className="mt-4 leading-7 text-zinc-400">
              Ocurrió un error general. Intenta recargar la aplicación.
            </p>
            <button
              onClick={reset}
              className="mt-6 rounded-full bg-white px-6 py-3 font-bold text-black"
            >
              Volver a intentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
