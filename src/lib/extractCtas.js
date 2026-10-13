/**
 * Pull concrete CTA button examples from homepage HTML for Tokens-tab
 * 1:1 previews (text, icons, default + interaction styles).
 */

const MAX_CTAS = 10;
const MAX_ICON_SVG = 4_000;
const CTA_CLASS_HINT =
  /\b(btn|button|cta|primary|secondary|signup|sign-up|get-started|getstarted|trial|demo|download|subscribe|contact|book|start|join|buy|purchase|shop|hero[-_]?cta)\b/i;
const SKIP_CLASS_HINT =
  /\b(nav-link|navbar|menu-item|footer|social|skip|cookie|close|icon-only|pagination|tab|breadcrumb|lang)\b/i;

const STYLE_PROPS = [
  "background",
  "background-color",
  "background-image",
  "color",
  "border",
  "border-color",
  "border-width",
  "border-style",
  "border-radius",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "line-height",
  "text-transform",
  "text-decoration",
  "box-shadow",
  "gap",
  "display",
  "align-items",
  "justify-content",
  "width",
  "height",
  "min-height",
  "min-width",
  "opacity",
  "transform",
  "transition",
  "outline",
  "outline-offset",
];

function decodeEntities(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseAttrs(attrStr) {
  const attrs = {};
  const re = /([:\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(attrStr || "")) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function classList(attrs) {
  return String(attrs.class || attrs.className || "")
    .split(/\s+/)
    .filter(Boolean);
}

function parseInlineStyle(styleStr) {
  const out = {};
  if (!styleStr) return out;
  for (const part of String(styleStr).split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!prop || !value) continue;
    if (STYLE_PROPS.includes(prop) || prop.startsWith("border") || prop.startsWith("padding")) {
      out[prop] = value;
    }
  }
  return out;
}

function parseDeclarations(body) {
  const out = {};
  for (const part of String(body || "").split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!prop || !value) continue;
    if (
      STYLE_PROPS.includes(prop) ||
      prop.startsWith("border") ||
      prop.startsWith("padding") ||
      prop.startsWith("background")
    ) {
      out[prop] = value;
    }
  }
  return out;
}

function collectStyleBlocks(html) {
  const blocks = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[1] || "");
  }
  return blocks.join("\n");
}

/**
 * Very small CSS rule matcher: class / id / element + optional :hover/:active/:focus.
 */
function rulesForElement(cssText, attrs, tagName) {
  const classes = classList(attrs);
  const id = attrs.id || "";
  const states = { default: {}, hover: {}, active: {}, focus: {} };
  if (!cssText) return states;

  const ruleRe =
    /([^{}@][^{]*)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(cssText)) !== null) {
    const selectors = m[1].split(",").map((s) => s.trim());
    const decls = parseDeclarations(m[2]);
    if (!Object.keys(decls).length) continue;

    for (const sel of selectors) {
      const stateMatch = sel.match(/:(hover|active|focus(?:-visible)?)\s*$/i);
      const state = stateMatch
        ? stateMatch[1].toLowerCase().startsWith("focus")
          ? "focus"
          : stateMatch[1].toLowerCase()
        : "default";
      const base = sel.replace(/:(hover|active|focus(?:-visible)?)\s*$/i, "").trim();

      let matches = false;
      if (id && (base === `#${id}` || base.endsWith(`#${id}`))) matches = true;
      if (!matches && classes.some((c) => base === `.${c}` || base.endsWith(`.${c}`))) {
        matches = true;
      }
      // Compound like "a.btn" / "button.primary"
      if (
        !matches &&
        classes.some(
          (c) =>
            base === `${tagName}.${c}` ||
            base.endsWith(` ${tagName}.${c}`) ||
            base.endsWith(`.${c}`)
        )
      ) {
        matches = true;
      }
      if (!matches) continue;
      Object.assign(states[state], decls);
    }
  }
  return states;
}

