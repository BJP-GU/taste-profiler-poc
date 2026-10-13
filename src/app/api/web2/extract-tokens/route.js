import { NextResponse } from "next/server";
import { fetchLandingPage, homepageUrl } from "@/lib/fetchLandingPage";
import { extractDesignTokens } from "@/lib/web2Claude";
import { emptyDesignTokens } from "@/lib/designTokens";
import { extractIconsFromHtml, mergeIconTokens } from "@/lib/extractIcons";
import { mergeCtaTokens } from "@/lib/extractCtas";
import { pullCtas } from "@/lib/captureCtas";

/**
 * Pull Colors / Typography / Icons / CTAs from a site homepage.
 * Used only for liked references — disliked sites skip token breakdown.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url;
    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const home = await fetchLandingPage(homepageUrl(rawUrl));
    const raw = home.rawHtml || home.html;
    const extractedIcons = extractIconsFromHtml(raw, home.url);
    const [claudeResult, extractedCtas] = await Promise.all([
      extractDesignTokens(home.html, home.url).catch((e) => {
        console.error("extract-tokens Claude failed:", e.message);
        return null;
      }),
      pullCtas(home),
    ]);
    let tokens = claudeResult || emptyDesignTokens();

    tokens = {
      ...tokens,
      icons: mergeIconTokens(tokens.icons, extractedIcons),
      ctas: mergeCtaTokens(tokens.ctas, extractedCtas),
    };

    return NextResponse.json({
      tokens,
      tokensFrom: home.url,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Could not extract tokens" },
      { status: 400 }
    );
  }
}
