// Single source of truth for web-design scoreable facets.
export const WEB_FACETS = [
  {
    key: "hero_composition",
    label: "Hero composition",
    hint: "Headline-to-visual ratio, above-the-fold hierarchy",
  },
  { key: "typography", label: "Typography", hint: null },
  { key: "color", label: "Color", hint: null },
  {
    key: "layout_grid",
    label: "Layout / grid",
    hint: "Section rhythm, whitespace, scroll pacing",
  },
  {
    key: "imagery_style",
    label: "Imagery style",
    hint: "Photography vs. illustration vs. 3D/abstract",
  },
  {
    key: "motion_interaction",
    label: "Motion / interaction",
    hint: "Scroll animation, hover states, restraint vs. heavy motion",
  },
  {
    key: "cta_design",
    label: "CTA design",
    hint: "Button style, placement, visual weight",
  },
];

export const WEB_FACET_KEYS = WEB_FACETS.map((f) => f.key);

export function aggregateWebFacets(refs) {
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
