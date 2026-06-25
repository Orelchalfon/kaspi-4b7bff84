#!/usr/bin/env node
// analyze-file-sizes.mjs
// Zero-dependency file-size auditor for the senior-refactor skill.
// Scans common source dirs, reports files over a line threshold (default 300),
// sorted descending, tagged as "component" (.tsx/.jsx) or "logic" (.ts/.js).
//
// Run from the repo root:
//   node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs
//   node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs --threshold 250

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";

const ROOT = process.cwd();

// --- config -----------------------------------------------------------------

const THRESHOLD = parseThreshold(process.argv, 300);

// Only these top-level source dirs are scanned (if they exist).
const SCAN_DIRS = ["src", "app", "pages", "components", "lib", "hooks", "utils", "features"];

// Never descend into these (matched by directory name anywhere in the tree).
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
  ".turbo",
  ".cache",
  ".vercel",
  ".wrangler",
]);

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const COMPONENT_EXTS = new Set([".tsx", ".jsx"]);

// --- helpers ----------------------------------------------------------------

function parseThreshold(argv, fallback) {
  const i = argv.indexOf("--threshold");
  if (i !== -1 && argv[i + 1]) {
    const n = Number.parseInt(argv[i + 1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

function countLines(absPath) {
  try {
    const text = readFileSync(absPath, "utf8");
    if (text.length === 0) return 0;
    // Count newlines + 1 for the trailing line if the file doesn't end in \n.
    let lines = 0;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) lines++;
    }
    return text.endsWith("\n") ? lines : lines + 1;
  } catch {
    return 0;
  }
}

function kindFor(ext) {
  return COMPONENT_EXTS.has(ext) ? "component" : "logic";
}

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), acc);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (!CODE_EXTS.has(ext)) continue;
      const abs = join(dir, entry.name);
      const lines = countLines(abs);
      if (lines > THRESHOLD) {
        acc.push({ path: relative(ROOT, abs).split(sep).join("/"), lines, kind: kindFor(ext) });
      }
    }
  }
}

function pad(str, width) {
  str = String(str);
  return str.length >= width ? str : str + " ".repeat(width - str.length);
}

function padStart(str, width) {
  str = String(str);
  return str.length >= width ? str : " ".repeat(width - str.length) + str;
}

// --- main -------------------------------------------------------------------

const scanned = SCAN_DIRS.filter((d) => existsSync(join(ROOT, d)));

if (scanned.length === 0) {
  console.log("No source directories found among:", SCAN_DIRS.join(", "));
  console.log("Run this from the repo root.");
  process.exit(0);
}

const results = [];
for (const dir of scanned) walk(join(ROOT, dir), results);

results.sort((a, b) => b.lines - a.lines);

console.log("");
console.log(`senior-refactor · file-size audit (threshold > ${THRESHOLD} lines)`);
console.log(`scanned dirs: ${scanned.join(", ")}`);
console.log("");

if (results.length === 0) {
  console.log(`No files over ${THRESHOLD} lines. 🎉`);
  process.exit(0);
}

const pathWidth = Math.max(4, ...results.map((r) => r.path.length));
const lineWidth = Math.max(5, ...results.map((r) => String(r.lines).length));

console.log(`${pad("FILE", pathWidth)}  ${padStart("LINES", lineWidth)}  KIND`);
console.log(`${"-".repeat(pathWidth)}  ${"-".repeat(lineWidth)}  ${"-".repeat(9)}`);
for (const r of results) {
  console.log(`${pad(r.path, pathWidth)}  ${padStart(r.lines, lineWidth)}  ${r.kind}`);
}

const components = results.filter((r) => r.kind === "component").length;
const logic = results.length - components;
console.log("");
console.log(
  `Total: ${results.length} file(s) over ${THRESHOLD} lines ` +
    `(${components} component, ${logic} logic). Largest: ${results[0].lines} lines.`
);
