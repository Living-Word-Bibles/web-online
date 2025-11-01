// build.mjs — WEB Online Bible (matches KJV Online layout, no Install panel)
// Publishes verse-per-page site to /dist
// AdSense: ca-pub-5303063222439969

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- SITE CONFIG ----
const OUT_DIR = path.join(__dirname, 'dist');
const SITE_ORIGIN = 'https://web.livingwordbibles.com';
const THE_HOLY_BIBLE_URL = 'https://www.livingwordbibles.com/read-the-bible-online/web';
const LOGO_URL = 'https://www.livingwordbibles.com/s/LivingWordBibles01.png';
const TITLE = 'The Holy Bible: World English Bible';
const PUBLISHER = 'Living Word Bibles';
const ADSENSE_PUB = 'ca-pub-5303063222439969';

// Data: set a pinned jsDelivr commit URL in the workflow as env DATA_URL, or use local data/web.json
const DATA_URL = process.env.DATA_URL || '';
const LOCAL_DATA = path.join(__dirname, 'data', 'web.json');

// ---- LOAD SUPPORT FILES ----
const BOOKS = JSON.parse(fs.readFileSync(path.join(__dirname, 'books.json'), 'utf8'));

// ---- FS HELPERS ----
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const write = (p, c) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, c); };

// ---- DATA LOADER (tolerant of object-or-array chapter/verse shapes) ----
async function loadData() {
  if (DATA_URL) {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`Failed to fetch WEB data: ${res.status}`);
    return await res.json();
  }
  if (fs.existsSync(LOCAL_DATA)) {
    return JSON.parse(fs.readFileSync(LOCAL_DATA, 'utf8'));
  }
  throw new Error('No DATA_URL set and no local data at data/web.json');
}

const isObject = (x) => x && typeof x === 'object' && !Array.isArray(x);

// Collect numeric keys of an object/array in ascending order, ignoring 0
function numericKeysAsc(container) {
  if (Array.isArray(container)) {
    const out = [];
    for (let i = 1; i < container.length; i++) if (container[i] != null) out.push(i);
    return out;
  }
  const nums = Object.keys(container)
    .map(k => Number(k))
    .filter(n => Number.isFinite(n) && n > 0);
  nums.sort((a,b)=>a-b);
  return nums;
}

// ---- HTML HELPERS ----
function esc(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
const slug = (s) => s.toLowerCase().replaceAll(' ', '-');
const canon = (bookSlug, c, v) => `${SITE_ORIGIN}/${bookSlug}/${c}/${v}/`;

function shareBar(url, label) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(label);
  // Inline SVG icons for parity + accessibility
  const svg = {
    fb: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M13 22v-9h3l1-4h-4V7c0-1.1.9-2 2-2h2V1h-3a5 5 0 0 0-5 5v3H6v4h3v9h4z"/></svg>',
    ig: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 7zm6.5-.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"/></svg>',
    x:  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M18.3 2H21l-6.6 7.6L22 22h-6.9l-5.4-7-3.8 4.3V2h4.6v9.2z"/></svg>',
    li: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM2 8h4v14H2zm7 0h4v2h.1A4.4 4.4 0 0 1 17 8c3.4 0 5 2.2 5 6.1V22h-4v-6c0-2-1-3.4-2.6-3.4S12 14 12 16v6H8z"/></svg>',
    mail:'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M2 4h20v16H2z"/><path fill="#fff" d="M3 6l9 7 9-7v-1H3z"/></svg>',
    copy:'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg>',
  };
  return `
  <div class="share">
    <a class="share-btn" aria-label="Share on Facebook" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}">${svg.fb}<span>Facebook</span></a>
    <a class="share-btn" aria-label="Open Instagram profile" target="_blank" rel="noopener" href="https://www.instagram.com/living.word.bibles/">${svg.ig}<span>Instagram</span></a>
    <a class="share-btn" aria-label="Post on X" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${u}&text=${t}">${svg.x}<span>X</span></a>
    <a class="share-btn" aria-label="Share on LinkedIn" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${u}">${svg.li}<span>LinkedIn</span></a>
    <a class="share-btn" aria-label="Share via Email" target="_blank" rel="noopener" href="mailto:?subject=${t}&body=${u}">${svg.mail}<span>Email</span></a>
    <button class="share-btn" aria-label="Copy link" onclick="navigator.clipboard.writeText('${url}').then(()=>{ const n=document.getElementById('copied'); if(n){n.style.opacity=1; setTimeout(()=>n.style.opacity=0,1200);} });">${svg.copy}<span>Copy</span></button>
    <span id="copied" class="copied">Link copied</span>
  </div>`;
}

