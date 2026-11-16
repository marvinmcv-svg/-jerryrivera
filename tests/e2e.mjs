// End-to-end + visual check of the site on desktop and phones.
//
//   npm run test:e2e                 # builds, serves dist/ and runs every check
//   OFFLINE=1 npm run test:e2e       # stub third-party CDNs (covers, previews, Instagram)
//   SHOTS=dir npm run test:e2e       # where to save screenshots (default tests/screenshots)
//
// Uses the `playwright` package (npx playwright install chromium if you don't have a browser).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const ROOT = new URL('..', import.meta.url);
const PORT = 4179;
const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;
const OFFLINE = !!process.env.OFFLINE;
const SHOTS = process.env.SHOTS || new URL('screenshots/', import.meta.url).pathname;
const COVER = await readFile(new URL('fixtures/cover.jpg', import.meta.url));
const AUDIO = await readFile(new URL('fixtures/preview.mp3', import.meta.url));

const results = [];
let failures = 0;
const check = (ctx, name, ok, detail = '') => {
  results.push({ ctx, name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} [${ctx}] ${name}${detail ? ` — ${detail}` : ''}`);
};

async function startServer() {
  if (process.env.BASE_URL) return null;
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) return proc; } catch {}
    await sleep(200);
  }
  throw new Error('preview server did not start');
}

async function wire(page, label) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    // third-party resources blocked in CI/offline are not site bugs
    if (/Failed to load resource|ERR_|net::|instagram|spotify|youtube|mzstatic|scdn|amazon/i.test(txt)) return;
    errors.push(txt);
  });
  if (OFFLINE) {
    await page.context().route(/mzstatic\.com|scdn\.co|media-amazon\.com/, (r) => r.fulfill({ body: COVER, contentType: 'image/jpeg' }));
    await page.context().route(/audio-ssl\.itunes\.apple\.com/, (r) => r.fulfill({ body: AUDIO, contentType: 'audio/mpeg' }));
    await page.context().route(/open\.spotify\.com\/(track|album|artist)\//, (r) => r.fulfill({ body: '<title>Spotify</title>', contentType: 'text/html' }));
    await page.context().route(/instagram\.com|open\.spotify\.com\/embed|fonts\.(googleapis|gstatic)\.com|youtube/, (r) => r.abort());
  }
  page.__errors = errors;
  page.__label = label;
  return errors;
}

const scrollTo = async (page, sel, block = 'start') => {
  await page.evaluate(([s, b]) => document.querySelector(s)?.scrollIntoView({ block: b, behavior: 'instant' }), [sel, block]);
  await sleep(900);
};

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${page.__label}-${name}.png` });
}

