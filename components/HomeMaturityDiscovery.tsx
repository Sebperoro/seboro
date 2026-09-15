"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getPublishedWorks,
  getWorkCoverBackground,
  type PublishedWork,
} from "@/lib/publishedWorks";
import {
  DISCOVERY_LANE_POLICIES,
  getDiscoveryHomeLaneLimits,
  getDiscoveryLanePolicy,
  type DiscoveryLaneId,
} from "@/lib/discoveryLanePolicy";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PlatformMode =
  | "initial"
  | "learning"
  | "competitive"
  | "mature";

type MaturitySnapshot = {
  mode: PlatformMode;
  published_works: number;
  active_reader_work_pairs_30d: number;
  avg_readers_per_work: number;
  median_readers_per_work: number;
  works_with_5_readers: number;
  works_with_10_readers: number;
  works_with_25_readers: number;
  coverage_5: number;
  coverage_10: number;
  coverage_25: number;
  reason: string;
};

type DiscoverySignal = {
  work_id: string;
  slug: string;
  title: string;
  genre: string;
  work_status: string;
  serial_state: string | null;
  days_published: number;

  readers_total: number;
  readers_7d: number;
  readers_30d: number;
  active_in_progress: number;
  finished_total: number;
  avg_progress: number;

  saves_total: number;
  acquired_total: number;
  purchased_total: number;
  followers_total: number;

  community_posts_total: number;
  community_posts_7d: number;
  community_reactions_total: number;
  community_reactions_7d: number;
  community_replies_total: number;
  community_replies_7d: number;

  ratings_total: number;
  ratings_7d: number;
  avg_rating: number;
  reviews_total: number;
  reviews_7d: number;
  feedback_reactions_total: number;
  feedback_reactions_7d: number;
  annotations_total: number;

  impressions_7d: number;
  top1_7d: number;
  top4_7d: number;

  finish_rate: number;
  save_rate: number;
  follow_rate: number;
  signal_confidence: number;

  rating_confidence: number;
  bayesian_rating: number;
  rating_quality_score: number;
  rating_evidence_score: number;

  selection_seboro: boolean;
  editorial_quality_score: number | null;

  trend_score: number;
  breakout_score: number;
  quality_score: number;
  hidden_gem_score: number;
  community_score: number;
  favorite_score: number;

  has_growth_history: boolean;

  is_new: boolean;
  is_trending: boolean;
  is_breaking_out: boolean;
  is_hidden_gem: boolean;
  is_community_hot: boolean;
  is_community_favorite: boolean;
  is_serial: boolean;
};

type HomeWork = PublishedWork & {
  author_name: string;
};

type LaneKind =
  | "special"
  | "genre"
  | "mixed"
  | "community"
  | "format"
  | "mosaic";

type LaneItem = {
  work: HomeWork;
  signal: DiscoverySignal;
};

type Lane = {
  id: string;
  policyId: DiscoveryLaneId;
  kind: LaneKind;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  weight: number;
  appearanceChance: number;
  items: LaneItem[];
};

type ExposureEvent = {
  workId: string;
  laneId: string;
  position: number;
  at: number;
};

type GlobalExposurePenalty = {
  work_id: string;
  lane_id: string;
  lane_penalty: number;
  overall_penalty: number;
  exposure_score: number;
};

type CachedHomeLane = {
  id: string;
  workIds: string[];
};

type CachedHomeLayout = {
  expiresAt: number;
  exposureRecorded: boolean;
  lanes: CachedHomeLane[];
};

const EXPOSURE_MEMORY_DAYS = 7;
const MAX_EXPOSURE_EVENTS = 600;

const HOME_LAYOUT_TTL_MS =
  30 * 60 * 1000;

function homeLayoutKey(
  previewMode: boolean
) {
  return `seboro:home-layout:v2:${
    previewMode ? "preview" : "public"
  }`;
}

function readCachedHomeLayout(
  previewMode: boolean
): CachedHomeLayout | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        homeLayoutKey(previewMode)
      );

    if (!raw) return null;

    const parsed = JSON.parse(
      raw
    ) as CachedHomeLayout;

    if (
      !parsed ||
      !Number.isFinite(
        parsed.expiresAt
      ) ||
      parsed.expiresAt <=
        Date.now() ||
      !Array.isArray(parsed.lanes)
    ) {
      window.localStorage.removeItem(
        homeLayoutKey(previewMode)
      );
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCachedHomeLayout(
  previewMode: boolean,
  lanes: Lane[],
  exposureRecorded = false
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const value: CachedHomeLayout = {
      expiresAt:
        Date.now() +
        HOME_LAYOUT_TTL_MS,
      exposureRecorded,
      lanes: lanes.map((lane) => ({
        id: lane.id,
        workIds: lane.items.map(
          (item) => item.work.id
        ),
      })),
    };

    window.localStorage.setItem(
      homeLayoutKey(previewMode),
      JSON.stringify(value)
    );
  } catch {
    // La Home sigue funcionando sin cache local.
  }
}

function markCachedHomeLayoutRecorded(
  previewMode: boolean
) {
  const cached =
    readCachedHomeLayout(
      previewMode
    );

  if (!cached) return;

  try {
    window.localStorage.setItem(
      homeLayoutKey(previewMode),
      JSON.stringify({
        ...cached,
        exposureRecorded: true,
      })
    );
  } catch {
    // No bloquea la Home.
  }
}

function restoreCachedHomeLayout(
  cached: CachedHomeLayout,
  candidates: Lane[],
  maxLanes: number
) {
  const candidateById =
    new Map(
      candidates.map((lane) => [
        lane.id,
        lane,
      ])
    );

  const restored: Lane[] = [];

  for (const savedLane of cached.lanes) {
    const lane =
      candidateById.get(
        savedLane.id
      );

    if (!lane) continue;

    const itemById =
      new Map(
        lane.items.map((item) => [
          item.work.id,
          item,
        ])
      );

    const used =
      new Set<string>();

    const ordered: LaneItem[] = [];

    for (
      const workId of
      savedLane.workIds
    ) {
      const item =
        itemById.get(workId);

      if (!item) continue;

      used.add(workId);
      ordered.push(item);
    }

    /*
     * Si algo cambió durante esos 30 minutos
     * (p. ej. una obra dejó de estar disponible),
     * conservamos el orden existente y solo
     * añadimos al final candidatos todavía válidos.
     */
    for (const item of lane.items) {
      if (
        !used.has(item.work.id)
      ) {
        ordered.push(item);
      }
    }

    if (ordered.length === 0) {
      continue;
    }

    restored.push({
      ...lane,
      items: ordered,
    });

    if (
      restored.length >= maxLanes
    ) {
      break;
    }
  }

  return restored;
}

