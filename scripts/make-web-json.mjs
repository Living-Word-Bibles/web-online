// scripts/make-web-json.mjs
// Build data/web.json for WEB Online from per-book JSON (public domain)
// Source data: https://github.com/TehShrike/world-english-bible (book JSON files)  ← pin a commit if you like
// Output shape: { BookName: { chapterNumber: { verseNumber: "text" } } }

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.join(__dirname, '..');

// Load your canonical book list so names match your site
const booksPath  = path.join(repoRoot, 'books.json');
const BOOKS      = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Pin to a specific commit if you want reproducibility.
// Example: const COMMIT = 'abc123...';
const COMMIT = 'master'; // change to a commit SHA later for stability
const BASE   = `https://raw.githubusercontent.com/TehShrike/world-english-bible/${COMMIT}/json`;

// tiny fetch helper (Node 18+/20+ has global fetch)
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json();
}

function toRepoFilename(bookName) {
  // repo uses lowercased names with spaces removed, e.g. "1 Samuel" -> "1samuel", "Song of Solomon" -> "songofsolomon"
  return bookName.toLowerCase().replaceAll(' ', '');
}

function pushText(target, c, v, value) {
  if (!target[c]) target[c] = {};
  if (!target[c][v]) target[c][v] = value.trim();
  else target[c][v] = (target[c][v] + ' ' + value).trim();
}

async function build() {
  const out = {};
  let verseCount = 0;

  for (const { name } of BOOKS) {
    const file = `${toRepoFilename(name)}.json`;
    const url  = `${BASE}/${file}`;
    const arr  = await getJson(url); // array of objects w/ {type, chapterNumber, verseNumber, value, ...}
    const byChapter = {};

    for (const row of arr) {
      const { type, chapterNumber: c, verseNumber: v, value } = row || {};
      if (!c || !v) continue;

      // Keep verse text; ignore structural markers
      if (type === 'paragraph text' || type === 'line text') {
        pushText(byChapter, c, v, value || '');
      }
      // optional: treat stanza/line breaks as spaces — verse text already concatenates above, so safe to ignore
    }

    // Trim whitespace in every verse
    for (const c of Object.keys(byChapter)) {
      for (const v of Object.keys(byChapter[c])) {
        byChapter[c][v] = byChapter[c][v].replace(/\s+/g, ' ').trim();
        verseCount++;
      }
    }

    out[name] = byChapter;
    console.log(`✓ ${name} (${Object.keys(byChapter).length} chapters)`);
  }

  const dataDir = path.join(repoRoot, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const outPath = path.join(dataDir, 'web.json');
  fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');

  console.log(`\nDONE → ${outPath}`);
  console.log(`Total verses: ${verseCount.toLocaleString()}`);
}

build().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
