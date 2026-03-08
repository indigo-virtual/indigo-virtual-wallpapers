#!/usr/bin/env node
/**
 * Automated Wallpaper Metadata Generator
 *
 * Scans wallpapers/, generates thumbnails, and produces static API JSON files
 * for consumption via jsDelivr CDN. Safe for repeated runs; preserves manual
 * metadata (author, author_id, source, added).
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// CDN configuration — change these for your repository
// ---------------------------------------------------------------------------
const REPO_OWNER = "indigo-virtual";
const REPO_NAME = "indigo-virtual-wallpapers";
const BRANCH = "main";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const THUMBNAIL_WIDTH = 400;
const PAGE_SIZE = 50;
const LATEST_COUNT = 20;
const METADATA_FILE = "wallpaper-meta.json";

// Resolve repo root (parent of scripts/)
const REPO_ROOT = path.resolve(__dirname, "..");
const WALLPAPERS_DIR = path.join(REPO_ROOT, "wallpapers");
const THUMBNAILS_DIR = path.join(REPO_ROOT, "thumbnails");
const DATA_DIR = path.join(REPO_ROOT, "data");

// ---------------------------------------------------------------------------
// Helper: deterministic ID from filename (slug)
// e.g. "Sunset Lake.jpg" → "sunset-lake"
// ---------------------------------------------------------------------------
function filenameToId(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// CDN URL helpers
// ---------------------------------------------------------------------------
function getCdnBase() {
  return `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${BRANCH}`;
}

function getImageCdnUrl(filename) {
  return `${getCdnBase()}/wallpapers/${encodeURIComponent(filename)}`;
}

function getThumbnailCdnUrl(filename) {
  return `${getCdnBase()}/thumbnails/${encodeURIComponent(filename)}`;
}

// ---------------------------------------------------------------------------
// Ensure directory exists; create if missing
// ---------------------------------------------------------------------------
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Load existing persisted metadata (filename, author, author_id, source, added) by id
// Returns { [id]: { filename?, author, author_id, source, added } } or {}
// ---------------------------------------------------------------------------
function loadPersistedMetadata() {
  const filePath = path.join(DATA_DIR, METADATA_FILE);
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return typeof data === "object" && data !== null ? data : {};
  } catch (e) {
    console.warn(
      "Warning: Could not parse " +
        METADATA_FILE +
        ", starting fresh. " +
        e.message,
    );
    return {};
  }
}

// ---------------------------------------------------------------------------
// Save persisted metadata (filename, author, author_id, source, added, resolution per id).
// Writes only if content changed for re-runnable behavior.
// ---------------------------------------------------------------------------
function savePersistedMetadata(meta) {
  ensureDir(DATA_DIR);
  const filePath = path.join(DATA_DIR, METADATA_FILE);
  const content = JSON.stringify(meta, null, 2);
  try {
    if (
      fs.existsSync(filePath) &&
      fs.readFileSync(filePath, "utf8") === content
    )
      return;
  } catch (_) {}
  fs.writeFileSync(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// Scan wallpapers directory for supported image files
// Returns array of { filename, id, ext } (filename = basename as on disk)
// ---------------------------------------------------------------------------
function scanWallpapers() {
  if (!fs.existsSync(WALLPAPERS_DIR)) {
    return [];
  }
  const entries = fs.readdirSync(WALLPAPERS_DIR, { withFileTypes: true });
  const result = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
    const id = filenameToId(e.name);
    if (!id) continue;
    result.push({ filename: e.name, id, ext });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Generate thumbnail if missing or source image is newer
// Returns true if thumbnail was generated
// ---------------------------------------------------------------------------
async function ensureThumbnail(wallpaperPath, thumbPath) {
  const needGenerate =
    !fs.existsSync(thumbPath) ||
    fs.statSync(wallpaperPath).mtimeMs > fs.statSync(thumbPath).mtimeMs;
  if (!needGenerate) return false;

  const sharp = require("sharp");
  ensureDir(path.dirname(thumbPath));
  await sharp(wallpaperPath)
    .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
    .toFile(thumbPath);
  return true;
}

// ---------------------------------------------------------------------------
// Build full wallpaper entry for API (id, image, thumbnail, author, author_id, resolution, source, added)
// ---------------------------------------------------------------------------
function buildWallpaperEntry(record, persisted) {
  const { filename, id } = record;
  const p = persisted[id] || {};
  return {
    id,
    image: getImageCdnUrl(filename),
    thumbnail: getThumbnailCdnUrl(filename),
    author: p.author != null ? p.author : "Unknown",
    author_id: p.author_id != null ? p.author_id : "",
    resolution: p.resolution != null ? p.resolution : "1920x1080",
    source: p.source != null ? p.source : "",
    added: p.added != null ? p.added : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const stats = {
    totalDetected: 0,
    newWallpapers: 0,
    removed: 0,
    thumbnailsGenerated: 0,
    pagesCreated: 0,
  };

  // Validate / create directories
  if (!fs.existsSync(WALLPAPERS_DIR)) {
    console.error("Error: wallpapers directory not found at " + WALLPAPERS_DIR);
    process.exit(1);
  }
  ensureDir(THUMBNAILS_DIR);
  ensureDir(DATA_DIR);

  const current = scanWallpapers();
  stats.totalDetected = current.length;

  if (current.length === 0) {
    console.log("No wallpapers found in wallpapers/.");
    // Still write index and empty pages so API is valid
  }

  const persisted = loadPersistedMetadata();
  const currentIds = new Set(current.map((r) => r.id));
  const existingIds = new Set(Object.keys(persisted));

  // Remove metadata and thumbnails for deleted wallpapers
  if (fs.existsSync(THUMBNAILS_DIR)) {
    const thumbFiles = fs.readdirSync(THUMBNAILS_DIR);
    for (const id of existingIds) {
      if (currentIds.has(id)) continue;
      const thumbName = thumbFiles.find((f) => filenameToId(f) === id);
      if (thumbName) {
        const thumbFile = path.join(THUMBNAILS_DIR, thumbName);
        try {
          fs.unlinkSync(thumbFile);
        } catch (e) {
          console.warn(
            "Warning: could not delete thumbnail " + thumbFile,
            e.message,
          );
        }
      }
      delete persisted[id];
      stats.removed++;
    }
  } else {
    for (const id of existingIds) {
      if (currentIds.has(id)) continue;
      delete persisted[id];
      stats.removed++;
    }
  }

  // Normalize thumb path from record
  const getThumbPath = (record) => path.join(THUMBNAILS_DIR, record.filename);

  // Add new entries to persisted (only added timestamp; author/source preserved from existing)
  for (const record of current) {
    if (!persisted[record.id]) {
      persisted[record.id] = {
        filename: record.filename,
        author: "Unknown",
        author_id: "",
        source: "",
        added: new Date().toISOString(),
      };
      stats.newWallpapers++;
    }
  }

  // Ensure we have resolution in persisted if we want it editable later (optional)
  for (const record of current) {
    if (persisted[record.id] && persisted[record.id].resolution == null) {
      persisted[record.id].resolution = "1920x1080";
    }
  }

  // Generate thumbnails (only when needed)
  let sharpLoaded = false;
  for (const record of current) {
    const srcPath = path.join(WALLPAPERS_DIR, record.filename);
    const thumbPath = getThumbPath(record);
    try {
      const generated = await ensureThumbnail(srcPath, thumbPath);
      if (generated) {
        stats.thumbnailsGenerated++;
        if (!sharpLoaded) {
          sharpLoaded = true;
        }
      }
    } catch (e) {
      console.warn(
        "Warning: thumbnail generation failed for " +
          record.filename +
          ": " +
          e.message,
      );
    }
  }

  // Build full entries and sort newest first
  const entries = current.map((r) => buildWallpaperEntry(r, persisted));
  entries.sort((a, b) => new Date(b.added) - new Date(a.added));

  // Persist metadata (filename, author, source, added, resolution) — only write if changed
  const toPersist = {};
  for (const e of entries) {
    const record = current.find((r) => r.id === e.id);
    toPersist[e.id] = {
      filename: record ? record.filename : e.id,
      author: e.author,
      author_id: e.author_id,
      source: e.source,
      added: e.added,
      resolution: e.resolution,
    };
  }
  savePersistedMetadata(toPersist);

  // Paginate: 50 per page
  const pages = [];
  for (let i = 0; i < entries.length; i += PAGE_SIZE) {
    pages.push(entries.slice(i, i + PAGE_SIZE));
  }
  stats.pagesCreated = pages.length || 1;

  ensureDir(DATA_DIR);
  const jsonOpts = { encoding: "utf8" };

  // Helper: write file only if content changed (deterministic re-runs)
  function writeIfChanged(filePath, content) {
    const prev = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : null;
    if (prev !== content) {
      fs.writeFileSync(filePath, content, jsonOpts);
    }
  }

  for (let p = 0; p < pages.length; p++) {
    const filePath = path.join(DATA_DIR, `page-${p + 1}.json`);
    const content = JSON.stringify({ wallpapers: pages[p] }, null, 2);
    writeIfChanged(filePath, content);
  }

  // If no wallpapers, still write one empty page so index is valid
  if (pages.length === 0) {
    const filePath = path.join(DATA_DIR, "page-1.json");
    writeIfChanged(filePath, JSON.stringify({ wallpapers: [] }, null, 2));
  }

  // latest.json — 20 newest
  const latestPath = path.join(DATA_DIR, "latest.json");
  const latestContent = JSON.stringify(
    { wallpapers: entries.slice(0, LATEST_COUNT) },
    null,
    2,
  );
  writeIfChanged(latestPath, latestContent);

  // index.json
  const index = {
    total_wallpapers: entries.length,
    total_pages: Math.max(1, stats.pagesCreated),
    page_size: PAGE_SIZE,
    latest: "latest.json",
    pages: Array.from(
      { length: Math.max(1, stats.pagesCreated) },
      (_, i) => `page-${i + 1}.json`,
    ),
  };
  const indexContent = JSON.stringify(index, null, 2);
  writeIfChanged(path.join(DATA_DIR, "index.json"), indexContent);

  // Remove stale page files (e.g. had 10 pages, now 7)
  const existingPageFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^page-\d+\.json$/.test(f));
  for (const f of existingPageFiles) {
    const n = parseInt(f.replace("page-", "").replace(".json", ""), 10);
    if (n > index.total_pages) {
      try {
        fs.unlinkSync(path.join(DATA_DIR, f));
      } catch (e) {
        console.warn("Warning: could not remove stale " + f, e.message);
      }
    }
  }

  // Logging
  console.log("Wallpaper metadata generation complete.");
  console.log("  Total wallpapers detected: " + stats.totalDetected);
  console.log("  New wallpapers added: " + stats.newWallpapers);
  console.log("  Wallpapers removed: " + stats.removed);
  console.log("  Thumbnails generated: " + stats.thumbnailsGenerated);
  console.log("  Pages created: " + index.total_pages);
  console.log("  Latest feed: " + LATEST_COUNT + " wallpapers in latest.json");
  console.log("  JSON output directory: " + DATA_DIR);
  console.log(
    "  Output files: index.json, latest.json, page-1.json ... page-" +
      index.total_pages +
      ".json",
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
