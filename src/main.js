import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { albums, posts, SHOW_DATE } from './data.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = () => window.innerWidth <= 720;

/* =========================================================
   i18n — Spanish is authored in the HTML, English in data-en
   ========================================================= */
let lang = 'es';
const i18nNodes = $$('[data-en]').map((el) => ({ el, es: el.innerHTML, en: el.dataset.en }));
const i18nExtra = {
  es: { hits: 'Éxitos', studio: 'Álbum de estudio', thanks: '¡Gracias! Ya eres parte de la familia. 🎺', invalid: 'Escribe un email válido.', views: 'vistas' },
  en: { hits: 'Hits', studio: 'Studio album', thanks: 'Thank you! You’re part of the family now. 🎺', invalid: 'Please enter a valid email.', views: 'views' },
};
const t = (k) => i18nExtra[lang][k];

function setLang(next) {
  lang = next;
  document.documentElement.lang = lang;
  i18nNodes.forEach(({ el, es, en }) => { el.innerHTML = lang === 'en' ? en : es; });
  $('.lang__es').classList.toggle('is-on', lang === 'es');
  $('.lang__en').classList.toggle('is-on', lang === 'en');
  splitWords($('.js-words'));
  buildLegacyScrub();
  renderPosts();
  updateDiscoInfo(activeAlbum, true);
  ScrollTrigger.refresh();
}
$('.lang').addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));

/* =========================================================
   Smooth scroll (Lenis) wired into GSAP's ticker
   ========================================================= */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.15, easing: (x) => 1 - Math.pow(1 - x, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollTo = (target, opts = {}) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, ...opts });
  else {
    const y = typeof target === 'number' ? target : $(target)?.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
};
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id === '#top' ? 0 : id);
  })
);

/* =========================================================
   WebGL dust (lazy so it never blocks first paint)
   ========================================================= */
let gl = null;
if (!reduced) {
  import('./gl.js').then(({ initGL }) => {
    try { gl = initGL($('.gl')); } catch (err) { console.warn('WebGL unavailable', err); }
  });
}

/* =========================================================
   Text splitting helpers
   ========================================================= */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    el.appendChild(s);
  });
  return $$('.ch', el);
}
function splitWords(el) {
  if (!el) return;
  // keep inline tags (<em>) by walking text nodes
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
    });
  };
  walk(el);
}

/* =========================================================
   Preloader → curtain opens → hero intro
   ========================================================= */
const heroChars = $$('.hero__title .split').flatMap(splitChars);

function runLoader() {
  const counter = { v: 0 };
  const imgs = [$('.hero__img')];
  const loaded = Promise.all([
    ...imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; }))),
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ]);

  if (reduced) {
    loaded.then(() => { $('.loader').remove(); document.body.classList.remove('is-loading'); });
    return;
  }

  gsap.set(heroChars, { yPercent: 115, rotate: 6 });
  gsap.set(['.hero__eyebrow', '.hero__script', '.hero__ctas', '.hero__meta', '.hero__scroll', '.nav'], { autoAlpha: 0, y: 24 });
  gsap.set('.hero__img', { scale: 1.25, filter: 'brightness(0.3) blur(6px)' });

  const tl = gsap.timeline();
  tl.to(counter, {
    v: 85, duration: 1.4, ease: 'power2.inOut',
    onUpdate: () => {
      $('.js-count').textContent = Math.round(counter.v);
      gsap.set('.loader__bar span', { scaleX: counter.v / 100 });
    },
  });
  loaded.then(() => {
    tl.to(counter, {
      v: 100, duration: 0.5, ease: 'power1.out',
      onUpdate: () => {
        $('.js-count').textContent = Math.round(counter.v);
        gsap.set('.loader__bar span', { scaleX: counter.v / 100 });
      },
    })
      .to('.loader__center', { autoAlpha: 0, y: -30, duration: 0.6, ease: 'power3.in' }, '+=0.15')
      .to('.loader__curtain--l', { xPercent: -100, skewY: -2, duration: 1.5, ease: 'expo.inOut' }, '<0.2')
      .to('.loader__curtain--r', { xPercent: 100, skewY: 2, duration: 1.5, ease: 'expo.inOut' }, '<')
      .to('.hero__img', { scale: 1, filter: 'brightness(1) blur(0px)', duration: 2.2, ease: 'expo.out' }, '<0.35')
      .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.045 }, '<0.35')
      .to(['.nav', '.hero__eyebrow', '.hero__script', '.hero__ctas', '.hero__meta', '.hero__scroll'], { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, '<0.5')
      .add(() => {
        $('.loader').remove();
        document.body.classList.remove('is-loading');
        lenis?.start();
        countUp($('.hero__meta .js-num'));
        // idle gold shimmer sweeping across "Rivera"
        gsap.to('.hero__title .line--r .ch', { backgroundPosition: '-300% 0', duration: 6, ease: 'none', repeat: -1 });
      }, '-=0.6');
  });
}
runLoader();

