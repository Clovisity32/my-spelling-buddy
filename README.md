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

**Live URL:** https://clovisity32.github.io/my-spelling-buddy/

Hosted on GitHub Pages via `.github/workflows/deploy-pages.yml`, which
builds and deploys automatically on every push to `master`. GitHub Pages
serves a project site from a subpath (`/my-spelling-buddy/`), not the
root, so the deploy uses `npm run build:gh-pages` (sets `GH_PAGES=true`)
rather than the plain `npm run build` — local dev, `npm run build`, and
the Playwright suite all still use the root path and are unaffected.

On the iPad, open the deployed URL in Safari, then **Share → Add to Home
Screen**. This is not optional polish: Safari can evict IndexedDB data for
a site that hasn't been opened in about a week, and installing to the Home
Screen exempts the app from that eviction, protecting Chloe's saved
recordings and handwriting.

See `docs/manual-ipad-qa.md` for the manual checks the automated suite
can't cover (Apple Pencil behavior, palm rejection, real device audio).