async function run(browser, label, contextOpts) {
  console.log(`\n▶ ${label}`);
  const context = await browser.newContext({ ...contextOpts, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = await wire(page, label);
  const mobile = (contextOpts.viewport?.width ?? 1440) <= 720;

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.loader', { state: 'detached', timeout: 15000 });
  await sleep(1200);
  check(label, 'preloader opens onto the hero', true);
  await shot(page, '01-hero');

  // --- layout sanity
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(label, 'no horizontal page scroll', overflow <= 1, `overflow ${overflow}px`);

  // --- 1. logo: face + latest record
  const logo = await page.evaluate(() => {
    const face = document.querySelector('.brand__face');
    const label = document.querySelector('.brand__label');
    const r = face.getBoundingClientRect();
    return { faceOk: face.complete && face.naturalWidth > 0, w: r.width, record: getComputedStyle(label).backgroundImage.includes('mi-isla') };
  });
  check(label, 'logo shows Jerry\'s face', logo.faceOk && logo.w >= 36, `${logo.w}px`);
  check(label, 'logo carries the latest record (Mi Isla del Encanto)', logo.record);

  // --- language toggle
  await page.click('.lang');
  const en = await page.textContent('#historia .section-title');
  await page.click('.lang');
  const es = await page.textContent('#historia .section-title');
  check(label, 'ES/EN toggle', /Story/.test(en) && /Historia/.test(es), `${en.trim()} / ${es.trim()}`);

  // --- mobile menu
  if (mobile) {
    await page.click('.burger');
    await sleep(700);
    const open = await page.$eval('.menu', (m) => m.classList.contains('is-open'));
    check(label, 'burger opens the menu', open);
    await page.click('.menu__links a[href="#historia"]');
    await sleep(2200);
    const closed = await page.$eval('.menu', (m) => !m.classList.contains('is-open'));
    const top = await page.$eval('#historia', (s) => Math.round(s.getBoundingClientRect().top));
    check(label, 'menu link closes menu and scrolls to section', closed && Math.abs(top) < 120, `section top ${top}px`);
  }

  // --- 3. Historia turntable
  await scrollTo(page, '#historia');
  await shot(page, '02-story');
  const tracks = await page.$$eval('.track', (t) => t.length);
  check(label, 'story has 10 eras', tracks === 10, `${tracks}`);
  await scrollTo(page, '.track[data-i="3"]', 'center');
  await sleep(600);
  const deckYear = await page.textContent('.js-deck-year');
  check(label, 'turntable follows scroll (1992 on deck)', deckYear.trim() === '1992', deckYear);
  const deckBox = await page.$eval('.deck__readout', (d) => d.getBoundingClientRect().toJSON());
  check(label, 'turntable stays on screen while scrolling the eras', deckBox.top >= 0 && deckBox.bottom <= (await page.evaluate(() => innerHeight)), `top ${Math.round(deckBox.top)}`);
  await page.click('.track[data-i="3"] .play-chip');
  await sleep(1200);
  const story = await page.evaluate(() => ({
    pressed: document.querySelector('.track[data-i="3"] .play-chip').getAttribute('aria-pressed'),
    np: document.querySelector('.np').classList.contains('is-open'),
    title: document.querySelector('.np__title').textContent,
    spinning: document.querySelector('.js-tt').classList.contains('is-playing'),
  }));
  check(label, 'era preview plays (Amores Como el Nuestro)', story.pressed === 'true' && story.np && /Amores/.test(story.title), JSON.stringify(story));
  check(label, 'record spins while the era plays', story.spinning);
  await shot(page, '03-story-playing');
  await page.click('.track[data-i="3"] .play-chip');
  await sleep(300);
  check(label, 'tapping again pauses', (await page.getAttribute('.track[data-i="3"] .play-chip', 'aria-pressed')) === 'false');

  // --- 4. Discography covers
  await scrollTo(page, '#discografia');
  await sleep(800);
  await shot(page, '04-discography');
  const disco = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.rcard')];
    const imgs = cards.map((c) => c.querySelector('.rcard__face img'));
    return { n: cards.length, withImg: imgs.filter(Boolean).length, hiRes: imgs.filter((i) => i && /1200x1200|600x600|\/media\/|\.webp|_SL600_|ab67616d/.test(i.src)).length };
  });
  check(label, 'discography has 21 releases', disco.n === 21, `${disco.n}`);
  check(label, 'every release uses original cover art', disco.withImg === 21 && disco.hiRes === 21, `${disco.hiRes}/21 high-res`);
  const before = await page.textContent('.js-d-idx');
  await page.click('.disco__btn[data-dir="1"]');
  await sleep(1800);
  const after = await page.textContent('.js-d-idx');
  check(label, 'next-album button advances', before !== after, `${before} → ${after}`);
  const links = await page.$$eval('.js-d-links a', (a) => a.map((x) => x.href));
  check(label, 'album has Spotify / Apple / Buy links', links.length >= 2, `${links.length} links`);

  // --- 5. Billboard #1s — previews + Spotify
  await scrollTo(page, '.hits');
  await shot(page, '05-hits');
  const hits = await page.$$eval('.hit', (rows) => rows.map((r) => ({
    preview: r.querySelector('.hit__play')?.dataset.preview || '',
    spotify: r.querySelector('.hit__spotify')?.href || '',
  })));
  check(label, '10 Billboard #1s listed', hits.length === 10);
  check(label, 'each #1 links to its Spotify track', hits.every((h) => /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(h.spotify)));
  check(label, 'each #1 has a 30 s preview', hits.every((h) => /^https:\/\/audio-ssl\.itunes\.apple\.com\/.+\.m4a$/.test(h.preview)));
  await page.click('.hit:nth-child(5) .hit__play');
  await sleep(1500);
  const hitState = await page.evaluate(() => ({
    pressed: document.querySelector('.hit:nth-child(5) .hit__play').getAttribute('aria-pressed'),
    title: document.querySelector('.np__title').textContent,
    spotify: document.querySelector('.np__spotify').href,
  }));
  check(label, 'tapping “Quiero” plays its preview', hitState.pressed === 'true' && hitState.title === 'Quiero', JSON.stringify(hitState));
  check(label, 'now-playing bar links to the Spotify track', /open\.spotify\.com\/track\//.test(hitState.spotify));
  await shot(page, '06-hits-playing');
  await page.click('.np__toggle');
  await sleep(300);
  check(label, 'now-playing pause works', (await page.getAttribute('.hit:nth-child(5) .hit__play', 'aria-pressed')) === 'false');
  const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.click('.hit:nth-child(5) .hit__spotify')]);
  check(label, 'Spotify button opens the track in a new tab', !!popup && /open\.spotify\.com\/track/.test(popup.url()), popup?.url());
  await popup?.close();

  // --- videos modal
  await scrollTo(page, '#videos');
  await page.click('.vcard--main');
  await sleep(700);
  check(label, 'video modal opens', await page.$eval('.modal', (m) => m.classList.contains('is-open')));
  await page.click('.modal__close');
  await sleep(500);
  check(label, 'video modal closes', await page.$eval('.modal', (m) => !m.classList.contains('is-open')));

  // --- 7. Next show: image + human + countdown
  await scrollTo(page, '#gira');
  await sleep(1000);
  await shot(page, '07-tour');
  const tour = await page.evaluate(() => {
    const bg = document.querySelector('.tour__photo img');
    const artist = document.querySelector('.ticket__artist img');
    return { bg: bg.complete && bg.naturalWidth > 0, artist: !!artist && artist.getBoundingClientRect().height > 60 };
  });
  check(label, 'tour has a live photo of Jerry', tour.bg);
  check(label, 'ticket shows Jerry\'s portrait', tour.artist);
  const s1 = await page.textContent('.js-cd-s');
  await sleep(1100);
  const s2 = await page.textContent('.js-cd-s');
  const showPassed = Date.now() > new Date('2026-11-18T02:30:00Z').getTime();
  check(label, 'countdown ticks', s1 !== s2 || showPassed, `${s1} → ${s2}`);

  // --- 8. Instagram: real posts
  await scrollTo(page, '.social');
  await sleep(1500);
  await shot(page, '08-instagram');
  const ig = await page.$$eval('.post blockquote.instagram-media, .post iframe', (els) => els.map((e) => e.dataset?.instgrmPermalink || e.src || ''));
  check(label, '8 real Instagram posts embedded', ig.length === 8 && ig.every((u) => /instagram\.com\/p\//.test(u)), `${ig.length}`);

  // --- 9. JR AI assistant
  await page.click('.ai-fab');
  await sleep(700);
  await shot(page, '09-ai-open');
  const chips = await page.$$eval('.ai__chips button', (b) => b.length);
  check(label, 'JR AI opens with quick replies', chips >= 4, `${chips} chips`);
  await page.click('.ai__chips button[data-k="booking"]');
  await sleep(400);
  check(label, 'booking flow shows request form', !!(await page.$('.ai__booking')));
  await page.click('.ai__booking button[type="submit"]');
  check(label, 'booking form validates', (await page.textContent('.ai__booking .ai__err')).length > 5);
  const f = '.ai__booking';
  await page.fill(`${f} [name=name]`, 'Ana Pérez · Eventos Caribe');
  await page.fill(`${f} [name=email]`, 'ana@example.com');
  await page.fill(`${f} [name=city]`, 'Miami, FL');
  await page.fill(`${f} [name=date]`, '2027-03-20');
  await page.fill(`${f} [name=cap]`, '3000');
  await page.click(`${f} button[type="submit"]`);
  await sleep(400);
  const lastBot = await page.$$eval('.ai__msg--bot .ai__bubble', (b) => b.at(-1).textContent);
  check(label, 'booking request is prepared', /Miami/.test(lastBot), lastBot.slice(0, 80));
  await page.click('.ai__chips button[data-k="buy"]');
  await sleep(400);
  const cards = await page.$$eval('.ai__card', (c) => c.map((x) => x.href));
  check(label, 'buy flow suggests records with store links', cards.length >= 3 && cards.every((h) => /apple\.com|spotify\.com/.test(h)));
  await shot(page, '10-ai-flows');
  // free text via the Claude endpoint (mocked) …
  await page.route('**/api/chat', (r) => r.fulfill({ json: { reply: 'Jerry nació en **Humacao** — [Spotify](https://open.spotify.com/artist/7wOZy3KdFVVINgNFFxkxwO)' } }));
  await page.fill('#ai-input', '¿Dónde nació Jerry?');
  await page.press('#ai-input', 'Enter');
  await page.waitForFunction(() => /Humacao/.test(document.querySelector('.ai__msg--bot:last-child')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
  const apiReply = await page.$eval('.ai__msg--bot:last-child', (m) => m.innerHTML);
  check(label, 'free-text question answered by /api/chat', /<b>Humacao<\/b>/.test(apiReply) && /open\.spotify\.com/.test(apiReply));
  // … and the offline fallback when the endpoint is down
  await page.unroute('**/api/chat');
  await page.route('**/api/chat', (r) => r.fulfill({ status: 503, json: { error: 'down' } }));
  await page.fill('#ai-input', 'When is the next concert?');
  await page.press('#ai-input', 'Enter');
  await page.waitForFunction(() => /Auditorio/.test(document.querySelector('.ai__msg--bot:last-child')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
  check(label, 'assistant falls back gracefully if the API is down', /Auditorio/.test(await page.$eval('.ai__msg--bot:last-child', (m) => m.textContent)));
  await page.click('.ai__close');
  await sleep(500);
  check(label, 'JR AI closes', await page.$eval('.ai', (a) => !a.classList.contains('is-open')));

  // --- footer + newsletter
  await scrollTo(page, '#contacto');
  await page.fill('#email', 'nope');
  await page.click('.news button[type="submit"]');
  const bad = await page.textContent('.news__msg');
  await page.fill('#email', 'fan@example.com');
  await page.click('.news button[type="submit"]');
  const good = await page.textContent('.news__msg');
  check(label, 'newsletter validates and confirms', bad !== good && good.length > 5);
  await shot(page, '11-footer');

  // --- touch targets on phones
  if (mobile) {
    const small = await page.evaluate(() => [...document.querySelectorAll('.hit__play, .hit__spotify, .play-chip, .ai-fab, .burger, .disco__btn, .np__toggle, .btn')]
      .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
      .map((el) => ({ c: el.className.split(' ')[0], ...el.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 40 || r.height < 40).map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`));
    check(label, 'primary tap targets ≥ 40px', small.length === 0, small.join(', '));
  }

  const overflowEnd = await page.evaluate(() => {
    const W = window.innerWidth;
    const culprits = [...document.querySelectorAll('main *, footer *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.social__rail, .ring-scene, .marquee, .release__ghost, .tour__bg, .singles__grid, .ai__chips');
    }).slice(0, 3).map((el) => el.className || el.tagName);
    return { px: document.documentElement.scrollWidth - W, culprits };
  });
  check(label, 'still no horizontal scroll after interactions', overflowEnd.px <= 1, `${overflowEnd.px}px ${overflowEnd.culprits.join(', ')}`);
  check(label, 'no JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await context.close();
}

await mkdir(SHOTS, { recursive: true });
const server = await startServer();
const browser = await chromium.launch();
try {
  await run(browser, 'desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await run(browser, 'iphone', { ...devices['iPhone 13'] });
  await run(browser, 'android', { ...devices['Pixel 7'] });
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\n${results.length - failures}/${results.length} checks passed · screenshots in ${SHOTS}`);
process.exit(failures ? 1 : 0);
