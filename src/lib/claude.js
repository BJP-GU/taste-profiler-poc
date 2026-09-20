import Anthropic from "@anthropic-ai/sdk";
import { FACET_KEYS } from "./facets";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

// Given an uploaded poster image, ask Claude to produce a short, neutral,
// purely descriptive phrase per facet (no opinions, no valence). The user
// scores the valence themselves in the UI; this call only labels what's
// visually present so the scoring step has something concrete to react to.
export async function tagFacets(base64Image, mediaType) {
  const prompt = `You are looking at a piece of graphic design (a poster). For each of these six facets, write a short (5-10 word) neutral, purely descriptive phrase of what is visually present. Do not evaluate quality or express any opinion, just describe.

Facets: ${FACET_KEYS.join(", ")}

Respond with ONLY a JSON object with exactly these six keys, no other text, no markdown code fences:
{"color": "...", "typography": "...", "composition_layout": "...", "imagery_style": "...", "form_shape": "...", "texture_materiality": "..."}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  return safeParseFacetJson(text);
}

function safeParseFacetJson(text) {
  const out = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    for (const key of FACET_KEYS) {
      out[key] = typeof parsed[key] === "string" ? parsed[key] : "";
    }
  } catch {
    for (const key of FACET_KEYS) out[key] = "";
  }
  return out;
}

// Given the aggregated facet averages + liked/disliked descriptors across
// the whole catalog, ask Claude to write the plain-language taste summary.
// This is the "semantic representation" step: a text synthesis over
// structured data, not a custom NLG model.
export async function synthesizeProfile(aggregated) {
  const prompt = `Here is a designer's scored catalog of graphic design references, broken down by facet. For each facet you have an average score (-1 to 1) and the actual descriptive phrases tied to the references they scored +1 (liked) and -1 (disliked) on that facet.

Data:
${JSON.stringify(aggregated, null, 2)}

Write a concise 3-5 sentence taste profile in third person about "the designer," in plain aesthetic language, the way a design critic would describe someone's taste, not the way a statistics report would.

Rules:
- Never mention a numeric score or write anything like "(1.0)" or "scored highly." Translate the numbers into confidence instead: a facet near 1 across several references is a strong, repeated preference; a facet near 0 or backed by very few examples is not worth a confident claim.
- Do not describe the six facets by their category names as the main content (avoid sentences like "they favor typography and composition"). Instead, pull the actual descriptive phrases from the liked/disliked lists and turn them into concrete claims. If the liked typography descriptors repeatedly mention "bold geometric sans-serif," say the designer favors bold geometric sans-serif type, not "they favor typography."
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
