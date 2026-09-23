import { NextResponse } from "next/server";
import { fetchLandingPage } from "@/lib/fetchLandingPage";
import { tagWebFacets } from "@/lib/webClaude";
import { extractDesignTokens } from "@/lib/web2Claude";
import { captureWebsiteScreenshot } from "@/lib/captureScreenshot";
import { emptyDesignTokens } from "@/lib/designTokens";

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

    // Facet tagging, design-token extraction, and screenshot in parallel.
    const [tagResult, tokenResult, shotResult] = await Promise.allSettled([
      tagWebFacets(page.html, page.url),
      extractDesignTokens(page.html, page.url),
      captureWebsiteScreenshot(page.url),
    ]);

    let descriptors = null;
    if (tagResult.status === "fulfilled") {
      descriptors = tagResult.value;
    } else {
      console.error("Web2 facet tagging failed:", tagResult.reason?.message);
    }

    let tokens = emptyDesignTokens();
    if (tokenResult.status === "fulfilled") {
      tokens = tokenResult.value;
    } else {
      console.error("Web2 token extraction failed:", tokenResult.reason?.message);
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
      tokens,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
