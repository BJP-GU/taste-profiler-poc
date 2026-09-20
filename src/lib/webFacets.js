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
