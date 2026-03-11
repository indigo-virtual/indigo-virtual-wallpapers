#!/usr/bin/env node
/**
 * Bulk-update author name and/or author_id in data/wallpaper-meta.json.
 * Match by current author_id or author name; then run generate:wallpapers
 * to propagate to latest.json and page-*.json.
 *
 * Usage:
 *   node scripts/update-author.js --by-id IGO0002 --name "New Name" [--id NEW_ID]
 *   node scripts/update-author.js --by-name "Rahul Chakraborty" --name "Rahul C." [--id IGO0002]
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const META_PATH = path.join(REPO_ROOT, "data", "wallpaper-meta.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { byId: null, byName: null, newName: null, newId: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--by-id" && args[i + 1]) {
      out.byId = args[++i];
    } else if (args[i] === "--by-name" && args[i + 1]) {
      out.byName = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      out.newName = args[++i];
    } else if (args[i] === "--id" && args[i + 1]) {
      out.newId = args[++i];
    }
  }
  return out;
}

function main() {
  const { byId, byName, newName, newId } = parseArgs();

  if (!fs.existsSync(META_PATH)) {
    console.error("Error: data/wallpaper-meta.json not found. Run 'npm run generate:wallpapers' first.");
    process.exit(1);
  }

  const needMatch = byId != null || byName != null;
  if (!needMatch || !newName) {
    console.error("Usage:");
    console.error('  node scripts/update-author.js --by-id IGO0002 --name "New Name" [--id NEW_ID]');
    console.error('  node scripts/update-author.js --by-name "Rahul Chakraborty" --name "Rahul C." [--id IGO0002]');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  let updated = 0;

  for (const [id, entry] of Object.entries(meta)) {
    const match =
      (byId != null && (entry.author_id || "") === byId) ||
      (byName != null && (entry.author || "").trim() === byName.trim());
    if (!match) continue;

    if (newName != null) entry.author = newName;
    if (newId != null) entry.author_id = newId;
    updated++;
  }

  if (updated === 0) {
    console.log("No wallpapers matched.");
    if (byId) console.log("  --by-id: " + byId);
    if (byName) console.log("  --by-name: " + JSON.stringify(byName));
    process.exit(0);
  }

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), "utf8");
  console.log("Updated " + updated + " wallpaper(s) in data/wallpaper-meta.json");
  console.log("  New author: " + newName + (newId != null ? " (id: " + newId + ")" : ""));
  console.log("");
  console.log("Run the generator to update latest.json and page-*.json:");
  console.log("  npm run generate:wallpapers");
}

main();
