"use client";

import Link from "next/link";
import ReportContentButton from "@/components/ReportContentButton";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createCommunityPost,
  createCommunityReply,
  getCommunitySnapshot,
  toggleCommunityReaction,
  type CommunityBranch,
  type CommunityReaction,
  type CommunitySnapshot,
} from "@/lib/community";

export type CommunityWork = {
  slug: string;
  title: string;
  author: string;
  cover: string;
  backHref: string;
  authorUserId?: string | null;
  real?: boolean;
};

const reactionOptions: {
  id: CommunityReaction;
  emoji: string;
  label: string;
}[] = [
  {
    id: "love",
    emoji: "❤️",
    label: "Me encantó",
  },
  {
    id: "moved",
    emoji: "😢",
    label: "Me emocionó",
  },
  {
    id: "surprised",
    emoji: "😮",
    label: "Me sorprendió",
  },
  {
    id: "funny",
    emoji: "😂",
    label: "Me hizo reír",
  },
  {
    id: "annoyed",
    emoji: "😡",
    label: "Me molestó",
  },
];

const branchMeta: Record<
  CommunityBranch,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: string;
  }
> = {
  general: {
    label: "Conversación general",
    shortLabel: "General",
    description:
      "Teorías, momentos favoritos y conversaciones entre lectores.",
    icon: "💬",
  },

  autor: {
    label: "Preguntas para el autor",
    shortLabel: "Preguntas",
    description:
      "Pregunta directamente sobre la obra y su proceso creativo.",
    icon: "❓",
  },

  criticas: {
    label: "Críticas y opiniones",
    shortLabel: "Críticas",
    description:
      "Opiniones desarrolladas, análisis y lecturas personales.",
    icon: "✍️",
  },
};

const EMPTY: CommunitySnapshot = {
  posts: [],
  replies: [],
  reactions: [],
  currentUserId: null,
};

