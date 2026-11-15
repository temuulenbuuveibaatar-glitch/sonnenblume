# Sonnenblume — project notes for Claude Code

Crew self-health system for long-duration space missions. NASA Space Apps Challenge 2026 (astronaut health), Team Sonnenblume.

- Live: https://aegis-crew-health.vercel.app (Vercel project `aegis-crew-health`, linked in `.vercel/`)
- Repo: https://github.com/temuulenbuuveibaatar-glitch/sonnenblume (branch `main`, MIT)

## Stack
Plain HTML/CSS/JS, no build step. Vercel serverless functions in `api/` (ES modules, `.mjs`).

| Path | What |
|---|---|
| `index.html`, `css/landing.css`, `js/landing.js` | Landing page (black theme, white vortex canvas — teammates chose this design, keep it) |
| `app.html`, `css/styles.css`, `js/app.js` | Console: dashboard, log, trends, library, pharmacy, guide |
| `js/body.js` | Procedural SVG anatomy (`buildBody(rng)`), viewBox 880x980, two modes: Organs / Bones |
| `privacy.html`, `js/privacy.js` | Privacy Charter + delete-all-data |
| `data/*.json` | Medical library: 119 medicines, 85 protocols, 18 guides, shielding, conditions, etc. (`data/index.json` lists files) |
| `api/kb.mjs` | Library from Azure Cosmos DB (returns empty → app uses bundled `data/`) |
| `api/spaceweather.mjs` | NASA DONKI proxy (FLR, SEP, GST), cached 1 h; env `NASA_API_KEY` optional |
| `sw.js` | Offline cache, network-first; bump `VERSION` on every release |
| `scripts/seed-azure.mjs` | Seeds Cosmos DB (`npm run seed`) |
| `tests/smoke_test.py` | 60 Playwright checks; runs in GitHub Actions on every push |

## Commands
```bash
python tests/smoke_test.py            # needs: pip install playwright && python -m playwright install chromium
npx vercel deploy --prod --yes        # deploy
```

## Rules (from the team — follow them)
- **No emojis and no decorative icons anywhere.** Status dots (green/amber/red) are fine.
- Keep the old black/gold design; do not restyle without being asked.
- All stored data is untrusted: everything goes through `sanitize()` in `app.js`; escape all HTML with `esc()`.
- Strict CSP in `vercel.json` (no inline scripts, no `eval`, `connect-src 'self'`). External APIs go through `api/` proxies.
- Medicine doses are never invented: only the flight-surgeon dose table (Pharmacy tab) holds numbers; demo values only for acetaminophen and ibuprofen from OTC labels.
- AI disclosure must stay in the site footer, page metadata (`ai-disclosure`) and README (NASA Space Apps SI rules).
- Run the tests before every push; add a test for every new feature.

## Open ideas
- More anatomical realism in `js/body.js` (male and female views exist; `S.sex`, toggle `#bodySex`).
- Crew-wide view for the medical officer.
- Set `NASA_API_KEY` in Vercel to avoid DEMO_KEY rate limits.
