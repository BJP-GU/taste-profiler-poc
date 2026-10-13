/**
 * Pull concrete icon / logo examples from homepage HTML (before SVG bodies are
 * stripped for Claude prompts). Used for the Tokens tab preview.
 */

const MAX_ICONS = 12;
const MAX_SVG_CHARS = 6_000;

function absoluteUrl(src, baseUrl) {
  if (!src) return null;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return null;
  }
}

function nameFromAttrs(attrs, fallback) {
  const aria = attrs.match(/aria-label=["']([^"']+)["']/i)?.[1];
  const title = attrs.match(/title=["']([^"']+)["']/i)?.[1];
  const alt = attrs.match(/alt=["']([^"']+)["']/i)?.[1];
  const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
  const cls = attrs.match(/\bclass=["']([^"']+)["']/i)?.[1];

  const candidates = [aria, title, alt, id, cls].filter(Boolean);
  for (const raw of candidates) {
    const cleaned = String(raw)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    // Skip Tailwind-style utility class dumps as labels.
    if (!cleaned) continue;
    if (cleaned.split(" ").length > 4) continue;
    if (/^(h|w|flex|grid|text|bg|opacity|overflow|absolute|relative)\b/i.test(cleaned)) {
      continue;
    }
    return cleaned;
  }
  return fallback;
}

function looksLikeIconOrLogo(src, attrs = "") {
  const s = `${src || ""} ${attrs}`.toLowerCase();
  return (
    s.includes("icon") ||
    s.includes("logo") ||
    s.includes("brand") ||
    s.includes("mark") ||
    s.includes("wordmark") ||
    /\.svg(\?|$)/i.test(src || "") ||
    /\/(icons?|favicon|logo)\//i.test(src || "")
  );
}

function prepareSvg(attrs, body) {
  let svg = `<svg${attrs}>${body}</svg>`;
  if (svg.length > MAX_SVG_CHARS) {
    svg = `${svg.slice(0, MAX_SVG_CHARS)}<!-- truncated -->`;
  }
  // Force a visible box so huge viewBoxes still preview.
  if (!/\bwidth=/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg width="40" height="40"');
  }
  if (!/\bheight=/i.test(svg) && !/\bwidth=/i.test(attrs)) {
    svg = svg.replace(/<svg\b/i, '<svg height="40"');
  }
  // currentColor strokes need an explicit color in the preview pane.
  if (!/\bfill=/i.test(attrs) || /fill=["']?(none|transparent)/i.test(attrs)) {
    svg = svg.replace(
      /<svg\b/i,
      '<svg style="color:#000;max-width:100%;max-height:100%" '
    );
  }
  return svg;
}

/**
 * @returns {{ label: string, value: string, style?: string, source?: string, svg?: string, previewUrl?: string }[]}
 */
export function extractIconsFromHtml(html, pageUrl) {
  if (!html || typeof html !== "string") return [];
  const icons = [];
  const seen = new Set();

  function push(entry) {
    const key = entry.svg
      ? `svg:${entry.svg.slice(0, 120)}`
      : `url:${entry.previewUrl || entry.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    icons.push(entry);
  }

  // Inline SVGs — keep real markup for preview (logos, marks, UI icons).
  const svgRe = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/gi;
  let m;
  let svgIndex = 0;
  while ((m = svgRe.exec(html)) !== null && icons.length < MAX_ICONS) {
    const attrs = m[1] || "";
    const body = m[2] || "";
    const compact = body.replace(/\s/g, "");
    // Skip empty shells; allow <use>-only sprites and path logos.
    if (compact.length < 4 && !/<use\b/i.test(body)) continue;
    svgIndex += 1;
    const isLogo = /logo|brand|wordmark|lockup|mark/i.test(`${attrs} ${body.slice(0, 200)}`);
    const label = nameFromAttrs(
      attrs,
      isLogo ? "Logo" : `Icon ${svgIndex}`
    );
    push({
      label,
      value: "Inline SVG",
      style: "inline SVG",
      source: "homepage markup",
      svg: prepareSvg(attrs, body),
    });
  }

  // <img> logos / icons.
  const imgRe = /<(?:img|source)\b([^>]*?)\/?>/gi;
  while ((m = imgRe.exec(html)) !== null && icons.length < MAX_ICONS) {
    const attrs = m[1] || "";
    const src =
      attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bsrcset=["']([^"'\s,]+)/i)?.[1];
    if (!looksLikeIconOrLogo(src, attrs)) continue;
    const previewUrl = absoluteUrl(src, pageUrl);
    if (!previewUrl) continue;
    const label = nameFromAttrs(attrs, /logo/i.test(attrs) ? "Logo" : "Icon");
    push({
      label,
      value: previewUrl,
      style: "image",
      source: "img",
      previewUrl,
    });
  }

  // Linked SVG/PNG assets that look like logos (e.g. href="logo.svg").
  const hrefRe = /\b(?:href|src)=["']([^"']+\.svg[^"']*)["']/gi;
  while ((m = hrefRe.exec(html)) !== null && icons.length < MAX_ICONS) {
    const href = m[1];
    if (!looksLikeIconOrLogo(href)) continue;
    const previewUrl = absoluteUrl(href, pageUrl);
    if (!previewUrl) continue;
    push({
      label: /logo/i.test(href) ? "Logo" : "SVG asset",
      value: previewUrl,
      style: "svg file",
      source: "link",
      previewUrl,
    });
  }

  // Favicon / apple-touch as a last visual fallback.
  if (icons.length === 0 || !icons.some((i) => i.svg || i.previewUrl)) {
    const iconLink =
      html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/i)?.[0] ||
      html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i)?.[0];
    const href = iconLink?.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const previewUrl = absoluteUrl(href, pageUrl);
    if (previewUrl) {
      push({
        label: "Site icon",
        value: previewUrl,
        style: "favicon",
        source: "link",
        previewUrl,
      });
    }
  }

  return icons.slice(0, MAX_ICONS);
}


/** Merge DOM-extracted icon previews with Claude-labeled inventory. Prefer visuals. */
export function mergeIconTokens(claudeIcons, extractedIcons) {
  const fromClaude = Array.isArray(claudeIcons) ? claudeIcons : [];
  const fromDom = Array.isArray(extractedIcons) ? extractedIcons : [];

  // DOM visuals are the source of truth. Attach Claude names when helpful.
  if (fromDom.length) {
    return fromDom.slice(0, MAX_ICONS).map((dom, i) => {
      const named =
        fromClaude.find((c) =>
          /logo/i.test(`${c.label} ${c.value || ""}`) && /logo/i.test(`${dom.label} ${dom.value || ""}`)
        ) || fromClaude[i];
      const generic = /^(Icon|Logo)(\s+\d+)?$/i.test(dom.label || "");
      return {
        ...dom,
        label:
          generic && named?.label
            ? named.label
            : dom.label || named?.label || "Icon",
        style: dom.style || named?.style,
        source: dom.source || named?.source,
      };
    });
  }

  return fromClaude.slice(0, MAX_ICONS);
}
