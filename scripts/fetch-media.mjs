// Mirrors every remote cover (Apple Music / Spotify / Amazon CDNs) into public/media
// so production serves first-party, cacheable images. Runs automatically before
// `npm run build`; if the network is unavailable it keeps the current manifest and
// the site falls back to the official CDN URLs at runtime.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { albums, hits, chapters, art } from '../src/data.js';

const root = new URL('..', import.meta.url);
const outDir = new URL('public/media/', root);
const manifestFile = new URL('src/media-manifest.json', root);

const urls = new Set();
albums.forEach((a) => !a.local && urls.add(art(a.key, 1200)));
hits.forEach((h) => urls.add(art(h.cover, 300)));
chapters.forEach((c) => c.cover && !c.local && urls.add(art(c.cover, 600)));
urls.delete('');

let manifest = {};
try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')); } catch {}
await mkdir(outDir, { recursive: true });

let ok = 0;
let failed = 0;
await Promise.all([...urls].map(async (url) => {
  if (manifest[url]) return;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') || '';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const name = createHash('sha1').update(url).digest('hex').slice(0, 16) + '.' + ext;
    await writeFile(new URL(name, outDir), Buffer.from(await res.arrayBuffer()));
    manifest[url] = `/media/${name}`;
    ok++;
  } catch (err) {
    failed++;
    console.warn(`[media] skipped ${url}: ${err.message}`);
  }
}));

await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[media] mirrored ${ok} new, ${Object.keys(manifest).length} total, ${failed} unavailable (CDN fallback).`);