function relativeDate(value: string) {
  const diff =
    Date.now() -
    new Date(value).getTime();

  const minutes = Math.max(
    0,
    Math.floor(diff / 60000)
  );

  if (minutes < 1) {
    return "Ahora";
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days =
    Math.floor(hours / 24);

  if (days === 1) {
    return "Ayer";
  }

  if (days < 7) {
    return `Hace ${days} días`;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
    }
  ).format(new Date(value));
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "S";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function AuthorBadge({
  official = false,
}: {
  official?: boolean;
}) {
  return (
    <span className="rounded-full border border-[#efb78f] bg-[#fff0e5] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#b95016]">
      {official
        ? "Respuesta del autor"
        : "Autor"}
    </span>
  );
}

function Avatar({
  name,
  author = false,
  size = "normal",
}: {
  name: string;
  author?: boolean;
  size?: "small" | "normal";
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-black ${
        size === "small"
          ? "h-9 w-9 text-[11px]"
          : "h-11 w-11 text-sm"
      } ${
        author
          ? "bg-[#d96822] text-white ring-2 ring-[#f5d1b8]"
          : "bg-[#f2ece7] text-[#625950] ring-1 ring-[#dfd5cd]"
      }`}
    >
      {getInitials(name)}
    </div>
  );
}

export default function CommunityBoard({
  work,
}: {
  work: CommunityWork;
}) {
  const [branch, setBranch] =
    useState<CommunityBranch>(
      "general"
    );

  const [snapshot, setSnapshot] =
    useState<CommunitySnapshot>(
      EMPTY
    );

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [newPost, setNewPost] =
    useState("");

  const [
    newPostSpoiler,
    setNewPostSpoiler,
  ] = useState(false);

  const [
    replyDrafts,
    setReplyDrafts,
  ] = useState<
    Record<string, string>
  >({});

  const [
    openReplies,
    setOpenReplies,
  ] = useState<string[]>([]);

  const [
    visibleSpoilers,
    setVisibleSpoilers,
  ] = useState<string[]>([]);

  const refresh =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        setSnapshot(
          await getCommunitySnapshot(
            work.slug
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la comunidad."
        );
      } finally {
        setLoading(false);
      }
    }, [work.slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredPosts =
    useMemo(
      () =>
        snapshot.posts.filter(
          (post) =>
            post.branch ===
            branch
        ),
      [
        snapshot.posts,
        branch,
      ]
    );

  const branchCounts =
    useMemo(() => {
      return {
        general:
          snapshot.posts.filter(
            (post) =>
              post.branch ===
              "general"
          ).length,

        autor:
          snapshot.posts.filter(
            (post) =>
              post.branch ===
              "autor"
          ).length,

        criticas:
          snapshot.posts.filter(
            (post) =>
              post.branch ===
              "criticas"
          ).length,
      };
    }, [snapshot.posts]);

  const isCurrentUserAuthor =
    Boolean(
      work.authorUserId &&
        snapshot.currentUserId ===
          work.authorUserId
    );

  async function publishPost() {
    if (
      !snapshot.currentUserId
    ) {
      setError(
        "Debes iniciar sesión para publicar."
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      await createCommunityPost({
        bookSlug: work.slug,
        branch,
        body: newPost,
        spoiler:
          newPostSpoiler,
      });

      setNewPost("");
      setNewPostSpoiler(
        false
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar."
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishReply(
    postId: string
  ) {
    if (
      !snapshot.currentUserId
    ) {
      setError(
        "Debes iniciar sesión para responder."
      );

      return;
    }

    /*
     * En Preguntas al autor,
     * solamente el autor puede
     * publicar la respuesta.
     */
    if (
      branch === "autor" &&
      !isCurrentUserAuthor
    ) {
      setError(
        `Solo ${work.author} puede responder las preguntas dirigidas al autor.`
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      await createCommunityReply(
        postId,
        replyDrafts[
          postId
        ] || ""
      );

      setReplyDrafts(
        (current) => ({
          ...current,
          [postId]: "",
        })
      );

      setOpenReplies(
        (current) =>
          current.includes(
            postId
          )
            ? current
            : [
                ...current,
                postId,
              ]
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo responder."
      );
    } finally {
      setBusy(false);
    }
  }

  async function react(
    postId: string,
    reaction: CommunityReaction
  ) {
    if (
      !snapshot.currentUserId
    ) {
      setError(
        "Debes iniciar sesión para reaccionar."
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      await toggleCommunityReaction(
        postId,
        reaction
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo reaccionar."
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleReplies(
    postId: string
  ) {
    setOpenReplies(
      (current) =>
        current.includes(
          postId
        )
          ? current.filter(
              (id) =>
                id !== postId
            )
          : [
              ...current,
              postId,
            ]
    );
  }

  function toggleSpoiler(
    postId: string
  ) {
    setVisibleSpoilers(
      (current) =>
        current.includes(
          postId
        )
          ? current.filter(
              (id) =>
                id !== postId
            )
          : [
              ...current,
              postId,
            ]
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-7 md:px-8">
      {/* CONTEXTO DE LA OBRA */}
      <section className="overflow-hidden rounded-[28px] border border-[#e8c9b2] bg-gradient-to-r from-[#fffaf6] via-white to-[#fff1e6] shadow-[0_12px_35px_rgba(109,66,34,0.055)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center md:p-6">
          <div
            className="h-[132px] w-[88px] shrink-0 rounded-[14px] border border-[#dcd1c8] shadow-[0_10px_24px_rgba(52,35,22,0.14)]"
            style={{
              background:
                work.cover,
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#bb642c]">
                Comunidad de
              </span>

              {work.real && (
                <span className="rounded-full border border-[#efc5a7] bg-[#fff0e5] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#b95016]">
                  Publicación SEBORO
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.03em] text-[#211f1c] md:text-3xl">
              {work.title}
            </h1>

            {work.authorUserId ? (
              <Link
                href={`/autores/${work.authorUserId}`}
                className="mt-1 inline-block text-sm font-semibold text-[#766c64] transition hover:text-[#c45b1b]"
              >
                por {work.author}
              </Link>
            ) : (
              <p className="mt-1 text-sm font-semibold text-[#766c64]">
                por {work.author}
              </p>
            )}

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8a7f76]">
              Habla de la historia,
              comparte tu interpretación
              o pregunta directamente a
              su autor.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
            <Link
              href={work.backHref}
              className="rounded-full border border-[#dfd4cb] bg-white px-4 py-2 text-sm font-bold text-[#5e554e] transition hover:border-[#d5ad90] hover:text-[#b95016]"
            >
              ← Volver a la obra
            </Link>

            <Link
              href="/comunidad"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#a06b49] transition hover:text-[#c45b1b]"
            >
              Ver toda la comunidad
            </Link>
          </div>
        </div>
      </section>

      {/* PESTAÑAS */}
      <section className="relative mt-5 rounded-[24px] border border-[#ead8ca] bg-white p-2 shadow-[0_7px_22px_rgba(99,65,40,0.035)]">
        <div className="flex gap-2 overflow-x-auto">
          {(
            Object.keys(
              branchMeta
            ) as CommunityBranch[]
          ).map((key) => {
            const item =
              branchMeta[key];

            const active =
              branch === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setBranch(
                    key
                  );

                  setError("");
                }}
                className={`flex min-w-[180px] flex-1 items-center gap-3 rounded-[18px] px-4 py-3 text-left transition md:min-w-0 ${
                  active
                    ? "bg-[#d96822] text-white shadow-[0_9px_22px_rgba(217,104,34,0.22)]"
                    : "text-[#5e554e] hover:bg-[#fff6ef]"
                }`}
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">
                      {
                        item.shortLabel
                      }
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        active
                          ? "bg-white/18 text-white"
                          : "bg-[#f5efea] text-[#90867d]"
                      }`}
                    >
                      {
                        branchCounts[
                          key
                        ]
                      }
                    </span>
                  </div>

                  <p
                    className={`mt-0.5 hidden truncate text-[11px] md:block ${
                      active
                        ? "text-white/75"
                        : "text-[#978c83]"
                    }`}
                  >
                    {
                      item.description
                    }
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-2 right-2 w-8 rounded-r-[22px] bg-gradient-to-l from-white to-transparent md:hidden"
        />
      </section>

      {/* RED SOCIAL */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* FEED PRINCIPAL */}
        <section className="min-w-0">
          {!snapshot.currentUserId &&
            !loading && (
              <div className="mb-5 rounded-[20px] border border-[#efd6aa] bg-[#fff9e9] px-5 py-4 text-sm leading-6 text-[#806231]">
                Puedes leer toda la
                conversación sin iniciar
                sesión. Para publicar,
                responder o reaccionar,{" "}
                <Link
                  href="/cuenta"
                  className="font-black text-[#b85a1e] underline decoration-[#d9a378] underline-offset-4"
                >
                  entra a tu cuenta
                </Link>
                .
              </div>
            )}

          {error && (
            <div className="mb-5 rounded-[20px] border border-[#efc6bd] bg-[#fff6f3] px-5 py-4 text-sm font-semibold leading-6 text-[#a84f3c]">
              {error}
            </div>
          )}

          {/* COMPOSITOR */}
          <div className="rounded-[26px] border border-[#ead8ca] bg-white p-5 shadow-[0_9px_26px_rgba(93,62,39,0.04)] md:p-6">
            <div className="flex gap-3">
              <Avatar
                name={
                  isCurrentUserAuthor
                    ? work.author
                    : "Tú"
                }
                author={
                  isCurrentUserAuthor
                }
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#ba6b39]">
                      Nueva publicación
                    </p>

                    <h2 className="mt-1 text-lg font-black text-[#302822]">
                      {
                        branchMeta[
                          branch
                        ].label
                      }
                    </h2>
                  </div>

                  <span className="rounded-full bg-[#f7f1ec] px-3 py-1.5 text-xs font-semibold text-[#82786f]">
                    {
                      branchMeta[
                        branch
                      ].icon
                    }{" "}
                    {
                      branchMeta[
                        branch
                      ].shortLabel
                    }
                  </span>
                </div>

                <textarea
                  value={newPost}
                  onChange={(
                    event
                  ) =>
                    setNewPost(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    branch ===
                    "autor"
                      ? `Escribe una pregunta para ${work.author}...`
                      : branch ===
                        "criticas"
                      ? "¿Qué te pareció la obra? Comparte tu crítica..."
                      : "¿Qué quieres compartir con otros lectores?"
                  }
                  className="mt-4 min-h-28 w-full resize-y rounded-[18px] border border-[#e4dad2] bg-[#fcfaf8] p-4 text-[15px] leading-7 text-[#39312b] outline-none transition placeholder:text-[#aaa099] focus:border-[#d6a27d] focus:bg-white"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[#e9ded5] bg-[#fffaf6] px-3 py-2 text-xs font-semibold text-[#776d65]">
                    <input
                      type="checkbox"
                      checked={
                        newPostSpoiler
                      }
                      onChange={(
                        event
                      ) =>
                        setNewPostSpoiler(
                          event
                            .target
                            .checked
                        )
                      }
                      className="accent-[#d96822]"
                    />

                    ⚠️ Contiene spoilers
                  </label>

                  <button
                    type="button"
                    onClick={
                      publishPost
                    }
                    disabled={
                      busy ||
                      !newPost.trim()
                    }
                    className="rounded-full bg-[#d96822] px-5 py-2.5 text-sm font-black text-white shadow-[0_7px_18px_rgba(217,104,34,0.18)] transition hover:bg-[#b95016] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy
                      ? "Guardando..."
                      : "Publicar"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TITULO DEL FEED */}
          <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#af6a3e]">
                Conversación
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-[-0.025em] text-[#28221e]">
                {
                  branchMeta[
                    branch
                  ].label
                }
              </h2>

              <p className="mt-1 text-sm text-[#8c8178]">
                {
                  branchMeta[
                    branch
                  ].description
                }
              </p>
            </div>

            <span className="rounded-full border border-[#e9ded5] bg-white px-3 py-1.5 text-xs font-bold text-[#857b72]">
              {
                filteredPosts.length
              }{" "}
              {filteredPosts.length ===
              1
                ? "publicación"
                : "publicaciones"}
            </span>
          </div>

          {/* POSTS */}
          {loading ? (
            <div className="mt-5 space-y-4">
              {Array.from({
                length: 3,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-56 animate-pulse rounded-[26px] border border-[#eadfd6] bg-white"
                  />
                )
              )}
            </div>
          ) : filteredPosts.length ===
            0 ? (
            <div className="mt-5 rounded-[26px] border border-dashed border-[#decfc3] bg-white p-9 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1e6] text-xl">
                {
                  branchMeta[
                    branch
                  ].icon
                }
              </div>

              <h3 className="mt-4 text-lg font-black text-[#403731]">
                Aquí todavía hay
                silencio.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#887d74]">
                Sé la primera persona en
                iniciar esta parte de la
                conversación sobre{" "}
                <strong className="text-[#5f554e]">
                  {work.title}
                </strong>
                .
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredPosts.map(
                (post) => {
                  const postReplies =
                    snapshot.replies.filter(
                      (
                        reply
                      ) =>
                        reply.post_id ===
                        post.id
                    );

                  const postReactions =
                    snapshot.reactions.filter(
                      (
                        reaction
                      ) =>
                        reaction.post_id ===
                        post.id
                    );

                  const spoilerVisible =
                    !post.spoiler ||
                    visibleSpoilers.includes(
                      post.id
                    );

                  const repliesVisible =
                    openReplies.includes(
                      post.id
                    );

                  const postIsAuthor =
                    Boolean(
                      work.authorUserId
                    ) &&
                    post.user_id ===
                      work.authorUserId;

                  return (
                    <article
                      id={`post-${post.id}`}
                      key={post.id}
                      className={`rounded-[26px] border bg-white shadow-[0_8px_26px_rgba(93,62,39,0.035)] ${
                        postIsAuthor
                          ? "border-[#eab994]"
                          : "border-[#ead8ca]"
                      }`}
                    >
                      <div className="p-5 md:p-6">
                        {/* CABECERA POST */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 gap-3">
                            <Avatar
                              name={
                                post.display_name
                              }
                              author={
                                postIsAuthor
                              }
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {postIsAuthor &&
                                work.authorUserId ? (
                                  <Link
                                    href={`/autores/${work.authorUserId}`}
                                    className="truncate font-black text-[#332c27] transition hover:text-[#c45b1b]"
                                  >
                                    {
                                      post.display_name
                                    }
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/usuarios/${post.user_id}`}
                                    className="truncate font-black text-[#332c27] transition hover:text-[#c45b1b]"
                                  >
                                    {
                                      post.display_name
                                    }
                                  </Link>
                                )}

                                {postIsAuthor && (
                                  <AuthorBadge />
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9a9088]">
                                <span>
                                  {relativeDate(
                                    post.created_at
                                  )}
                                </span>

                                <span>
                                  ·
                                </span>

                                <span>
                                  {
                                    branchMeta[
                                      branch
                                    ].shortLabel
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {post.spoiler && (
                              <span className="rounded-full border border-[#eed3a0] bg-[#fff8e8] px-2.5 py-1 text-[10px] font-bold text-[#9a7024]">
                                ⚠️ Spoiler
                              </span>
                            )}

                            <ReportContentButton
                              targetType="post"
                              targetId={
                                post.id
                              }
                              targetUserId={
                                post.user_id
                              }
                              currentUserId={
                                snapshot.currentUserId
                              }
                            />
                          </div>
                        </div>

                        {/* CONTENIDO */}
                        <div className="mt-5">
                          {spoilerVisible ? (
                            <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#514942]">
                              {
                                post.body
                              }
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                toggleSpoiler(
                                  post.id
                                )
                              }
                              className="w-full rounded-[20px] border border-[#efd3a5] bg-[#fff9e9] p-5 text-left transition hover:border-[#e5bd78]"
                            >
                              <p className="font-black text-[#775820]">
                                ⚠️ Esta
                                publicación
                                contiene
                                spoilers
                              </p>

                              <p className="mt-1 text-sm leading-6 text-[#9b7b42]">
                                Presiona
                                aquí para
                                mostrar el
                                contenido.
                              </p>
                            </button>
                          )}

                          {post.spoiler &&
                            spoilerVisible && (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSpoiler(
                                    post.id
                                  )
                                }
                                className="mt-3 text-xs font-semibold text-[#9c8f85] underline decoration-[#d2c6bd] underline-offset-4 transition hover:text-[#b95016]"
                              >
                                Volver a
                                ocultar
                                spoiler
                              </button>
                            )}
                        </div>

                        {/* REACCIONES */}
                        <div className="mt-5 flex flex-wrap gap-2">
                          {reactionOptions.map(
                            (
                              reaction
                            ) => {
                              const rows =
                                postReactions.filter(
                                  (
                                    item
                                  ) =>
                                    item.reaction ===
                                    reaction.id
                                );

                              const mine =
                                rows.some(
                                  (
                                    item
                                  ) =>
                                    item.user_id ===
                                    snapshot.currentUserId
                                );

                              return (
                                <button
                                  key={
                                    reaction.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    react(
                                      post.id,
                                      reaction.id
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  title={
                                    reaction.label
                                  }
                                  className={`group rounded-full border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                                    mine
                                      ? "border-[#e9a779] bg-[#fff0e5] text-[#ad4c12]"
                                      : "border-[#e7ddd5] bg-[#fcfaf8] text-[#716860] hover:border-[#dfb99d] hover:bg-[#fff7f1]"
                                  }`}
                                >
                                  <span className="text-sm">
                                    {
                                      reaction.emoji
                                    }
                                  </span>

                                  <span className="ml-1.5 hidden sm:inline">
                                    {
                                      reaction.label
                                    }
                                  </span>

                                  {rows.length >
                                    0 && (
                                    <span
                                      className={`ml-1.5 ${
                                        mine
                                          ? "text-[#c46a31]"
                                          : "text-[#a49a92]"
                                      }`}
                                    >
                                      {
                                        rows.length
                                      }
                                    </span>
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>

                        {/* RESPUESTAS */}
                        <div className="mt-5 border-t border-[#eee5de] pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              toggleReplies(
                                post.id
                              )
                            }
                            className="flex items-center gap-2 text-sm font-black text-[#625950] transition hover:text-[#c45b1b]"
                          >
                            <span>
                              💬
                            </span>

                            {postReplies.length >
                            0
                              ? `${
                                  postReplies.length
                                } respuesta${
                                  postReplies.length ===
                                  1
                                    ? ""
                                    : "s"
                                }`
                              : branch ===
                                "autor"
                              ? "Ver respuesta del autor"
                              : "Responder"}
                          </button>

                          {repliesVisible && (
                            <div className="mt-5">
                              {/* LINEA DE HILO */}
                              <div className="ml-5 border-l-2 border-[#efe4dc] pl-4 md:ml-6 md:pl-5">
                                <div className="space-y-3">
                                  {postReplies.map(
                                    (
                                      reply
                                    ) => {
                                      const replyIsAuthor =
                                        Boolean(
                                          work.authorUserId
                                        ) &&
                                        reply.user_id ===
                                          work.authorUserId;

                                      return (
                                        <div
                                          key={
                                            reply.id
                                          }
                                          className={`rounded-[20px] border p-4 ${
                                            replyIsAuthor
                                              ? "border-[#e7b38e] bg-[#fff8f2]"
                                              : "border-[#e8dfd8] bg-[#fcfaf8]"
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 gap-2.5">
                                              <Avatar
                                                name={
                                                  reply.display_name
                                                }
                                                author={
                                                  replyIsAuthor
                                                }
                                                size="small"
                                              />

                                              <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  {replyIsAuthor &&
                                                  work.authorUserId ? (
                                                    <Link
                                                      href={`/autores/${work.authorUserId}`}
                                                      className="truncate text-sm font-black text-[#3e352f] transition hover:text-[#c45b1b]"
                                                    >
                                                      {
                                                        reply.display_name
                                                      }
                                                    </Link>
                                                  ) : (
                                                    <Link
                                                      href={`/usuarios/${reply.user_id}`}
                                                      className="truncate text-sm font-black text-[#3e352f] transition hover:text-[#c45b1b]"
                                                    >
                                                      {
                                                        reply.display_name
                                                      }
                                                    </Link>
                                                  )}

                                                  {replyIsAuthor && (
                                                    <AuthorBadge
                                                      official={
                                                        branch ===
                                                        "autor"
                                                      }
                                                    />
                                                  )}
                                                </div>

                                                <p className="mt-0.5 text-[11px] font-medium text-[#9e948c]">
                                                  {relativeDate(
                                                    reply.created_at
                                                  )}
                                                </p>
                                              </div>
                                            </div>

                                            <ReportContentButton
                                              targetType="reply"
                                              targetId={
                                                reply.id
                                              }
                                              targetUserId={
                                                reply.user_id
                                              }
                                              currentUserId={
                                                snapshot.currentUserId
                                              }
                                            />
                                          </div>

                                          <p className="mt-3 whitespace-pre-wrap pl-[46px] text-sm leading-6 text-[#5e554e]">
                                            {
                                              reply.body
                                            }
                                          </p>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>

                                {/* RESPONDER */}
                                {branch ===
                                  "autor" &&
                                !isCurrentUserAuthor ? (
                                  <div className="mt-4 rounded-[17px] border border-[#ead8ca] bg-[#fffaf6] px-4 py-3 text-xs leading-5 text-[#867a71]">
                                    Las preguntas
                                    de esta sección
                                    solo pueden ser
                                    respondidas
                                    oficialmente por{" "}
                                    <strong className="text-[#b65a1f]">
                                      {
                                        work.author
                                      }
                                    </strong>
                                    .
                                  </div>
                                ) : (
                                  <div className="mt-4 flex gap-2">
                                    <input
                                      value={
                                        replyDrafts[
                                          post.id
                                        ] || ""
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setReplyDrafts(
                                          (
                                            current
                                          ) => ({
                                            ...current,

                                            [post.id]:
                                              event
                                                .target
                                                .value,
                                          })
                                        )
                                      }
                                      placeholder={
                                        branch ===
                                          "autor"
                                          ? "Responder como autor..."
                                          : "Escribe una respuesta..."
                                      }
                                      className="min-w-0 flex-1 rounded-full border border-[#e3d9d1] bg-white px-4 py-2.5 text-sm text-[#413934] outline-none transition placeholder:text-[#aaa098] focus:border-[#d6a17c]"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        publishReply(
                                          post.id
                                        )
                                      }
                                      disabled={
                                        busy ||
                                        !(
                                          replyDrafts[
                                            post.id
                                          ] ||
                                          ""
                                        ).trim()
                                      }
                                      className="shrink-0 rounded-full bg-[#d96822] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#b95016] disabled:opacity-40"
                                    >
                                      Enviar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* LATERAL */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* OBRA */}
          <section className="rounded-[24px] border border-[#ead8ca] bg-white p-4 shadow-[0_8px_24px_rgba(93,62,39,0.035)]">
            <div className="flex gap-4">
              <div
                className="h-[120px] w-[80px] shrink-0 rounded-[13px] border border-[#ddd3cb] shadow-[0_8px_20px_rgba(48,33,22,0.10)]"
                style={{
                  background:
                    work.cover,
                }}
              />

              <div className="min-w-0 py-1">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#b96a38]">
                  Estás hablando de
                </p>

                <p className="mt-2 line-clamp-2 font-black leading-5 text-[#3a322c]">
                  {work.title}
                </p>

                <p className="mt-1 truncate text-xs font-medium text-[#8b8077]">
                  {work.author}
                </p>

                <Link
                  href={
                    work.backHref
                  }
                  className="mt-3 inline-block text-xs font-black text-[#c45b1b] transition hover:text-[#99420f]"
                >
                  Ver la obra →
                </Link>
              </div>
            </div>
          </section>

          {/* RAMA ACTIVA */}
          <section className="rounded-[24px] border border-[#ebceb8] bg-[#fff8f3] p-5">
            <span className="text-2xl">
              {
                branchMeta[
                  branch
                ].icon
              }
            </span>

            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.17em] text-[#b56431]">
              Estás en
            </p>

            <h3 className="mt-1 text-lg font-black text-[#3b312a]">
              {
                branchMeta[
                  branch
                ].label
              }
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#82756c]">
              {
                branchMeta[
                  branch
                ].description
              }
            </p>

            {branch ===
              "autor" && (
              <div className="mt-4 rounded-[17px] border border-[#ecc8ac] bg-white/80 p-3">
                <p className="text-xs font-black text-[#b2541a]">
                  Respuesta oficial
                </p>

                <p className="mt-1 text-xs leading-5 text-[#84766c]">
                  Solo el autor puede
                  responder directamente
                  las preguntas de esta
                  sección.
                </p>
              </div>
            )}
          </section>

          {/* REACCIONES */}
          <section className="rounded-[24px] border border-[#ead8ca] bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a77859]">
              Reacciones SEBORO
            </p>

            <h3 className="mt-1 text-base font-black text-[#3b332d]">
              Responde sin escribir
            </h3>

            <div className="mt-4 space-y-2">
              {reactionOptions.map(
                (reaction) => (
                  <div
                    key={
                      reaction.id
                    }
                    className="flex items-center gap-3 rounded-[14px] bg-[#faf7f4] px-3 py-2"
                  >
                    <span className="text-base">
                      {
                        reaction.emoji
                      }
                    </span>

                    <span className="text-xs font-semibold text-[#756b63]">
                      {
                        reaction.label
                      }
                    </span>
                  </div>
                )
              )}
            </div>
          </section>

          {/* NORMAS */}
          <section className="rounded-[24px] border border-[#e7ded7] bg-[#f7f4f1] p-5">
            <p className="text-xs font-black text-[#625950]">
              Una buena comunidad
            </p>

            <p className="mt-2 text-xs leading-5 text-[#8b8179]">
              Puedes discrepar,
              criticar y debatir.
              Marca spoilers cuando
              corresponda y centra la
              conversación en las ideas,
              no en atacar a otros
              lectores.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}