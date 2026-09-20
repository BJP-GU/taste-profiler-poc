import { NextResponse } from "next/server";
import { getReference, updateReference, deleteReference } from "@/lib/db";

// `context.params` is awaited rather than destructured directly so this
// works whether the running Next.js version treats params as a plain
// object or as a Promise (that changed between major versions).
export async function GET(request, context) {
  const { id } = await context.params;
  const item = getReference(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request, context) {
  const { id } = await context.params;
  const body = await request.json();
  const updated = updateReference(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request, context) {
  const { id } = await context.params;
  const removed = deleteReference(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
