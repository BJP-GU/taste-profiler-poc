// Core homepage wireframe tokens for the Playground.
// Depth drives exploded-view placement: background = behind, foreground = in front.

export const PLAYGROUND_TOKEN_TYPES = [
  {
    type: "header",
    label: "Header",
    wireframeLabel: "Logo · Buttons",
    depth: "background",
    explodeOrder: 0,
  },
  {
    type: "headline",
    label: "Headline",
    wireframeLabel: "[Headline]",
    depth: "background",
    explodeOrder: 1,
  },
  {
    type: "hero_image",
    label: "Hero Image",
    wireframeLabel: "[Hero Image]",
    depth: "foreground",
    explodeOrder: 2,
  },
  {
    type: "cta",
    label: "CTA",
    wireframeLabel: "[CTA]",
    depth: "foreground",
    explodeOrder: 3,
  },
];

export function createBlankTokens(overrides = []) {
  return PLAYGROUND_TOKEN_TYPES.map((def, index) => {
    const override = overrides.find((t) => t.type === def.type) || {};
    return {
      id: override.id || `${def.type}-${index}`,
      type: def.type,
      label: override.label || def.label,
      wireframeLabel: override.wireframeLabel || def.wireframeLabel,
      depth: def.depth,
      explodeOrder: def.explodeOrder,
      status: "blank", // blank | generating | ready | error
      html: null,
      css: null,
      referenceId: null,
      prompt: null,
      error: null,
    };
  });
}
