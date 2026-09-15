export default function Loading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center bg-[#f4f1ea] text-[#25231f]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d8d2c8] border-t-[#2f2d29]" />

        <p className="mt-4 text-sm font-semibold text-[#8b837b]">
          Cargando SEBORO...
        </p>
      </div>
    </div>
  );
}