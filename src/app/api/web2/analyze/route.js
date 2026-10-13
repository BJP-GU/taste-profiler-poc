import { NextResponse } from "next/server";
import {
  fetchLandingPage,
  homepageUrl,
} from "@/lib/fetchLandingPage";
import { tagWebFacets } from "@/lib/webClaude";
import { captureWebsiteScreenshot } from "@/lib/captureScreenshot";
import { emptyDesignTokens } from "@/lib/designTokens";

/**
 * Analyze a URL for facets + screenshot.
 * Token breakdown is NOT run here — only pulled for liked sites
 * via /api/web2/extract-tokens or refresh-tokens.
 */
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

    const [tagResult, shotResult] = await Promise.allSettled([
      tagWebFacets(page.html, page.url),
      captureWebsiteScreenshot(page.url),
    ]);

    let descriptors = null;
    if (tagResult.status === "fulfilled") {
      descriptors = tagResult.value;
    } else {
      console.error("Web2 facet tagging failed:", tagResult.reason?.message);
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
      tokens: emptyDesignTokens(),
      tokensFrom: homepageUrl(rawUrl),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
