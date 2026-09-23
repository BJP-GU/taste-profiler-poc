import Anthropic from "@anthropic-ai/sdk";
import { normalizeDesignTokens, emptyDesignTokens } from "./designTokens";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

// Pull discrete design tokens from landing-page HTML for the 2.0 profiler.
// Facet descriptors stay separate (tagWebFacets); this inventory is for the
// Tokens tab — colors, type styles, and icons, each labeled.
export async function extractDesignTokens(html, pageUrl) {
  const prompt = `You are reading the HTML/CSS of a website landing page (URL: ${pageUrl}). Extract a structured inventory of design tokens that appear on this page.

Return three categories:

1. colors — distinct color values used in the design (hex preferred, or rgb/rgba/hsl). Give each a short human label for its role (e.g. "Page background", "Primary CTA", "Body text", "Accent"). Deduplicate near-identical values. Prefer 4–12 colors that matter visually; skip noisy one-offs when possible.
2. typography — distinct type styles (font family, weight, size when inferable from CSS, classes, or font links). Label each by role (e.g. "Hero headline", "Body copy", "Nav link"). Prefer 3–8 entries.
3. icons — icon systems or individual icon treatments visible in markup (inline SVG patterns, icon fonts, sprite classes, libraries like Lucide/Font Awesome/Heroicons, favicon-only if that's all there is). Label each; note style (outline, filled, duotone, etc.) and source when clear. Prefer 2–10 entries; if none are detectable, return an empty array.

Respond with ONLY a JSON object, no markdown fences:
{"colors":[{"label":"...","value":"#112233","role":"..."}],"typography":[{"label":"...","family":"...","weight":"...","size":"...","value":"Family · weight · size"}],"icons":[{"label":"...","style":"...","source":"...","value":"style · source"}]}

Landing page HTML:
${html}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
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
