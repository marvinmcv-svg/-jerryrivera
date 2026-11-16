// JR AI — fan / booking / store assistant.
// Talks to /api/chat (Claude, see api/chat.js). If the endpoint isn't deployed or
// fails, it answers from the built-in knowledge below so the widget never dead-ends.
import { albums, hits, SHOW, CONTACT, SPOTIFY_ARTIST, art } from './data.js';
import { media } from './media.js';

const $ = (s, c = document) => c.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fab = $('.ai-fab');
const panel = $('.ai');
const log = $('.ai__log');
const chipsEl = $('.ai__chips');
const form = $('.ai__form');
const input = $('#ai-input');

let getLang = () => 'es';
let onOpen = () => {};
let onClose = () => {};
const history = []; // [{role, content}] — text only, sent to the API
let busy = false;
let apiAvailable = true;

const T = {
  es: {
    hello: '¡Hola! Soy <b>JR AI</b>, el asistente oficial de Jerry Rivera. Te ayudo a <b>contratarlo</b> para tu evento, <b>comprar o escuchar</b> su música y con los <b>boletos</b> del próximo show. ¿Qué necesitas?',
    chips: [['booking', '🎤 Contratar a Jerry'], ['buy', '💿 Comprar discos'], ['show', '🎟️ Próximo concierto'], ['hits', '🏆 Sus N.º 1'], ['new', '🆕 Lo nuevo']],
    placeholder: 'Pregúntale a JR AI…',
    typing: 'JR AI está escribiendo…',
    error: 'Ups, no pude conectar. Te respondo con lo que sé:',
    form: { title: 'Solicitud de contratación', name: 'Nombre y empresa', email: 'Email', city: 'Ciudad / país', date: 'Fecha del evento', type: 'Tipo de evento', types: ['Concierto / festival', 'Evento privado', 'Corporativo', 'Boda', 'TV / medios'], cap: 'Aforo aprox.', notes: 'Detalles (opcional)', send: 'Preparar solicitud', invalid: 'Completa nombre, email válido, ciudad y fecha.' },
  },
  en: {
    hello: 'Hi! I\'m <b>JR AI</b>, Jerry Rivera\'s official assistant. I can help you <b>book him</b> for your event, <b>buy or stream</b> his music, and get <b>tickets</b> for the next show. What do you need?',
    chips: [['booking', '🎤 Book Jerry'], ['buy', '💿 Buy records'], ['show', '🎟️ Next concert'], ['hits', '🏆 His #1 hits'], ['new', '🆕 What\'s new']],
    placeholder: 'Ask JR AI…',
    typing: 'JR AI is typing…',
    error: 'Oops, I couldn\'t connect. Here\'s what I know:',
    form: { title: 'Booking request', name: 'Name & company', email: 'Email', city: 'City / country', date: 'Event date', type: 'Event type', types: ['Concert / festival', 'Private event', 'Corporate', 'Wedding', 'TV / media'], cap: 'Approx. capacity', notes: 'Details (optional)', send: 'Prepare request', invalid: 'Please add name, a valid email, city and date.' },
  },
};
const t = () => T[getLang()];

/* ---------- rendering ---------- */
// Tiny, safe markdown: **bold**, [label](https://url), line breaks. Everything else is escaped.
function md(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1 ↗</a>')
    .replace(/\n/g, '<br>');
}
function bubble(role, html, extra = '') {
  const el = document.createElement('div');
  el.className = `ai__msg ai__msg--${role}`;
  el.innerHTML = `<div class="ai__bubble">${html}</div>${extra}`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}
function renderChips() {
  chipsEl.innerHTML = t().chips.map(([k, label]) => `<button type="button" data-k="${k}">${label}</button>`).join('');
  input.placeholder = t().placeholder;
}

function albumCards(list) {
  return `<div class="ai__cards">${list.map((a) => `
    <a class="ai__card" href="${a.apple || a.spotify || CONTACT.store}" target="_blank" rel="noopener">
      <img src="${a.local || media(art(a.key, 300))}" alt="" loading="lazy" />
      <span><b>${esc(a.name)}</b><small>${a.year}</small></span>
    </a>`).join('')}</div>`;
}

