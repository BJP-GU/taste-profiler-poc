import { NextResponse } from "next/server";
import {
  listWeb2References,
  getCachedWeb2Profile,
  saveCachedWeb2Profile,
  web2ReferenceIdFingerprint,
} from "@/lib/web2Db";
import { synthesizeWebProfile } from "@/lib/webClaude";
import { WEB_FACET_KEYS, aggregateWebFacets } from "@/lib/webFacets";

const MIN_REFERENCES = 5;

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
  const refs = listWeb2References();
  const placements = placementPayload(refs);

  if (refs.length < MIN_REFERENCES) {
    return NextResponse.json({
      insufficientData: true,
      count: refs.length,
      required: MIN_REFERENCES,
    });
  }

  const fingerprint = web2ReferenceIdFingerprint(refs);
  const cached = getCachedWeb2Profile();

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

  const aggregated = aggregateWebFacets(refs);

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
    saveCachedWeb2Profile({
      fingerprint,
      referenceIds: refs.map((r) => r.id).sort(),
      count: refs.length,
      aggregated,
      profileText,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Web2 profile synthesis failed:", e.message);
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
