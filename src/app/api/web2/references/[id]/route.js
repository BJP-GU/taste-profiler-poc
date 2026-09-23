import { NextResponse } from "next/server";
import {
  getWeb2Reference,
  updateWeb2Reference,
  deleteWeb2Reference,
} from "@/lib/web2Db";

export async function GET(request, context) {
  const { id } = await context.params;
  const item = getWeb2Reference(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request, context) {
  const { id } = await context.params;
  const body = await request.json();
  const updated = updateWeb2Reference(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request, context) {
  const { id } = await context.params;
  const removed = deleteWeb2Reference(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
