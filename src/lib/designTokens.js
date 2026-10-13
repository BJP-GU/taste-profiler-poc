// Structured design tokens extracted from a landing page (homepage only).

export const TOKEN_CATEGORIES = [
  { key: "colors", label: "Colors" },
  { key: "typography", label: "Typography" },
  { key: "icons", label: "Icons" },
  { key: "ctas", label: "CTAs" },
];

/** Facet score that seeds default like/dislike for each token category. */
export const TOKEN_FACET_MAP = {
  colors: "color",
  typography: "typography",
  icons: "imagery_style",
  ctas: "cta_design",
};

export function emptyDesignTokens() {
  return { colors: [], typography: [], icons: [], ctas: [] };
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScore(score) {
  if (score === 1 || score === -1 || score === 0) return score;
  if (score === "1" || score === "-1" || score === "0") return Number(score);
  return undefined;
}

function normalizeStyleMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const v = String(value).trim();
    if (!v) continue;
    out[key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeCtaStyles(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const styles = {};
  for (const state of ["default", "hover", "active", "focus", "disabled"]) {
    const map = normalizeStyleMap(raw[state]);
    if (map) styles[state] = map;
  }
  return Object.keys(styles).length ? styles : undefined;
}

const CTA_SNAPSHOT_STATES = ["default", "hover", "active", "focus", "focusVisible"];
const CTA_PSEUDOS = new Set(["", "::before", "::after"]);
const MAX_SNAPSHOT_HTML = 120_000;

function cssSafe(value) {
  const v = asString(value);
  if (!v || /[{}]|<\//.test(v)) return "";
  return v;
}

function normalizePropMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  for (const [prop, value] of Object.entries(raw)) {
    if (!/^-?[a-z][a-z0-9-]*$/.test(prop)) continue;
    const v = cssSafe(value);
    if (v) out[prop] = v;
  }
  return Object.keys(out).length ? out : null;
}

function normalizeSnapshotState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [k, entry] of Object.entries(raw)) {
    if (!/^\d+$/.test(k) || !entry || typeof entry !== "object") continue;
    const pes = {};
    for (const [pe, map] of Object.entries(entry)) {
      if (!CTA_PSEUDOS.has(pe)) continue;
      const m = normalizePropMap(map);
      if (m) pes[pe] = m;
    }
    if (Object.keys(pes).length) out[k] = pes;
  }
  return Object.keys(out).length ? out : null;
}