/** Map common Tailwind-style utilities to CSS (incl. hover:/active:/focus:). */
function stylesFromTailwind(classes) {
  const states = { default: {}, hover: {}, active: {}, focus: {} };

  const colorMap = {
    black: "#000000",
    white: "#ffffff",
    transparent: "transparent",
    current: "currentColor",
    "gray-50": "#f9fafb",
    "gray-100": "#f3f4f6",
    "gray-200": "#e5e7eb",
    "gray-300": "#d1d5db",
    "gray-400": "#9ca3af",
    "gray-500": "#6b7280",
    "gray-600": "#4b5563",
    "gray-700": "#374151",
    "gray-800": "#1f2937",
    "gray-900": "#111827",
    "slate-900": "#0f172a",
    "neutral-900": "#171717",
    "zinc-900": "#18181b",
    "red-500": "#ef4444",
    "red-600": "#dc2626",
    "blue-500": "#3b82f6",
    "blue-600": "#2563eb",
    "indigo-500": "#6366f1",
    "indigo-600": "#4f46e5",
    "violet-500": "#8b5cf6",
    "violet-600": "#7c3aed",
    "green-500": "#22c55e",
    "green-600": "#16a34a",
    "emerald-500": "#10b981",
    "emerald-600": "#059669",
    "amber-500": "#f59e0b",
    "orange-500": "#f97316",
    "pink-500": "#ec4899",
  };

  function resolveColor(token) {
    if (!token) return null;
    if (colorMap[token]) return colorMap[token];
    if (/^\[#([0-9a-f]{3,8})\]$/i.test(token)) {
      return `#${token.slice(2, -1)}`;
    }
    if (/^\[(rgb|rgba|hsl|hsla)\([^\]]+\)\]$/i.test(token)) {
      return token.slice(1, -1);
    }
    // Arbitrary / unknown brand colors — skip rather than invent.
    return null;
  }

  function applyUtil(util, target) {
    if (util === "rounded" || util === "rounded-md") target["border-radius"] = "0.375rem";
    else if (util === "rounded-sm") target["border-radius"] = "0.125rem";
    else if (util === "rounded-lg") target["border-radius"] = "0.5rem";
    else if (util === "rounded-xl") target["border-radius"] = "0.75rem";
    else if (util === "rounded-2xl") target["border-radius"] = "1rem";
    else if (util === "rounded-full") target["border-radius"] = "9999px";
    else if (util === "rounded-none") target["border-radius"] = "0";
    else if (util === "uppercase") target["text-transform"] = "uppercase";
    else if (util === "normal-case") target["text-transform"] = "none";
    else if (util === "font-medium") target["font-weight"] = "500";
    else if (util === "font-semibold") target["font-weight"] = "600";
    else if (util === "font-bold") target["font-weight"] = "700";
    else if (util === "font-normal") target["font-weight"] = "400";
    else if (util === "inline-flex") {
      target.display = "inline-flex";
      target["align-items"] = "center";
    } else if (util === "flex") {
      target.display = "flex";
      target["align-items"] = "center";
    } else if (util === "items-center") target["align-items"] = "center";
    else if (util === "justify-center") target["justify-content"] = "center";
    else if (util === "shadow" || util === "shadow-sm") {
      target["box-shadow"] = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
    } else if (util === "shadow-md") {
      target["box-shadow"] = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
    } else if (util === "shadow-lg") {
      target["box-shadow"] = "0 10px 15px -3px rgb(0 0 0 / 0.1)";
    } else if (util === "shadow-none") target["box-shadow"] = "none";
    else if (util === "border") {
      target["border-width"] = "1px";
      target["border-style"] = "solid";
    } else if (util === "border-2") {
      target["border-width"] = "2px";
      target["border-style"] = "solid";
    } else if (util === "underline") target["text-decoration"] = "underline";
    else if (util === "no-underline") target["text-decoration"] = "none";
    else if (/^text-(xs|sm|base|lg|xl|2xl)$/.test(util)) {
      const sizes = {
        "text-xs": "0.75rem",
        "text-sm": "0.875rem",
        "text-base": "1rem",
        "text-lg": "1.125rem",
        "text-xl": "1.25rem",
        "text-2xl": "1.5rem",
      };
      target["font-size"] = sizes[util];
    } else if (/^px-(\d+|\[\S+\])$/.test(util)) {
      const n = util.match(/^px-(\d+)$/)?.[1];
      if (n) target["padding-left"] = target["padding-right"] = `${Number(n) * 0.25}rem`;
    } else if (/^py-(\d+)$/.test(util)) {
      const n = util.match(/^py-(\d+)$/)[1];
      target["padding-top"] = target["padding-bottom"] = `${Number(n) * 0.25}rem`;
    } else if (/^p-(\d+)$/.test(util)) {
      const n = util.match(/^p-(\d+)$/)[1];
      target.padding = `${Number(n) * 0.25}rem`;
    } else if (/^gap-(\d+)$/.test(util)) {
      const n = util.match(/^gap-(\d+)$/)[1];
      target.gap = `${Number(n) * 0.25}rem`;
    } else if (util.startsWith("bg-")) {
      const c = resolveColor(util.slice(3));
      if (c) target["background-color"] = c;
    } else if (util.startsWith("text-") && !/^text-(xs|sm|base|lg|xl|2xl)$/.test(util)) {
      const c = resolveColor(util.slice(5));
      if (c) target.color = c;
    } else if (util.startsWith("border-") && !/^border-\d/.test(util)) {
      const c = resolveColor(util.slice(7));
      if (c) {
        target["border-color"] = c;
        if (!target["border-width"]) {
          target["border-width"] = "1px";
          target["border-style"] = "solid";
        }
      }
    } else if (/^tracking-(tight|tighter|normal|wide|wider)$/.test(util)) {
      const map = {
        "tracking-tighter": "-0.05em",
        "tracking-tight": "-0.025em",
        "tracking-normal": "0",
        "tracking-wide": "0.025em",
        "tracking-wider": "0.05em",
      };
      target["letter-spacing"] = map[util];
    } else if (util === "opacity-80") target.opacity = "0.8";
    else if (util === "opacity-90") target.opacity = "0.9";
    else if (util === "opacity-100") target.opacity = "1";
    else if (util === "scale-95") target.transform = "scale(0.95)";
    else if (util === "scale-100") target.transform = "scale(1)";
  }

  for (const raw of classes) {
    let state = "default";
    let util = raw;
    const pref = raw.match(/^(hover|active|focus|focus-visible):(.*)$/);
    if (pref) {
      state = pref[1].startsWith("focus") ? "focus" : pref[1];
      util = pref[2];
    }
    applyUtil(util, states[state]);
  }

  return states;
}

