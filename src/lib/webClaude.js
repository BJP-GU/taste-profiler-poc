import Anthropic from "@anthropic-ai/sdk";
import { WEB_FACET_KEYS, WEB_FACETS } from "./webFacets";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

const FACET_LIST = WEB_FACETS.map((f) =>
  f.hint ? `${f.key} — ${f.hint}` : f.key
).join("\n- ");

// Given cleaned landing-page HTML, ask Claude for a concrete neutral descriptor
// per web facet. The user scores valence in the UI; this only labels what the
// markup actually implies about the site's design.
export async function tagWebFacets(html, pageUrl) {
  const prompt = `You are a careful web-design analyst reading the HTML/CSS of ONE landing page (URL: ${pageUrl}).
You do not see a screenshot. Extract design facts ONLY from the code you are given.

Inspect closely before writing. Mine these signals (when present):
- <head> font links, @font-face, font-family declarations, font-weight / letter-spacing / text-transform / line-height
- Inline styles, <style> blocks, CSS variables (--*), Tailwind/utility classes (e.g. grid-cols-*, gap-*, rounded-*, bg-*, text-*, sticky, fixed)
- Semantic structure of the first screenful: header/nav, hero headline + subcopy, media, primary CTA
- Color values as hex / rgb / hsl / named tokens; background vs text vs accent roles
- Image / video / canvas / Lottie / SVG usage and surrounding classes that imply photography, illustration, product shots, abstract graphics
- Script src / class names that imply motion (framer, gsap, locomotive, aos, swiper, marquee, animate, transition, hover:)
- Button / a.button / [role=button] markup: classes for pill/rounded/square, filled/outline/ghost, size, placement

Facets to describe:
- ${FACET_LIST}

For EACH facet write one precise descriptive phrase (about 10–20 words). Rules:
- Neutral and factual only — no taste judgments ("nice", "clean", "beautiful", "cluttered").
- Prefer concrete specifics found in code (named font, hex value, "3-column grid", "pill filled CTA in header", "full-bleed photo hero") over vague labels ("modern typography", "nice colors").
- If a detail is not evidenced in the HTML, omit it — do not invent. If truly unclear, say what IS visible and note uncertainty briefly (e.g. "system sans, weights unclear").
- Mention small but design-relevant details when present: tracking/uppercase, border-radius, sticky nav, marquee, outline vs solid buttons, mono vs serif pairing, dark page ground, etc.
- Do not repeat the same generic phrase across facets.

Respond with ONLY a JSON object with exactly these keys, no markdown fences:
{"hero_composition":"...","typography":"...","color":"...","layout_grid":"...","imagery_style":"...","motion_interaction":"...","cta_design":"..."}

Landing page HTML:
${html}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  return safeParseWebFacetJson(text);
}

function safeParseWebFacetJson(text) {
  const out = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    for (const key of WEB_FACET_KEYS) {
      out[key] = typeof parsed[key] === "string" ? parsed[key] : "";
    }
  } catch {
    for (const key of WEB_FACET_KEYS) out[key] = "";
  }
  return out;
}

export async function synthesizeWebProfile(aggregated) {
  const prompt = `Here is a designer's scored catalog of web design references (landing pages), broken down by facet. For each facet you have an average score (-1 to 1) and the actual descriptive phrases tied to the references they scored +1 (liked) and -1 (disliked) on that facet.

Data:
${JSON.stringify(aggregated, null, 2)}

Write a concise 3-5 sentence taste profile in third person about "the designer," in plain aesthetic language, the way a design critic would describe someone's taste in web design, not the way a statistics report would.

Rules:
- Never mention a numeric score or write anything like "(1.0)" or "scored highly." Translate the numbers into confidence instead: a facet near 1 across several references is a strong, repeated preference; a facet near 0 or backed by very few examples is not worth a confident claim.
- Do not describe the facets by their category names as the main content (avoid sentences like "they favor typography and CTA design"). Instead, pull the actual descriptive phrases from the liked/disliked lists and turn them into concrete claims.
- If a facet's liked or disliked list is empty or has only one entry, do not make a claim about that facet at all. Skip it rather than guessing or falling back to a generic statement.
- If nearly every facet has too little descriptive content to say anything concrete, say so plainly instead of padding the response with vague statements.
- No hedging language, no invented details beyond what's in the descriptor phrases.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content.find((b) => b.type === "text")?.text || "";
}

/**
 * Semantic taste profile from PseudoClient-style juxtaposition evidence:
 * liked vs disliked support sets, contrasted per web-design facet.
 */
export async function synthesizeSemanticTasteProfile(contrastive) {
  const facetBrief = WEB_FACETS.map((f) => {
    const block = contrastive.facets?.[f.key] || {};
    return {
      facet: f.label,
      preferred_signals: block.preferredSignals || [],
      avoided_signals: block.avoidedSignals || [],
      from_liked_sites: (block.likedDescriptors || []).map((d) => d.descriptor),
      from_disliked_sites: (block.dislikedDescriptors || []).map((d) => d.descriptor),
      evidence_strength: block.evidenceStrength ?? 0,
    };
  });

  const prompt = `You are synthesizing a designer's personal web/UI taste profile.
The designer provided a support set of websites they like and dislike (metric-learning style juxtaposition, inspired by PseudoClient / Lin & Martelaro DIS '21). Evidence was contrasted per design facet — what co-occurs in liked sites vs disliked sites.

Support set size: ${contrastive.supportSet?.liked?.length || 0} liked, ${contrastive.supportSet?.disliked?.length || 0} disliked.

Per-facet contrastive evidence:
${JSON.stringify(facetBrief, null, 2)}

Return ONLY a JSON object (no markdown fences) with this shape:
{
  "summary": "3-5 sentence third-person taste profile of the designer in plain aesthetic language",
  "facets": {
    "hero_composition": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" },
    "typography": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" },
    "color": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" },
    "layout_grid": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" },
    "imagery_style": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" },
    "motion_interaction": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" },
    "cta_design": { "prefers": "...", "avoids": "...", "confidence": "low|medium|high" }
  }
}

Rules:
- Ground every claim in the provided descriptors/signals. Do not invent aesthetics that are not evidenced.
- "prefers" / "avoids" should be short concrete phrases (not category labels alone).
- If evidence_strength is low or lists are empty for a facet, set confidence to "low" and keep prefers/avoids brief or "insufficient evidence".
- Never mention numeric scores, APIs, or the paper by name in the summary.
- Write as if describing the designer's taste so an AI design tool could follow it.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  return safeParseSemanticProfile(text);
}

function safeParseSemanticProfile(text) {
  const emptyFacet = () => ({
    prefers: "insufficient evidence",
    avoids: "insufficient evidence",
    confidence: "low",
  });
  const fallback = {
    summary: "",
    facets: Object.fromEntries(WEB_FACET_KEYS.map((k) => [k, emptyFacet()])),
  };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    const facets = {};
    for (const key of WEB_FACET_KEYS) {
      const f = parsed.facets?.[key] || {};
      facets[key] = {
        prefers: typeof f.prefers === "string" ? f.prefers : "insufficient evidence",
        avoids: typeof f.avoids === "string" ? f.avoids : "insufficient evidence",
        confidence: ["low", "medium", "high"].includes(f.confidence)
          ? f.confidence
          : "low",
      };
    }
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      facets,
    };
  } catch {
    return fallback;
  }
}