function normalizeCtaSnapshot(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const html = asString(raw.html);
  if (!html || html.length > MAX_SNAPSHOT_HTML || !html.includes("data-tp-cta")) {
    return undefined;
  }
  const styles = {};
  for (const state of CTA_SNAPSHOT_STATES) {
    const s = normalizeSnapshotState(raw.styles?.[state]);
    if (s) styles[state] = s;
  }
  if (!styles.default) return undefined;
  const num = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.round(Number(n))) : undefined);
  const fonts = asString(raw.fonts);
  const keyframes = asString(raw.keyframes);
  return {
    html,
    styles,
    ...(fonts && !/<\//.test(fonts) ? { fonts } : {}),
    ...(keyframes && !/<\//.test(keyframes) ? { keyframes } : {}),
    backdrop: {
      color: cssSafe(raw.backdrop?.color) || "rgb(255, 255, 255)",
      ...(cssSafe(raw.backdrop?.image) ? { image: cssSafe(raw.backdrop.image) } : {}),
    },
    ...(num(raw.width) !== undefined ? { width: num(raw.width) } : {}),
    ...(num(raw.height) !== undefined ? { height: num(raw.height) } : {}),
  };
}

function normalizeColor(item) {
  if (!item || typeof item !== "object") return null;
  const label = asString(item.label) || "Color";
  const value = asString(item.value);
  if (!value) return null;
  const score = normalizeScore(item.score);
  return {
    label,
    value,
    role: asString(item.role) || undefined,
    ...(score !== undefined ? { score } : {}),
    ...(item.userSet ? { userSet: true } : {}),
    ...(item.inGallery ? { inGallery: true } : {}),
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
  const score = normalizeScore(item.score);
  return {
    label,
    value: value || family,
    family: family || undefined,
    weight: weight || undefined,
    size: size || undefined,
    ...(score !== undefined ? { score } : {}),
    ...(item.userSet ? { userSet: true } : {}),
    ...(item.inGallery ? { inGallery: true } : {}),
  };
}

function normalizeIcon(item) {
  if (!item || typeof item !== "object") return null;
  const label = asString(item.label) || "Icon";
  const value =
    asString(item.value) ||
    [asString(item.style), asString(item.source)].filter(Boolean).join(" · ");
  const svg = asString(item.svg);
  const previewUrl = asString(item.previewUrl) || asString(item.src);
  if (!value && !asString(item.style) && !asString(item.source) && !svg && !previewUrl) {
    return null;
  }
  const score = normalizeScore(item.score);
  return {
    label,
    value: value || label,
    style: asString(item.style) || undefined,
    source: asString(item.source) || undefined,
    ...(svg ? { svg } : {}),
    ...(previewUrl ? { previewUrl } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(item.userSet ? { userSet: true } : {}),
    ...(item.inGallery ? { inGallery: true } : {}),
  };
}

function normalizeCta(item) {
  if (!item || typeof item !== "object") return null;
  const text = asString(item.text) || asString(item.value);
  const label = asString(item.label) || text || "CTA";
  const iconSvg = asString(item.iconSvg) || asString(item.svg);
  const styles = normalizeCtaStyles(item.styles);
  const shape = asString(item.shape) || asString(item.style);
  const role = asString(item.role);
  const source = asString(item.source);
  const iconPosition = asString(item.iconPosition);
  const href = asString(item.href);
  const snapshot = normalizeCtaSnapshot(item.snapshot);

  if (!text && !iconSvg && !styles && !shape && !snapshot) return null;

  const value =
    asString(item.value) ||
    [text, shape, role].filter(Boolean).join(" · ") ||
    label;

  const score = normalizeScore(item.score);
  return {
    label,
    value,
    text: text || undefined,
    role: role || undefined,
    shape: shape || undefined,
    source: source || undefined,
    iconPosition:
      iconPosition === "left" || iconPosition === "right" || iconPosition === "only"
        ? iconPosition
        : iconSvg
          ? "left"
          : undefined,
    ...(href ? { href } : {}),
    ...(iconSvg ? { iconSvg } : {}),
    ...(styles ? { styles } : {}),
    ...(snapshot ? { snapshot } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(item.userSet ? { userSet: true } : {}),
    ...(item.inGallery ? { inGallery: true } : {}),
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
    ctas: Array.isArray(raw.ctas)
      ? raw.ctas.map(normalizeCta).filter(Boolean)
      : [],
  };
}

function facetScoreForCategory(facets, categoryKey) {
  const facetKey = TOKEN_FACET_MAP[categoryKey];
  if (!facetKey || !Array.isArray(facets)) return 0;
  const facet = facets.find((f) => f.name === facetKey);
  const score = Number(facet?.score);
  return score === 1 || score === -1 ? score : 0;
}

/**
 * Apply Facets-tab like/dislike as defaults onto token elements.
 * Tokens the user already voted on (userSet) keep their score.
 */
export function applyFacetDefaultsToTokens(tokens, facets) {
  const base = normalizeDesignTokens(tokens);
  const out = emptyDesignTokens();

  for (const cat of TOKEN_CATEGORIES) {
    const defaultScore = facetScoreForCategory(facets, cat.key);
    out[cat.key] = (base[cat.key] || []).map((token) => {
      if (token.userSet) return token;
      return { ...token, score: defaultScore };
    });
  }
  return out;
}

/** Toggle like (1) / dislike (−1); clicking the active vote clears to neutral (0). */
export function nextTokenVote(current, next) {
  if (current === next) return 0;
  return next;
}

function tokenIdentity(token) {
  return [
    asString(token?.label),
    asString(token?.value),
    asString(token?.text),
    asString(token?.family),
    asString(token?.previewUrl),
  ].join("\0");
}

/**
 * Copy gallery inclusion (and user votes) from previously saved tokens onto a
 * freshly extracted set, matching by label/value when possible.
 */
export function preserveTokenSelections(previous, next) {
  const prev = normalizeDesignTokens(previous);
  const nxt = normalizeDesignTokens(next);
  const out = emptyDesignTokens();

  for (const cat of TOKEN_CATEGORIES) {
    const prevList = prev[cat.key] || [];
    out[cat.key] = (nxt[cat.key] || []).map((token, i) => {
      const match =
        prevList.find((p) => tokenIdentity(p) === tokenIdentity(token)) ||
        prevList[i];
      if (!match) return token;
      const nextToken = { ...token };
      if (match.userSet || match.score === 1 || match.score === -1) {
        nextToken.score = match.score;
        if (match.userSet) nextToken.userSet = true;
      }
      if (match.inGallery) nextToken.inGallery = true;
      return nextToken;
    });
  }
  return out;
}

export function collectGalleryItems(references) {
  const items = [];
  for (const ref of references || []) {
    if (ref.valence !== 1) continue;
    const tokens = normalizeDesignTokens(ref.tokens);
    for (const cat of TOKEN_CATEGORIES) {
      (tokens[cat.key] || []).forEach((token, index) => {
        if (!token.inGallery) return;
        items.push({
          id: `${ref.id}:${cat.key}:${index}`,
          referenceId: ref.id,
          hostname: ref.hostname || "",
          sourceUrl: ref.sourceUrl || "",
          category: cat.key,
          index,
          token,
        });
      });
    }
  }
  return items;
}

export function groupGalleryItems(items) {
  return TOKEN_CATEGORIES.map((cat) => ({
    ...cat,
    items: (items || []).filter((item) => item.category === cat.key),
  }));
}