/* =========================================================
   Nav: condensed state, hide on scroll-down, active section
   ========================================================= */
const nav = $('.nav');
let lastY = 0;
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle('is-scrolled', y > 40);
  nav.classList.toggle('is-hidden', y > 400 && y > lastY && !menuOpen);
  lastY = y;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  gl?.setScroll(y / Math.max(docH, 1));
};
window.addEventListener('scroll', onScroll, { passive: true });

$$('.nav__links a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  if (!sec) return;
  ScrollTrigger.create({
    trigger: sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: (self) => a.classList.toggle('is-active', self.isActive),
  });
});

/* mobile menu */
let menuOpen = false;
const burger = $('.burger');
const menu = $('.menu');
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false');
  lenis?.start();
}
burger.addEventListener('click', () => {
  if (menuOpen) return closeMenu();
  menuOpen = true;
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden', 'false');
  burger.setAttribute('aria-expanded', 'true');
  lenis?.stop();
  gsap.fromTo('.menu__links a', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.9, ease: 'expo.out', delay: 0.2 });
});

/* =========================================================
   Spotify dock
   ========================================================= */
const player = $('.player');
const listenBtn = $('.listen');
function togglePlayer(force) {
  const open = force ?? !player.classList.contains('is-open');
  if (open) {
    const frame = $('.player__frame');
    if (!frame.firstChild) {
      const ifr = document.createElement('iframe');
      ifr.src = frame.dataset.src;
      ifr.title = 'Spotify: Jerry Rivera';
      ifr.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      ifr.loading = 'lazy';
      frame.appendChild(ifr);
    }
  }
  player.classList.toggle('is-open', open);
  player.setAttribute('aria-hidden', String(!open));
  listenBtn.setAttribute('aria-expanded', String(open));
}
listenBtn.addEventListener('click', () => togglePlayer());
$('.player__close').addEventListener('click', () => togglePlayer(false));

/* =========================================================
   Count-up numbers
   ========================================================= */
const fmt = (n, mode) => {
  if (mode === 'compact') return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(Math.round(n));
  return String(Math.round(n));
};
function countUp(el) {
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  const to = +el.dataset.to;
  const o = { v: 0 };
  if (reduced) { el.textContent = fmt(to, el.dataset.format); return; }
  gsap.to(o, { v: to, duration: 2.2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v, el.dataset.format)) });
}
$$('.stats .js-num').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => countUp(el) }));
if (reduced) countUp($('.hero__meta .js-num'));

/* =========================================================
   Scroll choreography
   ========================================================= */
