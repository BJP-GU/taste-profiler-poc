import { NextResponse } from "next/server";
import { fetchLandingPage } from "@/lib/fetchLandingPage";
import { tagWebFacets } from "@/lib/webClaude";
import { captureWebsiteScreenshot } from "@/lib/captureScreenshot";

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    let page;
    try {
      page = await fetchLandingPage(rawUrl);
    } catch (e) {
      return NextResponse.json({ error: e.message || "Fetch failed" }, { status: 400 });
    }

    // Fetch HTML tagging and a screenshot in parallel so the UI still gets a
    // preview even when Claude is slow, and vice versa.
    const [tagResult, shotResult] = await Promise.allSettled([
      tagWebFacets(page.html, page.url),
      captureWebsiteScreenshot(page.url),
    ]);

    let descriptors = null;
    if (tagResult.status === "fulfilled") {
      descriptors = tagResult.value;
    } else {
      console.error("Web facet tagging failed:", tagResult.reason?.message);
    }

    let imagePath = null;
    if (shotResult.status === "fulfilled") {
      imagePath = shotResult.value;
    } else {
      console.error("Screenshot capture failed:", shotResult.reason?.message);
    }

    return NextResponse.json({
      sourceUrl: page.url,
      hostname: page.hostname,
      imagePath,
      descriptors,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
