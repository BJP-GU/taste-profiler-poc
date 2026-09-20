// Single source of truth for the six scoreable facets.
// Used by both server code (API routes, Claude prompts) and client components.
export const FACETS = [
  { key: "color", label: "Color" },
  { key: "typography", label: "Typography" },
  { key: "composition_layout", label: "Composition & Layout" },
  { key: "imagery_style", label: "Imagery & Illustration Style" },
  { key: "form_shape", label: "Form & Shape Language" },
  { key: "texture_materiality", label: "Texture & Materiality" },
];

export const FACET_KEYS = FACETS.map((f) => f.key);
