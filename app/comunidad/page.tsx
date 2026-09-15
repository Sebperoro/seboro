"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import TopNav from "@/components/TopNav";
import ReportContentButton from "@/components/ReportContentButton";

import {
  getPublishedWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";

import {
  createCommunityPost,
  createCommunityReply,
  getGlobalCommunitySnapshot,
  toggleCommunityReaction,
  type CommunityBranch,
  type CommunityPost,
  type CommunityReaction,
  type GlobalCommunitySnapshot,
} from "@/lib/community";

type PublishedWithAuthor =
  PublishedWork & {
    author_name: string;
  };

type SocialWork = {
  slug: string;
  title: string;
  author: string;
  genre: string;
  cover: string;
  authorUserId: string | null;
  real: boolean;
};

type FeedFilter =
  | "all"
  | CommunityBranch;

const EMPTY: GlobalCommunitySnapshot = {
  posts: [],
  replies: [],
  reactions: [],
  currentUserId: null,
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
    icon: string;
    description: string;
  }
> = {
  general: {
    label: "Conversación general",
    shortLabel: "General",
    icon: "💬",
    description:
      "Ideas, teorías y conversaciones entre lectores.",
  },

  criticas: {
    label: "Críticas y opiniones",
    shortLabel: "Críticas",
    icon: "✍️",
    description:
      "Opiniones desarrolladas y análisis de las obras.",
  },

  autor: {
    label: "Preguntas para el autor",
    shortLabel: "Preguntas",
    icon: "❓",
    description:
      "Preguntas relacionadas con las historias y su creación.",
  },
};

function relativeDate(
  value: string
) {
  const diff =
    Date.now() -
    new Date(value).getTime();

  const minutes = Math.max(
    0,
    Math.floor(
      diff / 60000
    )
  );

  if (minutes < 1) {
    return "Ahora";
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days =
    Math.floor(
      hours / 24
    );

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
  ).format(
    new Date(value)
  );
}

function getInitials(
  name: string
) {
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
    parts[
      parts.length - 1
    ][0]
  }`.toUpperCase();
}

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function Avatar({
  name,
  author = false,
  small = false,
}: {
  name: string;
  author?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-black ${
        small
          ? "h-9 w-9 text-[11px]"
          : "h-11 w-11 text-sm"
      } ${
        author
          ? "bg-[#d96822] text-white ring-2 ring-[#f1c5a7]"
          : "bg-[#f2ece7] text-[#675e56] ring-1 ring-[#dfd5cd]"
      }`}
    >
      {getInitials(name)}
    </div>
  );
}

function AuthorBadge({
  answer = false,
}: {
  answer?: boolean;
}) {
  return (
    <span className="rounded-full border border-[#edb58c] bg-[#fff0e5] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#b95016]">
      {answer
        ? "Respuesta del autor"
        : "Autor"}
    </span>
  );
}

