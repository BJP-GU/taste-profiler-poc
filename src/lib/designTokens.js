// Structured design tokens extracted from a landing page (web profiler 2.0).

export const TOKEN_CATEGORIES = [
  { key: "colors", label: "Colors" },
  { key: "typography", label: "Typography" },
  { key: "icons", label: "Icons" },
];

export function emptyDesignTokens() {
  return { colors: [], typography: [], icons: [] };
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeColor(item) {
  if (!item || typeof item !== "object") return null;
  const label = asString(item.label) || "Color";
  const value = asString(item.value);
  if (!value) return null;
  return {
    label,
    value,
    role: asString(item.role) || undefined,
  };
}

function normalizeTypography(item) {
  if (!item || typeof item !== "object") return null;
  const family = asString(item.family);
  const weight = asString(item.weight);
  const size = asString(item.size);
  const label = asString(item.label) || family || "Type style";
  const value =
    asString(item.value) ||
    [family, weight, size].filter(Boolean).join(" · ");
  if (!value && !family) return null;
  return {
    label,
    value: value || family,
    family: family || undefined,
    weight: weight || undefined,
    size: size || undefined,
  };
}

function normalizeIcon(item) {
  if (!item || typeof item !== "object") return null;
  const label = asString(item.label) || "Icon";
  const value =
    asString(item.value) ||
    [asString(item.style), asString(item.source)].filter(Boolean).join(" · ");
  if (!value && !asString(item.style) && !asString(item.source)) return null;
  return {
    label,
    value: value || label,
    style: asString(item.style) || undefined,
    source: asString(item.source) || undefined,
  };
}

export function normalizeDesignTokens(raw) {
  const empty = emptyDesignTokens();
  if (!raw || typeof raw !== "object") return empty;

  return {
    colors: Array.isArray(raw.colors)
      ? raw.colors.map(normalizeColor).filter(Boolean)
      : [],
    typography: Array.isArray(raw.typography)
      ? raw.typography.map(normalizeTypography).filter(Boolean)
      : [],
    icons: Array.isArray(raw.icons)
      ? raw.icons.map(normalizeIcon).filter(Boolean)
      : [],
  };
}