function bookingForm() {
  const f = t().form;
  const today = new Date().toISOString().slice(0, 10);
  return `<form class="ai__booking" novalidate>
    <b>${f.title}</b>
    <input name="name" placeholder="${f.name}" required />
    <input name="email" type="email" placeholder="${f.email}" required />
    <div class="ai__row"><input name="city" placeholder="${f.city}" required /><input name="date" type="date" min="${today}" aria-label="${f.date}" required /></div>
    <div class="ai__row"><select name="type" aria-label="${f.type}">${f.types.map((x) => `<option>${x}</option>`).join('')}</select><input name="cap" inputmode="numeric" placeholder="${f.cap}" /></div>
    <textarea name="notes" rows="2" placeholder="${f.notes}"></textarea>
    <button type="submit" class="btn btn--gold">${f.send}</button>
    <p class="ai__err" role="status"></p>
  </form>`;
}

/* ---------- local knowledge (offline fallback + instant chip answers) ---------- */
const days = () => Math.max(0, Math.ceil((new Date(SHOW.date) - Date.now()) / 864e5));
function local(q) {
  const en = getLang() === 'en';
  const s = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const has = (...w) => w.some((x) => s.includes(x));

  if (has('booking', 'contrat', 'book', 'hire', 'evento', 'event', 'boda', 'wedding', 'privad', 'private', 'corporat', 'precio', 'price', 'cost', 'fee', 'cachet', 'tarifa')) {
    return {
      text: en
        ? 'Jerry performs concerts, festivals, private and corporate events with his full orchestra. Fees depend on **date, city, capacity and production**, so management quotes each request personally.\n\nFill in the form below and I\'ll prepare your request for Jerry\'s team:'
        : 'Jerry se presenta en conciertos, festivales, eventos privados y corporativos con su orquesta completa. El cachet depende de **fecha, ciudad, aforo y producción**, así que su equipo cotiza cada solicitud de forma personal.\n\nCompleta el formulario y preparo tu solicitud para el equipo de Jerry:',
      extra: bookingForm(),
    };
  }
  if (has('compr', 'buy', 'disco', 'record', 'vinyl', 'vinilo', ' cd', 'cds', 'tienda', 'store', 'merch', 'album', 'álbum')) {
    const picks = [albums.find((a) => a.key === 'isla'), albums.find((a) => a.key === 'llegue'), albums.find((a) => a.key === 'cuenta'), albums.find((a) => a.key === 'rivera')].filter(Boolean);
    return {
      text: en
        ? `You can buy Jerry's albums digitally on [Apple Music / iTunes](${CONTACT.store}), find physical CDs on [Amazon](${CONTACT.amazon}), or stream everything on [Spotify](${SPOTIFY_ARTIST}). A few essentials:`
        : `Puedes comprar sus álbumes en digital en [Apple Music / iTunes](${CONTACT.store}), CDs físicos en [Amazon](${CONTACT.amazon}), o escuchar todo en [Spotify](${SPOTIFY_ARTIST}). Algunos esenciales:`,
      extra: albumCards(picks),
    };
  }
  if (has('concierto', 'concert', 'show', 'boleto', 'ticket', 'gira', 'tour', 'mexico', 'méxico', 'cdmx', 'auditorio', 'fecha', 'date', 'live', 'vivo')) {
    const d = days();
    return {
      text: en
        ? `Next show: **${SHOW.city} — ${SHOW.venue}**, Nov 17, 2026 at 8:30 PM${d ? ` (in ${d} day${d === 1 ? '' : 's'})` : ''}. [Get tickets on Ticketmaster](${SHOW.tickets}). New dates are announced first on [Instagram](https://instagram.com/jerryrivera).`
        : `Próximo show: **${SHOW.city} — ${SHOW.venue}**, 17 de noviembre de 2026, 8:30 PM${d ? ` (faltan ${d} día${d === 1 ? '' : 's'})` : ''}. [Compra tus boletos en Ticketmaster](${SHOW.tickets}). Las nuevas fechas se anuncian primero en [Instagram](https://instagram.com/jerryrivera).`,
    };
  }
  if (has('numero 1', 'numeros uno', 'number one', '#1', 'n.º 1', 'n.o 1', 'exito', 'hit', 'billboard', 'chart')) {
    return {
      text: (en ? 'Jerry has **10 #1s on Billboard Tropical Airplay**, including:\n' : 'Jerry tiene **10 N.º 1 en Billboard Tropical Airplay**, entre ellos:\n') +
        hits.slice(0, 6).map((h) => `• [${h.title} (${h.year})](${h.spotifyUrl})`).join('\n') +
        (en ? '\n\nScroll to “The Number Ones” to hear 30-second previews.' : '\n\nBaja a “Los Números Uno” para escuchar adelantos de 30 segundos.'),
    };
  }
  if (has('nuevo', 'new', 'latest', 'reciente', 'isla', 'lanzamiento', 'release', 'orden')) {
    return {
      text: en
        ? `The latest single is **Mi Isla del Encanto** (2026), a love letter to Puerto Rico from *El Nuevo Orden Musical*, where Jerry re-records the songs that defined an era with Isidro Infante. [Listen on Spotify](https://open.spotify.com/album/07DincC8rWgyGGAmt1JKV5).`
        : `Lo más reciente es **Mi Isla del Encanto** (2026), una carta de amor a Puerto Rico, parte de *El Nuevo Orden Musical*, donde Jerry regraba los temas que marcaron una época junto a Isidro Infante. [Escúchala en Spotify](https://open.spotify.com/album/07DincC8rWgyGGAmt1JKV5).`,
    };
  }
  if (has('quien', 'who', 'bio', 'nacio', 'born', 'edad', 'age', 'bebe', 'historia', 'story', 'cuenta conmigo')) {
    return {
      text: en
        ? 'Jerry Rivera (Gerardo Rivera Rodríguez) was born on July 31, 1973 in Humacao, Puerto Rico. Signed by CBS at 16, he became “el Bebé de la Salsa”; at 18, **Cuenta Conmigo** became the best-selling salsa album in history. 38 years later he\'s releasing *El Nuevo Orden Musical*.'
        : 'Jerry Rivera (Gerardo Rivera Rodríguez) nació el 31 de julio de 1973 en Humacao, Puerto Rico. Firmado por CBS a los 16, se convirtió en “el Bebé de la Salsa”; a los 18, **Cuenta Conmigo** fue el álbum de salsa más vendido de la historia. 38 años después lanza *El Nuevo Orden Musical*.',
    };
  }
  if (has('prensa', 'press', 'entrevista', 'interview', 'contact', 'email', 'correo', 'manager', 'management')) {
    return {
      text: en
        ? `For press, interviews and management, use the official contact on [Jerry's Linktree](${CONTACT.booking}). For bookings I can prepare the request for you — just say “book Jerry”.`
        : `Para prensa, entrevistas y management, usa el contacto oficial en el [Linktree de Jerry](${CONTACT.booking}). Para contrataciones puedo preparar la solicitud por ti — solo dime “contratar a Jerry”.`,
    };
  }
  return {
    text: en
      ? 'I can help with **bookings**, **buying records**, **tickets** and anything about Jerry\'s music and story. Try one of the options below 👇'
      : 'Puedo ayudarte con **contrataciones**, **compra de discos**, **boletos** y todo sobre la música y la historia de Jerry. Prueba una de las opciones 👇',
  };
}