export default function CommunityHomePage() {
  const [
    published,
    setPublished,
  ] =
    useState<
      PublishedWithAuthor[]
    >([]);

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<GlobalCommunitySnapshot>(
      EMPTY
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FeedFilter>(
      "all"
    );

  /*
   * COMPOSITOR
   */
  const [
    newPost,
    setNewPost,
  ] =
    useState("");

  const [
    newPostBranch,
    setNewPostBranch,
  ] =
    useState<CommunityBranch>(
      "general"
    );

  const [
    newPostSpoiler,
    setNewPostSpoiler,
  ] =
    useState(false);

  const [
    selectedBookSlug,
    setSelectedBookSlug,
  ] =
    useState<string | null>(
      null
    );

  const [
    bookSearch,
    setBookSearch,
  ] =
    useState("");

  const [
    bookSearchOpen,
    setBookSearchOpen,
  ] =
    useState(false);

  const [
    visibleSpoilers,
    setVisibleSpoilers,
  ] =
    useState<string[]>(
      []
    );

  const [
    openReplies,
    setOpenReplies,
  ] =
    useState<string[]>(
      []
    );

  const [
    replyDrafts,
    setReplyDrafts,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const loadFeed =
    useCallback(
      async () => {
        const result =
          await getGlobalCommunitySnapshot();

        setSnapshot(
          result
        );
      },
      []
    );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [
          works,
          community,
        ] =
          await Promise.all([
            getPublishedWorks(),
            getGlobalCommunitySnapshot(),
          ]);

        if (!active) {
          return;
        }

        setPublished(
          works
        );

        setSnapshot(
          community
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la comunidad."
        );
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  /*
   * CATÁLOGO SOCIAL
   */
  const socialWorks =
    useMemo(() => {
      const map =
        new Map<
          string,
          SocialWork
        >();

      published.forEach(
        (work) => {
          map.set(
            work.slug,
            {
              slug:
                work.slug,

              title:
                work.title,

              author:
                work.author_name,

              genre:
                work.genre,

              cover:
                getWorkCoverBackground(
                  work
                ),

              authorUserId:
                work.author_id,

              real:
                true,
            }
          );
        }
      );

      return [
        ...map.values(),
      ];
    }, [
      published,
    ]);

  const workBySlug =
    useMemo(
      () =>
        new Map(
          socialWorks.map(
            (work) => [
              work.slug,
              work,
            ]
          )
        ),
      [socialWorks]
    );

  const selectedWork =
    useMemo(() => {
      if (
        !selectedBookSlug
      ) {
        return null;
      }

      return (
        workBySlug.get(
          selectedBookSlug
        ) || null
      );
    }, [
      selectedBookSlug,
      workBySlug,
    ]);

  /*
   * BÚSQUEDA PROGRESIVA
   */
  const bookSuggestions =
    useMemo(() => {
      const search =
        normalizeText(
          bookSearch
        );

      if (!search) {
        return socialWorks
          .slice(0, 6);
      }

      return socialWorks
        .map((work) => {
          const title =
            normalizeText(
              work.title
            );

          const author =
            normalizeText(
              work.author
            );

          const genre =
            normalizeText(
              work.genre
            );

          let score = 0;

          if (
            title === search
          ) {
            score += 100;
          }

          if (
            title.startsWith(
              search
            )
          ) {
            score += 60;
          }

          if (
            title.includes(
              search
            )
          ) {
            score += 40;
          }

          if (
            author.startsWith(
              search
            )
          ) {
            score += 30;
          }

          if (
            author.includes(
              search
            )
          ) {
            score += 20;
          }

          if (
            genre.includes(
              search
            )
          ) {
            score += 10;
          }

          return {
            work,
            score,
          };
        })
        .filter(
          (item) =>
            item.score > 0
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        )
        .slice(0, 6)
        .map(
          (item) =>
            item.work
        );
    }, [
      bookSearch,
      socialWorks,
    ]);

  /*
   * FEED PÚBLICO
   * Si una obra real no forma parte del catálogo público
   * (por ejemplo is_test=true), sus posts no se muestran
   * en la comunidad general. Los posts globales sí permanecen.
   */
  const visiblePosts =
    useMemo(
      () =>
        snapshot.posts.filter(
          (post) =>
            !post.book_slug ||
            workBySlug.has(
              post.book_slug
            )
        ),
      [
        snapshot.posts,
        workBySlug,
      ]
    );
  const filteredPosts =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return visiblePosts;
      }

      return visiblePosts.filter(
        (post) =>
          post.branch ===
          filter
      );
    }, [
      visiblePosts,
      filter,
    ]);

  const branchCounts =
    useMemo(
      () => ({
        all:
          visiblePosts
            .length,

        general:
          visiblePosts.filter(
            (post) =>
              post.branch ===
              "general"
          ).length,

        criticas:
          visiblePosts.filter(
            (post) =>
              post.branch ===
              "criticas"
          ).length,

        autor:
          visiblePosts.filter(
            (post) =>
              post.branch ===
              "autor"
          ).length,
      }),
      [visiblePosts]
    );

  /*
   * OBRAS CON ACTIVIDAD
   *
   * Las publicaciones globales
   * simplemente no cuentan aquí.
   */
  const activeWorks =
    useMemo(() => {
      const scores =
        new Map<
          string,
          {
            score: number;
            posts: number;
          }
        >();

      const postSlugById =
        new Map<
          string,
          string
        >();

      snapshot.posts.forEach(
        (post) => {
          if (
            !post.book_slug
          ) {
            return;
          }

          postSlugById.set(
            post.id,
            post.book_slug
          );

          const current =
            scores.get(
              post.book_slug
            ) || {
              score: 0,
              posts: 0,
            };

          current.score +=
            3;

          current.posts +=
            1;

          scores.set(
            post.book_slug,
            current
          );
        }
      );

      snapshot.replies.forEach(
        (reply) => {
          const slug =
            postSlugById.get(
              reply.post_id
            );

          if (!slug) {
            return;
          }

          const current =
            scores.get(
              slug
            ) || {
              score: 0,
              posts: 0,
            };

          current.score +=
            1;

          scores.set(
            slug,
            current
          );
        }
      );

      snapshot.reactions.forEach(
        (
          reaction
        ) => {
          const slug =
            postSlugById.get(
              reaction.post_id
            );

          if (!slug) {
            return;
          }

          const current =
            scores.get(
              slug
            ) || {
              score: 0,
              posts: 0,
            };

          current.score +=
            0.4;

          scores.set(
            slug,
            current
          );
        }
      );

      return [
        ...scores.entries(),
      ]
        .map(
          ([
            slug,
            activity,
          ]) => ({
            work:
              workBySlug.get(
                slug
              ),

            ...activity,
          })
        )
        .filter(
          (
            item
          ): item is {
            work: SocialWork;
            score: number;
            posts: number;
          } =>
            Boolean(
              item.work
            )
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        )
        .slice(0, 5);
    }, [
      snapshot.posts,
      snapshot.replies,
      snapshot.reactions,
      workBySlug,
    ]);

  async function refresh() {
    try {
      await loadFeed();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la comunidad."
      );
    }
  }

  function selectWork(
    work: SocialWork
  ) {
    setSelectedBookSlug(
      work.slug
    );

    setBookSearch("");
    setBookSearchOpen(
      false
    );
  }

  function removeWork() {
    setSelectedBookSlug(
      null
    );

    setBookSearch("");

    /*
     * Pregunta al autor necesita
     * una obra. Si retiramos la obra,
     * vuelve automáticamente a General.
     */
    if (
      newPostBranch ===
      "autor"
    ) {
      setNewPostBranch(
        "general"
      );
    }
  }

  function chooseBranch(
    branch: CommunityBranch
  ) {
    setNewPostBranch(
      branch
    );

    /*
     * Si quiere hacer una pregunta
     * al autor y todavía no eligió
     * una obra, abrimos el buscador.
     */
    if (
      branch === "autor" &&
      !selectedBookSlug
    ) {
      setBookSearchOpen(
        true
      );
    }
  }

  async function publishPost() {
    if (
      !snapshot.currentUserId
    ) {
      setError(
        "Debes iniciar sesión para publicar."
      );

      return;
    }

    if (
      !newPost.trim()
    ) {
      return;
    }

    if (
      newPostBranch ===
        "autor" &&
      !selectedBookSlug
    ) {
      setError(
        "Para preguntar al autor primero vincula una obra."
      );

      setBookSearchOpen(
        true
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      await createCommunityPost(
        {
          bookSlug:
            selectedBookSlug,

          branch:
            newPostBranch,

          body:
            newPost,

          spoiler:
            newPostSpoiler,
        }
      );

      setNewPost("");

      setNewPostBranch(
        "general"
      );

      setNewPostSpoiler(
        false
      );

      setSelectedBookSlug(
        null
      );

      setBookSearch("");

      setBookSearchOpen(
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

  async function publishReply(
    post: CommunityPost
  ) {
    if (
      !snapshot.currentUserId
    ) {
      setError(
        "Debes iniciar sesión para responder."
      );

      return;
    }

    const work =
      post.book_slug
        ? workBySlug.get(
            post.book_slug
          )
        : undefined;

    if (
      post.branch ===
        "autor" &&
      work?.authorUserId &&
      snapshot.currentUserId !==
        work.authorUserId
    ) {
      setError(
        `Esta pregunta está dirigida a ${work.author}.`
      );

      return;
    }

    const body =
      replyDrafts[
        post.id
      ] || "";

    if (!body.trim()) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await createCommunityReply(
        post.id,
        body
      );

      setReplyDrafts(
        (current) => ({
          ...current,

          [post.id]:
            "",
        })
      );

      setOpenReplies(
        (current) =>
          current.includes(
            post.id
          )
            ? current
            : [
                ...current,
                post.id,
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
                id !==
                postId
            )
          : [
              ...current,
              postId,
            ]
    );
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
                id !==
                postId
            )
          : [
              ...current,
              postId,
            ]
    );
  }

  function filterClass(
    key: FeedFilter
  ) {
    return filter === key
      ? "bg-[#d96822] text-white shadow-[0_8px_20px_rgba(217,104,34,0.22)]"
      : "text-[#625950] hover:bg-[#fff4ec]";
  }

  const composerStarted =
    newPost.trim().length >
    0;

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#211f1c]">
      <TopNav />

      <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        {/* HERO */}
        <section className="relative mt-7 overflow-hidden rounded-[38px] border-2 border-[#2b211c] bg-[#14100d] shadow-[0_24px_70px_rgba(81,38,8,0.22)]">
          {/* Fondo completo de rombos */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-[-90px] rotate-45 opacity-[0.96]">
              <div className="grid grid-cols-10 gap-3 md:grid-cols-14 xl:grid-cols-18">
                {Array.from({ length: 220 }).map((_, index) => {
                  const tone =
                    index % 7 === 0
                      ? "bg-[#ef812f]"
                      : index % 5 === 0
                      ? "bg-[#c75d17]"
                      : index % 4 === 0
                      ? "bg-[#8d3f13]"
                      : index % 3 === 0
                      ? "bg-[#2d1b12]"
                      : index % 2 === 0
                      ? "bg-[#1b1511]"
                      : "bg-[#100d0b]";

                  const glow =
                    index % 11 === 0
                      ? "shadow-[0_0_28px_rgba(239,129,47,0.26)]"
                      : index % 13 === 0
                      ? "shadow-[0_0_24px_rgba(199,93,23,0.18)]"
                      : "";

                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-[10px] border border-white/[0.045] ${tone} ${glow}`}
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-[10px]">
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_36%,transparent_67%,rgba(255,255,255,0.025))]" />
                        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,235,219,0.8)_0.7px,transparent_0.7px)] [background-size:11px_11px]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.10),transparent_36%),radial-gradient(circle_at_72%_78%,rgba(0,0,0,0.20),transparent_46%)]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Brillo global y profundidad */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_13%_18%,rgba(255,177,103,0.18),transparent_22%),radial-gradient(circle_at_78%_23%,rgba(255,116,39,0.23),transparent_21%),radial-gradient(circle_at_89%_79%,rgba(255,205,157,0.14),transparent_20%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#130f0d]/88 via-[#1a120d]/64 to-[#22120a]/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/24" />
          </div>

          {/* Contenido */}
          <div className="relative z-10 flex flex-col gap-8 px-8 py-10 md:px-10 md:py-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#ffb071]/25 bg-[#df7226] px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_rgba(223,114,38,0.30)]">
                  Comunidad SEBORO
                </span>

                <span className="text-sm font-semibold text-[#f3caa6]">
                  libros · lectores · autores
                </span>
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.96] text-[#fff7ef] md:text-6xl">
                Las historias también se viven
                <br />
                <span className="text-[#ffb982]">
                  después de cerrar el libro.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#f5dcc7]/92 md:text-lg">
                Descubre lo que otros lectores están pensando, encuentra críticas,
                comparte teorías y habla directamente con los autores.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="rounded-[20px] border border-white/10 bg-black/25 px-5 py-4 text-[#fff0e3] shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffb073]">
                  Ahora mismo
                </p>

                <div className="mt-1 flex items-end gap-2">
                  <span className="text-3xl font-black text-white">
                    {snapshot.posts.length}
                  </span>

                  <span className="pb-1 text-sm font-semibold text-[#f7d6bf]/85">
                    conversaciones recientes
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {["teorías", "críticas", "preguntas"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#f0bf95]/18 bg-black/20 px-3 py-1.5 text-xs font-semibold text-[#f7dbc3] backdrop-blur-md"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FILTROS DEL FEED */}
        <section className="relative mt-5 rounded-[24px] border border-[#e5c8b2] bg-[#fffaf6] p-2.5 shadow-[0_8px_24px_rgba(99,65,40,0.05)]">
          <div className="flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                setFilter(
                  "all"
                )
              }
              className={`flex shrink-0 items-center gap-2 rounded-[17px] px-5 py-3 text-sm font-black transition ${filterClass(
                "all"
              )}`}
            >
              ✦ Todo

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  filter ===
                  "all"
                    ? "bg-white/20"
                    : "bg-[#f4efeb]"
                }`}
              >
                {
                  branchCounts.all
                }
              </span>
            </button>

            {(
              [
                "general",
                "criticas",
                "autor",
              ] as CommunityBranch[]
            ).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setFilter(
                    key
                  )
                }
                className={`flex shrink-0 items-center gap-2 rounded-[17px] px-5 py-3 text-sm font-black transition ${filterClass(
                  key
                )}`}
              >
                {
                  branchMeta[
                    key
                  ].icon
                }

                {
                  branchMeta[
                    key
                  ].shortLabel
                }

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    filter ===
                    key
                      ? "bg-white/20"
                      : "bg-[#f4efeb]"
                  }`}
                >
                  {
                    branchCounts[
                      key
                    ]
                  }
                </span>
              </button>
            ))}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-2.5 right-2.5 w-8 rounded-r-[22px] bg-gradient-to-l from-[#fffaf6] to-transparent md:hidden"
          />
        </section>

        {/* LAYOUT */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">
            {!snapshot.currentUserId &&
              !loading && (
                <div className="mb-5 rounded-[20px] border border-[#efd6aa] bg-[#fff9e9] px-5 py-4 text-sm leading-6 text-[#806231]">
                  Puedes explorar toda
                  la comunidad sin
                  iniciar sesión. Para
                  publicar, responder o
                  reaccionar,{" "}
                  <Link
                    href="/cuenta"
                    className="font-black text-[#b95016] underline underline-offset-4"
                  >
                    entra a tu cuenta
                  </Link>
                  .
                </div>
              )}

            {error && (
              <div className="mb-5 rounded-[20px] border border-[#efc6bd] bg-[#fff6f3] px-5 py-4 text-sm font-semibold text-[#a84f3c]">
                {error}
              </div>
            )}

            {/* NUEVO COMPOSITOR */}
            <section className="rounded-[26px] border border-[#e2c4ae] bg-white p-5 shadow-[0_10px_28px_rgba(93,62,39,0.055)] md:p-6">
              <div className="flex gap-3">
                <Avatar
                  name="Tú"
                />

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-[#302822]">
                    ¿Qué quieres compartir?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#8a7f76]">
                    Comparte una idea,
                    pregunta, crítica o
                    algo que estés
                    buscando.
                  </p>

                  <textarea
                    value={
                      newPost
                    }
                    onChange={(
                      event
                    ) =>
                      setNewPost(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Escribe aquí..."
                    className="mt-4 min-h-32 w-full resize-y rounded-[20px] border border-[#e4dad2] bg-[#fcfaf8] p-4 text-[15px] leading-7 text-[#39312b] outline-none transition placeholder:text-[#aaa098] focus:border-[#d6a27d] focus:bg-white"
                  />

                  {/* OBRA SELECCIONADA */}
                  {selectedWork && (
                    <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#e6c6af] bg-[#fff8f2] p-3">
                      <div
                        className="h-[58px] w-[39px] shrink-0 rounded-[7px] border border-[#ddd2ca]"
                        style={{
                          background:
                            selectedWork.cover,
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#b7622d]">
                          Obra vinculada
                        </p>

                        <p className="mt-1 truncate text-sm font-black text-[#433831]">
                          {
                            selectedWork.title
                          }
                        </p>

                        <p className="truncate text-xs text-[#8f8278]">
                          {
                            selectedWork.author
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          removeWork
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e0d4cb] bg-white text-sm font-black text-[#8c7f76] transition hover:border-[#d7a887] hover:text-[#b95016]"
                        title="Quitar obra"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* BUSCADOR PROGRESIVO */}
                  {bookSearchOpen &&
                    !selectedWork && (
                      <div className="mt-3 overflow-hidden rounded-[20px] border border-[#e5d8ce] bg-white shadow-[0_12px_30px_rgba(74,49,31,0.08)]">
                        <div className="border-b border-[#eee5de] p-3">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a39890]">
                              ⌕
                            </span>

                            <input
                              autoFocus
                              value={
                                bookSearch
                              }
                              onChange={(
                                event
                              ) =>
                                setBookSearch(
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="Escribe título, autor o género..."
                              className="w-full rounded-[15px] border border-[#e5dbd3] bg-[#fcfaf8] py-3 pl-9 pr-4 text-sm text-[#433b35] outline-none transition focus:border-[#d6a27d]"
                            />
                          </div>
                        </div>

                        <div className="max-h-[330px] overflow-y-auto p-2">
                          {bookSuggestions.length >
                          0 ? (
                            bookSuggestions.map(
                              (
                                work
                              ) => (
                                <button
                                  key={
                                    work.slug
                                  }
                                  type="button"
                                  onClick={() =>
                                    selectWork(
                                      work
                                    )
                                  }
                                  className="flex w-full items-center gap-3 rounded-[15px] p-2.5 text-left transition hover:bg-[#fff5ed]"
                                >
                                  <div
                                    className="h-[62px] w-[42px] shrink-0 rounded-[8px] border border-[#ddd3cb]"
                                    style={{
                                      background:
                                        work.cover,
                                    }}
                                  />

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-[#413832]">
                                      {
                                        work.title
                                      }
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-[#8f847c]">
                                      {
                                        work.author
                                      }{" "}
                                      ·{" "}
                                      {
                                        work.genre
                                      }
                                    </p>
                                  </div>

                                  <span className="text-xs font-black text-[#c45b1b]">
                                    Vincular
                                  </span>
                                </button>
                              )
                            )
                          ) : (
                            <div className="p-6 text-center">
                              <p className="text-sm font-black text-[#514842]">
                                No encontramos
                                esa obra.
                              </p>

                              <p className="mt-1 text-xs text-[#93887f]">
                                Puedes seguir
                                publicando sin
                                vincular ninguna.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-[#eee5de] px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBookSearchOpen(
                                false
                              );

                              setBookSearch(
                                ""
                              );
                            }}
                            className="text-xs font-bold text-[#8d8178] transition hover:text-[#b95016]"
                          >
                            Cerrar búsqueda
                          </button>
                        </div>
                      </div>
                    )}

                  {/* HERRAMIENTAS PROGRESIVAS */}
                  {composerStarted && (
                    <div className="mt-4 border-t border-[#eee5de] pt-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#a67b60]">
                        Añade contexto solo si lo necesitas
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {!selectedWork && (
                          <button
                            type="button"
                            onClick={() =>
                              setBookSearchOpen(
                                (
                                  current
                                ) =>
                                  !current
                              )
                            }
                            className={`rounded-full border px-3.5 py-2 text-xs font-black transition ${
                              bookSearchOpen
                                ? "border-[#d96822] bg-[#fff0e5] text-[#b95016]"
                                : "border-[#e5dbd3] bg-[#fcfaf8] text-[#71675f] hover:border-[#d9b398]"
                            }`}
                          >
                            📖 Añadir obra
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            chooseBranch(
                              newPostBranch ===
                                "criticas"
                                ? "general"
                                : "criticas"
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-xs font-black transition ${
                            newPostBranch ===
                            "criticas"
                              ? "border-[#d96822] bg-[#fff0e5] text-[#b95016]"
                              : "border-[#e5dbd3] bg-[#fcfaf8] text-[#71675f] hover:border-[#d9b398]"
                          }`}
                        >
                          ✍️{" "}
                          {newPostBranch ===
                          "criticas"
                            ? "Es una crítica"
                            : "Marcar como crítica"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            chooseBranch(
                              newPostBranch ===
                                "autor"
                                ? "general"
                                : "autor"
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-xs font-black transition ${
                            newPostBranch ===
                            "autor"
                              ? "border-[#d96822] bg-[#fff0e5] text-[#b95016]"
                              : "border-[#e5dbd3] bg-[#fcfaf8] text-[#71675f] hover:border-[#d9b398]"
                          }`}
                        >
                          ❓{" "}
                          {newPostBranch ===
                          "autor"
                            ? "Pregunta al autor"
                            : "Preguntar al autor"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setNewPostSpoiler(
                              (
                                current
                              ) =>
                                !current
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-xs font-black transition ${
                            newPostSpoiler
                              ? "border-[#e6b961] bg-[#fff8e4] text-[#93691e]"
                              : "border-[#e5dbd3] bg-[#fcfaf8] text-[#71675f] hover:border-[#d9b398]"
                          }`}
                        >
                          ⚠️{" "}
                          {newPostSpoiler
                            ? "Tiene spoilers"
                            : "Marcar spoiler"}
                        </button>
                      </div>

                      {newPostBranch ===
                        "autor" &&
                        !selectedWork && (
                          <p className="mt-3 rounded-[14px] bg-[#fff7ec] px-3 py-2 text-xs font-semibold text-[#9b6a32]">
                            Para enviar una
                            pregunta al autor
                            necesitamos saber
                            de qué obra estás
                            hablando.
                          </p>
                        )}
                    </div>
                  )}

                  {/* PUBLICAR */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-[#9a8e85]">
                      {selectedWork
                        ? `📖 ${selectedWork.title}`
                        : "🌐 Se publicará para toda la comunidad"}
                    </div>

                    <button
                      type="button"
                      onClick={
                        publishPost
                      }
                      disabled={
                        busy ||
                        !newPost.trim() ||
                        (newPostBranch ===
                          "autor" &&
                          !selectedBookSlug)
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
            </section>

            {/* FEED TITLE */}
            <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b16a3e]">
                  Ahora en SEBORO
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#29221e]">
                  {filter ===
                  "all"
                    ? "Lo que está diciendo la comunidad"
                    : branchMeta[
                        filter
                      ].label}
                </h2>
              </div>

              <span className="rounded-full border border-[#e8ded6] bg-white px-3 py-1.5 text-xs font-bold text-[#887e75]">
                {
                  filteredPosts.length
                }{" "}
                publicaciones
              </span>
            </div>

            {/* POSTS */}
            {loading ? (
              <div className="mt-5 space-y-4">
                {Array.from({
                  length: 4,
                }).map(
                  (_, index) => (
                    <div
                      key={
                        index
                      }
                      className="h-64 animate-pulse rounded-[26px] border border-[#eadfd6] bg-white"
                    />
                  )
                )}
              </div>
            ) : filteredPosts.length ===
              0 ? (
              <div className="mt-5 rounded-[26px] border border-dashed border-[#decfc3] bg-white p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1e6] text-xl">
                  💬
                </div>

                <h3 className="mt-4 text-lg font-black text-[#403731]">
                  Aquí todavía hay
                  mucho por decir.
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#887d74]">
                  Sé de las primeras
                  personas en iniciar una
                  conversación.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredPosts.map(
                  (post) => {
                    const work =
                      post.book_slug
                        ? workBySlug.get(
                            post.book_slug
                          )
                        : undefined;

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

                    const postIsAuthor =
                      Boolean(
                        work?.authorUserId
                      ) &&
                      work?.authorUserId ===
                        post.user_id;

                    const spoilerVisible =
                      !post.spoiler ||
                      visibleSpoilers.includes(
                        post.id
                      );

                    const repliesVisible =
                      openReplies.includes(
                        post.id
                      );

                    const authorReply =
                      work?.authorUserId
                        ? postReplies.find(
                            (
                              reply
                            ) =>
                              reply.user_id ===
                              work.authorUserId
                          )
                        : undefined;

                    const canReply =
                      post.branch !==
                        "autor" ||
                      !work?.authorUserId ||
                      snapshot.currentUserId ===
                        work.authorUserId;

                    return (
                      <article
                        key={
                          post.id
                        }
                        className={`overflow-hidden rounded-[26px] border bg-white shadow-[0_8px_26px_rgba(93,62,39,0.035)] ${
                          postIsAuthor
                            ? "border-[#eab994]"
                            : "border-[#ead8ca]"
                        }`}
                      >
                        <div className="p-5 md:p-6">
                          {/* CABECERA */}
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
                                  work?.authorUserId ? (
                                    <Link
                                      href={`/autores/${work.authorUserId}`}
                                      className="truncate font-black text-[#342d28] transition hover:text-[#c45b1b]"
                                    >
                                      {
                                        post.display_name
                                      }
                                    </Link>
                                  ) : (
                                    <Link
                                      href={`/usuarios/${post.user_id}`}
                                      className="truncate font-black text-[#342d28] transition hover:text-[#c45b1b]"
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
                                        post.branch
                                      ].icon
                                    }{" "}
                                    {
                                      branchMeta[
                                        post.branch
                                      ].shortLabel
                                    }
                                  </span>

                                  {!work && (
                                    <>
                                      <span>
                                        ·
                                      </span>

                                      <span>
                                        🌐 Global
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {post.spoiler && (
                                <span className="hidden rounded-full border border-[#eed3a0] bg-[#fff8e8] px-2.5 py-1 text-[10px] font-bold text-[#9a7024] sm:inline">
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

                          {/* TEXTO */}
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
                                className="w-full rounded-[20px] border border-[#efd3a5] bg-[#fff9e9] p-5 text-left transition hover:border-[#e4bd7b]"
                              >
                                <p className="font-black text-[#775820]">
                                  ⚠️ Esta
                                  publicación contiene
                                  spoilers
                                </p>

                                <p className="mt-1 text-sm leading-6 text-[#9b7b42]">
                                  Presiona para
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
                                  className="mt-3 text-xs font-semibold text-[#9c8f85] underline underline-offset-4"
                                >
                                  Ocultar spoiler
                                </button>
                              )}
                          </div>

                          {/* OBRA VINCULADA */}
                          {work && (
                            <Link
                              href={`/comunidad/${work.slug}`}
                              className="group mt-5 flex items-center gap-3 rounded-[18px] border border-[#e9dfd7] bg-[#fcfaf8] p-3 transition hover:border-[#dcb99e] hover:bg-[#fff8f2]"
                            >
                              <div
                                className="h-[72px] w-[48px] shrink-0 rounded-[8px] border border-[#ddd3cb]"
                                style={{
                                  background:
                                    work.cover,
                                }}
                              />

                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#b66a3a]">
                                  Hablando de
                                </p>

                                <p className="mt-1 truncate text-sm font-black text-[#3f3630] transition group-hover:text-[#c45b1b]">
                                  {
                                    work.title
                                  }
                                </p>

                                <p className="mt-0.5 truncate text-xs text-[#90867e]">
                                  {
                                    work.author
                                  }{" "}
                                  ·{" "}
                                  {
                                    work.genre
                                  }
                                </p>
                              </div>

                              <span className="text-sm font-black text-[#c45b1b]">
                                →
                              </span>
                            </Link>
                          )}

                          {/* RESPUESTA DESTACADA DEL AUTOR */}
                          {post.branch ===
                            "autor" &&
                            authorReply && (
                              <div className="mt-4 rounded-[19px] border border-[#e6b28c] bg-[#fff8f2] p-4">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d96822] text-xs text-white">
                                    ✓
                                  </span>

                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#b95016]">
                                    El autor respondió
                                  </p>
                                </div>

                                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#655950]">
                                  {
                                    authorReply.body
                                  }
                                </p>
                              </div>
                            )}

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
                                    title={
                                      reaction.label
                                    }
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      react(
                                        post.id,
                                        reaction.id
                                      )
                                    }
                                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                                      mine
                                        ? "border-[#e7a477] bg-[#fff0e5] text-[#ad4c12]"
                                        : "border-[#e7ddd5] bg-[#fcfaf8] text-[#716860] hover:border-[#dfb99d] hover:bg-[#fff7f1]"
                                    }`}
                                  >
                                    <span className="text-sm">
                                      {
                                        reaction.emoji
                                      }
                                    </span>

                                    <span className="ml-1.5 hidden md:inline">
                                      {
                                        reaction.label
                                      }
                                    </span>

                                    {rows.length >
                                      0 && (
                                      <span className="ml-1.5 text-[#a07860]">
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
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleReplies(
                                    post.id
                                  )
                                }
                                className="flex items-center gap-2 text-sm font-black text-[#625950] transition hover:text-[#c45b1b]"
                              >
                                💬

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

                              {work && (
                                <Link
                                  href={`/comunidad/${work.slug}`}
                                  className="text-xs font-black text-[#b9632e] transition hover:text-[#9b4210]"
                                >
                                  Abrir comunidad de
                                  la obra →
                                </Link>
                              )}
                            </div>

                            {repliesVisible && (
                              <div className="mt-5 ml-4 border-l-2 border-[#efe4dc] pl-4 md:ml-6">
                                <div className="space-y-3">
                                  {postReplies.map(
                                    (
                                      reply
                                    ) => {
                                      const replyIsAuthor =
                                        Boolean(
                                          work?.authorUserId
                                        ) &&
                                        reply.user_id ===
                                          work?.authorUserId;

                                      return (
                                        <div
                                          key={
                                            reply.id
                                          }
                                          className={`rounded-[18px] border p-4 ${
                                            replyIsAuthor
                                              ? "border-[#e8b590] bg-[#fff8f2]"
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
                                                small
                                              />

                                              <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <p className="truncate text-sm font-black text-[#403832]">
                                                    {
                                                      reply.display_name
                                                    }
                                                  </p>

                                                  {replyIsAuthor && (
                                                    <AuthorBadge
                                                      answer={
                                                        post.branch ===
                                                        "autor"
                                                      }
                                                    />
                                                  )}
                                                </div>

                                                <p className="mt-0.5 text-[11px] text-[#9e948c]">
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

                                {canReply ? (
                                  <div className="mt-4 flex gap-2">
                                    <input
                                      value={
                                        replyDrafts[
                                          post.id
                                        ] ||
                                        ""
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
                                        post.branch ===
                                          "autor"
                                          ? "Responder como autor..."
                                          : "Escribe una respuesta..."
                                      }
                                      className="min-w-0 flex-1 rounded-full border border-[#e3d9d1] bg-white px-4 py-2.5 text-sm text-[#413934] outline-none placeholder:text-[#aaa098] focus:border-[#d6a17c]"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        publishReply(
                                          post
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
                                ) : (
                                  <div className="mt-4 rounded-[16px] border border-[#ead8ca] bg-[#fffaf6] px-4 py-3 text-xs leading-5 text-[#887b71]">
                                    Esta pregunta está
                                    esperando una
                                    respuesta oficial
                                    de{" "}
                                    <strong className="text-[#b95016]">
                                      {
                                        work?.author
                                      }
                                    </strong>
                                    .
                                  </div>
                                )}
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
          </div>

          {/* LATERAL */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[24px] border border-[#d9b28f] bg-gradient-to-br from-[#fffaf6] to-[#fff0e5] p-5 shadow-[0_10px_26px_rgba(137,76,32,0.07)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[#302923]">
                  Se está hablando de
                </h2>

                <span className="text-lg">
                  🔥
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-[#948a82]">
                Historias que están
                generando conversación.
              </p>

              <div className="mt-4 space-y-4">
                {activeWorks.map(
                  (
                    item,
                    index
                  ) => (
                    <Link
                      key={
                        item.work
                          .slug
                      }
                      href={`/comunidad/${item.work.slug}`}
                      className="group flex items-center gap-3"
                    >
                      <span className="w-4 shrink-0 text-center text-xs font-black text-[#c1b5ac]">
                        {index +
                          1}
                      </span>

                      <div
                        className="h-[62px] w-[42px] shrink-0 rounded-[8px] border border-[#ddd4cc]"
                        style={{
                          background:
                            item.work
                              .cover,
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#3d342e] transition group-hover:text-[#c45b1b]">
                          {
                            item.work
                              .title
                          }
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[#958a82]">
                          {
                            item.posts
                          }{" "}
                          {item.posts ===
                          1
                            ? "conversación"
                            : "conversaciones"}
                        </p>
                      </div>
                    </Link>
                  )
                )}

                {!loading &&
                  activeWorks.length ===
                    0 && (
                    <p className="text-sm leading-6 text-[#91867e]">
                      Cuando empiece la
                      conversación, las
                      obras activas
                      aparecerán aquí.
                    </p>
                  )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e3b991] bg-[#fff4ea] p-5 shadow-[0_8px_22px_rgba(137,76,32,0.05)]">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b56532]">
                Explora la conversación
              </p>

              <h2 className="mt-1 text-lg font-black text-[#342b25]">
                ¿Qué quieres encontrar?
              </h2>

              <div className="mt-4 space-y-2">
                {(
                  [
                    "general",
                    "criticas",
                    "autor",
                  ] as CommunityBranch[]
                ).map(
                  (key) => (
                    <button
                      key={
                        key
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          key
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-[16px] border border-[#efd8c7] bg-white/75 p-3 text-left transition hover:border-[#dda980]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e5]">
                        {
                          branchMeta[
                            key
                          ].icon
                        }
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#4d423a]">
                          {
                            branchMeta[
                              key
                            ].shortLabel
                          }
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-[#91847a]">
                          {
                            branchMeta[
                              key
                            ].description
                          }
                        </p>
                      </div>
                    </button>
                  )
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e7ddd5] bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#a97959]">
                Próximamente
              </p>

              <h2 className="mt-1 text-base font-black text-[#3c342e]">
                La Comunidad seguirá creciendo
              </h2>

              <div className="mt-4 space-y-3 text-sm text-[#756b63]">
                <p>
                  ◌ Recomiéndame una historia
                </p>

                <p>
                  ◌ Encuestas y debates
                </p>

                <p>
                  ◌ Círculos por género o tema
                </p>

                <p>
                  ◌ Lecturas conjuntas
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}