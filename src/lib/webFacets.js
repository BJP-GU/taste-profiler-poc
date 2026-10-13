// Single source of truth for web-design scoreable facets.
export const WEB_FACETS = [
  {
    key: "hero_composition",
    label: "Hero composition",
    hint: "Above-the-fold structure: headline vs visual balance, alignment, stacking, density",
  },
  {
    key: "typography",
    label: "Typography",
    hint: "Font families/weights if named, scale contrast, tracking, case, serif vs sans",
  },
  {
    key: "color",
    label: "Color",
    hint: "Palette roles, hex/rgb if present, contrast, accent vs neutrals, light/dark ground",
  },
  {
    key: "layout_grid",
    label: "Layout / grid",
    hint: "Columns, container width, section rhythm, whitespace, sticky/fixed chrome",
  },
  {
    key: "imagery_style",
    label: "Imagery style",
    hint: "Photo vs illustration vs 3D vs abstract; crop, treatment, decorative vs product",
  },
  {
    key: "motion_interaction",
    label: "Motion / interaction",
    hint: "Libraries, transitions, scroll/hover cues, marquee, carousel; or explicit stillness",
  },
  {
    key: "cta_design",
    label: "CTA design",
    hint: "Button shape/fill/outline, label tone, placement, primary vs secondary hierarchy",
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
