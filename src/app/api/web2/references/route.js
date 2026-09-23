import { NextResponse } from "next/server";
import { listWeb2References, createWeb2Reference } from "@/lib/web2Db";
import { WEB_FACET_KEYS } from "@/lib/webFacets";
import { emptyDesignTokens } from "@/lib/designTokens";

export async function GET() {
  return NextResponse.json(listWeb2References());
}

export async function POST(request) {
  const body = await request.json();
  const { sourceUrl, hostname, imagePath, facets, tokens, conceptNote } = body;

  if (
    !sourceUrl ||
    !Array.isArray(facets) ||
    facets.length !== WEB_FACET_KEYS.length
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = createWeb2Reference({
    sourceUrl,
    hostname,
    imagePath: imagePath || null,
    facets,
    tokens: tokens || emptyDesignTokens(),
    conceptNote,
  });
  return NextResponse.json(record);
}
