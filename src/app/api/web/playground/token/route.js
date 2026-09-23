import { NextResponse } from "next/server";
import { getWebReference } from "@/lib/webDb";
import { getWebTasteContext } from "@/lib/webTaste";
import { generateTokenComponent } from "@/lib/playgroundClaude";
import { PLAYGROUND_TOKEN_TYPES } from "@/lib/playgroundTokens";

export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tokenType = typeof body.tokenType === "string" ? body.tokenType : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const referenceId = typeof body.referenceId === "string" ? body.referenceId : "";
  const pageContext = typeof body.pageContext === "string" ? body.pageContext : "";

  const def = PLAYGROUND_TOKEN_TYPES.find((t) => t.type === tokenType);
  if (!def) {
    return NextResponse.json({ error: "Unknown token type." }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }
  if (!referenceId) {
    return NextResponse.json(
      { error: "Pick a catalog reference to base this component on." },
      { status: 400 }
    );
  }

  const reference = getWebReference(referenceId);
  if (!reference) {
    return NextResponse.json({ error: "Reference not found." }, { status: 404 });
  }

  const taste = getWebTasteContext();

  try {
    const result = await generateTokenComponent({
      tokenType,
      tokenLabel: def.label,
      prompt,
      reference,
      profileText: taste.profileText,
      aggregated: taste.aggregated,
      pageContext,
    });

    return NextResponse.json({
      tokenType,
      referenceId: reference.id,
      prompt,
      html: result.html,
      css: result.css,
      status: "ready",
    });
  } catch (e) {
    console.error("Token generation failed:", e.message);
    return NextResponse.json(
      { error: "Component generation failed. Check your API key and try again." },
      { status: 502 }
    );
  }
}
