# Jerry Rivera — Sitio Oficial

Premium, animation-rich artist site for **Jerry Rivera, el Bebé de la Salsa**. The art direction is "Gala Noir": velvet crimson, black and brocade gold, taken from his current press portrait.

## Stack
- **Vite** (static build, deploy `dist/` anywhere: Vercel, Netlify, Railway)
- **GSAP + ScrollTrigger**: loader, scroll choreography, pinned sections
- **Lenis**: smooth scrolling
- **Three.js**: GPU "stage dust" particle field (lazy-loaded)

## Experience
1. Velvet curtain preloader that opens onto the hero
2. **Logo**: Jerry's face in a gold ring with the latest record (*Mi Isla del Encanto*) spinning out from behind it
3. Split-letter hero with gold shimmer and portrait parallax
4. Velocity-reactive marquee
5. *Mi Isla del Encanto* release: a vinyl slides out of its 3D sleeve and spins, with a Spotify embed
6. Animated stats and a word-by-word "legacy" scroll reveal
7. **Historia: "Lado A / Lado B"**. His life is told as a record. A sticky turntable follows you through 10 eras: the label swaps to that era's cover, the tonearm moves inward, and each era plays the song that defined it (30 s preview)
8. **3D discography cylinder** with 21 releases and **original high-res cover art** (Apple Music 1200×1200 / Spotify 640), plus Spotify, Apple Music and Buy links per album
9. Holographic 3D tilt cards for the latest singles
10. **Billboard #1s**: tap any hit for a 30-second preview, or use the Spotify button to open the exact track. A shared "now playing" bar has pause and a Spotify link
11. Video wall with a YouTube modal (privacy-enhanced)
12. **Live**: full-bleed concert photo of Jerry, his portrait on the ticket, a live countdown (Auditorio Nacional, CDMX, Nov 17 2026)
13. **Instagram**: the real posts via Instagram's official embeds (original photo/video, caption, likes), with a styled fallback
14. **JR AI**: an assistant for bookings (guided request form), buying records (album cards with store links), tickets and Q&A, powered by Claude
- ES/EN language toggle, custom cursor, magnetic buttons, floating Spotify dock
- Honors `prefers-reduced-motion`; mobile-first layouts for every section

## Develop
```bash
npm install
npm run dev
npm run build        # mirrors cover art into public/media first (see below)
npm run test:e2e     # build + Playwright end-to-end on desktop, iPhone 13 and Pixel 7
```
`OFFLINE=1 npm run test:e2e` stubs third-party CDNs (covers, audio previews, Instagram) for sandboxed CI. Screenshots are saved to `tests/screenshots/`.

## Cover art & previews
- Covers come from the official Apple Music / Spotify CDNs (`src/data.js`). `npm run build` runs `scripts/fetch-media.mjs` first. It downloads every cover into `public/media/` so production serves first-party images. If the network is unavailable it skips them, and the site falls back to the CDN URLs. If an image ever fails, a designed typographic sleeve replaces it.
- Song previews are Apple's official 30-second clips. Every #1 also links to its exact Spotify track.

## JR AI (Claude)
`api/chat.js` is a Vercel serverless function that calls Claude (`claude-opus-5-5` at low effort, server-side refusal fallback, cached system prompt built from `src/data.js`).
1. In Vercel → Project → Settings → Environment Variables add `ANTHROPIC_API_KEY`. Optionally add `JR_AI_MODEL` to change the model.
2. Redeploy.

Without the key, the endpoint returns 503 and the widget answers from its built-in knowledge. Booking and record-buying flows always work.

## To wire up before launch
- **Booking email**: set `CONTACT.bookingEmail` in `src/data.js`. Booking requests from JR AI then open a pre-filled email to management. Until then they point to the official Linktree.
- **Newsletter** (`src/main.js`, search "Newsletter") only validates in the browser. Connect it to Mailchimp, Klaviyo or another email provider.
- **Show time**: `SHOW.date` in `src/data.js` assumes 8:30 PM CDMX. Confirm it with the promoter.
- **Ticket link** points to a Ticketmaster MX search. Replace it with the direct event URL.

Content sources: Instagram @jerryrivera, linktr.ee/jerryriveraoficial, Wikipedia, Spotify.
