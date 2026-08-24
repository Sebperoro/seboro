export default function Loading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center bg-[#0a0a0b] text-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white" />
        <p className="mt-4 text-sm text-zinc-500">
          Cargando SEBORO...
        </p>
      </div>
    </div>
  );
}
