// Separate JSON storage for Web design taste profiler 2.0 (facets + tokens).
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { emptyDesignTokens, normalizeDesignTokens } from "./designTokens";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "web2-references.json");
const profileFile = path.join(dataDir, "web2-profile.json");

function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, "[]", "utf-8");
}

function readAll() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
  } catch {
    return [];
  }
}

function writeAll(items) {
  ensureFile();
  fs.writeFileSync(dbFile, JSON.stringify(items, null, 2), "utf-8");
}

export function listWeb2References() {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getWeb2Reference(id) {
  return readAll().find((r) => r.id === id) || null;
}

export function createWeb2Reference({
  sourceUrl,
  hostname,
  imagePath,
  facets,
  tokens,
  conceptNote,
}) {
  const items = readAll();
  const record = {
    id: crypto.randomUUID(),
    sourceUrl,
    hostname: hostname || "",
    imagePath: imagePath || null,
    facets,
    tokens: normalizeDesignTokens(tokens || emptyDesignTokens()),
    conceptNote: conceptNote || "",
    createdAt: new Date().toISOString(),
  };
  items.push(record);
  writeAll(items);
  return record;
}

export function updateWeb2Reference(id, { facets, conceptNote, tokens }) {
  const items = readAll();
  const idx = items.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  items[idx] = {
    ...items[idx],
    facets: facets || items[idx].facets,
    conceptNote: conceptNote !== undefined ? conceptNote : items[idx].conceptNote,
    tokens:
      tokens !== undefined
        ? normalizeDesignTokens(tokens)
        : items[idx].tokens || emptyDesignTokens(),
  };
  writeAll(items);
  return items[idx];
}

export function deleteWeb2Reference(id) {
  const items = readAll();
  const idx = items.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const [removed] = items.splice(idx, 1);
  writeAll(items);

  if (removed.imagePath?.startsWith("/uploads/web/")) {
    const filename = path.basename(removed.imagePath);
    const filePath = path.join(process.cwd(), "public", "uploads", "web", filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore filesystem cleanup failures.
    }
  }

  return removed;
}

export function getCachedWeb2Profile() {
  ensureFile();
  if (!fs.existsSync(profileFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(profileFile, "utf-8"));
  } catch {
    return null;
  }
}

export function saveCachedWeb2Profile(cache) {
  ensureFile();
  fs.writeFileSync(profileFile, JSON.stringify(cache, null, 2), "utf-8");
}

export function web2ReferenceIdFingerprint(refs) {
  return refs
    .map((r) => r.id)
    .sort()
    .join(",");
}
