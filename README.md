# Jerry Rivera — Sitio Oficial

Premium, animation-rich artist site for **Jerry Rivera, el Bebé de la Salsa**. The art direction is "Gala Noir": velvet crimson, black and brocade gold, taken from his current press portrait.

## Stack
- **Vite** (static build, deploy `dist/` anywhere: Vercel, Netlify, Railway)
- **GSAP + ScrollTrigger**: loader, scroll choreography, pinned sections
- **Lenis**: smooth scrolling
- **Three.js**: GPU "stage dust" particle field (lazy-loaded)

## Experience
1. Velvet curtain preloader that opens onto the hero
2. Split-letter hero with gold shimmer and portrait parallax
3. Velocity-reactive marquee
4. *Mi Isla del Encanto* release: a vinyl slides out of its 3D sleeve and spins, with a Spotify embed
5. Animated stats and a word-by-word "legacy" scroll reveal
6. Pinned horizontal timeline (1973 → 2026)
7. **3D discography cylinder** with 20 releases, scroll-snapped, keyboard/arrow navigable and with reflections
8. Holographic 3D tilt cards for the latest singles
9. Billboard #1 hits list
10. Video wall with a YouTube modal (privacy-enhanced)
11. Ticket-style tour card with a live countdown (Auditorio Nacional, CDMX, Nov 17 2026)
12. Draggable Instagram rail, newsletter form and socials
- ES/EN language toggle, custom cursor, magnetic buttons, floating Spotify dock
- Honors `prefers-reduced-motion`; fully responsive

## Develop
```bash
npm install
npm run dev
npm run build
```

## To wire up before launch
- **Newsletter** (`src/main.js`, search "Newsletter") only validates in the browser. Connect it to Mailchimp, Klaviyo or another email provider.
- **Show time**: `SHOW_DATE` in `src/data.js` assumes 8:30 PM CDMX. Confirm it with the promoter.
- **Ticket link** points to a Ticketmaster MX search. Replace it with the direct event URL.
- **Album art**: catalog albums before 2026 use designed typographic sleeves. Drop in licensed cover art via a `cover` field in `src/data.js`.

Content sources: Instagram @jerryrivera, linktr.ee/jerryriveraoficial, Wikipedia, Spotify.
