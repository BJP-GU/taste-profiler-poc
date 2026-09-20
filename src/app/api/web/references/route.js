import { NextResponse } from "next/server";
import { listWebReferences, createWebReference } from "@/lib/webDb";
import { WEB_FACET_KEYS } from "@/lib/webFacets";

export async function GET() {
  return NextResponse.json(listWebReferences());
}

export async function POST(request) {
  const body = await request.json();
  const { sourceUrl, hostname, imagePath, facets, conceptNote } = body;

  if (
    !sourceUrl ||
    !Array.isArray(facets) ||
    facets.length !== WEB_FACET_KEYS.length
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = createWebReference({
    sourceUrl,
    hostname,
    imagePath: imagePath || null,
    facets,
    conceptNote,
  });
  return NextResponse.json(record);
}
