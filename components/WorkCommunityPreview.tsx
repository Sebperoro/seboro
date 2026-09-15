"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCommunitySnapshot,
  type CommunitySnapshot,
} from "@/lib/community";

type Props = {
  slug: string;
  ratingAvg: number | null;
  ratingCount: number;
};

const EMPTY: CommunitySnapshot = {
  posts: [],
  replies: [],
  reactions: [],
  currentUserId: null,
};

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function excerpt(value: string, length = 220) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= length
    ? clean
    : `${clean.slice(0, length).trim()}…`;
}

export default function WorkCommunityPreview({
  slug,
  ratingAvg,
  ratingCount,
}: Props) {
  const [snapshot, setSnapshot] = useState<CommunitySnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getCommunitySnapshot(slug);
        if (active) setSnapshot(result);
      } catch {
        if (active) setSnapshot(EMPTY);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [slug]);

  const replyCountByPost = useMemo(() => {
    const map = new Map<string, number>();

    snapshot.replies.forEach((reply) => {
      map.set(
        reply.post_id,
        (map.get(reply.post_id) || 0) + 1
      );
    });

    return map;
  }, [snapshot.replies]);

  const reactionCountByPost = useMemo(() => {
    const map = new Map<string, number>();

    snapshot.reactions.forEach((reaction) => {
      map.set(
        reaction.post_id,
        (map.get(reaction.post_id) || 0) + 1
      );
    });

    return map;
  }, [snapshot.reactions]);

  function score(postId: string) {
    return (
      (replyCountByPost.get(postId) || 0) * 2 +
      (reactionCountByPost.get(postId) || 0)
    );
  }

  const featuredCritiques = useMemo(
    () =>
      snapshot.posts
        .filter(
          (post) =>
            post.branch === "criticas" &&
            !post.spoiler
        )
        .sort((a, b) => {
          const diff = score(b.id) - score(a.id);
          if (diff !== 0) return diff;

          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        })
        .slice(0, 2),
    [
      snapshot.posts,
      replyCountByPost,
      reactionCountByPost,
    ]
  );

  const featuredConversations = useMemo(
    () =>
      snapshot.posts
        .filter(
          (post) =>
            post.branch !== "criticas" &&
            !post.spoiler
        )
        .sort((a, b) => {
          const diff = score(b.id) - score(a.id);
          if (diff !== 0) return diff;

          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        })
        .slice(0, 2),
    [
      snapshot.posts,
      replyCountByPost,
      reactionCountByPost,
    ]
  );

  const hasAnything =
    ratingCount > 0 ||
    featuredCritiques.length > 0 ||
    featuredConversations.length > 0;

  return (
    <section className="mt-5 rounded-[20px] border border-[#ddd5cf] bg-white p-4 shadow-[0_8px_20px_rgba(62,45,34,0.03)] md:mt-8 md:rounded-[24px] md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5b3f8c]">
            Lectores y comunidad
          </p>

          <h2 className="mt-1.5 text-xl font-black tracking-[-0.025em] text-[#2d2723] md:text-2xl">
            ¿Qué están diciendo de esta historia?
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#847a73]">
            Primero conoce la obra. Después, si quieres, consulta críticas y conversaciones de otros lectores.
          </p>
        </div>

        <Link
          href={`/comunidad/${slug}`}
          className="w-fit shrink-0 rounded-full border border-[#b79bde] bg-[#f4eefc] px-4 py-2 text-sm font-black text-[#4a3273] transition hover:border-[#9c7cc4] hover:bg-[#efe6fa] hover:text-[#3d2860]"
        >
          Ver toda la comunidad →
        </Link>
      </div>

      <div className="mt-4 rounded-[16px] border border-[#eadfce] bg-[#fffaf2] px-4 py-3">
        {ratingCount > 0 && ratingAvg !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-[#9b7625]">
              ★ {ratingAvg.toFixed(1)}
            </span>

            <span className="text-sm font-semibold text-[#8d837d]">
              {ratingCount}{" "}
              {ratingCount === 1
                ? "valoración"
                : "valoraciones"}
            </span>
          </div>
        ) : (
          <p className="text-sm font-semibold text-[#928881]">
            Todavía no hay suficientes valoraciones para formar una impresión general.
          </p>
        )}

        <p className="mt-1 text-xs leading-5 text-[#9a8e84]">
          Las críticas destacadas se eligen por conversación y utilidad aparente, no por ser positivas o negativas.
        </p>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-[16px] bg-[#f3eeea]" />
          <div className="h-28 animate-pulse rounded-[16px] bg-[#f3eeea]" />
        </div>
      ) : !hasAnything ? (
        <div className="mt-4 rounded-[16px] border border-dashed border-[#ddd2c9] bg-[#fcfaf8] px-4 py-5 text-sm leading-6 text-[#887d74]">
          Esta obra todavía está formando su comunidad. Cuando haya críticas y conversaciones útiles, aparecerán aquí.
        </div>
      ) : (
        <>
          {featuredCritiques.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-[#332d29]">
                  Críticas destacadas
                </h3>

                <Link
                  href={`/comunidad/${slug}`}
                  className="text-xs font-black text-[#a55f31]"
                >
                  Ver críticas →
                </Link>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {featuredCritiques.map((post) => {
                  const replies =
                    replyCountByPost.get(post.id) || 0;
                  const reactions =
                    reactionCountByPost.get(post.id) || 0;

                  return (
                    <Link
                      key={post.id}
                      href={`/comunidad/${slug}#post-${post.id}`}
                      className="rounded-[16px] border border-[#e6ddd6] bg-[#fcfaf8] p-4 transition hover:border-[#d8c1b0] hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-[#3b332d]">
                          {post.display_name}
                        </p>

                        <span className="shrink-0 text-[11px] font-semibold text-[#9a9088]">
                          {relativeDate(post.created_at)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-[#625950]">
                        {excerpt(post.body)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-[#978b82]">
                        {replies > 0 && (
                          <span>💬 {replies}</span>
                        )}

                        {reactions > 0 && (
                          <span>
                            Reacciones {reactions}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {featuredConversations.length > 0 && (
            <div className="mt-5 border-t border-[#eee5de] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-[#332d29]">
                  Conversaciones de la comunidad
                </h3>

                <Link
                  href={`/comunidad/${slug}`}
                  className="text-xs font-black text-[#4a3273]"
                >
                  Entrar →
                </Link>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {featuredConversations.map((post) => (
                  <Link
                    key={post.id}
                    href={`/comunidad/${slug}#post-${post.id}`}
                    className="rounded-[16px] border border-[#ddd9e8] bg-[#faf8fd] p-4 transition hover:border-[#c8bddb] hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#5b3f8c]">
                        {post.branch === "autor"
                          ? "Pregunta al autor"
                          : "Conversación"}
                      </span>

                      <span className="text-[11px] font-semibold text-[#9a9088]">
                        {relativeDate(post.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[#5f5668]">
                      {excerpt(post.body, 180)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
