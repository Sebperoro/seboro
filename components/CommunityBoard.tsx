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
    description: string;
    icon: string;
  }
> = {
  general: {
    label: "Comentarios sobre la obra",
    description:
      "Conversaciones generales entre lectores.",
    icon: "💬",
  },
  autor: {
    label: "Preguntas para el autor",
    description:
      "Preguntas relacionadas con la obra y su creación.",
    icon: "❓",
  },
  criticas: {
    label: "Críticas y opiniones",
    description:
      "Opiniones más desarrolladas y análisis.",
    icon: "⭐",
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
    Date.now() - new Date(value).getTime();

  const minutes = Math.max(
    0,
    Math.floor(diff / 60000)
  );

  if (minutes < 1) return "Ahora";
  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) return "Ayer";

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

function AuthorBadge() {
  return (
    <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-200">
      Autor
    </span>
  );
}

export default function CommunityBoard({
  work,
}: {
  work: CommunityWork;
}) {
  const [branch, setBranch] =
    useState<CommunityBranch>("general");

  const [snapshot, setSnapshot] =
    useState<CommunitySnapshot>(EMPTY);

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
  ] = useState<Record<string, string>>({});

  const [
    openReplies,
    setOpenReplies,
  ] = useState<string[]>([]);

  const [
    visibleSpoilers,
    setVisibleSpoilers,
  ] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setSnapshot(
        await getCommunitySnapshot(work.slug)
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

  const filteredPosts = useMemo(
    () =>
      snapshot.posts.filter(
        (post) => post.branch === branch
      ),
    [snapshot.posts, branch]
  );

  async function publishPost() {
    if (!snapshot.currentUserId) {
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
        spoiler: newPostSpoiler,
      });

      setNewPost("");
      setNewPostSpoiler(false);

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
    if (!snapshot.currentUserId) {
      setError(
        "Debes iniciar sesión para responder."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      await createCommunityReply(
        postId,
        replyDrafts[postId] || ""
      );

      setReplyDrafts((current) => ({
        ...current,
        [postId]: "",
      }));

      setOpenReplies((current) =>
        current.includes(postId)
          ? current
          : [...current, postId]
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
    if (!snapshot.currentUserId) {
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

  function toggleReplies(postId: string) {
    setOpenReplies((current) =>
      current.includes(postId)
        ? current.filter(
            (id) => id !== postId
          )
        : [...current, postId]
    );
  }

  function toggleSpoiler(postId: string) {
    setVisibleSpoilers((current) =>
      current.includes(postId)
        ? current.filter(
            (id) => id !== postId
          )
        : [...current, postId]
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_1fr]">
        <aside>
          <Link
            href={work.backHref}
            className="text-sm font-semibold text-zinc-400 hover:text-white"
          >
            ← Volver a la obra
          </Link>

          <div
            className="mt-5 aspect-[2/3] rounded-3xl shadow-2xl ring-1 ring-white/10"
            style={{
              background: work.cover,
            }}
          />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Comunidad de
            </p>

            {work.real && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                Publicación real
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl font-black">
            {work.title}
          </h1>

          {work.authorUserId ? (
            <Link
              href={`/autores/${work.authorUserId}`}
              className="mt-1 inline-block text-sm text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white"
            >
              por {work.author}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              por {work.author}
            </p>
          )}

          <div className="mt-7 space-y-2">
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
                  onClick={() =>
                    setBranch(key)
                  }
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-white/25"
                  }`}
                >
                  <div className="flex gap-3">
                    <span>
                      {item.icon}
                    </span>

                    <div>
                      <p className="font-semibold">
                        {item.label}
                      </p>

                      <p
                        className={`mt-1 text-xs leading-5 ${
                          active
                            ? "text-zinc-600"
                            : "text-zinc-500"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          {!snapshot.currentUserId &&
            !loading && (
              <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                Puedes leer la comunidad
                sin iniciar sesión. Para
                publicar, responder o
                reaccionar,{" "}
                <Link
                  href="/cuenta"
                  className="font-bold underline"
                >
                  entra a tu cuenta
                </Link>
                .
              </div>
            )}

          {error && (
            <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-200">
              {error}
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Nueva publicación
            </p>

            <h2 className="mt-2 text-xl font-bold">
              {
                branchMeta[branch]
                  .label
              }
            </h2>

            <textarea
              value={newPost}
              onChange={(event) =>
                setNewPost(
                  event.target.value
                )
              }
              placeholder={
                branch === "autor"
                  ? `Escribe una pregunta para ${work.author}...`
                  : branch ===
                    "criticas"
                  ? "Comparte tu crítica u opinión..."
                  : "¿Qué quieres comentar sobre la obra?"
              }
              className="mt-5 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={
                    newPostSpoiler
                  }
                  onChange={(event) =>
                    setNewPostSpoiler(
                      event.target.checked
                    )
                  }
                />
                ⚠️ Esta publicación
                contiene spoilers
              </label>

              <button
                onClick={publishPost}
                disabled={
                  busy ||
                  !newPost.trim()
                }
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
              >
                {busy
                  ? "Guardando..."
                  : "Publicar"}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Conversación
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {
                    branchMeta[branch]
                      .label
                  }
                </h2>
              </div>

              <span className="text-sm text-zinc-500">
                {
                  filteredPosts.length
                }{" "}
                publicaciones
              </span>
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
                Cargando
                conversación...
              </div>
            ) : filteredPosts.length ===
              0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-zinc-400">
                Todavía no hay
                publicaciones en esta
                rama. Puedes ser la
                primera persona en
                iniciar la conversación.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredPosts.map(
                  (post) => {
                    const postReplies =
                      snapshot.replies.filter(
                        (reply) =>
                          reply.post_id ===
                          post.id
                      );

                    const postReactions =
                      snapshot.reactions.filter(
                        (reaction) =>
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
                        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {postIsAuthor && work.authorUserId ? (
                                <Link
                                  href={`/autores/${work.authorUserId}`}
                                  className="font-bold underline decoration-white/20 underline-offset-4"
                                >
                                  {post.display_name}
                                </Link>
                              ) : (
                                <Link
                                  href={`/usuarios/${post.user_id}`}
                                  className="font-bold underline decoration-white/20 underline-offset-4"
                                >
                                  {post.display_name}
                                </Link>
                              )}

                              {postIsAuthor && (
                                <AuthorBadge />
                              )}
                            </div>

                            <p className="mt-1 text-xs text-zinc-500">
                              {relativeDate(
                                post.created_at
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <ReportContentButton
                              targetType="post"
                              targetId={post.id}
                              targetUserId={post.user_id}
                              currentUserId={snapshot.currentUserId}
                            />

                            {post.spoiler && (
                              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                                ⚠️ Spoiler
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-5">
                          {spoilerVisible ? (
                            <p className="whitespace-pre-wrap leading-7 text-zinc-300">
                              {post.body}
                            </p>
                          ) : (
                            <button
                              onClick={() =>
                                toggleSpoiler(
                                  post.id
                                )
                              }
                              className="w-full rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-left"
                            >
                              <p className="font-semibold text-amber-100">
                                Esta
                                publicación
                                contiene
                                spoilers.
                              </p>

                              <p className="mt-1 text-sm text-amber-200/70">
                                Presiona para
                                mostrar el
                                contenido.
                              </p>
                            </button>
                          )}

                          {post.spoiler &&
                            spoilerVisible && (
                              <button
                                onClick={() =>
                                  toggleSpoiler(
                                    post.id
                                  )
                                }
                                className="mt-3 text-xs text-zinc-500 underline"
                              >
                                Ocultar spoiler
                              </button>
                            )}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {reactionOptions.map(
                            (reaction) => {
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
                                  onClick={() =>
                                    react(
                                      post.id,
                                      reaction.id
                                    )
                                  }
                                  disabled={
                                    busy
                                  }
                                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                    mine
                                      ? "border-white bg-white text-black"
                                      : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/25"
                                  }`}
                                  title={
                                    reaction.label
                                  }
                                >
                                  {
                                    reaction.emoji
                                  }{" "}
                                  {rows.length ||
                                    ""}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <div className="mt-5 border-t border-white/10 pt-4">
                          <button
                            onClick={() =>
                              toggleReplies(
                                post.id
                              )
                            }
                            className="text-sm font-semibold text-zinc-300 hover:text-white"
                          >
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
                              : "Responder"}
                          </button>

                          {repliesVisible && (
                            <div className="mt-4 space-y-3">
                              {postReplies.map(
                                (reply) => {
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
                                      className={`rounded-2xl border p-4 ${
                                        replyIsAuthor
                                          ? "border-violet-300/20 bg-violet-300/[0.06]"
                                          : "border-white/10 bg-black/20"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {replyIsAuthor && work.authorUserId ? (
                                            <Link
                                              href={`/autores/${work.authorUserId}`}
                                              className="text-sm font-bold underline decoration-white/20 underline-offset-4"
                                            >
                                              {reply.display_name}
                                            </Link>
                                          ) : (
                                            <Link
                                              href={`/usuarios/${reply.user_id}`}
                                              className="text-sm font-bold underline decoration-white/20 underline-offset-4"
                                            >
                                              {reply.display_name}
                                            </Link>
                                          )}

                                          {replyIsAuthor && (
                                            <AuthorBadge />
                                          )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <ReportContentButton
                                            targetType="reply"
                                            targetId={reply.id}
                                            targetUserId={reply.user_id}
                                            currentUserId={snapshot.currentUserId}
                                          />

                                          <p className="text-xs text-zinc-600">
                                            {relativeDate(
                                              reply.created_at
                                            )}
                                          </p>
                                        </div>
                                      </div>

                                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                        {
                                          reply.body
                                        }
                                      </p>
                                    </div>
                                  );
                                }
                              )}

                              <div className="flex gap-2">
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
                                  placeholder="Escribe una respuesta..."
                                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                                />

                                <button
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
                                      ] || ""
                                    ).trim()
                                  }
                                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                                >
                                  Enviar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
