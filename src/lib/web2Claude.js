import Anthropic from "@anthropic-ai/sdk";
import { normalizeDesignTokens, emptyDesignTokens } from "./designTokens";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

// Pull discrete design tokens from landing-page HTML for the 2.0 profiler.
// Facet descriptors stay separate (tagWebFacets); this inventory is for the
// Tokens tab — colors, type styles, icons, and CTAs, each labeled.
export async function extractDesignTokens(html, pageUrl) {
  const prompt = `You are reading the HTML/CSS of a website landing page / homepage only (URL: ${pageUrl}). Extract a structured inventory of design tokens that appear on this page.

Return four categories:

1. colors — distinct color values used in the design (hex preferred, or rgb/rgba/hsl). Give each a short human label for its role (e.g. "Page background", "Primary CTA", "Body text", "Accent"). Deduplicate near-identical values. Prefer 4–12 colors that matter visually; skip noisy one-offs when possible.
2. typography — distinct type styles (font family, weight, size when inferable from CSS, classes, or font links). Label each by role (e.g. "Hero headline", "Body copy", "Nav link"). Prefer 3–8 entries. Always include family and weight when known.
3. icons — individual icons or icon treatments on this homepage. Give each a short human name (e.g. "Menu", "Arrow right", "Social: Instagram"). Note style (outline, filled, etc.) and source (inline SVG, img, icon font, library name). Prefer 2–12 entries; if none are detectable, return an empty array.
4. ctas — distinct call-to-action buttons / button-like links on this homepage (primary, secondary, ghost, etc.). Reproduce each as faithfully as the HTML/CSS allows:
   - label: short role name (e.g. "Primary hero CTA")
   - text: exact visible button label
   - role: primary | secondary | tertiary | ghost
   - shape: filled | outline | pill | square | ghost (or a short phrase)
   - source: hero | header | footer | page | modal
   - iconPosition: left | right | only when an icon is present; omit otherwise
   - iconSvg: optional raw inline SVG markup if present inside the button
   - styles: CSS property maps for interaction states. Use kebab-case CSS property names as keys (background-color, border-radius, padding, font-size, font-weight, color, border, box-shadow, letter-spacing, text-transform, gap, etc.). Include:
     - styles.default — resting look
     - styles.hover — from :hover / hover: utilities when available
     - styles.active — from :active when available
     - styles.focus — from :focus / :focus-visible when available
   Prefer 2–8 CTAs. Skip plain text nav links that are not button-like.

Respond with ONLY a JSON object, no markdown fences:
{"colors":[{"label":"...","value":"#112233","role":"..."}],"typography":[{"label":"...","family":"...","weight":"...","size":"...","value":"Family · weight · size"}],"icons":[{"label":"...","style":"...","source":"...","value":"style · source"}],"ctas":[{"label":"...","text":"...","role":"primary","shape":"filled pill","source":"hero","iconPosition":"right","styles":{"default":{"background-color":"#000","color":"#fff","border-radius":"9999px","padding":"12px 20px","font-weight":"600"},"hover":{"background-color":"#222"},"active":{"transform":"scale(0.98)"},"focus":{"outline":"2px solid #000","outline-offset":"2px"}}}]}

Landing page HTML:
${html}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  return safeParseTokensJson(text);
}

function safeParseTokensJson(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    return normalizeDesignTokens(parsed);
  } catch {
    return emptyDesignTokens();
  }
}
