import { NextResponse } from "next/server";
import {
  listWeb2References,
  getCachedWeb2Profile,
  saveCachedWeb2Profile,
  web2ReferenceIdFingerprint,
} from "@/lib/web2Db";
import { synthesizeSemanticTasteProfile } from "@/lib/webClaude";
import { WEB_FACET_KEYS, WEB_FACETS, aggregateWebFacets } from "@/lib/webFacets";
import {
  calibrationStatus,
  computeContrastiveTaste,
  MIN_LIKED,
  MIN_DISLIKED,
  PAPER_CITATION,
} from "@/lib/pseudoClient";

function placementPayload(refs) {
  return refs.map((r) => ({
    id: r.id,
    imagePath: r.imagePath || null,
    sourceUrl: r.sourceUrl,
    hostname: r.hostname,
    label: r.hostname || r.sourceUrl,
    valence: r.valence ?? 0,
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
  const calibration = calibrationStatus(refs);

  if (!calibration.ready) {
    return NextResponse.json({
      insufficientData: true,
      calibration,
      requiredLiked: MIN_LIKED,
      requiredDisliked: MIN_DISLIKED,
      count: refs.length,
      paper: PAPER_CITATION,
      placements,
    });
  }

  const fingerprint = `semantic:${web2ReferenceIdFingerprint(refs)}`;
  const cached = getCachedWeb2Profile();

  if (
    cached &&
    cached.fingerprint === fingerprint &&
    cached.profileText &&
    cached.semanticFacets
  ) {
    return NextResponse.json({
      insufficientData: false,
      count: refs.length,
      calibration,
      aggregated: cached.aggregated,
      contrastive: cached.contrastive,
      profileText: cached.profileText,
      semanticFacets: cached.semanticFacets,
      placements,
      paper: PAPER_CITATION,
      cached: true,
    });
  }

  const aggregated = aggregateWebFacets(refs);
  const contrastive = computeContrastiveTaste(refs);

  const totalDescriptors = Object.values(contrastive.facets).reduce(
    (sum, f) =>
      sum + (f.likedDescriptors?.length || 0) + (f.dislikedDescriptors?.length || 0),
    0
  );

  if (totalDescriptors === 0) {
    return NextResponse.json({
      insufficientData: false,
      insufficientDescriptors: true,
      count: refs.length,
      calibration,
      aggregated,
      contrastive,
      placements,
      paper: PAPER_CITATION,
      facetMeta: WEB_FACETS,
    });
  }

  let profileText;
  let semanticFacets;
  try {
    const semantic = await synthesizeSemanticTasteProfile(contrastive);
    profileText = semantic.summary;
    semanticFacets = semantic.facets;
    saveCachedWeb2Profile({
      fingerprint,
      referenceIds: refs.map((r) => r.id).sort(),
      count: refs.length,
      aggregated,
      contrastive,
      profileText,
      semanticFacets,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Semantic profile synthesis failed:", e.message);
    profileText =
      "Could not reach the model to generate a written summary right now (check ANTHROPIC_API_KEY in .env.local). Contrastive facet evidence below still reflects your liked vs disliked support sets.";
    semanticFacets = Object.fromEntries(
      WEB_FACET_KEYS.map((key) => [
        key,
        {
          prefers: (contrastive.facets[key]?.preferredSignals || []).join(", ") || "—",
          avoids: (contrastive.facets[key]?.avoidedSignals || []).join(", ") || "—",
          confidence: "low",
        },
      ])
    );
  }

  return NextResponse.json({
    insufficientData: false,
    insufficientDescriptors: false,
    count: refs.length,
    calibration,
    aggregated,
    contrastive,
    profileText,
    semanticFacets,
    placements,
    paper: PAPER_CITATION,
    facetMeta: WEB_FACETS,
    cached: false,
  });
}