function exposureMemoryKey(
  previewMode: boolean
) {
  return `seboro:home-exposure-memory:v2:${
    previewMode ? "preview" : "public"
  }`;
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function normalizeNumber(
  value: unknown
) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizeMaturity(
  value: Record<string, unknown>
): MaturitySnapshot {
  return {
    mode: String(
      value.mode || "initial"
    ) as PlatformMode,
    published_works:
      normalizeNumber(
        value.published_works
      ),
    active_reader_work_pairs_30d:
      normalizeNumber(
        value.active_reader_work_pairs_30d
      ),
    avg_readers_per_work:
      normalizeNumber(
        value.avg_readers_per_work
      ),
    median_readers_per_work:
      normalizeNumber(
        value.median_readers_per_work
      ),
    works_with_5_readers:
      normalizeNumber(
        value.works_with_5_readers
      ),
    works_with_10_readers:
      normalizeNumber(
        value.works_with_10_readers
      ),
    works_with_25_readers:
      normalizeNumber(
        value.works_with_25_readers
      ),
    coverage_5:
      normalizeNumber(value.coverage_5),
    coverage_10:
      normalizeNumber(value.coverage_10),
    coverage_25:
      normalizeNumber(value.coverage_25),
    reason: String(value.reason || ""),
  };
}

function normalizeSignal(
  row: Record<string, unknown>
): DiscoverySignal {
  return {
    work_id: String(row.work_id || ""),
    slug: String(row.slug || ""),
    title: String(row.title || ""),
    genre: String(row.genre || ""),
    work_status: String(
      row.work_status || ""
    ),
    serial_state: row.serial_state
      ? String(row.serial_state)
      : null,
    days_published:
      normalizeNumber(
        row.days_published
      ),

    readers_total:
      normalizeNumber(
        row.readers_total
      ),
    readers_7d:
      normalizeNumber(row.readers_7d),
    readers_30d:
      normalizeNumber(
        row.readers_30d
      ),
    active_in_progress:
      normalizeNumber(
        row.active_in_progress
      ),
    finished_total:
      normalizeNumber(
        row.finished_total
      ),
    avg_progress:
      normalizeNumber(
        row.avg_progress
      ),

    saves_total:
      normalizeNumber(
        row.saves_total
      ),
    acquired_total:
      normalizeNumber(
        row.acquired_total
      ),
    purchased_total:
      normalizeNumber(
        row.purchased_total
      ),
    followers_total:
      normalizeNumber(
        row.followers_total
      ),

    community_posts_total:
      normalizeNumber(
        row.community_posts_total
      ),
    community_posts_7d:
      normalizeNumber(
        row.community_posts_7d
      ),
    community_reactions_total:
      normalizeNumber(
        row.community_reactions_total
      ),
    community_reactions_7d:
      normalizeNumber(
        row.community_reactions_7d
      ),
    community_replies_total:
      normalizeNumber(
        row.community_replies_total
      ),
    community_replies_7d:
      normalizeNumber(
        row.community_replies_7d
      ),

    ratings_total:
      normalizeNumber(
        row.ratings_total
      ),
    ratings_7d:
      normalizeNumber(row.ratings_7d),
    avg_rating:
      normalizeNumber(row.avg_rating),
    reviews_total:
      normalizeNumber(
        row.reviews_total
      ),
    reviews_7d:
      normalizeNumber(row.reviews_7d),
    feedback_reactions_total:
      normalizeNumber(
        row.feedback_reactions_total
      ),
    feedback_reactions_7d:
      normalizeNumber(
        row.feedback_reactions_7d
      ),
    annotations_total:
      normalizeNumber(
        row.annotations_total
      ),

    impressions_7d:
      normalizeNumber(
        row.impressions_7d
      ),
    top1_7d:
      normalizeNumber(row.top1_7d),
    top4_7d:
      normalizeNumber(row.top4_7d),

    finish_rate:
      normalizeNumber(row.finish_rate),
    save_rate:
      normalizeNumber(row.save_rate),
    follow_rate:
      normalizeNumber(row.follow_rate),
    signal_confidence:
      normalizeNumber(
        row.signal_confidence
      ),

    rating_confidence:
      normalizeNumber(
        row.rating_confidence
      ),
    bayesian_rating:
      normalizeNumber(
        row.bayesian_rating
      ),
    rating_quality_score:
      normalizeNumber(
        row.rating_quality_score
      ),
    rating_evidence_score:
      normalizeNumber(
        row.rating_evidence_score
      ),

    selection_seboro:
      Boolean(row.selection_seboro),
    editorial_quality_score:
      row.editorial_quality_score == null
        ? null
        : normalizeNumber(
            row.editorial_quality_score
          ),

    trend_score:
      normalizeNumber(row.trend_score),
    breakout_score:
      normalizeNumber(
        row.breakout_score
      ),
    quality_score:
      normalizeNumber(
        row.quality_score
      ),
    hidden_gem_score:
      normalizeNumber(
        row.hidden_gem_score
      ),
    community_score:
      normalizeNumber(
        row.community_score
      ),
    favorite_score:
      normalizeNumber(
        row.favorite_score
      ),

    has_growth_history:
      Boolean(row.has_growth_history),

    is_new: Boolean(row.is_new),
    is_trending:
      Boolean(row.is_trending),
    is_breaking_out:
      Boolean(row.is_breaking_out),
    is_hidden_gem:
      Boolean(row.is_hidden_gem),
    is_community_hot:
      Boolean(row.is_community_hot),
    is_community_favorite:
      Boolean(
        row.is_community_favorite
      ),
    is_serial:
      Boolean(row.is_serial),
  };
}

function readExposureMemory(
  previewMode: boolean
): ExposureEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        exposureMemoryKey(previewMode)
      );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const cutoff =
      Date.now() -
      EXPOSURE_MEMORY_DAYS *
        24 *
        60 *
        60 *
        1000;

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.workId === "string" &&
          typeof item.laneId === "string" &&
          Number.isFinite(
            Number(item.position)
          ) &&
          Number.isFinite(
            Number(item.at)
          ) &&
          Number(item.at) >= cutoff
      )
      .map((item) => ({
        workId: String(item.workId),
        laneId: String(item.laneId),
        position: Number(item.position),
        at: Number(item.at),
      }))
      .slice(-MAX_EXPOSURE_EVENTS);
  } catch {
    return [];
  }
}

function writeExposureMemory(
  previewMode: boolean,
  events: ExposureEvent[]
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      exposureMemoryKey(previewMode),
      JSON.stringify(
        events.slice(
          -MAX_EXPOSURE_EVENTS
        )
      )
    );
  } catch {
    // La Home funciona aunque
    // localStorage esté bloqueado.
  }
}

function getLocalExposurePenalty(
  workId: string,
  laneId: string,
  events: ExposureEvent[]
) {
  const now = Date.now();
  const day =
    24 * 60 * 60 * 1000;

  let penalty = 0;

  for (const event of events) {
    if (event.workId !== workId) {
      continue;
    }

    const age = now - event.at;

    if (
      age < 0 ||
      age > 7 * day
    ) {
      continue;
    }

    const laneMultiplier =
      event.laneId === laneId
        ? 1.2
        : 0.8;

    const positionMultiplier =
      event.position === 0
        ? 1.8
        : event.position <= 2
        ? 1.25
        : 0.55;

    const timeMultiplier =
      age <=
      6 * 60 * 60 * 1000
        ? 1
        : age <= day
        ? 0.7
        : age <= 3 * day
        ? 0.35
        : 0.15;

    penalty +=
      laneMultiplier *
      positionMultiplier *
      timeMultiplier;
  }

  return clamp(penalty, 0, 7);
}

function mulberry32(seed: number) {
  return function random() {
    let value =
      (seed += 0x6d2b79f5);

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      ((value ^
        (value >>> 14)) >>>
        0) /
      4294967296
    );
  };
}

function hashString(
  value: string
) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(
      hash,
      16777619
    );
  }

  return hash >>> 0;
}

function weightedPermutation<
  T extends { weight: number }
>(
  values: T[],
  seed: number
) {
  const random = mulberry32(seed);

  return [...values]
    .map((value) => {
      const u = Math.max(
        random(),
        0.000001
      );

      return {
        value,
        key:
          -Math.log(u) /
          Math.max(
            0.01,
            value.weight
          ),
      };
    })
    .sort(
      (a, b) => a.key - b.key
    )
    .map((entry) => entry.value);
}

function shuffleWithSeed<T>(
  values: T[],
  seed: number
) {
  const random = mulberry32(seed);
  const result = [...values];

  for (
    let index =
      result.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      Math.floor(
        random() * (index + 1)
      );

    [
      result[index],
      result[swapIndex],
    ] = [
      result[swapIndex],
      result[index],
    ];
  }

  return result;
}

function genreName(
  value: string
) {
  const clean = value.trim();

  if (!clean) return "Otros";

  return (
    clean.charAt(0).toUpperCase() +
    clean.slice(1)
  );
}

