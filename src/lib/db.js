// Minimal single-user storage: one JSON file, not a real database.
// Deliberately simple for a proof-of-concept scale (dozens of records,
// single user, no concurrent writers). Swap for SQLite/Postgres if the
// catalog grows large or this stops being a solo prototype.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "references.json");
const profileFile = path.join(dataDir, "profile.json");

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

export function listReferences() {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getReference(id) {
  return readAll().find((r) => r.id === id) || null;
}

export function createReference({ imagePath, facets, conceptNote }) {
  const items = readAll();
  const record = {
    id: crypto.randomUUID(),
    imagePath,
    facets,
    conceptNote: conceptNote || "",
    createdAt: new Date().toISOString(),
  };
  items.push(record);
  writeAll(items);
  return record;
}

export function updateReference(id, { facets, conceptNote }) {
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

export function deleteReference(id) {
  const items = readAll();
  const idx = items.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const [removed] = items.splice(idx, 1);
  writeAll(items);

  // Best-effort cleanup of the uploaded image so re-uploads don't leave orphans.
  if (removed.imagePath?.startsWith("/uploads/")) {
    const filename = path.basename(removed.imagePath);
    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore filesystem cleanup failures; the catalog record is already gone.
    }
  }

  return removed;
}

// Cached Claude taste summary. Invalidated when the set of reference IDs
// changes (add/remove), so reloading /profile does not burn another API call.
export function getCachedProfile() {
  ensureFile();
  if (!fs.existsSync(profileFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(profileFile, "utf-8"));
  } catch {
    return null;
  }
}

export function saveCachedProfile(cache) {
  ensureFile();
  fs.writeFileSync(profileFile, JSON.stringify(cache, null, 2), "utf-8");
}

export function clearCachedProfile() {
  ensureFile();
  if (fs.existsSync(profileFile)) fs.unlinkSync(profileFile);
}

export function referenceIdFingerprint(refs) {
  return refs
    .map((r) => r.id)
    .sort()
    .join(",");
}
