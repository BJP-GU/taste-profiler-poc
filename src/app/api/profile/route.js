import { NextResponse } from "next/server";
import {
  listReferences,
  getCachedProfile,
  saveCachedProfile,
  referenceIdFingerprint,
} from "@/lib/db";
import { synthesizeProfile } from "@/lib/claude";
import { FACET_KEYS } from "@/lib/facets";

const MIN_REFERENCES = 5;

function aggregateFacets(refs) {
  const aggregated = {};
  for (const key of FACET_KEYS) {
    const scores = [];
    const liked = [];
    const disliked = [];

    for (const ref of refs) {
      const facet = ref.facets.find((f) => f.name === key);
      if (!facet) continue;
      scores.push(facet.score);
      if (facet.score === 1 && facet.descriptor) liked.push(facet.descriptor);
      if (facet.score === -1 && facet.descriptor) disliked.push(facet.descriptor);
    }

    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    aggregated[key] = { average: Number(average.toFixed(2)), liked, disliked };
  }
  return aggregated;
}

// Live per-reference scores for the facet plot. Always computed from the
// current catalog so editing a sample updates the plot even when the written
// profile is still served from cache.
function placementPayload(refs) {
  return refs.map((r) => ({
    id: r.id,
    imagePath: r.imagePath,
    scores: Object.fromEntries(
      FACET_KEYS.map((key) => {
        const facet = r.facets.find((f) => f.name === key);
        return [key, facet?.score ?? 0];
      })
    ),
  }));
}

export async function GET() {
  const refs = listReferences();
  const placements = placementPayload(refs);

  if (refs.length < MIN_REFERENCES) {
    return NextResponse.json({
      insufficientData: true,
      count: refs.length,
      required: MIN_REFERENCES,
    });
  }

  const fingerprint = referenceIdFingerprint(refs);
  const cached = getCachedProfile();

  // Same set of references as last synthesis → return the cached write-up.
  // Editing an existing sample does not force a re-profile; only
  // adding/removing a reference (fingerprint change) does.
  if (
    cached &&
    cached.fingerprint === fingerprint &&
    cached.profileText &&
    cached.aggregated
  ) {
    return NextResponse.json({
      insufficientData: false,
      insufficientDescriptors: false,
      count: refs.length,
      aggregated: cached.aggregated,
      profileText: cached.profileText,
      placements,
      cached: true,
    });
  }

  const aggregated = aggregateFacets(refs);

  // If every reference has an empty descriptor (usually because automatic
  // vision tagging failed silently at upload time and nobody typed
  // anything in by hand), there's nothing concrete for the synthesis step
  // to describe. Say so explicitly instead of asking the model to write a
  // profile from numbers alone, which just produces a statistics summary.
  const totalDescriptors = Object.values(aggregated).reduce(
    (sum, f) => sum + f.liked.length + f.disliked.length,
    0
  );

  if (totalDescriptors === 0) {
    return NextResponse.json({
      insufficientData: false,
      insufficientDescriptors: true,
      count: refs.length,
      aggregated,
      placements,
    });
  }

  let profileText;
  try {
    profileText = await synthesizeProfile(aggregated);
    saveCachedProfile({
      fingerprint,
      referenceIds: refs.map((r) => r.id).sort(),
      count: refs.length,
      aggregated,
      profileText,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Profile synthesis failed:", e.message);
    profileText =
      "Could not reach Claude to generate a written summary right now (check your API key). The facet placements below still reflect your current scores.";
    // Do not cache API failures — retry on the next visit.
  }

  return NextResponse.json({
    insufficientData: false,
    insufficientDescriptors: false,
    count: refs.length,
    aggregated,
    placements,
    profileText,
    cached: false,
  });
}