function initScroll() {
  if (reduced) return;

  // generic reveals
  $$('.reveal').forEach((el) =>
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
  );
  $$('.section-title').forEach((el) =>
    gsap.from(el, { yPercent: 40, autoAlpha: 0, skewY: 4, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
  );
  $$('.kicker__line').forEach((el) =>
    gsap.from(el, { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } })
  );

  // hero parallax out
  gsap.to('.hero__img', { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { yPercent: -25, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  // marquee — base loop + scroll velocity boost/skew
  const mq = $('.marquee__track');
  const mqTween = gsap.to(mq, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  const skewTo = gsap.quickTo(mq, 'skewX', { duration: 0.5, ease: 'power3' });
  lenis?.on('scroll', ({ velocity }) => {
    mqTween.timeScale(1 + Math.min(Math.abs(velocity) * 0.25, 6));
    skewTo(gsap.utils.clamp(-12, 12, -velocity * 0.6));
  });

  // release: ghost text drift, vinyl slides out of the sleeve
  gsap.fromTo('.ghost-track', { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.release', start: 'top bottom', end: 'bottom top', scrub: true } });
  const vinyl = $('.vinyl');
  gsap.fromTo('.vinyl-wrap', { xPercent: 0, rotate: -40 }, {
    xPercent: isMobile() ? 34 : 48, rotate: 0, ease: 'power2.out',
    scrollTrigger: { trigger: '.release', start: 'top 75%', end: 'top 10%', scrub: 1 },
  });
  gsap.from('.sleeve', { rotateY: -35, rotateX: 10, y: 80, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.release', start: 'top 70%' } });
  ScrollTrigger.create({ trigger: '.release', start: 'top 70%', end: 'bottom top', onToggle: (s) => vinyl.classList.toggle('is-spinning', s.isActive) });
  // release title by lines
  gsap.from('.release__title', { y: 80, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.release__title', start: 'top 85%' } });

  // stats stagger
  gsap.from('.stat', { y: 40, autoAlpha: 0, stagger: 0.12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

  // horizontal story
  const track = $('.story__track');
  const dist = () => track.scrollWidth - window.innerWidth;
  const storyTween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.story', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
      onUpdate: (s) => gsap.set('.story__progress span', { scaleX: s.progress }),
    },
  });
  $$('.chapter').forEach((ch) => {
    gsap.from(ch, {
      y: 90, rotate: 4, autoAlpha: 0.2, ease: 'power2.out',
      scrollTrigger: { trigger: ch, containerAnimation: storyTween, start: 'left 95%', end: 'left 60%', scrub: true },
    });
    gsap.from($('.chapter__year', ch), {
      xPercent: 30, ease: 'none',
      scrollTrigger: { trigger: ch, containerAnimation: storyTween, start: 'left right', end: 'right left', scrub: true },
    });
  });

  // singles: cards rise with a 3D flip
  gsap.from('.card3d', { y: 120, rotateX: 25, autoAlpha: 0, stagger: 0.15, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.singles__grid', start: 'top 85%' } });

  // hits list
  gsap.from('.hit', { y: 40, autoAlpha: 0, stagger: 0.06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.hits__list', start: 'top 85%' } });

  // videos
  gsap.from('.vcard', { y: 100, rotateY: -12, autoAlpha: 0, stagger: 0.15, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: '.videos__grid', start: 'top 85%' } });

  // ticket flips in
  gsap.from('.ticket', { rotateX: 50, y: 120, autoAlpha: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.tour', start: 'top 75%' } });
  gsap.fromTo('.tour__bg', { xPercent: -40 }, { xPercent: -60, ease: 'none', scrollTrigger: { trigger: '.tour', start: 'top bottom', end: 'bottom top', scrub: true } });

  // footer big type
  gsap.from('.footer__huge', { yPercent: 60, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 75%' } });
  gsap.from('.footer__script', { y: 40, rotate: -15, autoAlpha: 0, duration: 1.4, ease: 'expo.out', delay: 0.2, scrollTrigger: { trigger: '.footer', start: 'top 75%' } });
}

/* legacy quote: word-by-word illumination tied to scroll */
let legacyST = null;
function buildLegacyScrub() {
  legacyST?.kill();
  const words = $$('.legacy__quote .w');
  if (reduced) { words.forEach((w) => (w.style.opacity = 1)); return; }
  legacyST = ScrollTrigger.create({
    trigger: '.legacy__quote', start: 'top 80%', end: 'bottom 45%', scrub: true,
    onUpdate: (s) => {
      const n = s.progress * words.length;
      words.forEach((w, i) => (w.style.opacity = gsap.utils.clamp(0.14, 1, n - i + 0.14)));
    },
  });
}
splitWords($('.js-words'));
buildLegacyScrub();

/* lazy Spotify embeds */
$$('iframe[data-src]').forEach((ifr) =>
  ScrollTrigger.create({ trigger: ifr, start: 'top 140%', once: true, onEnter: () => (ifr.src = ifr.dataset.src) })
);

/* =========================================================
   DISCOGRAPHY — 3D cylinder of sleeves driven by scroll
   ========================================================= */
const ring = $('.ring');
const N = albums.length;
const STEP = 360 / N;
let radius = 0;
let activeAlbum = 0;
let ringAngle = 0;

function sleeveMarkup(a) {
  if (a.cover) return `<img src="${a.cover}" alt="Portada: ${a.name}" loading="lazy" />`;
  return `<div class="sleeve-art sleeve-art--${a.pattern}" style="--h:${a.hue}">
      <div class="sleeve-art__top"><span>${a.year}</span><span>${a.star ? '★' : '◆'}</span></div>
      <div class="sleeve-art__title">${a.name}</div>
      <div class="sleeve-art__artist">Jerry Rivera</div>
    </div>`;
}
albums.forEach((a, i) => {
  const card = document.createElement('div');
  card.className = 'rcard';
  card.dataset.cursor = 'Ver';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${a.name} (${a.year})`);
  card.innerHTML = `<div class="rcard__face">${sleeveMarkup(a)}</div><div class="rcard__reflect"><div class="rcard__face">${sleeveMarkup(a)}</div></div>`;
  card.addEventListener('click', () => goToAlbum(i));
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToAlbum(i); } });
  ring.appendChild(card);
});
const rcards = $$('.rcard', ring);
$('.js-d-total').textContent = String(N).padStart(2, '0');

function layoutRing() {
  const w = isMobile() ? 190 : window.innerWidth < 1024 ? 240 : 300;
  ring.style.setProperty('--card', w + 'px');
  radius = Math.round((w / 2) / Math.tan(Math.PI / N) * 1.05);
  rcards.forEach((c, i) => (c.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius}px)`));
  renderRing();
}
let tiltX = 0;
function renderRing() {
  ring.style.transform = `translateZ(${-radius}px) rotateX(${tiltX}deg) rotateY(${ringAngle}deg)`;
  rcards.forEach((c, i) => {
    const rel = ((i * STEP + ringAngle) % 360 + 540) % 360 - 180; // -180..180, 0 = front
    const facing = Math.cos((rel * Math.PI) / 180);
    const pop = Math.max(facing, 0) ** 12; // front sleeve lifts out of the ring
    c.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius + pop * radius * 0.22}px) rotateY(${-rel * 0.35 * pop}deg)`;
    c.style.filter = `brightness(${0.3 + 0.7 * Math.max(facing, 0) ** 3})`;
  });
}
function updateDiscoInfo(i, force) {
  if (i === activeAlbum && !force) return;
  activeAlbum = i;
  const a = albums[i];
  rcards.forEach((c, k) => c.classList.toggle('is-active', k === i));
  const info = $('.disco__info');
  const fill = () => {
    $('.js-d-year').textContent = a.year;
    $('.js-d-name').textContent = a.name;
    $('.js-d-label').textContent = a.label;
    $('.js-d-idx').textContent = String(i + 1).padStart(2, '0');
    $('.js-d-hits').innerHTML = (a.hits.length ? a.hits : [t('studio')]).map((h) => `<li>${h}</li>`).join('');
  };
  if (reduced || force) return fill();
  gsap.timeline()
    .to(info, { autoAlpha: 0, y: 14, duration: 0.18, ease: 'power2.in', onComplete: fill })
    .to(info, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' });
}

let discoST = null;
function initDisco() {
  layoutRing();
  updateDiscoInfo(0, true);
  rcards[0].classList.add('is-active');
  if (reduced) return;
  const angle = { v: 0 };
  discoST = ScrollTrigger.create({
    trigger: '.disco', start: 'top top', end: () => '+=' + window.innerHeight * (N * 0.28),
    pin: '.disco__pin', scrub: 1, invalidateOnRefresh: true,
    snap: { snapTo: 1 / (N - 1), duration: { min: 0.2, max: 0.6 }, ease: 'power2.inOut', delay: 0.08 },
    onUpdate: (s) => {
      const idx = s.progress * (N - 1);
      gsap.to(angle, {
        v: -idx * STEP, duration: 0.6, ease: 'power3.out', overwrite: true,
        onUpdate: () => { ringAngle = angle.v; renderRing(); },
      });
      updateDiscoInfo(Math.round(idx));
    },
  });
  // entrance: ring spins in
  gsap.from(ring, { rotateZ: -8, scale: 0.7, autoAlpha: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.disco', start: 'top 70%' } });
  if (finePointer) {
    const scene = $('.disco__pin');
    scene.addEventListener('pointermove', (e) => {
      const ny = e.clientY / window.innerHeight - 0.5;
      gsap.to({ v: tiltX }, { v: -ny * 10, duration: 0.8, ease: 'power3.out', onUpdate() { tiltX = this.targets()[0].v; renderRing(); } });
    });
  }
}
function goToAlbum(i) {
  i = (i + N) % N;
  if (!discoST) {
    ringAngle = -i * STEP; renderRing(); updateDiscoInfo(i); return;
  }
  const y = discoST.start + (discoST.end - discoST.start) * (i / (N - 1));
  scrollTo(y, { duration: 1.2 });
}
$$('.disco__btn').forEach((b) => b.addEventListener('click', () => goToAlbum(activeAlbum + +b.dataset.dir)));
window.addEventListener('resize', () => { layoutRing(); });

/* =========================================================
   3D tilt + glare + foil (cards, sleeve, ticket, videos)
   ========================================================= */
function initTilt() {
  if (!finePointer || reduced) return;
  $$('.tilt').forEach((el) => {
    const target = el.querySelector('.card3d__inner') || el;
    const max = el.classList.contains('ticket') ? 6 : el.classList.contains('sleeve') ? 14 : 12;
    const rx = gsap.quickTo(target, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(target, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(target, { transformPerspective: 900 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * max * 2);
      rx(-(py - 0.5) * max * 2);
      target.style.setProperty('--gx', px * 100 + '%');
      target.style.setProperty('--gy', py * 100 + '%');
      target.style.setProperty('--angle', ((px - 0.5) * 120).toFixed(1));
      el.style.setProperty('--gx', px * 100 + '%');
      el.style.setProperty('--gy', py * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* magnetic buttons */
function initMagnetic() {
  if (!finePointer || reduced) return;
  $$('.magnetic').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

/* custom cursor */
function initCursor() {
  if (!finePointer) return;
  const c = $('.cursor');
  const label = $('.cursor__label');
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const txt = lab?.dataset.cursor;
    const interactive = e.target.closest('a, button, input, [role="button"]');
    c.classList.toggle('is-label', !!txt);
    c.classList.toggle('is-hover', !txt && !!interactive);
    if (txt) label.textContent = txt;
  });
  document.addEventListener('pointerleave', () => gsap.to(c, { autoAlpha: 0 }));
  document.addEventListener('pointerenter', () => gsap.to(c, { autoAlpha: 1 }));
}

/* =========================================================
   Video modal (YouTube, privacy-enhanced)
   ========================================================= */
const modal = $('.modal');
let lastFocus = null;
function openVideo(id) {
  lastFocus = document.activeElement;
  $('.modal__frame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  lenis?.stop();
  $('.modal__close').focus();
}
function closeVideo() {
  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  setTimeout(() => ($('.modal__frame').innerHTML = ''), 400);
  lenis?.start();
  lastFocus?.focus();
}
$$('.js-video').forEach((b) => b.addEventListener('click', () => openVideo(b.dataset.yt)));
$('.modal__close').addEventListener('click', closeVideo);
$('.modal__backdrop').addEventListener('click', closeVideo);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeVideo(); closeMenu(); togglePlayer(false); }
  if (e.target.matches('input')) return;
  const inDisco = discoST?.isActive;
  if (inDisco && e.key === 'ArrowRight') goToAlbum(activeAlbum + 1);
  if (inDisco && e.key === 'ArrowLeft') goToAlbum(activeAlbum - 1);
});

/* =========================================================
   Countdown to Auditorio Nacional
   ========================================================= */
(function countdown() {
  const end = new Date(SHOW_DATE).getTime();
  const els = { d: $('.js-cd-d'), h: $('.js-cd-h'), m: $('.js-cd-m'), s: $('.js-cd-s') };
  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
  const tick = () => {
    const diff = Math.max(0, end - Date.now());
    els.d.textContent = pad(Math.floor(diff / 864e5));
    els.h.textContent = pad(Math.floor((diff / 36e5) % 24));
    els.m.textContent = pad(Math.floor((diff / 6e4) % 60));
    els.s.textContent = pad(Math.floor((diff / 1e3) % 60));
  };
  tick();
  setInterval(tick, 1000);
})();

/* =========================================================
   Instagram rail
   ========================================================= */
const compact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : n);
function renderPosts() {
  const locale = lang === 'en' ? 'en-US' : 'es-PR';
  $('.js-ig').innerHTML = posts.map((p) => {
    const d = new Date(p.date + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `<a class="post" href="${p.url}" target="_blank" rel="noopener" data-cursor="IG ↗">
      <div class="post__top"><span class="post__tag">${p.tag}</span><span>${d}</span></div>
      <p class="post__text">${p.text}</p>
      <div class="post__stats"><span>♥ <b>${compact(p.likes)}</b></span><span>💬 <b>${compact(p.comments)}</b></span>${p.views ? `<span>▶ <b>${compact(p.views)}</b> ${t('views')}</span>` : ''}</div>
    </a>`;
  }).join('');
}
renderPosts();

// drag-to-scroll for the rail (mouse); touch uses native scroll
(function dragRail() {
  const rail = $('.social__rail');
  let down = false, startX = 0, startL = 0, moved = false;
  rail.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startL = rail.scrollLeft; rail.classList.add('is-drag');
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    rail.scrollLeft = startL - dx;
  });
  window.addEventListener('pointerup', () => { down = false; rail.classList.remove('is-drag'); });
  rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  rail.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation(); }, { passive: true });
  rail.setAttribute('data-lenis-prevent-horizontal', '');
})();

/* =========================================================
   Newsletter (front-end only — wire to your ESP of choice)
   ========================================================= */
$('.news').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#email');
  const msg = $('.news__msg');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
    msg.textContent = t('invalid');
    gsap.fromTo('.news__row', { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    return;
  }
  msg.textContent = t('thanks');
  input.value = '';
});

/* =========================================================
   Boot
   ========================================================= */
initScroll();   // story pin must be created before the disco pin (page order)
initDisco();
ScrollTrigger.sort();
initTilt();
initMagnetic();
initCursor();
window.addEventListener('load', () => ScrollTrigger.refresh());
