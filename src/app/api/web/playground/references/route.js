import { NextResponse } from "next/server";
import { listWebReferences } from "@/lib/webDb";

// Lightweight catalog for the Playground reference gallery.
export async function GET() {
  const refs = listWebReferences().map((r) => ({
    id: r.id,
    hostname: r.hostname,
    sourceUrl: r.sourceUrl,
    imagePath: r.imagePath,
    conceptNote: r.conceptNote || "",
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ references: refs });
}
