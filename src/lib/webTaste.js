import {
  listWebReferences,
  getCachedWebProfile,
  webReferenceIdFingerprint,
} from "./webDb";
import { aggregateWebFacets } from "./webFacets";

/**
 * Taste context for generation. Uses the cached written profile when the
 * catalog hasn't changed; otherwise falls back to live facet aggregates so
 * Playground still sees preferences even if the profile page hasn't been opened.
 */
export function getWebTasteContext() {
  const refs = listWebReferences();
  const cached = getCachedWebProfile();
  const fingerprint = webReferenceIdFingerprint(refs);
  const cacheHit = Boolean(cached && cached.fingerprint === fingerprint);

  return {
    profileText: cacheHit ? cached.profileText || null : null,
    aggregated:
      cacheHit && cached.aggregated
        ? cached.aggregated
        : refs.length
          ? aggregateWebFacets(refs)
          : null,
    referenceCount: refs.length,
  };
}
