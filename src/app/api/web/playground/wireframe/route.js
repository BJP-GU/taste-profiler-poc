import { NextResponse } from "next/server";
import crypto from "crypto";
import { getWebReference } from "@/lib/webDb";
import { getWebTasteContext } from "@/lib/webTaste";
import { generateWireframePlan } from "@/lib/playgroundClaude";
import { createBlankTokens } from "@/lib/playgroundTokens";

export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "A text prompt is required." }, { status: 400 });
  }

  const referenceId = typeof body.referenceId === "string" ? body.referenceId : null;
  const reference = referenceId ? getWebReference(referenceId) : null;
  if (referenceId && !reference) {
    return NextResponse.json({ error: "Reference not found." }, { status: 404 });
  }

  const taste = getWebTasteContext();

  let plan;
  try {
    plan = await generateWireframePlan({
      prompt,
      reference,
      profileText: taste.profileText,
      aggregated: taste.aggregated,
    });
  } catch (e) {
    console.error("Wireframe generation failed:", e.message);
    plan = {
      title: "Untitled homepage",
      summary: prompt.slice(0, 120),
      tokens: createBlankTokens().map((t) => ({
        type: t.type,
        label: t.label,
        wireframeLabel: t.wireframeLabel,
      })),
      warning:
        "Could not reach Claude for wireframe labels (check ANTHROPIC_API_KEY). Showing a blank wireframe you can still edit token-by-token.",
    };
  }

  const tokens = createBlankTokens(plan.tokens);

  return NextResponse.json({
    id: crypto.randomUUID(),
    title: plan.title,
    summary: plan.summary,
    prompt,
    referenceId: reference?.id || null,
    tokens,
    tasteUsed: Boolean(taste.profileText || taste.aggregated),
    referenceCount: taste.referenceCount,
    warning: plan.warning || null,
    createdAt: new Date().toISOString(),
  });
}
