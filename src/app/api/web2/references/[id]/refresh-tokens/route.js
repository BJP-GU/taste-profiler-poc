import { NextResponse } from "next/server";
import { fetchLandingPage, homepageUrl } from "@/lib/fetchLandingPage";
import { extractDesignTokens } from "@/lib/web2Claude";
import {
  emptyDesignTokens,
  normalizeDesignTokens,
  applyFacetDefaultsToTokens,
  preserveTokenSelections,
} from "@/lib/designTokens";
import { extractIconsFromHtml, mergeIconTokens } from "@/lib/extractIcons";
import { mergeCtaTokens } from "@/lib/extractCtas";
import { pullCtas } from "@/lib/captureCtas";
import {
  getWeb2Reference,
  updateWeb2Reference,
} from "@/lib/web2Db";

/** Re-pull Colors / Typography / Icons / CTAs from the site homepage for a liked reference. */
export async function POST(_request, context) {
  const { id } = await context.params;
  const item = getWeb2Reference(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (item.valence !== 1) {
    return NextResponse.json(
      { error: "Token breakdown is only available for liked sites." },
      { status: 400 }
    );
  }

  try {
    const homeHref = homepageUrl(item.sourceUrl);
    const home = await fetchLandingPage(homeHref);
    const raw = home.rawHtml || home.html;
    const extractedIcons = extractIconsFromHtml(raw, home.url);
    const [claudeResult, extractedCtas] = await Promise.all([
      extractDesignTokens(home.html, home.url).catch((e) => {
        console.error("Token refresh Claude extract failed:", e.message);
        return null;
      }),
      pullCtas(home),
    ]);
    let tokens = claudeResult || emptyDesignTokens();

    const prev = normalizeDesignTokens(item.tokens || emptyDesignTokens());
    const nextIcons = mergeIconTokens(tokens.icons, extractedIcons);
    const nextCtas = mergeCtaTokens(tokens.ctas, extractedCtas);
    tokens = preserveTokenSelections(prev, {
      colors: tokens.colors,
      typography: tokens.typography,
      icons: nextIcons,
      ctas: nextCtas,
    });
    tokens = applyFacetDefaultsToTokens(tokens, item.facets);

    const updated = updateWeb2Reference(id, { tokens });
    return NextResponse.json({
      tokens: updated.tokens,
      tokensFrom: home.url,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Could not refresh tokens from homepage" },
      { status: 400 }
    );
  }
}
