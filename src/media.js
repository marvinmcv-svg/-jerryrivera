// Remote cover art is mirrored into /public/media at build time by scripts/fetch-media.mjs,
// which writes src/media-manifest.json (git-ignored). When a mirrored copy exists we serve it;
// otherwise we fall back to the official CDN URL.
const found = import.meta.glob('./media-manifest.json', { eager: true, import: 'default' });
const manifest = Object.values(found)[0] || {};

export const media = (url) => (url && manifest[url]) || url;
