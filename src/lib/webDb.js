// Separate JSON storage for the web-design profiler so it never collides
// with graphic-design references.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "web-references.json");
const profileFile = path.join(dataDir, "web-profile.json");

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

export function listWebReferences() {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getWebReference(id) {
  return readAll().find((r) => r.id === id) || null;
}

export function createWebReference({ sourceUrl, hostname, imagePath, facets, conceptNote }) {
  const items = readAll();
  const record = {
    id: crypto.randomUUID(),
    sourceUrl,
    hostname: hostname || "",
    imagePath: imagePath || null,
    facets,
    conceptNote: conceptNote || "",
    createdAt: new Date().toISOString(),
  };
  items.push(record);
  writeAll(items);
  return record;
}

export function updateWebReference(id, { facets, conceptNote }) {
  const items = readAll();
  const idx = items.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  items[idx] = {
    ...items[idx],
    facets: facets || items[idx].facets,
    conceptNote: conceptNote !== undefined ? conceptNote : items[idx].conceptNote,
  };
  writeAll(items);
  return items[idx];
}

export function deleteWebReference(id) {
  const items = readAll();
  const idx = items.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const [removed] = items.splice(idx, 1);
  writeAll(items);

  // Best-effort cleanup of the saved screenshot.
  if (removed.imagePath?.startsWith("/uploads/web/")) {
    const filename = path.basename(removed.imagePath);
    const filePath = path.join(process.cwd(), "public", "uploads", "web", filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore filesystem cleanup failures; the catalog record is already gone.
    }
  }

  return removed;
}

export function getCachedWebProfile() {
  ensureFile();
  if (!fs.existsSync(profileFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(profileFile, "utf-8"));
  } catch {
    return null;
  }
}

export function saveCachedWebProfile(cache) {
  ensureFile();
  fs.writeFileSync(profileFile, JSON.stringify(cache, null, 2), "utf-8");
}

export function webReferenceIdFingerprint(refs) {
  return refs
    .map((r) => r.id)
    .sort()
    .join(",");
}
