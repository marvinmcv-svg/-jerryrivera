// Vercel serverless function: POST /api/chat → { reply }
// Powers the "JR AI" widget. Requires ANTHROPIC_API_KEY in the project's environment
// variables. Without it the endpoint returns 503 and the widget answers from its
// built-in knowledge instead.
import Anthropic from '@anthropic-ai/sdk';
import { albums, hits, chapters, SHOW, CONTACT, SPOTIFY_ARTIST } from '../src/data.js';

const MODEL = process.env.JR_AI_MODEL || 'claude-opus-5-5';
const MAX_TURNS = 12;
const MAX_CHARS = 1200;

const knowledge = [
  'BIO: Jerry Rivera (Gerardo Rivera Rodríguez), born July 31, 1973, Humacao, Puerto Rico; raised in Levittown, Toa Baja. Nickname "el Bebé de la Salsa". Signed to CBS at 16 (1989).',
  'TIMELINE:\n' + chapters.map((c) => `- ${c.year}: ${c.title.en} — ${c.text.en.replace(/<[^>]+>/g, '')}`).join('\n'),
  'DISCOGRAPHY:\n' + albums.map((a) => `- ${a.year} ${a.name} (${a.label})${a.hits.length ? ': ' + a.hits.join(', ') : ''}${a.apple ? ' — buy: ' + a.apple : ''}`).join('\n'),
  'BILLBOARD #1s:\n' + hits.map((h) => `- ${h.year} ${h.title}${h.feat ? ' ' + h.feat : ''} (${h.album}) ${h.chart} — ${h.spotifyUrl}`).join('\n'),
  'AWARDS: 2 Premios Lo Nuestro, Latin Grammy nominee (Canto a Mi Ídolo… Frankie Ruiz, 2003), Grammy nomination for Fresco (1996), 3 Sony Crystal Awards; judge on Idol Puerto Rico (2011). Cuenta Conmigo (1992) was 3× Platinum and the best-selling salsa album in history at the time, 3 months at #1 on Billboard Latin.',
  `NOW: "El Nuevo Orden Musical" (2026) — re-recording his classics with producer Isidro Infante. Latest single "Mi Isla del Encanto" (Oct 2026), before it "Salsa Es Destino Y Rumbo" and "Es Una Locura". Latest album "Llegué Yo" (2025).`,
  `NEXT SHOW: ${SHOW.city}, ${SHOW.venue}, November 17, 2026, 8:30 PM. Tickets: ${SHOW.tickets}. Recently played Punta Cana. New dates are announced on Instagram @jerryrivera.`,
  `LINKS: Spotify ${SPOTIFY_ARTIST} · Apple Music / iTunes store ${CONTACT.store} · Physical CDs on Amazon ${CONTACT.amazon} · Instagram https://instagram.com/jerryrivera · YouTube https://www.youtube.com/channel/UCa41eRZNUMi_6aO4u08FulA · Booking & press contact ${CONTACT.bookingEmail || CONTACT.booking}`,
].join('\n\n');

const system = `You are "JR AI", the official assistant on Jerry Rivera's website. You help fans and event organizers with three things: (1) booking Jerry for concerts, festivals, private or corporate events, (2) buying or streaming his records, (3) tickets and information about his music and career.

Voice: warm, concise, a little bit of boricua flavor, never over the top. Reply in the user's language (Spanish or English); the site language hint is given with each request. Keep answers under ~120 words. Use **bold** for key facts and markdown links [label](url) only with URLs from the knowledge below.

Rules:
- Only state facts found in the knowledge below. If you don't know (e.g. an unannounced tour date, a specific fee), say so and point to the official contact.
- Never quote prices, fees or availability. For bookings, collect: name/company, email, city/country, event date, event type, approximate capacity — then tell them to send it via the booking contact, and that management confirms every booking. The widget also offers a booking form when the user asks about booking.
- For buying records, point to Apple Music/iTunes for digital purchases, Amazon for CDs and Spotify for streaming.
- You are an AI assistant, not Jerry himself; don't speak in his first person.
- Politely decline unrelated requests and steer back to Jerry's music, shows and bookings.

KNOWLEDGE
${knowledge}`;

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!client) return res.status(503).json({ error: 'Assistant not configured' });

  const body = typeof req.body === 'string' ? safeJSON(req.body) : req.body || {};
  const lang = body.lang === 'en' ? 'en' : 'es';
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Last message must be from the user' });
  }

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [...messages, { role: 'system', content: `Site language: ${lang === 'en' ? 'English' : 'Spanish'}.` }],
    });
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ reply: lang === 'en' ? "I can't help with that one — but ask me about Jerry's music, shows or bookings!" : 'No puedo ayudarte con eso — ¡pero pregúntame sobre la música, los shows o contrataciones de Jerry!' });
    }
    const reply = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return res.status(200).json({ reply });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Busy, try again shortly' });
    if (err instanceof Anthropic.APIError) {
      console.error('JR AI API error', err.status, err.message);
      return res.status(502).json({ error: 'Upstream error' });
    }
    console.error('JR AI error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function safeJSON(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