function mergeStyleStates(...parts) {
  const out = { default: {}, hover: {}, active: {}, focus: {} };
  for (const part of parts) {
    if (!part) continue;
    for (const state of Object.keys(out)) {
      Object.assign(out[state], part[state] || {});
    }
  }
  // Drop empty state maps
  for (const state of Object.keys(out)) {
    if (!Object.keys(out[state]).length) delete out[state];
  }
  return out;
}

function ensureButtonChrome(styles) {
  const next = {
    default: { ...(styles.default || {}) },
    ...(styles.hover ? { hover: { ...styles.hover } } : {}),
    ...(styles.active ? { active: { ...styles.active } } : {}),
    ...(styles.focus ? { focus: { ...styles.focus } } : {}),
  };
  const d = next.default;
  if (!d.display) {
    d.display = "inline-flex";
    d["align-items"] = "center";
    d["justify-content"] = "center";
  }
  if (!d.gap && !d["column-gap"]) d.gap = "0.5rem";
  if (!d["text-decoration"]) d["text-decoration"] = "none";
  if (!d.cursor) d.cursor = "pointer";
  if (!d["font-family"]) d["font-family"] = "inherit";
  if (!d["line-height"]) d["line-height"] = "1.2";
  if (!d.border && !d["border-width"] && !d["border-color"]) {
    // leave as-is; outline buttons set border explicitly
  }
  if (!d.padding && !d["padding-left"] && !d["padding-top"]) {
    d.padding = "0.75rem 1.25rem";
  }
  if (!d["font-size"]) d["font-size"] = "0.9375rem";
  if (!d["font-weight"]) d["font-weight"] = "500";
  return next;
}

