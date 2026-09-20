import { NextResponse } from "next/server";
import { listReferences, createReference } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listReferences());
}

export async function POST(request) {
  const body = await request.json();
  const { imagePath, facets, conceptNote } = body;

  if (!imagePath || !Array.isArray(facets) || facets.length !== 6) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = createReference({ imagePath, facets, conceptNote });
  return NextResponse.json(record);
}