function diversifyWorks(
  items: LaneItem[],
  maxItems: number,
  seed: number
) {
  const shuffled =
    shuffleWithSeed(
      items,
      seed
    );

  const selected: LaneItem[] =
    [];
  const deferred: LaneItem[] =
    [];
  const authors = new Set<string>();
  const genres = new Set<string>();

  for (const item of shuffled) {
    const author =
      item.work.author_id || "";
    const genre =
      item.work.genre
        ?.trim()
        .toLowerCase() || "otros";

    if (
      authors.has(author) ||
      genres.has(genre)
    ) {
      deferred.push(item);
      continue;
    }

    selected.push(item);
    authors.add(author);
    genres.add(genre);

    if (
      selected.length >= maxItems
    ) {
      return selected;
    }
  }

  for (const item of deferred) {
    selected.push(item);

    if (
      selected.length >= maxItems
    ) {
      break;
    }
  }

  return selected;
}

function laneItemBaseWeight(
  policyId: DiscoveryLaneId,
  signal: DiscoverySignal
) {
  if (
    policyId === "selection-seboro"
  ) {
    return (
      4 +
      (signal.editorial_quality_score ??
        signal.quality_score) /
        13 +
      signal.quality_score / 35
    );
  }

  if (policyId === "trend") {
    return (
      3.5 +
      signal.trend_score / 8
    );
  }

  if (
    policyId === "hidden-gem"
  ) {
    return (
      3.5 +
      signal.hidden_gem_score /
        8
    );
  }

  if (policyId === "breakout") {
    return (
      3.5 +
      signal.breakout_score / 8
    );
  }

  if (policyId === "new") {
    const freshness =
      clamp(
        (15 -
          signal.days_published) /
          2.4,
        0,
        6
      );

    return (
      3.5 +
      freshness +
      signal.trend_score / 28 +
      signal.quality_score / 45
    );
  }

  if (
    policyId === "community"
  ) {
    return (
      3.5 +
      signal.community_score / 8 +
      signal.trend_score / 45
    );
  }

  if (
    policyId ===
    "community-favorites"
  ) {
    return (
      3.5 +
      signal.favorite_score / 8 +
      signal.rating_evidence_score /
        28
    );
  }

  if (policyId === "serial") {
    return (
      3.5 +
      signal.trend_score / 18 +
      signal.community_score / 24 +
      signal.quality_score / 45
    );
  }

  if (
    policyId ===
    "mixed-diversity"
  ) {
    return (
      4 +
      signal.quality_score / 35 +
      signal.trend_score / 40 +
      signal.favorite_score / 55
    );
  }

  // Género: mérito equilibrado,
  // sin convertirlo en ranking puro.
  return (
    3.5 +
    signal.quality_score / 32 +
    signal.trend_score / 38 +
    signal.favorite_score / 50
  );
}

function weightedItems(
  laneId: string,
  policyId: DiscoveryLaneId,
  items: LaneItem[],
  seed: number,
  localEvents: ExposureEvent[],
  laneGlobalPenalties:
    Map<string, number>,
  overallGlobalPenalties:
    Map<string, number>
) {
  return weightedPermutation(
    items.map((item) => {
      const localPenalty =
        getLocalExposurePenalty(
          item.work.id,
          laneId,
          localEvents
        );

      const lanePenalty =
        laneGlobalPenalties.get(
          `${laneId}:${item.work.id}`
        ) || 0;

      const overallPenalty =
        overallGlobalPenalties.get(
          item.work.id
        ) || 0;

      const combinedPenalty =
        clamp(
          localPenalty * 0.65 +
            lanePenalty * 0.8 +
            overallPenalty *
              0.35,
          0,
          8
        );

      return {
        ...item,
        weight: clamp(
          laneItemBaseWeight(
            policyId,
            item.signal
          ) -
            combinedPenalty,
          1.25,
          16
        ),
      };
    }),
    seed
  ).map(
    ({ weight: _weight, ...item }) =>
      item
  );
}

function laneParticipates(
  lane: Lane,
  seed: number
) {
  const random = mulberry32(
    seed +
      hashString(
        `participate:${lane.id}`
      )
  );

  return (
    random() <
    lane.appearanceChance
  );
}

function biasDiscoveryMosaicPosition(
  lanes: Lane[],
  seed: number
) {
  const mosaicIndex =
    lanes.findIndex(
      (lane) =>
        lane.id ===
        "discovery-mosaic"
    );

  /*
   * Con pocos carriles dejamos que el mosaico
   * caiga donde lo coloque el sorteo normal.
   *
   * Cuando la Home ya tiene bastantes carriles,
   * el mosaico conserva aleatoriedad, pero en
   * ~70% de las visitas se fuerza a la primera
   * mitad para que sea una experiencia visible
   * sin convertirla en una sección fija.
   */
  if (
    mosaicIndex < 0 ||
    lanes.length < 6
  ) {
    return lanes;
  }

  const random = mulberry32(
    seed +
      hashString(
        "position:discovery-mosaic"
      )
  );

  if (random() >= 0.7) {
    return lanes;
  }

  const result = [...lanes];
  const [mosaic] = result.splice(
    mosaicIndex,
    1
  );

  const firstHalfSlots =
    Math.max(
      1,
      Math.ceil(
        result.length / 2
      )
    );

  const targetIndex =
    Math.floor(
      random() *
        firstHalfSlots
    );

  result.splice(
    targetIndex,
    0,
    mosaic
  );

  return result;
}

function modeLabel(
  mode: PlatformMode
) {
  if (mode === "learning") {
    return "Modo aprendizaje";
  }

  if (mode === "competitive") {
    return "Modo competitivo";
  }

  if (mode === "mature") {
    return "Modo maduro";
  }

  return "Modo inicial";
}

