import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { PLAYGROUND_TOKEN_TYPES } from "./playgroundTokens";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

function profileContext(profileText, aggregated) {
  if (profileText) return `Taste profile:\n${profileText}`;
  if (aggregated) return `Aggregated facet preferences:\n${JSON.stringify(aggregated, null, 2)}`;
  return "No taste profile available yet — use general modern web design judgment.";
}

function referenceContext(reference) {
  if (!reference) return "No specific reference site selected.";
  const facets = (reference.facets || [])
    .map((f) => `- ${f.name}: ${f.descriptor || "(no descriptor)"} [score ${f.score}]`)
    .join("\n");
  return `Reference site: ${reference.hostname || reference.sourceUrl}
URL: ${reference.sourceUrl}
Concept note: ${reference.conceptNote || "(none)"}
Facets:
${facets || "(none)"}`;
}

function loadReferenceImage(reference) {
  if (!reference?.imagePath) return null;
  const rel = reference.imagePath.replace(/^\//, "");
  const filePath = path.join(process.cwd(), "public", rel);
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath).toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mediaType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "image/png";
    return { type: "image", source: { type: "base64", media_type: mediaType, data } };
  } catch {
    return null;
  }
}

function userContent(text, reference) {
  const image = loadReferenceImage(reference);
  if (!image) return text;
  return [
    image,
    {
      type: "text",
      text: "The image is a screenshot of the selected catalog reference. Use it as a visual source for this task.\n\n" + text,
    },
  ];
}

/**
 * Produce wireframe labels for the standard homepage tokens from a prompt +
 * optional reference + taste profile. Structure is fixed; Claude fills copy hints.
 */
export async function generateWireframePlan({ prompt, reference, profileText, aggregated }) {
  const tokenList = PLAYGROUND_TOKEN_TYPES.map((t) => t.type).join(", ");

  const systemPrompt = `You design homepage wireframes for a taste-aware design tool.
Return ONLY valid JSON (no markdown) with this shape:
{
  "title": "short project title",
  "summary": "one sentence describing the page intent",
  "tokens": [
    { "type": "header", "wireframeLabel": "...", "label": "Header" },
    { "type": "headline", "wireframeLabel": "...", "label": "Headline" },
    { "type": "hero_image", "wireframeLabel": "...", "label": "Hero Image" },
    { "type": "cta", "wireframeLabel": "...", "label": "CTA" }
  ]
}
Rules:
- Include exactly these token types: ${tokenList}
- wireframeLabel is short placeholder text shown on the blank wireframe (e.g. brand name for header, a draft headline, "[Hero: landscape photo]", "Get started")
- Do not invent extra tokens
- Respect the designer's taste profile when choosing tone of labels`;

  const userPrompt = `User prompt:
${prompt}

${profileContext(profileText, aggregated)}

${referenceContext(reference)}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: "user", content: userContent(`${systemPrompt}\n\n${userPrompt}`, reference) }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  return parseWireframeJson(text);
}

function parseWireframeJson(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    const byType = Object.fromEntries((parsed.tokens || []).map((t) => [t.type, t]));
    return {
      title: typeof parsed.title === "string" ? parsed.title : "Untitled homepage",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      tokens: PLAYGROUND_TOKEN_TYPES.map((def) => ({
        type: def.type,
        label: byType[def.type]?.label || def.label,
        wireframeLabel: byType[def.type]?.wireframeLabel || def.wireframeLabel,
      })),
    };
  } catch {
    return {
      title: "Untitled homepage",
      summary: "",
      tokens: PLAYGROUND_TOKEN_TYPES.map((def) => ({
        type: def.type,
        label: def.label,
        wireframeLabel: def.wireframeLabel,
      })),
    };
  }
}

/**
 * Generate HTML/CSS for one design token, grounded in a catalog reference + prompt.
 */
export async function generateTokenComponent({
  tokenType,
  tokenLabel,
  prompt,
  reference,
  profileText,
  aggregated,
  pageContext,
}) {
  const systemPrompt = `You generate a single self-contained homepage component for a design playground.
Return ONLY valid JSON (no markdown):
{
  "html": "<section>...</section>",
  "css": ".token-root { ... }"
}

Rules:
- html must be a single root element with class "token-root"
- css must style only descendants of .token-root (no html/body selectors)
- .token-root must fill its container: width:100%; height:100%; box-sizing:border-box; overflow:hidden
- No external scripts, no iframes, no remote font imports
- Use inline-safe CSS only (no @import)
- For images, use a CSS gradient or a muted placeholder block — do not use external image URLs
- Match the visual language of the reference screenshot and facet descriptors, filtered through the taste profile
- Component type: ${tokenType} (${tokenLabel})
- Design so the component still reads at small slot sizes (CTA ~150x56, header ~280x52, hero ~340x200)
- Keep markup semantic and compact`;

  const userPrompt = `Component prompt:
${prompt}

Page context:
${pageContext || "(none)"}

${profileContext(profileText, aggregated)}

${referenceContext(reference)}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: userContent(`${systemPrompt}\n\n${userPrompt}`, reference) }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  return parseTokenJson(text, tokenType);
}

function parseTokenJson(text, tokenType) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    const html = typeof parsed.html === "string" ? parsed.html.trim() : "";
    const css = typeof parsed.css === "string" ? parsed.css.trim() : "";
    if (!html) throw new Error("empty html");
    return { html, css };
  } catch {
    return fallbackTokenMarkup(tokenType);
  }
}

function fallbackTokenMarkup(tokenType) {
  const labels = {
    header: "Header",
    headline: "Headline",
    hero_image: "Hero",
    cta: "Call to action",
  };
  const label = labels[tokenType] || "Component";
  return {
    html: `<div class="token-root"><div class="fallback">${label}</div></div>`,
    css: `.token-root{width:100%;height:100%;box-sizing:border-box}.token-root .fallback{height:100%;display:flex;align-items:center;justify-content:center;padding:1rem;border:1px dashed #a3a3a3;color:#525252;font:500 0.875rem/1.4 system-ui,sans-serif;background:#fafafa}`,
  };
}
