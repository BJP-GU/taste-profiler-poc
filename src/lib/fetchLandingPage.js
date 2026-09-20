// Fetch a public landing-page URL and return cleaned HTML suitable for
// Claude facet tagging. Strips heavy script bodies and truncates so the
// prompt stays within a manageable size.

const MAX_HTML_CHARS = 80_000;
const FETCH_TIMEOUT_MS = 20_000;

export function normalizeUrl(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) throw new Error("URL is required");

  let withProtocol = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    withProtocol = `https://${trimmed}`;
  }

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }

  return parsed.toString();
}

export function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function cleanHtml(html) {
  let out = html;

  // Drop comments and non-visual bulky tags, but keep class/id/style hints
  // and lightweight script tags that often signal animation libraries.
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  out = out.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "<svg></svg>");
  out = out.replace(
    /<script\b([^>]*)>[\s\S]*?<\/script>/gi,
    (_m, attrs) => `<script${attrs}></script>`
  );
  // Keep CSS text (color/type/layout signals) but cap very large style blocks.
  out = out.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_m, attrs, css) => {
    const trimmed = css.trim();
    const kept =
      trimmed.length > 12_000 ? `${trimmed.slice(0, 12_000)}\n/* truncated */` : trimmed;
    return `<style${attrs}>${kept}</style>`;
  });

  // Collapse whitespace a bit without destroying attribute readability.
  out = out.replace(/\s+/g, " ").trim();

  if (out.length > MAX_HTML_CHARS) {
    out = `${out.slice(0, MAX_HTML_CHARS)}\n<!-- truncated -->`;
  }
  return out;
}

export async function fetchLandingPage(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "TasteProfilerBot/0.1 (+local prototype; landing-page HTML only)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new Error(`Could not fetch page (HTTP ${res.status})`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("URL did not return an HTML page");
    }

    const html = await res.text();
    if (!html.trim()) throw new Error("Page returned empty HTML");

    return {
      url: res.url || url,
      hostname: hostnameFromUrl(res.url || url),
      html: cleanHtml(html),
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Timed out fetching the page");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