function WorkCard({
  work,
  signal,
  badge,
}: {
  work: HomeWork;
  signal: DiscoverySignal;
  badge: string;
}) {
  const price =
    Number(work.price_mxn || 0);

  return (
    <Link
      href={`/publicaciones/${work.slug}`}
      className="group w-[165px] shrink-0"
    >
      <div
        className="aspect-[2/3] w-full overflow-hidden rounded-[16px] border border-[#e0d7cf] bg-[#eee9e4] shadow-[0_9px_24px_rgba(62,45,34,0.08)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_15px_32px_rgba(62,45,34,0.13)]"
        style={{
          background:
            getWorkCoverBackground(work),
        }}
      />

      <div className="mt-2.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7d74]">
            {work.genre}
          </span>
        </div>

        <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-[1.15] text-[#27211d]">
          {work.title}
        </h3>

        <p className="mt-1 truncate text-[12px] text-[#80756e] md:text-[13px]">
          {work.author_name}
        </p>

        <div className="mt-1 flex items-center justify-between gap-1.5 text-[10px] md:mt-1.5 md:gap-2 md:text-[11px]">
          <span className="font-black text-[#b95016]">
            {price > 0
              ? `$${price.toLocaleString(
                  "es-MX"
                )} MXN`
              : "Gratis"}
          </span>

          <span className="text-[#8f8580]">
            {work.work_status ===
            "finished"
              ? "Terminada"
              : "En proceso"}
          </span>
        </div>

        {signal.ratings_total >
          0 && (
          <p className="mt-1 text-[10px] font-semibold text-[#9c8f7c] md:text-[11px]">
            ★{" "}
            {signal.avg_rating.toFixed(
              1
            )}{" "}
            ({signal.ratings_total})
          </p>
        )}

        {signal.community_posts_total >
          0 && (
          <p className="mt-1 text-[9px] font-bold text-[#745a8d] md:mt-1.5 md:text-[10px]">
            💬{" "}
            {
              signal.community_posts_total
            }{" "}
            {signal.community_posts_total ===
            1
              ? "conversación"
              : "conversaciones"}
          </p>
        )}
      </div>
    </Link>
  );
}

function DiscoveryMosaicSection({
  lane,
}: {
  lane: Lane;
}) {
  const AUTO_HOLD_MS = 5600;
  const MANUAL_HOLD_MS = 14000;

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [
    manualSelection,
    setManualSelection,
  ] = useState<{
    index: number;
    rowKey: string;
    until: number;
  } | null>(null);

  const [
    hoveredRows,
    setHoveredRows,
  ] = useState<
    Record<string, boolean>
  >({});

  const active =
    lane.items[
      activeIndex %
        Math.max(
          lane.items.length,
          1
        )
    ];

  const activeWasManual =
    manualSelection?.index ===
      activeIndex &&
    (manualSelection?.until || 0) >
      Date.now();

  useEffect(() => {
    if (
      lane.items.length <= 1
    ) {
      return;
    }

    let timeoutId:
      | number
      | undefined;

    const now = Date.now();

    if (
      manualSelection &&
      manualSelection.until > now
    ) {
      timeoutId =
        window.setTimeout(
          () => {
            setManualSelection(null);

            setActiveIndex(
              (current) =>
                (current + 1) %
                lane.items.length
            );
          },
          manualSelection.until -
            now
        );
    } else {
      timeoutId =
        window.setTimeout(
          () => {
            setActiveIndex(
              (current) =>
                (current + 1) %
                lane.items.length
            );
          },
          AUTO_HOLD_MS
        );
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(
          timeoutId
        );
      }
    };
  }, [
    activeIndex,
    lane.items.length,
    manualSelection,
  ]);

  useEffect(() => {
    if (
      activeIndex >=
      lane.items.length
    ) {
      setActiveIndex(0);
      setManualSelection(null);
    }
  }, [
    activeIndex,
    lane.items.length,
  ]);

  if (!active) {
    return null;
  }

  const price =
    Number(
      active.work.price_mxn || 0
    );

  const synopsis =
    String(
      (
        active.work as HomeWork & {
          synopsis?: string | null;
          description?: string | null;
          summary?: string | null;
        }
      ).synopsis ||
        (
          active.work as HomeWork & {
            description?: string | null;
          }
        ).description ||
        (
          active.work as HomeWork & {
            summary?: string | null;
          }
        ).summary ||
        "Descubre esta historia dentro de SEBORO."
    );

  /*
   * Cada hilera recibe TODO el conjunto de obras,
   * pero en un orden diferente. Así evitamos que,
   * con un catálogo pequeño, una fila quede casi
   * vacía o parezca formada siempre por las mismas
   * dos o tres portadas.
   */
  const rowOne =
    shuffleWithSeed(
      lane.items,
      hashString(
        `${lane.id}:mosaic-row-1`
      )
    );

  const rowTwo =
    shuffleWithSeed(
      lane.items,
      hashString(
        `${lane.id}:mosaic-row-2`
      )
    );

  const rowThree =
    shuffleWithSeed(
      lane.items,
      hashString(
        `${lane.id}:mosaic-row-3`
      )
    );

  const chooseWork = (
    item: LaneItem,
    rowKey: string
  ) => {
    const index =
      lane.items.findIndex(
        (candidate) =>
          candidate.work.id ===
          item.work.id
      );

    if (index < 0) {
      return;
    }

    setActiveIndex(index);

    setManualSelection({
      index,
      rowKey,
      until:
        Date.now() +
        MANUAL_HOLD_MS,
    });
  };

  const renderMovingRow = (
    row: LaneItem[],
    rowKey: string,
    direction:
      | "left"
      | "right",
    duration: number,
    delay: number
  ) => {
    /*
     * Cuatro copias idénticas del orden de la fila.
     * La animación avanza exactamente 25%, por lo
     * que el final coincide con el inicio siguiente
     * y nunca quedan huecos laterales.
     */
    const repeated = [
      ...row,
      ...row,
      ...row,
      ...row,
    ];

    const pausedByManual =
      Boolean(
        manualSelection &&
          manualSelection.rowKey ===
            rowKey &&
          manualSelection.until >
            Date.now()
      );

    const pausedByHover =
      Boolean(
        hoveredRows[rowKey]
      );

    const isPaused =
      pausedByManual ||
      pausedByHover;

    return (
      <div
        className="w-full overflow-hidden"
        onMouseEnter={() =>
          setHoveredRows(
            (current) => ({
              ...current,
              [rowKey]: true,
            })
          )
        }
        onMouseLeave={() =>
          setHoveredRows(
            (current) => ({
              ...current,
              [rowKey]: false,
            })
          )
        }
      >
        <div
          className={`flex w-max gap-3 ${
            direction === "left"
              ? "seboro-mosaic-left"
              : "seboro-mosaic-right"
          }`}
          style={{
            animationDuration:
              `${duration}s`,
            animationDelay:
              `${delay}s`,
            animationPlayState:
              isPaused
                ? "paused"
                : "running",
          }}
        >
          {repeated.map(
            (
              item,
              index
            ) => {
              const originalIndex =
                lane.items.findIndex(
                  (candidate) =>
                    candidate.work.id ===
                    item.work.id
                );

              const selected =
                originalIndex ===
                activeIndex;

              return (
                <button
                  key={`${rowKey}-${item.work.id}-${index}`}
                  type="button"
                  onClick={() =>
                    chooseWork(
                      item,
                      rowKey
                    )
                  }
                  aria-label={`Destacar ${item.work.title}`}
                  className={`group relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-[12px] border bg-[#eee9e4] shadow-[0_7px_18px_rgba(49,34,25,0.10)] transition md:h-[132px] md:w-[88px] ${
                    selected
                      ? "border-[#e36b24] ring-2 ring-[#e36b24]/35"
                      : "border-white/55 hover:-translate-y-1 hover:border-[#dc9a6b]"
                  }`}
                  style={{
                    background:
                      getWorkCoverBackground(
                        item.work
                      ),
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/14 via-transparent to-white/4"
                  />

                  {selected && (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#d96822] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
                      {activeWasManual
                        ? "Tu elección"
                        : "Destacada"}
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] border border-[#d1cecb] bg-[#dad8d6] shadow-[0_16px_42px_rgba(55,49,45,0.10)]">
      <style>{`
        @keyframes seboroMosaicLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); }
        }

        @keyframes seboroMosaicRight {
          from { transform: translateX(-25%); }
          to { transform: translateX(0); }
        }

        .seboro-mosaic-left {
          animation-name: seboroMosaicLeft;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .seboro-mosaic-right {
          animation-name: seboroMosaicRight;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .seboro-mosaic-left,
          .seboro-mosaic-right {
            animation: none !important;
          }
        }
      `}</style>

      <div className="relative border-b border-[#c45b1b] bg-[#d96822] px-5 py-2.5 md:px-6">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Explora SEBORO
            </span>

            <span className="h-3 w-px bg-white/40" />

            <span className="text-[10px] font-bold text-white/90">
              Historias en movimiento
            </span>
          </div>
        </div>

        <Link
          href="/descubre"
          className="absolute right-5 top-1/2 hidden -translate-y-1/2 text-[11px] font-black text-white transition hover:text-white/80 md:block"
        >
          Ver catálogo →
        </Link>
      </div>

      <div className="hidden md:block">
      <div className="relative min-h-[410px] overflow-hidden bg-gradient-to-br from-[#d9d7d5] via-[#e4e2e0] to-[#cfccca] py-0 md:min-h-[445px]">
        <div className="absolute inset-0 flex flex-col justify-center gap-2.5 py-3 md:gap-3 md:py-4">
          {renderMovingRow(
            rowOne,
            "row-1",
            "left",
            38,
            -7
          )}

          {renderMovingRow(
            rowTwo,
            "row-2",
            "right",
            44,
            -16
          )}

          {renderMovingRow(
            rowThree,
            "row-3",
            "left",
            50,
            -27
          )}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#d5d2d0]/80 to-transparent"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#d2cfcd]/80 to-transparent"
        />

        <div className="pointer-events-none relative z-20 flex min-h-[410px] items-center justify-start px-4 py-3 md:min-h-[445px] md:px-6">
          <div className="pointer-events-auto ml-1 w-full min-h-[286px] overflow-hidden rounded-[24px] border border-white/15 shadow-[0_18px_40px_rgba(34,30,27,0.22)] backdrop-blur-[7px] md:ml-2 md:w-[58%] md:max-w-[760px] lg:w-[56%] xl:w-[54%]">
            <div className="grid min-h-[286px] md:grid-cols-[205px_minmax(0,1fr)]">
              <div className="flex items-center bg-[#242220]/92 p-2.5 md:p-3">
                <Link
                  href={`/publicaciones/${active.work.slug}`}
                  className="group mx-auto block w-full max-w-[190px]"
                >
                  <div
                    className="aspect-[2/3] w-full overflow-hidden rounded-[16px] border border-white/15 bg-[#eee9e4] opacity-[0.98] shadow-[0_14px_30px_rgba(0,0,0,0.25)] transition duration-200 group-hover:-translate-y-1"
                    style={{
                      background:
                        getWorkCoverBackground(
                          active.work
                        ),
                    }}
                  />
                </Link>
              </div>

              <div className="flex min-h-[286px] flex-col bg-[#34312f]/84 p-5 backdrop-blur-[9px] md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#75513d] bg-[#2f2621]/88 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#f0a16d]">
                    {active.work.genre}
                  </span>

                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#d0c9c4]">
                    {active.work.work_status ===
                    "finished"
                      ? "Terminada"
                      : "En proceso"}
                  </span>

                  {activeWasManual && (
                    <span className="rounded-full border border-[#7a543c] bg-[#33251e]/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#f0a16d]">
                      Elegida por ti
                    </span>
                  )}
                </div>

                <h2 className="mt-3 line-clamp-2 min-h-[58px] text-[25px] font-black leading-[1.04] tracking-[-0.03em] text-white md:text-[29px]">
                  {active.work.title}
                </h2>

                <p className="mt-1.5 text-[13px] font-bold text-[#d0c7c1]">
                  {active.work.author_name}
                </p>

                <p className="mt-3 line-clamp-4 min-h-[96px] text-[13px] leading-6 text-[#e0d9d4]">
                  {synopsis}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-[12px]">
                  <span className="font-black text-[#f09a61]">
                    {price > 0
                      ? `$${price.toLocaleString(
                          "es-MX"
                        )} MXN`
                      : "Gratis"}
                  </span>

                  <span className="text-white/25">
                    ·
                  </span>

                  <span className="font-semibold text-[#d1cac5]">
                    {active.signal.readers_total > 0
                      ? `${active.signal.readers_total.toLocaleString(
                          "es-MX"
                        )} lectores`
                      : "Nueva oportunidad"}
                  </span>

                  {active.signal.avg_rating > 0 && (
                    <>
                      <span className="text-white/25">
                        ·
                      </span>

                      <span className="font-semibold text-[#d1cac5]">
                        ★{" "}
                        {active.signal.avg_rating.toFixed(
                          1
                        )}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link
                    href={`/publicaciones/${active.work.slug}`}
                    className="rounded-full bg-[#d95f19] px-4 py-2 text-[12px] font-black text-white shadow-[0_8px_20px_rgba(194,82,21,0.18)] transition hover:bg-[#bb4e12]"
                  >
                    Ver obra
                  </Link>

                  <Link
                    href="/descubre"
                    className="rounded-full border border-white/14 bg-black/12 px-4 py-2 text-[12px] font-black text-[#ece7e3] transition hover:bg-black/22"
                  >
                    Explorar catálogo
                  </Link>
                </div>

                {activeWasManual && (
                  <p className="mt-3 text-[10px] font-semibold leading-4 text-[#c8a990]">
                    Esta obra permanecerá destacada un poco más porque la seleccionaste directamente.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-2 right-4 z-20 rounded-full bg-[#e7e4e2]/80 px-3 py-1 text-[10px] font-semibold text-[#6f6965] backdrop-blur">
          Pasa el cursor para pausar · Clic para destacar
        </div>
      </div>
      </div>
      <div className="mt-3 md:hidden">
        <div className="overflow-hidden rounded-[20px] border border-white/15 bg-[#242220] shadow-[0_14px_34px_rgba(34,30,27,0.22)]">
          <Link
            href={`/publicaciones/${active.work.slug}`}
            className="group block"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[20px] bg-[#eee9e4]">
              {active.work.cover_url ? (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 scale-110 brightness-50 blur-xl"
                    style={{
                      backgroundImage: `url("${active.work.cover_url}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url("${active.work.cover_url}")`,
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </>
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background: active.work.cover_style,
                  }}
                />
              )}
            </div>
          </Link>

          <div className="flex flex-col bg-[#34312f]/95 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#75513d] bg-[#2f2621]/88 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#f0a16d]">
                {active.work.genre}
              </span>

              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#d0c9c4]">
                {active.work.work_status === "finished" ? "Terminada" : "En proceso"}
              </span>

              {activeWasManual && (
                <span className="rounded-full border border-[#7a543c] bg-[#33251e]/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#f0a16d]">
                  Elegida por ti
                </span>
              )}
            </div>

            <h2 className="mt-2.5 line-clamp-2 text-[20px] font-black leading-[1.1] tracking-[-0.02em] text-white">
              {active.work.title}
            </h2>

            <p className="mt-1 text-[12px] font-bold text-[#d0c7c1]">
              {active.work.author_name}
            </p>

            <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-[#e0d9d4]">
              {synopsis}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px]">
              <span className="font-black text-[#f09a61]">
                {price > 0
                  ? `$${price.toLocaleString("es-MX")} MXN`
                  : "Gratis"}
              </span>

              <span className="text-white/25">·</span>

              <span className="font-semibold text-[#d1cac5]">
                {active.signal.readers_total > 0
                  ? `${active.signal.readers_total.toLocaleString("es-MX")} lectores`
                  : "Nueva oportunidad"}
              </span>

              {active.signal.avg_rating > 0 && (
                <>
                  <span className="text-white/25">·</span>
                  <span className="font-semibold text-[#d1cac5]">
                    ★ {active.signal.avg_rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/publicaciones/${active.work.slug}`}
                className="rounded-full bg-[#d95f19] px-4 py-2 text-[12px] font-black text-white shadow-[0_8px_20px_rgba(194,82,21,0.18)] transition hover:bg-[#bb4e12]"
              >
                Ver obra
              </Link>

              <Link
                href="/descubre"
                className="rounded-full border border-white/14 bg-black/12 px-4 py-2 text-[12px] font-black text-[#ece7e3] transition hover:bg-black/22"
              >
                Explorar catálogo
              </Link>
            </div>

            {activeWasManual && (
              <p className="mt-2.5 text-[10px] font-semibold leading-4 text-[#c8a990]">
                Esta obra permanecerá destacada un poco más porque la seleccionaste directamente.
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-[16px] bg-gradient-to-br from-[#d9d7d5] via-[#e4e2e0] to-[#cfccca] py-2.5">
          {renderMovingRow(rowOne, "row-mobile", "left", 32, -5)}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#d5d2d0]/80 to-transparent"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#d2cfcd]/80 to-transparent"
          />
        </div>

        <p className="mt-2 text-center text-[10px] font-semibold text-[#8f8580]">
          Toca una portada para destacarla
        </p>
      </div>
    </section>
  );
}

function LaneSection({
  lane,
}: {
  lane: Lane;
}) {
  const scrollerRef =
    useRef<HTMLDivElement | null>(
      null
    );
  const [
    canScrollLeft,
    setCanScrollLeft,
  ] = useState(false);
  const [
    canScrollRight,
    setCanScrollRight,
  ] = useState(false);

  const updateScrollState = () => {
    const element =
      scrollerRef.current;

    if (!element) return;

    setCanScrollLeft(
      element.scrollLeft > 8
    );

    setCanScrollRight(
      element.scrollLeft +
        element.clientWidth <
        element.scrollWidth - 8
    );
  };

  useEffect(() => {
    updateScrollState();

    const element =
      scrollerRef.current;

    if (!element) return;

    const onScroll = () =>
      updateScrollState();

    element.addEventListener(
      "scroll",
      onScroll,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      updateScrollState
    );

    return () => {
      element.removeEventListener(
        "scroll",
        onScroll
      );

      window.removeEventListener(
        "resize",
        updateScrollState
      );
    };
  }, [lane.items.length]);

  const move = (
    direction: "left" | "right"
  ) => {
    const element =
      scrollerRef.current;

    if (!element) return;

    const amount = Math.max(
      360,
      Math.min(
        760,
        element.clientWidth * 0.78
      )
    );

    element.scrollBy({
      left:
        direction === "right"
          ? amount
          : -amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-8 overflow-hidden rounded-[26px] border border-[#e5d9d0] bg-white shadow-[0_12px_34px_rgba(75,55,40,0.07)]">
      <div className="flex items-end justify-between gap-4 border-b border-[#eee5de] px-5 py-3.5 md:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
              {lane.eyebrow}
            </p>

            {lane.kind ===
              "special" && (
              <span className="rounded-full border border-[#ead3c1] bg-[#fff8f2] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#a9501c]">
                Especial
              </span>
            )}
          </div>

          <h2 className="mt-1 text-[19px] font-black text-[#211f1c]">
            {lane.title}
          </h2>

          <p className="mt-0.5 max-w-3xl text-[13px] text-[#746d66]">
            {lane.description}
          </p>
        </div>

        <Link
          href="/descubre"
          className="shrink-0 text-sm font-black text-[#c45b1b] transition hover:text-[#963d0d]"
        >
          Ver más
        </Link>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto px-5 pb-4 pt-4 scroll-smooth md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {lane.items.map(
            ({ work, signal }) => (
              <WorkCard
                key={`${lane.id}-${work.id}`}
                work={work}
                signal={signal}
                badge={lane.badge}
              />
            )
          )}
        </div>

        {canScrollLeft && (
          <button
            type="button"
            onClick={() =>
              move("left")
            }
            aria-label={`Mover ${lane.title} hacia la izquierda`}
            className="absolute left-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[#211f1c]/72 text-2xl font-light leading-none text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:bg-[#211f1c]/90 active:scale-95 md:left-3 md:h-11 md:w-11 md:text-3xl"
          >
            ‹
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            onClick={() =>
              move("right")
            }
            aria-label={`Mover ${lane.title} hacia la derecha`}
            className="absolute right-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[#211f1c]/72 text-2xl font-light leading-none text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:bg-[#211f1c]/90 active:scale-95 md:right-3 md:h-11 md:w-11 md:text-3xl"
          >
            ›
          </button>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent"
        />
      </div>
    </section>
  );
}

export default function HomeMaturityDiscovery() {
  const [works, setWorks] =
    useState<HomeWork[]>([]);
  const [signals, setSignals] =
    useState<DiscoverySignal[]>([]);
  const [maturity, setMaturity] =
    useState<MaturitySnapshot | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const [
    previewMode,
    setPreviewMode,
  ] = useState(false);

  const [
    globalMemoryStatus,
    setGlobalMemoryStatus,
  ] = useState<
    "idle" |
      "saving" |
      "saved" |
      "error"
  >("idle");

  const [
    globalMemoryError,
    setGlobalMemoryError,
  ] = useState("");

  const [
    exposureEvents,
    setExposureEvents,
  ] = useState<ExposureEvent[]>([]);

  const [
    globalExposurePenalties,
    setGlobalExposurePenalties,
  ] = useState<
    GlobalExposurePenalty[]
  >([]);

  const sessionSeedRef = useRef(
    Math.floor(
      Math.random() *
        2_000_000_000
    )
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const isPreview =
          typeof window !==
            "undefined" &&
          new URLSearchParams(
            window.location.search
          ).get("preview") === "1";

        setPreviewMode(isPreview);
        setExposureEvents(
          readExposureMemory(
            isPreview
          )
        );

        const supabase =
          getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(
            "Falta conectar SEBORO con Supabase."
          );
        }

        const [
          publishedWorks,
          maturityResult,
          signalResult,
          penaltyResult,
        ] = await Promise.all([
          getPublishedWorks({
            includeTest: isPreview,
          }),
          supabase.rpc(
            "get_platform_maturity"
          ),
          supabase.rpc(
            "get_discovery_lane_signals",
            {
              p_preview: isPreview,
            }
          ),
          supabase.rpc(
            "get_home_exposure_penalties",
            {
              p_preview: isPreview,
              p_days: 7,
            }
          ),
        ]);

        if (
          maturityResult.error
        ) {
          throw new Error(
            maturityResult.error.message
          );
        }

        if (signalResult.error) {
          throw new Error(
            signalResult.error.message
          );
        }

        if (penaltyResult.error) {
          throw new Error(
            penaltyResult.error.message
          );
        }

        if (!active) return;

        const rawMaturity =
          Array.isArray(
            maturityResult.data
          )
            ? maturityResult.data[0]
            : maturityResult.data;

        setWorks(publishedWorks);

        setSignals(
          (
            (signalResult.data ||
              []) as Record<
              string,
              unknown
            >[]
          ).map(normalizeSignal)
        );

        setGlobalExposurePenalties(
          (
            (penaltyResult.data ||
              []) as Record<
              string,
              unknown
            >[]
          ).map((row) => ({
            work_id: String(
              row.work_id || ""
            ),
            lane_id: String(
              row.lane_id || ""
            ),
            lane_penalty:
              normalizeNumber(
                row.lane_penalty
              ),
            overall_penalty:
              normalizeNumber(
                row.overall_penalty
              ),
            exposure_score:
              normalizeNumber(
                row.exposure_score
              ),
          }))
        );

        setMaturity(
          rawMaturity
            ? normalizeMaturity(
                rawMaturity as Record<
                  string,
                  unknown
                >
              )
            : null
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el motor de descubrimiento de SEBORO."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const workById = useMemo(
    () =>
      new Map(
        works.map((work) => [
          work.id,
          work,
        ])
      ),
    [works]
  );

  const signalByWork =
    useMemo(
      () =>
        new Map(
          signals.map((signal) => [
            signal.work_id,
            signal,
          ])
        ),
      [signals]
    );

  const laneGlobalPenalties =
    useMemo(() => {
      const map =
        new Map<string, number>();

      globalExposurePenalties.forEach(
        (item) => {
          map.set(
            `${item.lane_id}:${item.work_id}`,
            item.lane_penalty
          );
        }
      );

      return map;
    }, [globalExposurePenalties]);

  const overallGlobalPenalties =
    useMemo(() => {
      const map =
        new Map<string, number>();

      globalExposurePenalties.forEach(
        (item) => {
          const current =
            map.get(item.work_id) ||
            0;

          map.set(
            item.work_id,
            Math.max(
              current,
              item.overall_penalty
            )
          );
        }
      );

      return map;
    }, [globalExposurePenalties]);

  const allItems = useMemo(
    () =>
      signals
        .map((signal) => {
          const work =
            workById.get(
              signal.work_id
            );

          return work
            ? {
                work,
                signal,
              }
            : null;
        })
        .filter(
          (
            item
          ): item is LaneItem =>
            Boolean(item)
        ),
    [signals, workById]
  );

  const candidateLanes =
    useMemo(() => {
      const seed =
        sessionSeedRef.current;
      const lanes: Lane[] = [];

      const createLane = (
        policyId: DiscoveryLaneId,
        options: {
          id?: string;
          kind: LaneKind;
          eyebrow: string;
          title?: string;
          description?: string;
          badge: string;
          items: LaneItem[];
        }
      ) => {
        const policy =
          getDiscoveryLanePolicy(
            policyId
          );

        if (
          options.items.length <
          policy.minItems
        ) {
          return;
        }

        const laneId =
          options.id || policy.id;

        lanes.push({
          id: laneId,
          policyId,
          kind: options.kind,
          eyebrow:
            options.eyebrow,
          title:
            options.title ||
            policy.title,
          description:
            options.description ||
            policy.description,
          badge: options.badge,
          weight:
            policy.positionWeight,
          appearanceChance:
            policy.appearanceChance,
          items: weightedItems(
            laneId,
            policyId,
            options.items.slice(
              0,
              policy.maxItems
            ),
            seed +
              hashString(
                `items:${laneId}`
              ),
            exposureEvents,
            laneGlobalPenalties,
            overallGlobalPenalties
          ),
        });
      };

      createLane(
        "selection-seboro",
        {
          kind: "special",
          eyebrow:
            "Selección editorial",
          badge: "SEBORO",
          items: allItems.filter(
            ({ signal }) =>
              signal.selection_seboro
          ),
        }
      );

      createLane("trend", {
        kind: "special",
        eyebrow: "Ahora",
        badge: "Tendencia",
        items: allItems.filter(
          ({ signal }) =>
            signal.is_trending
        ),
      });

      const mixedPolicy =
        getDiscoveryLanePolicy(
          "mixed-diversity"
        );

      if (
        allItems.length >=
        mixedPolicy.minItems
      ) {
        createLane(
          "mixed-diversity",
          {
            kind: "mixed",
            eyebrow: "Diversidad",
            badge: "Variado",
            items: diversifyWorks(
              allItems,
              mixedPolicy.maxItems,
              seed + 7031
            ),
          }
        );
      }

      /*
       * CARRIL ESPECIAL: MOSAICO DE DESCUBRIMIENTO
       *
       * Usa la política de diversidad como base para
       * ponderar obras, pero tiene identidad propia,
       * probabilidad propia y un tratamiento especial
       * de posición más adelante.
       */
      if (allItems.length >= 3) {
        const mosaicItems =
          weightedItems(
            "discovery-mosaic",
            "mixed-diversity",
            allItems,
            seed +
              hashString(
                "items:discovery-mosaic"
              ),
            exposureEvents,
            laneGlobalPenalties,
            overallGlobalPenalties
          ).slice(0, 18);

        lanes.push({
          id: "discovery-mosaic",
          policyId:
            "mixed-diversity",
          kind: "mosaic",
          eyebrow:
            "Descubrimiento vivo",
          title:
            "Explora SEBORO",
          description:
            "Una selección en movimiento para encontrar historias fuera de un ranking fijo.",
          badge: "Explora",
          weight: 8.8,
          appearanceChance:
            previewMode ? 1 : 0.82,
          items: mosaicItems,
        });
      }

      createLane(
        "hidden-gem",
        {
          kind: "special",
          eyebrow: "Descubrimiento",
          badge: "Joya",
          items: allItems.filter(
            ({ signal }) =>
              signal.is_hidden_gem
          ),
        }
      );

      createLane("breakout", {
        kind: "special",
        eyebrow: "Crecimiento",
        badge: "Despegando",
        items: allItems.filter(
          ({ signal }) =>
            signal.is_breaking_out
        ),
      });

      createLane("new", {
        kind: "special",
        eyebrow: "Lanzamiento",
        badge: "Nueva",
        items: allItems.filter(
          ({ signal }) =>
            signal.is_new
        ),
      });

      createLane("community", {
        kind: "community",
        eyebrow: "Comunidad",
        badge: "Conversación",
        items: allItems.filter(
          ({ signal }) =>
            signal.is_community_hot
        ),
      });

      createLane(
        "community-favorites",
        {
          kind: "community",
          eyebrow: "Comunidad",
          badge: "Favorita",
          items: allItems.filter(
            ({ signal }) =>
              signal.is_community_favorite
          ),
        }
      );

      const genrePolicy =
        getDiscoveryLanePolicy(
          "genre"
        );

      const byGenre =
        new Map<
          string,
          LaneItem[]
        >();

      allItems.forEach((item) => {
        const genre =
          item.work.genre
            ?.trim()
            .toLowerCase() ||
          "otros";

        const current =
          byGenre.get(genre) ||
          [];

        current.push(item);
        byGenre.set(
          genre,
          current
        );
      });

      [...byGenre.entries()]
        .sort(
          ([a], [b]) =>
            a.localeCompare(b, "es")
        )
        .forEach(
          ([genre, items]) => {
            if (
              items.length <
              genrePolicy.minItems
            ) {
              return;
            }

            createLane("genre", {
              id: `genre-${genre
                .normalize("NFD")
                .replace(
                  /[\u0300-\u036f]/g,
                  ""
                )
                .replace(
                  /[^a-z0-9]+/g,
                  "-"
                )
                .replace(
                  /^-|-$/g,
                  ""
                )}`,
              kind: "genre",
              eyebrow: "Género",
              title:
                genreName(genre),
              description: `Historias de ${genreName(
                genre
              )} disponibles ahora en SEBORO.`,
              badge:
                genreName(genre),
              items,
            });
          }
        );

      createLane("serial", {
        kind: "format",
        eyebrow: "Por capítulos",
        badge: "Seriada",
        items: allItems.filter(
          ({ signal }) =>
            signal.is_serial
        ),
      });

      return lanes;
    }, [
      allItems,
      exposureEvents,
      laneGlobalPenalties,
      overallGlobalPenalties,
      previewMode,
    ]);

  const lanes = useMemo(() => {
    if (
      candidateLanes.length === 0
    ) {
      return [];
    }

    const limits =
      getDiscoveryHomeLaneLimits(
        maturity?.mode || "initial",
        candidateLanes.length
      );

    /*
     * Durante 30 minutos conservamos EXACTAMENTE
     * los carriles y el orden de las obras de esa
     * persona/dispositivo. Así puede abrir un libro,
     * volver atrás y encontrar lo que había visto.
     */
    const cached =
      readCachedHomeLayout(
        previewMode
      );

    if (cached) {
      const restored =
        restoreCachedHomeLayout(
          cached,
          candidateLanes,
          limits.max
        );

      if (
        restored.length >=
        limits.min
      ) {
        return restored;
      }
    }

    const seed =
      sessionSeedRef.current;

    const selected =
      candidateLanes.filter(
        (lane) =>
          laneParticipates(
            lane,
            seed
          )
      );

    if (
      selected.length <
      limits.min
    ) {
      const selectedIds =
        new Set(
          selected.map(
            (lane) => lane.id
          )
        );

      const remaining =
        weightedPermutation(
          candidateLanes
            .filter(
              (lane) =>
                !selectedIds.has(
                  lane.id
                )
            )
            .map((lane) => ({
              ...lane,
              weight:
                lane.weight *
                lane.appearanceChance,
            })),
          seed + 8011
        );

      while (
        selected.length <
          limits.min &&
        remaining.length > 0
      ) {
        const next =
          remaining.shift();

        if (next) {
          selected.push(next);
        }
      }
    }

    const orderedBase =
      weightedPermutation(
        selected.map((lane) => ({
          ...lane,
          weight: lane.weight,
        })),
        seed + 9011
      )
        .slice(0, limits.max)
        .map(
          ({
            weight,
            ...lane
          }) => ({
            ...lane,
            weight,
          })
        );

    const ordered =
      biasDiscoveryMosaicPosition(
        orderedBase,
        seed
      );

    writeCachedHomeLayout(
      previewMode,
      ordered,
      false
    );

    return ordered;
  }, [
    candidateLanes,
    maturity?.mode,
    previewMode,
  ]);

  const recordedVisitRef =
    useRef(false);

  useEffect(() => {
    if (
      loading ||
      lanes.length === 0 ||
      recordedVisitRef.current
    ) {
      return;
    }

    const cachedLayout =
      readCachedHomeLayout(
        previewMode
      );

    /*
     * Volver a la misma Home dentro de los 30 min
     * no cuenta como una nueva exposición global.
     * Evita inflar métricas por recargar o regresar.
     */
    if (
      cachedLayout?.exposureRecorded
    ) {
      recordedVisitRef.current =
        true;
      setGlobalMemoryStatus(
        "saved"
      );
      return;
    }

    const now = Date.now();
    const newEvents:
      ExposureEvent[] = [];

    lanes.forEach((lane) => {
      lane.items
        .slice(0, 4)
        .forEach(
          (item, position) => {
            newEvents.push({
              workId:
                item.work.id,
              laneId: lane.id,
              position,
              at: now,
            });
          }
        );
    });

    if (
      newEvents.length === 0
    ) {
      return;
    }

    const cutoff =
      now -
      EXPOSURE_MEMORY_DAYS *
        24 *
        60 *
        60 *
        1000;

    const next = [
      ...exposureEvents.filter(
        (event) =>
          event.at >= cutoff
      ),
      ...newEvents,
    ].slice(
      -MAX_EXPOSURE_EVENTS
    );

    writeExposureMemory(
      previewMode,
      next
    );

    async function saveGlobal() {
      const supabase =
        getSupabaseBrowserClient();

      if (!supabase) return;

      setGlobalMemoryStatus(
        "saving"
      );
      setGlobalMemoryError("");

      const { error: rpcError } =
        await supabase.rpc(
          "record_home_exposure_batch",
          {
            p_events:
              newEvents.map(
                (event) => ({
                  work_id:
                    event.workId,
                  lane_id:
                    event.laneId,
                  position:
                    event.position,
                })
              ),
            p_preview:
              previewMode,
          }
        );

      if (rpcError) {
        setGlobalMemoryStatus(
          "error"
        );
        setGlobalMemoryError(
          rpcError.message
        );
        return;
      }

      recordedVisitRef.current =
        true;

      markCachedHomeLayoutRecorded(
        previewMode
      );

      setGlobalMemoryStatus(
        "saved"
      );
    }

    void saveGlobal();
  }, [
    loading,
    lanes,
    exposureEvents,
    previewMode,
  ]);

  if (loading) {
    return (
      <section className="mt-11">
        <div className="h-6 w-52 animate-pulse rounded-full bg-[#ece6e0]" />

        <div className="mt-5 flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="w-[165px] shrink-0"
              >
                <div className="aspect-[2/3] animate-pulse rounded-[16px] bg-[#eee9e4]" />
              </div>
            )
          )}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-11 rounded-[24px] border border-[#ead4c4] bg-[#fff8f2] p-5">
        <p className="text-sm font-black text-[#a9501c]">
          El catálogo sigue disponible, pero el motor de descubrimiento no pudo cargarse.
        </p>

        <p className="mt-1 text-sm text-[#816f63]">
          {error}
        </p>

        <Link
          href="/descubre"
          className="mt-4 inline-flex rounded-full bg-[#d95f19] px-4 py-2 text-sm font-black text-white"
        >
          Abrir Descubre
        </Link>
      </section>
    );
  }

  if (works.length === 0) {
    return (
      <section className="mt-11 rounded-[30px] border border-[#e5d9d0] bg-white px-6 py-8 shadow-[0_12px_34px_rgba(75,55,40,0.07)] md:px-8">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b95016]">
          Catálogo SEBORO
        </p>

        <h2 className="mt-2 text-2xl font-black text-[#211f1c]">
          Las primeras historias reales están por llegar.
        </h2>

        <p className="mt-3 max-w-2xl leading-7 text-[#746d66]">
          En cuanto existan publicaciones reales, los carriles aparecerán automáticamente según las señales del motor de descubrimiento.
        </p>

        <Link
          href="/?preview=1"
          className="mt-5 inline-flex rounded-full border border-[#d9c8ba] bg-[#fffaf6] px-5 py-2.5 text-sm font-black text-[#6f594a] transition hover:bg-[#fff4eb]"
        >
          Vista interna QA
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-11">
      {previewMode && (
        <div className="rounded-[24px] border border-[#d7e4e8] bg-[#f5fafb] px-5 py-4 md:flex md:items-center md:justify-between md:gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#b8d1da] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#4f7e8c]">
                {modeLabel(
                  maturity?.mode ||
                    "initial"
                )}
              </span>

              {previewMode && (
                <span className="rounded-full border border-[#e4c97c] bg-[#fff8d9] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8b6b08]">
                  Vista previa QA
                </span>
              )}

              {previewMode &&
                globalMemoryStatus !==
                  "idle" && (
                  <span
                    title={
                      globalMemoryStatus ===
                      "error"
                        ? globalMemoryError
                        : undefined
                    }
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      globalMemoryStatus ===
                      "saved"
                        ? "border-[#b7d8bf] bg-[#eff9f1] text-[#477052]"
                        : globalMemoryStatus ===
                          "error"
                        ? "border-[#e6b8b8] bg-[#fff1f1] text-[#a44848]"
                        : "border-[#cbd6df] bg-[#f3f7fa] text-[#667985]"
                    }`}
                  >
                    {globalMemoryStatus ===
                    "saved"
                      ? "Memoria global ✓"
                      : globalMemoryStatus ===
                        "error"
                      ? "Memoria global: error"
                      : "Guardando memoria…"}
                  </span>
                )}
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#65777e]">
              {previewMode
                ? "Vista interna del motor definitivo: la combinación de carriles y obras se mantiene 30 minutos para que puedas explorar y volver sin perder lo que viste. Al vencer ese tiempo, SEBORO vuelve a sortear la Home con sus probabilidades, mérito y memoria de exposición."
                : maturity?.mode ===
                  "initial"
                ? "SEBORO está reuniendo datos. Los carriles protegen la oportunidad de descubrimiento sin convertir la Home en un ranking fijo."
                : maturity?.reason ||
                  "SEBORO adapta el descubrimiento a la madurez del catálogo."}
            </p>
          </div>

          <Link
            href="/descubre"
            className="mt-4 inline-flex shrink-0 rounded-full border border-[#bdd0d7] bg-white px-4 py-2 text-sm font-black text-[#4f7e8c] transition hover:bg-[#edf6f8] md:mt-0"
          >
            Explorar catálogo →
          </Link>
        </div>
      )}

      {lanes.length === 0 ? (
        <section className="mt-8 rounded-[26px] border border-[#e5d9d0] bg-white px-6 py-7 shadow-[0_12px_34px_rgba(75,55,40,0.07)]">
          <h2 className="text-xl font-black text-[#211f1c]">
            El catálogo está reuniendo señales.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746d66]">
            Todavía no hay suficientes obras elegibles para formar los carriles de esta visita. SEBORO no crea categorías vacías solo para llenar espacio.
          </p>
        </section>
      ) : (
        lanes.map((lane) =>
          lane.kind ===
          "mosaic" ? (
            <DiscoveryMosaicSection
              key={lane.id}
              lane={lane}
            />
          ) : (
            <LaneSection
              key={lane.id}
              lane={lane}
            />
          )
        )
      )}
    </section>
  );
}
