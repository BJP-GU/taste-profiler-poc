import { NextResponse } from "next/server";
import {
  TOKEN_CATEGORIES,
  collectGalleryItems,
  groupGalleryItems,
  normalizeDesignTokens,
} from "@/lib/designTokens";
import { listWeb2References, getWeb2Reference, updateWeb2Reference } from "@/lib/web2Db";

export async function GET() {
  const items = collectGalleryItems(listWeb2References());
  return NextResponse.json({
    groups: groupGalleryItems(items),
    total: items.length,
  });
}

export async function PATCH(request) {
  const body = await request.json();
  const { referenceId, category, index, inGallery } = body;

  if (!referenceId || !TOKEN_CATEGORIES.some((cat) => cat.key === category)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const item = getWeb2Reference(referenceId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tokens = normalizeDesignTokens(item.tokens);
  const list = tokens[category] || [];
  if (!list[index]) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  const nextToken = { ...list[index] };
  if (inGallery) nextToken.inGallery = true;
  else delete nextToken.inGallery;
  list[index] = nextToken;
  tokens[category] = list;

  const updated = updateWeb2Reference(referenceId, { tokens });
  return NextResponse.json({
    tokens: updated.tokens,
    groups: groupGalleryItems(collectGalleryItems(listWeb2References())),
  });
}
