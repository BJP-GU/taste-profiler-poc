/**
 * Protocol numbers and contrastive taste helpers inspired by
 * Lin & Martelaro, "Learning Personal Style from Few Examples" (DIS '21) /
 * PseudoClient.
 *
 * Paper finding: 5 positive + 5 negative examples → 79.4% overall accuracy
 * in their few-shot setup (Table 2). We use that as the calibration target
 * for a designer's taste (not a client's), then translate the like/dislike
 * support sets into a semantic facet profile instead of image retrieval.
 */

import { WEB_FACETS, WEB_FACET_KEYS } from "./webFacets";

/** Minimum liked (positive support set) examples — paper's handful size. */
export const MIN_LIKED = 5;

/** Minimum disliked (negative support set) examples. */
export const MIN_DISLIKED = 5;

export const PAPER_CITATION =
  "Lin & Martelaro, Learning Personal Style from Few Examples (DIS ’21)";

/**
 * Whole-site valence for a reference.
 * Prefers explicit `valence` (±1); falls back to mean facet score sign.
 */
export function referenceValence(ref) {
  if (ref?.valence === 1 || ref?.valence === -1) return ref.valence;
  if (!Array.isArray(ref?.facets) || ref.facets.length === 0) return 0;
  const sum = ref.facets.reduce((acc, f) => acc + (Number(f.score) || 0), 0);
  const avg = sum / ref.facets.length;
  if (avg > 0.15) return 1;
  if (avg < -0.15) return -1;
  return 0;
}

export function partitionByValence(refs) {
  const liked = [];
  const disliked = [];
  const neutral = [];
  for (const ref of refs) {
    const v = referenceValence(ref);
    if (v === 1) liked.push(ref);
    else if (v === -1) disliked.push(ref);
    else neutral.push(ref);
  }
  return { liked, disliked, neutral };
}

export function calibrationStatus(refs) {
  const { liked, disliked, neutral } = partitionByValence(refs);
  return {
    likedCount: liked.length,
    dislikedCount: disliked.length,
    neutralCount: neutral.length,
    requiredLiked: MIN_LIKED,
    requiredDisliked: MIN_DISLIKED,
    ready: liked.length >= MIN_LIKED && disliked.length >= MIN_DISLIKED,
    likedRemaining: Math.max(0, MIN_LIKED - liked.length),
    dislikedRemaining: Math.max(0, MIN_DISLIKED - disliked.length),
  };
}

function normalizePhrase(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(phrase) {
  return normalizePhrase(phrase)
    .split(" ")
    .filter((t) => t.length > 2);
}

/**
 * Juxtaposition-style contrast (Principle 3 in the paper): learn by comparing
 * what co-occurs in liked vs disliked sets, rather than labeling style words
 * in isolation.
 *
 * Returns structured evidence per facet for semantic synthesis.
 */
export function computeContrastiveTaste(refs) {
  const { liked, disliked } = partitionByValence(refs);
  const facets = {};

  for (const meta of WEB_FACETS) {
    const key = meta.key;
    const likedDescs = [];
    const dislikedDescs = [];

    for (const ref of liked) {
      const f = ref.facets?.find((x) => x.name === key);
      if (f?.descriptor?.trim()) {
        likedDescs.push({
          descriptor: f.descriptor.trim(),
          hostname: ref.hostname || ref.sourceUrl,
          sourceUrl: ref.sourceUrl,
        });
      }
    }
    for (const ref of disliked) {
      const f = ref.facets?.find((x) => x.name === key);
      if (f?.descriptor?.trim()) {
        dislikedDescs.push({
          descriptor: f.descriptor.trim(),
          hostname: ref.hostname || ref.sourceUrl,
          sourceUrl: ref.sourceUrl,
        });
      }
    }

    const likedTokens = new Map();
    const dislikedTokens = new Map();
    for (const d of likedDescs) {
      for (const t of tokenize(d.descriptor)) {
        likedTokens.set(t, (likedTokens.get(t) || 0) + 1);
      }
    }
    for (const d of dislikedDescs) {
      for (const t of tokenize(d.descriptor)) {
        dislikedTokens.set(t, (dislikedTokens.get(t) || 0) + 1);
      }
    }

    const preferredSignals = [];
    const avoidedSignals = [];
    const allTokens = new Set([...likedTokens.keys(), ...dislikedTokens.keys()]);
    for (const t of allTokens) {
      const lp = likedTokens.get(t) || 0;
      const dn = dislikedTokens.get(t) || 0;
      const score = lp - dn;
      if (score >= 2 || (lp >= 2 && dn === 0)) preferredSignals.push({ token: t, score });
      if (score <= -2 || (dn >= 2 && lp === 0)) avoidedSignals.push({ token: t, score: -score });
    }
    preferredSignals.sort((a, b) => b.score - a.score);
    avoidedSignals.sort((a, b) => b.score - a.score);

    const evidenceStrength =
      likedDescs.length + dislikedDescs.length === 0
        ? 0
        : Math.min(
            1,
            (likedDescs.length + dislikedDescs.length) /
              (MIN_LIKED + MIN_DISLIKED)
          );

    facets[key] = {
      label: meta.label,
      likedDescriptors: likedDescs,
      dislikedDescriptors: dislikedDescs,
      preferredSignals: preferredSignals.slice(0, 8).map((s) => s.token),
      avoidedSignals: avoidedSignals.slice(0, 8).map((s) => s.token),
      evidenceStrength: Number(evidenceStrength.toFixed(2)),
    };
  }

  return {
    method: "juxtaposition_contrast",
    paper: PAPER_CITATION,
    supportSet: {
      liked: liked.map((r) => ({
        id: r.id,
        hostname: r.hostname,
        sourceUrl: r.sourceUrl,
      })),
      disliked: disliked.map((r) => ({
        id: r.id,
        hostname: r.hostname,
        sourceUrl: r.sourceUrl,
      })),
    },
    facets,
    facetKeys: WEB_FACET_KEYS,
  };
}