function textFromInner(inner) {
  const withoutTags = decodeEntities(
    String(inner || "")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
  return withoutTags.slice(0, 80);
}

function iconFromInner(inner) {
  const m = String(inner || "").match(/<svg\b[^>]*>[\s\S]*?<\/svg>/i);
  if (!m) return null;
  let svg = m[0];
  if (svg.length > MAX_ICON_SVG) {
    svg = `${svg.slice(0, MAX_ICON_SVG)}<!-- truncated -->`;
  }
  if (!/\sxmlns=/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\bwidth=/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg width="16" height="16"');
  }
  return svg;
}

function iconPositionFromInner(inner, iconSvg) {
  if (!iconSvg) return undefined;
  const idx = String(inner).toLowerCase().indexOf("<svg");
  const text = textFromInner(inner);
  if (!text) return "only";
  // Rough: if svg appears after most of the text content position
  const textOnly = String(inner)
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "§")
    .replace(/<[^>]+>/g, "");
  const mark = textOnly.indexOf("§");
  if (mark < 0) return "left";
  const before = textOnly.slice(0, mark).trim().length;
  const after = textOnly.slice(mark + 1).trim().length;
  if (before === 0 && after > 0) return "left";
  if (after === 0 && before > 0) return "right";
  return before <= after ? "left" : "right";
}

function looksLikeCta(tag, attrs, text, classes) {
  const cls = classes.join(" ");
  const aria = attrs["aria-label"] || "";
  const role = attrs.role || "";
  const type = (attrs.type || "").toLowerCase();

  if (SKIP_CLASS_HINT.test(cls) && !CTA_CLASS_HINT.test(cls)) return false;
  if (type === "submit" && text) return true;
  if (role === "button" && text) return true;
  if (CTA_CLASS_HINT.test(cls) || CTA_CLASS_HINT.test(aria)) return true;

  // Buttons are usually CTAs if they have visible label.
  if (tag === "button" && text && text.length <= 40) return true;

  // Links that look like buttons: short label + button-ish classes / inline bg.
  if (tag === "a" && text && text.length >= 2 && text.length <= 36) {
    const style = attrs.style || "";
    if (/background|border-radius|padding/i.test(style)) return true;
    if (/\b(btn|button|cta|primary|secondary)\b/i.test(cls)) return true;
  }
  return false;
}

function inferShape(styles, classes) {
  const radius = styles.default?.["border-radius"] || "";
  const bg = styles.default?.["background-color"] || styles.default?.background || "";
  const border =
    styles.default?.border ||
    styles.default?.["border-width"] ||
    styles.default?.["border-color"];
  const cls = classes.join(" ");

  if (/9999px|50%|full/i.test(radius) || /rounded-full/.test(cls)) return "pill";
  if (/^0(px)?$/.test(radius) || /rounded-none/.test(cls)) return "square";
  if (bg && bg !== "transparent" && !/rgba?\([^)]*,\s*0\)/.test(bg)) {
    return border ? "filled with border" : "filled";
  }
  if (border) return "outline";
  return "text / ghost";
}

function inferRole(classes, text, index) {
  const cls = classes.join(" ").toLowerCase();
  const t = (text || "").toLowerCase();
  if (/\bprimary\b/.test(cls) || /\bcta\b/.test(cls)) return "primary";
  if (/\bsecondary\b/.test(cls) || /\boutline\b/.test(cls) || /\bghost\b/.test(cls)) {
    return "secondary";
  }
  if (/sign\s?up|get started|start free|try|buy|book|subscribe|join/.test(t)) {
    return "primary";
  }
  if (/learn more|read more|see|explore|view|docs|demo|contact|login|log in|sign in/.test(t)) {
    return index === 0 ? "primary" : "secondary";
  }
  return index === 0 ? "primary" : "secondary";
}

function inferSource(attrs, index) {
  const cls = `${attrs.class || ""} ${attrs.id || ""}`.toLowerCase();
  if (/hero|banner|masthead/.test(cls)) return "hero";
  if (/nav|header|topbar/.test(cls)) return "header";
  if (/footer/.test(cls)) return "footer";
  if (/modal|dialog|popup/.test(cls)) return "modal";
  return index === 0 ? "hero" : "page";
}

function compactStyles(styles) {
  if (!styles || !styles.default) return undefined;
  const out = {};
  for (const [state, map] of Object.entries(styles)) {
    if (map && Object.keys(map).length) out[state] = map;
  }
  return Object.keys(out).length ? out : undefined;
}

