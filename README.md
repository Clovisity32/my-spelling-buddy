# My Spelling Buddy

A spelling-practice app for Chloe: parents record words, Chloe practises
independently on an iPad with an Apple Pencil, and parents review and mark
her work later. No accounts, no server — everything lives on the device.

## Develop

```bash
npm install
npm run dev
```

Recording requires a secure context (HTTPS or `localhost`) — the dev server
counts, so recording works locally.

## Test

```bash
npm test
```

Runs `npm run build` + `npm run preview`, then the Playwright suite against
the production build (see `playwright.config.js`).

## Deploy

The app must be served over HTTPS for microphone recording to work on the
iPad — a plain LAN address from a dev server will not prompt for
microphone permission. Deploy the `dist/` output (`npm run build`) to any
static HTTPS host (Netlify, Vercel, GitHub Pages).

On the iPad, open the deployed URL in Safari, then **Share → Add to Home
Screen**. This is not optional polish: Safari can evict IndexedDB data for
a site that hasn't been opened in about a week, and installing to the Home
Screen exempts the app from that eviction, protecting Chloe's saved
recordings and handwriting.

See `docs/manual-ipad-qa.md` for the manual checks the automated suite
can't cover (Apple Pencil behavior, palm rejection, real device audio).
