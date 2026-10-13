import { NextResponse } from "next/server";
import { fetchLandingPage, homepageUrl } from "@/lib/fetchLandingPage";
import { tagWebFacets } from "@/lib/webClaude";
import { extractDesignTokens } from "@/lib/web2Claude";
import { captureWebsiteScreenshot } from "@/lib/captureScreenshot";
import {
  emptyDesignTokens,
  applyFacetDefaultsToTokens,
  preserveTokenSelections,
} from "@/lib/designTokens";
import { extractIconsFromHtml, mergeIconTokens } from "@/lib/extractIcons";
import { mergeCtaTokens } from "@/lib/extractCtas";
import { pullCtas } from "@/lib/captureCtas";
import { WEB_FACETS } from "@/lib/webFacets";
import { getWeb2Reference, updateWeb2Reference } from "@/lib/web2Db";

/**
 * Re-fetch the reference URL: refresh facet descriptors + screenshot.
 * Preserves like/dislike scores and whole-site valence.
 * Token breakdown is refreshed only when the site is liked.
 */
export async function POST(_request, context) {
  const { id } = await context.params;
  const item = getWeb2Reference(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const page = await fetchLandingPage(item.sourceUrl);

    const [tagResult, shotResult] = await Promise.allSettled([
      tagWebFacets(page.html, page.url),
      captureWebsiteScreenshot(page.url),
    ]);

    const descriptors =
      tagResult.status === "fulfilled" ? tagResult.value : null;
    if (tagResult.status === "rejected") {
      console.error("Reanalyze facet tagging failed:", tagResult.reason?.message);
    }

    const imagePath =
      shotResult.status === "fulfilled"
        ? shotResult.value
        : item.imagePath || null;
    if (shotResult.status === "rejected") {
      console.error("Reanalyze screenshot failed:", shotResult.reason?.message);
    }

    if (!descriptors) {
      return NextResponse.json(
        { error: "Could not re-tag facets from this page. Try again." },
        { status: 502 }
      );
    }

    const facets = WEB_FACETS.map((f) => {
      const prev = item.facets?.find((x) => x.name === f.key);
      return {
        name: f.key,
        descriptor: descriptors[f.key] || prev?.descriptor || "",
        score: prev?.score ?? 0,
      };
    });

    let tokens = emptyDesignTokens();
    if (item.valence === 1) {
      try {
        let home = page;
        const homeHref = homepageUrl(item.sourceUrl);
        if (new URL(page.url).pathname.replace(/\/$/, "") !== "") {
          home = await fetchLandingPage(homeHref);
        }
        const raw = home.rawHtml || home.html;
        const extractedIcons = extractIconsFromHtml(raw, home.url);
        const [claudeResult, extractedCtas] = await Promise.all([
          extractDesignTokens(home.html, home.url).catch((e) => {
            console.error("Reanalyze token extract failed:", e.message);
            return null;
          }),
          pullCtas(home),
        ]);
        const extracted = claudeResult || emptyDesignTokens();
        tokens = preserveTokenSelections(
          item.tokens,
          applyFacetDefaultsToTokens(
            {
              ...extracted,
              icons: mergeIconTokens(extracted.icons, extractedIcons),
              ctas: mergeCtaTokens(extracted.ctas, extractedCtas),
            },
            facets
          )
        );
      } catch (e) {
        console.error("Reanalyze homepage tokens failed:", e.message);
        tokens = applyFacetDefaultsToTokens(
          item.tokens || emptyDesignTokens(),
          facets
        );
      }
    }

    const updated = updateWeb2Reference(id, {
      facets,
      tokens,
      imagePath,
      sourceUrl: page.url,
      hostname: page.hostname,
    });

    return NextResponse.json({
      reference: updated,
      tokensFrom: item.valence === 1 ? homepageUrl(item.sourceUrl) : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Reanalyze failed" },
      { status: 400 }
    );
  }
}
