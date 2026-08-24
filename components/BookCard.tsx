import Link from "next/link";
import type { Book } from "@/data/books";

export default function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/obra/${book.slug}`} className="group min-w-[180px] max-w-[180px]">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-white/25"
        style={{ background: book.cover }}
      >
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 pt-14">
          <p className="text-xs uppercase tracking-[0.2em] text-white/65">{book.genre}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-white">{book.title}</h3>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-zinc-400">{book.author}</p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-amber-300">★ {book.rating}</span>
          <span className="text-zinc-500">{book.status}</span>
        </div>
      </div>
    </Link>
  );
}
