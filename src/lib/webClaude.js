import Anthropic from "@anthropic-ai/sdk";
import { WEB_FACET_KEYS, WEB_FACETS } from "./webFacets";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

const FACET_LIST = WEB_FACETS.map((f) =>
  f.hint ? `${f.key} (${f.hint})` : f.key
).join("\n- ");

// Given cleaned landing-page HTML, ask Claude for a short neutral descriptor
// per web facet. The user scores valence in the UI; this only labels what
// the markup suggests about the site's design.
export async function tagWebFacets(html, pageUrl) {
  const prompt = `You are reading the HTML source of a website landing page (URL: ${pageUrl}). Infer the site's visual and interaction design from structure, class names, CSS hints, image/media tags, CTA markup, and any animation/library signals in the code. You only see this landing page — not the full site.

For each of these facets, write a short (5-10 word) neutral, purely descriptive phrase. Do not evaluate quality or express any opinion, just describe what the code implies.

Facets:
- ${FACET_LIST}

Respond with ONLY a JSON object with exactly these keys, no other text, no markdown code fences:
{"hero_composition":"...","typography":"...","color":"...","layout_grid":"...","imagery_style":"...","motion_interaction":"...","cta_design":"..."}

Landing page HTML:
${html}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
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
