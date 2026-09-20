import { NextResponse } from "next/server";
import {
  listWebReferences,
  getCachedWebProfile,
  saveCachedWebProfile,
  webReferenceIdFingerprint,
} from "@/lib/webDb";
import { synthesizeWebProfile } from "@/lib/webClaude";
import { WEB_FACET_KEYS } from "@/lib/webFacets";

const MIN_REFERENCES = 5;

function aggregateFacets(refs) {
  const aggregated = {};
  for (const key of WEB_FACET_KEYS) {
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

function placementPayload(refs) {
  return refs.map((r) => ({
    id: r.id,
    imagePath: r.imagePath || null,
    sourceUrl: r.sourceUrl,
    hostname: r.hostname,
    label: r.hostname || r.sourceUrl,
    scores: Object.fromEntries(
      WEB_FACET_KEYS.map((key) => {
        const facet = r.facets.find((f) => f.name === key);
        return [key, facet?.score ?? 0];
      })
    ),
  }));
}

export async function GET() {
  const refs = listWebReferences();
  const placements = placementPayload(refs);

  if (refs.length < MIN_REFERENCES) {
    return NextResponse.json({
      insufficientData: true,
      count: refs.length,
      required: MIN_REFERENCES,
    });
  }

  const fingerprint = webReferenceIdFingerprint(refs);
  const cached = getCachedWebProfile();

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
    profileText = await synthesizeWebProfile(aggregated);
    saveCachedWebProfile({
      fingerprint,
      referenceIds: refs.map((r) => r.id).sort(),
      count: refs.length,
      aggregated,
      profileText,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Web profile synthesis failed:", e.message);
    profileText =
      "Could not reach Claude to generate a written summary right now (check your API key). The facet placements below still reflect your current scores.";
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