/* ---------- conversation ---------- */
async function ask(q, { forceLocal = false } = {}) {
  if (busy || !q.trim()) return;
  bubble('user', esc(q));
  history.push({ role: 'user', content: q });
  const quick = local(q);
  // Booking & purchase have rich UI (form / cards): answer those locally and instantly.
  if (forceLocal || quick.extra || !apiAvailable) return reply(quick);

  busy = true;
  const typing = bubble('bot', `<span class="ai__dots" aria-label="${t().typing}"><i></i><i></i><i></i></span>`);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: getLang(), messages: history.slice(-12) }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!data.reply) throw new Error('empty');
    typing.remove();
    reply({ text: data.reply });
  } catch {
    apiAvailable = false; // stay local for the rest of the session
    typing.remove();
    reply(quick);
  } finally {
    busy = false;
  }
}
function reply({ text, extra = '' }) {
  history.push({ role: 'assistant', content: text });
  const el = bubble('bot', md(text), extra);
  const bf = $('.ai__booking', el);
  if (bf) bf.addEventListener('submit', (e) => submitBooking(e, bf));
}

function submitBooking(e, f) {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  const err = $('.ai__err', f);
  if (!v.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email || '') || !v.city?.trim() || !v.date) {
    err.textContent = t().form.invalid;
    return;
  }
  const en = getLang() === 'en';
  const subject = `${en ? 'Booking request' : 'Solicitud de contratación'} — Jerry Rivera — ${v.city} ${v.date}`;
  const body = [
    `${t().form.name}: ${v.name}`, `${t().form.email}: ${v.email}`, `${t().form.city}: ${v.city}`,
    `${t().form.date}: ${v.date}`, `${t().form.type}: ${v.type}`, `${t().form.cap}: ${v.cap || '-'}`, '', v.notes || '',
  ].join('\n');
  f.querySelectorAll('input,select,textarea,button').forEach((el) => (el.disabled = true));
  try { navigator.clipboard?.writeText(`${subject}\n\n${body}`).catch(() => {}); } catch {}
  const target = CONTACT.bookingEmail
    ? `mailto:${CONTACT.bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : CONTACT.booking;
  history.push({ role: 'user', content: `[booking form] ${v.type}, ${v.city}, ${v.date}` });
  reply({
    text: en
      ? `Thanks, ${v.name.split(' ')[0]}! Your request is ready (and copied to your clipboard). **${v.type} · ${v.city} · ${v.date}**.\n\n[Send it to Jerry's management](${target}). They usually reply within a few business days.`
      : `¡Gracias, ${v.name.split(' ')[0]}! Tu solicitud está lista (y copiada al portapapeles). **${v.type} · ${v.city} · ${v.date}**.\n\n[Envíala al equipo de Jerry](${target}). Normalmente responden en pocos días hábiles.`,
  });
}

