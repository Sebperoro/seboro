"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Book } from "@/data/books";
import SaveButton from "@/components/SaveButton";
import PurchaseButton from "@/components/PurchaseButton";

export default function PublicBookDetails({ book }: { book: Book }) {
  const [price, setPrice] = useState(book.price);
  const [synopsis, setSynopsis] = useState(book.synopsis);

  useEffect(() => {
    const storedPrice = localStorage.getItem(`seboro-author-price:${book.slug}`);
    const storedSynopsis = localStorage.getItem(`seboro-author-synopsis:${book.slug}`);

    if (storedPrice !== null) {
      const parsed = Number(storedPrice);
      if (!Number.isNaN(parsed) && parsed >= 0) setPrice(parsed);
    }

    if (storedSynopsis) setSynopsis(storedSynopsis);
  }, [book]);

  return (
    <div className="flex flex-col justify-center">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
        <span>{book.genre}</span>
        <span>•</span>
        <span>{book.status}</span>
        <span>•</span>
        <span>{book.chapters.length} capítulos</span>
      </div>

      <h1 className="mt-4 text-4xl font-black md:text-6xl">{book.title}</h1>
      <p className="mt-3 text-lg text-zinc-400">por {book.author}</p>

      <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
        {synopsis}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <span className="text-lg text-amber-300">★ {book.rating} / 5</span>
        <span className="text-zinc-500">•</span>
        <span className="text-lg font-semibold">
          {price > 0 ? `$${price} MXN` : "Gratis"}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PurchaseButton slug={book.slug} price={price} />

        <Link
          href={`/leer/${book.slug}`}
          className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white hover:border-white/30"
        >
          Comenzar a leer
        </Link>

        <SaveButton slug={book.slug} />

        <Link
          href={`/comunidad/${book.slug}`}
          className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white hover:border-white/30"
        >
          Ver comunidad
        </Link>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Las compras de esta versión son simuladas y no realizan cobros reales.
      </p>
    </div>
  );
}
