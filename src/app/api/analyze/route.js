import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { tagFacets } from "@/lib/claude";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.type && file.type.split("/")[1]) || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    let descriptors = null;
    try {
      descriptors = await tagFacets(buffer.toString("base64"), file.type || "image/jpeg");
    } catch (e) {
      // Don't fail the whole upload if vision tagging errors (e.g. missing
      // API key). The user can still fill in descriptors by hand.
      console.error("Vision tagging failed:", e.message);
    }

    return NextResponse.json({
      imagePath: `/uploads/${filename}`,
      descriptors,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
