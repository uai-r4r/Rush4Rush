/**
 * One-shot image compression for R4R.
 *
 * Converts every large image under public/ to WebP, caps the long edge at
 * 1400px, deletes the original, and then rewrites every reference to the old
 * filename across app/, components/ and data/ so nothing 404s.
 *
 * Run from the project root:
 *   npm install --save-dev sharp
 *   node compress-images.mjs --dry     (see what it would do)
 *   node compress-images.mjs           (do it)
 *
 * Commit before running. It edits files in place.
 */
import sharp from "sharp";
import { readdir, readFile, writeFile, stat, unlink } from "node:fs/promises";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const MIN_BYTES = 120 * 1024; // leave small files alone
const MAX_EDGE = 1400;
const QUALITY = 80;
const PUBLIC_DIR = "public";
const CODE_DIRS = ["app", "components", "data", "lib"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const fmt = (b) => (b / 1024 / 1024).toFixed(2) + "MB";

const files = await walk(PUBLIC_DIR);
const targets = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;
  const { size } = await stat(file);
  if (size < MIN_BYTES) continue;
  targets.push({ file, size });
}

if (targets.length === 0) {
  console.log("Nothing over " + MIN_BYTES / 1024 + "KB. Already compressed?");
  process.exit(0);
}

console.log(`${targets.length} images to convert${DRY ? " (dry run)" : ""}\n`);

let before = 0;
let after = 0;
const renames = new Map(); // "old-name.png" -> "old-name.webp"

for (const { file, size } of targets) {
  const outFile = file.replace(/\.(png|jpe?g)$/i, ".webp");

  const image = sharp(file).rotate(); // rotate() honours EXIF orientation
  const meta = await image.metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);

  const pipeline =
    longEdge > MAX_EDGE
      ? image.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside" })
      : image;

  const buf = await pipeline.webp({ quality: QUALITY, effort: 5 }).toBuffer();

  before += size;
  after += buf.length;

  const pct = (100 - (buf.length / size) * 100).toFixed(0);
  console.log(
    `  ${fmt(size).padStart(8)} -> ${(buf.length / 1024).toFixed(0).padStart(5)}KB  (${pct}% smaller)  ${file}`,
  );

  if (!DRY) {
    await writeFile(outFile, buf);
    if (outFile !== file) await unlink(file);
  }
  renames.set(path.basename(file), path.basename(outFile));
}

console.log(`\n  total: ${fmt(before)} -> ${fmt(after)}\n`);

// ---- rewrite references so nothing 404s -------------------------------
let touched = 0;
for (const dir of CODE_DIRS) {
  let list;
  try {
    list = await walk(dir);
  } catch {
    continue; // directory may not exist
  }
  for (const file of list) {
    if (!CODE_EXT.has(path.extname(file))) continue;
    const original = await readFile(file, "utf8");
    let next = original;
    for (const [from, to] of renames) {
      if (from === to) continue;
      next = next.split(from).join(to);
    }
    if (next !== original) {
      touched++;
      console.log(`  updated refs in ${file}`);
      if (!DRY) await writeFile(file, next, "utf8");
    }
  }
}

console.log(`\n${touched} source file(s) with updated references.`);
console.log(
  DRY
    ? "\nDry run — nothing changed. Re-run without --dry to apply."
    : "\nDone. Run `npm run build`, then check every page before pushing.",
);