/* ---------- open / close ---------- */
let greeted = false;
function open(prompt) {
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  fab.setAttribute('aria-expanded', 'true');
  fab.classList.add('is-open');
  if (!greeted) { greeted = true; renderChips(); bubble('bot', t().hello); }
  onOpen();
  if (prompt) {
    const label = t().chips.find(([k]) => k === prompt)?.[1].replace(/^\S+\s/, '') || prompt;
    ask(label, { forceLocal: true });
  } else if (window.matchMedia('(hover: hover)').matches) input.focus();
}
function close() {
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  fab.setAttribute('aria-expanded', 'false');
  fab.classList.remove('is-open');
  onClose();
}

export function initAssistant(opts = {}) {
  getLang = opts.getLang || getLang;
  onOpen = opts.onOpen || onOpen;
  onClose = opts.onClose || onClose;
  fab.addEventListener('click', () => (panel.classList.contains('is-open') ? close() : open()));
  $('.ai__close').addEventListener('click', close);
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (b) ask(b.textContent.replace(/^\S+\s/, ''), { forceLocal: true });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = '';
    ask(q);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.js-ask');
    if (b) { e.preventDefault(); open(b.dataset.q); }
  });
  // first-visit nudge
  setTimeout(() => fab.classList.add('is-nudge'), 6000);
  setTimeout(() => fab.classList.remove('is-nudge'), 15000);
  return { open, close, isOpen: () => panel.classList.contains('is-open'), relang: () => greeted && renderChips() };
}
