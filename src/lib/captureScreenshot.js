// Capture a desktop above-the-fold screenshot of a public URL and save it
// under public/uploads/web/. Prefers a local Playwright Chromium render so
// JS-heavy design sites actually paint; falls back to remote proxies only
// if Playwright is unavailable.

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { chromium } from "playwright";

const UPLOAD_SUBDIR = "web";
const FETCH_TIMEOUT_MS = 45_000;
const VIEWPORT = { width: 1280, height: 900 };

function uploadsDir() {
  return path.join(process.cwd(), "public", "uploads", UPLOAD_SUBDIR);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "TasteProfilerBot/0.1 (+local prototype; screenshot)",
        Accept: "image/*,application/json",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeImage(buffer, contentType) {
  if (contentType && /^image\//i.test(contentType)) return true;
  if (buffer.length < 4) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return true;
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return true;
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return true;
  }
  return false;
}

function extFromContentType(contentType) {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function captureViaPlaywright(pageUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    // Prefer networkidle for design sites that hydrate late; fall back if it
    // never settles (long-polling / analytics).
    try {
      await page.goto(pageUrl, {
        waitUntil: "networkidle",
        timeout: 35_000,
      });
    } catch {
      await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      await new Promise((r) => setTimeout(r, 2500));
    }

    // Give lazy images / fonts a brief beat to paint.
    await new Promise((r) => setTimeout(r, 1200));

    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
    });

    return { buffer: Buffer.from(buffer), ext: "png" };
  } finally {
    await browser.close();
  }
}

async function captureViaThumio(pageUrl) {
  const shotUrl = `https://image.thum.io/get/maxAge/1/width/1280/crop/900/noanimate/${pageUrl}`;
  const res = await fetchWithTimeout(shotUrl);
  if (!res.ok) throw new Error(`thum.io HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "";
  if (!looksLikeImage(buffer, contentType)) {
    throw new Error("thum.io did not return an image");
  }
  return { buffer, ext: extFromContentType(contentType) };
}

async function captureViaMicrolink(pageUrl) {
  const api = new URL("https://api.microlink.io");
  api.searchParams.set("url", pageUrl);
  api.searchParams.set("screenshot", "true");
  api.searchParams.set("meta", "false");
  api.searchParams.set("embed", "screenshot.url");

  const metaRes = await fetchWithTimeout(api.toString());
  if (!metaRes.ok) throw new Error(`microlink HTTP ${metaRes.status}`);
  const meta = await metaRes.json();
  const screenshotUrl = meta?.data?.screenshot?.url || meta?.image?.url;
  if (!screenshotUrl) throw new Error("microlink returned no screenshot URL");

  const imgRes = await fetchWithTimeout(screenshotUrl);
  if (!imgRes.ok) throw new Error(`microlink image HTTP ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get("content-type") || "";
  if (!looksLikeImage(buffer, contentType)) {
    throw new Error("microlink did not return an image");
  }
  return { buffer, ext: extFromContentType(contentType) };
}

export async function captureWebsiteScreenshot(pageUrl) {
  let lastError;
  let shot;

  for (const attempt of [captureViaPlaywright, captureViaThumio, captureViaMicrolink]) {
    try {
      shot = await attempt(pageUrl);
      break;
    } catch (err) {
      lastError = err;
      console.error(`Screenshot via ${attempt.name} failed:`, err.message);
    }
  }

  if (!shot) {
    throw lastError || new Error("Screenshot capture failed");
  }

  const dir = uploadsDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${shot.ext}`;
  await fs.writeFile(path.join(dir, filename), shot.buffer);
  return `/uploads/${UPLOAD_SUBDIR}/${filename}`;
}

export async function deleteWebsiteScreenshot(imagePath) {
  if (!imagePath?.startsWith(`/uploads/${UPLOAD_SUBDIR}/`)) return;
  const filename = path.basename(imagePath);
  const filePath = path.join(uploadsDir(), filename);
  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort cleanup.
  }
}