function adsense() {
  return `
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB}" crossorigin="anonymous"></script>
  <ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_PUB}" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;
}

function pageTemplate({ bookName, bookSlug, c, v, verseText, prev, next }) {
  const title = `${bookName} ${c}:${v} — ${TITLE}`;
  const url = canon(bookSlug, c, v);
  const desc = `${bookName} ${c}:${v} (WEB): ${verseText.slice(0, 140)}…`;
  const prevLink = prev ? `<a class="nav-btn" href="${prev}">⟵ Prev</a>` : '';
  const nextLink = next ? `<a class="nav-btn" href="${next}">Next ⟶</a>` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <link rel="canonical" href="${url}" />
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="article" />
  <meta name="robots" content="index,follow" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    :root { --fg:#111; --muted:#6b7280; --bg:#fff; --card:#fff; }
    * { box-sizing:border-box; }
    body { margin:0; font:18px/1.7 'EB Garamond', Georgia, 'Times New Roman', serif; color:var(--fg); background:var(--bg); }
    header { text-align:center; padding:28px 16px 12px; }
    header img { width:120px; height:auto; display:block; margin:0 auto 10px; }
    h1 { font-size:22px; margin:0 0 6px; font-weight:700; }
    .searchbar { display:flex; gap:8px; justify-content:center; padding:8px 16px 16px; flex-wrap:wrap; }
    .searchbar input { padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; min-width:120px; }
    .searchbar button, .nav-btn { padding:10px 14px; border:0; border-radius:12px; background:#111; color:#fff; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:8px; }
    main { max-width:780px; margin:0 auto; padding:8px 16px 36px; }
    .nav { display:flex; gap:8px; margin:16px 0; }
    .ref { color:var(--muted); font-weight:600; letter-spacing:.2px; margin-bottom:8px; }
    .verse { font-size:22px; line-height:1.7; background:var(--card); padding:18px; border-radius:16px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
    .share { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 24px; align-items:center; }
    .share-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #e5e7eb; border-radius:12px; text-decoration:none; color:#111; background:#fff; }
    .share-btn svg { flex:0 0 auto; }
    .copied { opacity:0; transition:opacity .25s ease; font-size:12px; color:var(--muted); margin-left:6px; }
    footer { text-align:center; color:var(--muted); padding:16px; border-top:1px solid #f3f4f6; }
  </style>
  <script>
    function goVerse(){
      const b = document.getElementById('book').value.trim();
      const c = document.getElementById('chap').value.trim();
      const v = document.getElementById('verse').value.trim();
      if(!b||!c||!v) return;
      window.location.href = '/' + b.toLowerCase().replaceAll(' ', '-') + '/' + c + '/' + v + '/';
    }
  </script>
</head>
<body>
  <header>
    <img src="${LOGO_URL}" alt="${PUBLISHER} logo" />
    <h1>${esc(TITLE)}</h1>
    <div class="searchbar">
      <input id="book" placeholder="Book (e.g., John)" />
      <input id="chap" placeholder="Chapter (e.g., 3)" />
      <input id="verse" placeholder="Verse (e.g., 16)" />
      <button onclick="goVerse()">Go</button>
      <a href="${THE_HOLY_BIBLE_URL}" class="nav-btn">The Holy Bible</a>
    </div>
  </header>
  <main>
    <div class="nav">${prevLink}${nextLink}</div>
    <div class="ref">${esc(bookName)} ${c}:${v} (WEB)</div>
    <article class="verse">${esc(verseText)}</article>
    ${shareBar(url, `${bookName} ${c}:${v} (WEB)`)}
    ${adsense()}
  </main>
  <footer>
    Copyright © 2025 | Living Word Bibles | All Rights Reserved |
    <a href="https://www.livingwordbibles.com" target="_blank" rel="noopener">www.livingwordbibles.com</a>
  </footer>

  </footer>
</body>
</html>`;
}

// ---- BUILD ----
async function main(){
  fs.rmSync(OUT_DIR, { recursive:true, force:true });
  ensureDir(OUT_DIR);

  const data = await loadData();

  // Build a complete ordered list of existing verse refs for robust prev/next
  const refs = [];
  for (let bIdx = 0; bIdx < BOOKS.length; bIdx++) {
    const bookName = BOOKS[bIdx].name;
    const book = data?.[bookName];
    if (!book) continue;

    const chapterKeys = numericKeysAsc(book);
    for (const c of chapterKeys) {
      const chapter = isObject(book) ? book[c] : book[c];
      if (!chapter) continue;
      const verseKeys = numericKeysAsc(chapter);
      for (const v of verseKeys) {
        const verseText = chapter[v];
        if (typeof verseText === 'string' && verseText.length) {
          refs.push({ bIdx, bookName, c, v, verseText });
        }
      }
    }
  }

  // Render pages
  for (let i = 0; i < refs.length; i++) {
    const { bIdx, bookName, c, v, verseText } = refs[i];
    const bookSlug = slug(bookName);

    const prev = i > 0
      ? canon(slug(refs[i-1].bookName), refs[i-1].c, refs[i-1].v)
      : null;
    const next = i < refs.length - 1
      ? canon(slug(refs[i+1].bookName), refs[i+1].c, refs[i+1].v)
      : null;

    const html = pageTemplate({ bookName, bookSlug, c, v, verseText, prev, next });
    const out = path.join(OUT_DIR, bookSlug, String(c), String(v), 'index.html');
    write(out, html);
  }

// robots & sitemap
write(path.join(OUT_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);
const urls = refs.map(r => `<url><loc>${canon(slug(r.bookName), r.c, r.v)}</loc></url>`).join('');
write(path.join(OUT_DIR, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);

// ads.txt (AdSense)
write(path.join(OUT_DIR, 'ads.txt'), 'google.com, pub-5303063222439969, DIRECT, f08c47fec0942fa0');

// CNAME for custom domain
write(path.join(OUT_DIR, 'CNAME'), 'web.livingwordbibles.com');

  console.log(`Built ${refs.length} verse pages → ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
