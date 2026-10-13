const FONT_EXT = /\.(woff2?|ttf|otf|eot)$/i;
const MAX_BYTES = 6 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

const CONTENT_TYPES = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" ||
    h === "::1" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
    /^f[cd][0-9a-f]{2}:/.test(h)
  );
}

/**
 * Same-origin proxy for site webfonts used by CTA snapshots. Most sites serve
 * fonts without CORS headers, so the preview iframe can't load them directly.
 */
export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("u");
  let target;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad font URL", { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) {
    return new Response("Font URL not allowed", { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "font/woff2,font/woff,*/*;q=0.5",
        Referer: `${target.origin}/`,
      },
    });
    if (!res.ok) return new Response("Font fetch failed", { status: 502 });

    const ext = target.pathname.split(".").pop()?.toLowerCase() || "";
    const upstreamType = res.headers.get("content-type") || "";
    if (!FONT_EXT.test(target.pathname) && !/font|octet-stream/i.test(upstreamType)) {
      return new Response("Not a font", { status: 415 });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response("Font too large", { status: 413 });
    }

    return new Response(buf, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || upstreamType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Font fetch failed", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