/** @returns {object[]} */
export function extractCtasFromHtml(html) {
  if (!html || typeof html !== "string") return [];

  const cssText = collectStyleBlocks(html);
  const ctas = [];
  const seen = new Set();

  const tagRe = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null && ctas.length < MAX_CTAS * 2) {
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2]);
    const inner = m[3] || "";
    const classes = classList(attrs);
    const text =
      textFromInner(inner) ||
      decodeEntities(attrs["aria-label"] || attrs.title || "").trim();

    if (!looksLikeCta(tag, attrs, text, classes)) continue;
    if (!text && !/<svg\b/i.test(inner)) continue;

    const iconSvg = iconFromInner(inner);
    const tw = stylesFromTailwind(classes);
    const fromCss = rulesForElement(cssText, attrs, tag);
    const inline = { default: parseInlineStyle(attrs.style) };
    let styles = ensureButtonChrome(mergeStyleStates(fromCss, tw, inline));

    // Need at least some visual signal (color or border or radius from utilities/CSS)
    const hasVisual =
      styles.default?.["background-color"] ||
      styles.default?.background ||
      styles.default?.border ||
      styles.default?.["border-color"] ||
      styles.default?.["border-width"] ||
      styles.default?.["border-radius"] ||
      CTA_CLASS_HINT.test(classes.join(" ")) ||
      tag === "button";

    if (!hasVisual && tag === "a") continue;

    const key = `${(text || "").toLowerCase()}|${styles.default?.["background-color"] || ""}|${styles.default?.["border-radius"] || ""}|${iconSvg ? "i" : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const role = inferRole(classes, text, ctas.length);
    const shape = inferShape(styles, classes);
    const source = inferSource(attrs, ctas.length);
    const iconPosition = iconPositionFromInner(inner, iconSvg);
    const href = attrs.href || undefined;

    const label =
      role === "primary"
        ? text
          ? `Primary · ${text}`
          : "Primary CTA"
        : text
          ? `${role === "secondary" ? "Secondary" : "CTA"} · ${text}`
          : "CTA";

    ctas.push({
      label,
      value: text || label,
      text: text || undefined,
      role,
      shape,
      source,
      ...(href ? { href } : {}),
      ...(iconSvg ? { iconSvg, iconPosition: iconPosition || "left" } : {}),
      styles: compactStyles(styles),
    });
  }

  // Prefer primary-looking / earlier CTAs; cap.
  return ctas.slice(0, MAX_CTAS);
}

/** Merge DOM-extracted CTA previews with Claude inventory. Prefer DOM visuals. */
export function mergeCtaTokens(claudeCtas, extractedCtas) {
  const fromClaude = Array.isArray(claudeCtas) ? claudeCtas : [];
  const fromDom = Array.isArray(extractedCtas) ? extractedCtas : [];

  if (fromDom.length) {
    return fromDom.slice(0, MAX_CTAS).map((dom, i) => {
      const textKey = (dom.text || dom.value || "").toLowerCase();
      const textMatch = fromClaude.find((c) => {
        const ct = (c.text || c.value || "").toLowerCase();
        return ct && textKey && (ct === textKey || ct.includes(textKey) || textKey.includes(ct));
      });

      if (dom.snapshot) {
        return {
          ...dom,
          label:
            textMatch?.label && !/^CTA/i.test(textMatch.label) ? textMatch.label : dom.label,
        };
      }

      const named = textMatch || fromClaude[i];
      const styles = mergeStyleStates(named?.styles, dom.styles);
      return {
        ...dom,
        label: named?.label && !/^CTA/i.test(named.label) ? named.label : dom.label,
        role: named?.role || dom.role,
        shape: named?.shape || dom.shape,
        source: named?.source || dom.source,
        text: dom.text || named?.text,
        iconSvg: dom.iconSvg || named?.iconSvg,
        iconPosition: dom.iconPosition || named?.iconPosition,
        styles: compactStyles(ensureButtonChrome(styles)),
      };
    });
  }

  return fromClaude.slice(0, MAX_CTAS).map((c) => ({
    ...c,
    styles: c.styles
      ? compactStyles(ensureButtonChrome(c.styles))
      : undefined,
  }));
}
