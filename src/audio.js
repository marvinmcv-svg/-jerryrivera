// One shared <audio> for every 30-second preview on the page (history tracks, #1 hits).
// Buttons opt in with data-preview / data-title / data-sub / data-art / data-spotify.
const $ = (s, c = document) => c.querySelector(s);

const audio = new Audio();
audio.preload = 'none';
let current = null; // { id, btn }
const listeners = new Set();
const np = $('.np');

function emit() {
  const state = { id: current?.id ?? null, playing: !!current && !audio.paused, progress: audio.duration ? audio.currentTime / audio.duration : 0 };
  listeners.forEach((fn) => fn(state));
  document.querySelectorAll('[data-preview]').forEach((b) => {
    const mine = current && b.dataset.preview === current.id;
    b.classList.toggle('is-playing', mine && !audio.paused);
    b.classList.toggle('is-loaded', !!mine);
    b.setAttribute('aria-pressed', String(mine && !audio.paused));
    if (mine) b.style.setProperty('--p', state.progress.toFixed(3));
    else b.style.removeProperty('--p');
  });
  if (np) {
    np.classList.toggle('is-open', !!current);
    np.setAttribute('aria-hidden', String(!current));
    np.classList.toggle('is-playing', state.playing);
    $('.np__toggle', np).textContent = state.playing ? '❚❚' : '▶';
    $('.np__toggle', np).setAttribute('aria-label', state.playing ? 'Pausar' : 'Reproducir');
    $('.np__bar i', np).style.transform = `scaleX(${state.progress})`;
  }
}

function play(btn) {
  const id = btn.dataset.preview;
  if (current?.id === id) {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
    return;
  }
  current = { id, btn };
  audio.src = id;
  audio.currentTime = 0;
  if (np) {
    $('.np__art', np).src = btn.dataset.art || '/img/jr-face.webp';
    $('.np__title', np).textContent = btn.dataset.title || '';
    $('.np__sub', np).textContent = btn.dataset.sub || 'Preview · 30 s';
    $('.np__spotify', np).href = btn.dataset.spotify || 'https://open.spotify.com/artist/7wOZy3KdFVVINgNFFxkxwO';
  }
  emit();
  audio.play().catch(() => { btn.classList.add('is-error'); emit(); });
}

function stop() {
  audio.pause();
  current = null;
  emit();
}

['play', 'pause', 'timeupdate', 'ended', 'loadedmetadata'].forEach((ev) => audio.addEventListener(ev, emit));
audio.addEventListener('ended', () => { audio.currentTime = 0; emit(); });

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-preview]');
  if (!btn) return;
  e.preventDefault();
  play(btn);
});
if (np) {
  $('.np__toggle', np).addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  $('.np__close', np).addEventListener('click', stop);
}

export const previews = {
  play, stop,
  onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  get playing() { return !!current && !audio.paused; },
  get id() { return current?.id ?? null; },
};
