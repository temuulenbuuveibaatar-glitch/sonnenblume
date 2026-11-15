# Sonnenblume

**Crew health, guarded when Earth is out of reach.**

Sonnenblume is a self-health system for astronauts on long-duration missions. The crew logs a few daily measurements, and Sonnenblume turns them into clear status, step-by-step guidance and automatic crew alerts. It is designed for missions where a doctor on Earth is minutes away, or out of contact entirely.

Built for the **2026 NASA Space Apps Challenge** (astronaut health).

**Live demo:** https://aegis-crew-health.vercel.app
**Console:** https://aegis-crew-health.vercel.app/app.html

> Student prototype. Not a medical device. Thresholds are general adult reference ranges for demonstration.

## The problem

NASA calls the goal **Earth-Independent Medical Operations**: crews beyond the Moon must manage their own health with:

- **No real-time doctor.** Mars is 3–22 minutes away by radio, and a solar conjunction cuts contact for about two weeks every 26 months.
- **No resupply.** A 2024 study found 54 of 91 ISS medicines have a shelf life of 3 years or less, so most would expire before a Mars mission ends.
- **No evacuation.** The crew medical officer has to act first, alone.

## What it does

| Feature | What the crew gets |
|---|---|
| **12 daily indicators** | Heart rate, blood pressure, SpO₂, temperature, blood sugar, sleep, mood, exercise, fluids, radiation dose, vision check, body mass |
| **Status engine** | Every reading is Nominal, Watch or Act now, plus detection of sudden changes, rebounds and implausible (critical) readings |
| **Anatomical body map** | Organs and bones light up by status; tap any system to see what it does, how spaceflight affects it and what to do |
| **Crew alerts** | Two or more indicators at Act now automatically alert the crew leader and medical officer |
| **Earth-independent mode** | Simulated comms delay and solar-conjunction blackout; an outbox shows when each message reaches Earth |
| **Medical library** | 119 medicines and 67 guided emergency protocols, plus radiation shielding, conditions and countermeasures |
| **Guided protocols** | Step-by-step checklists that timestamp each step and send a log to the crew and Earth |
| **Dose check** | Reads current vital signs and blocks or warns before a medicine is given (for example, no sedatives below 92% SpO₂). Weight-based doses, 24 h maximum and timing |
| **Onboard pharmacy** | Stock levels and medicines that expire before the mission ends |
| **Works offline** | Installs as an offline app; status reports are about 1 KB for weak deep-space links |
| **Private by design** | Health data stays in the browser. See the [Privacy Charter](https://aegis-crew-health.vercel.app/privacy.html) |

## Tech

- Vanilla HTML, CSS and JavaScript with no build step, so it runs anywhere.
- Procedural SVG anatomy (`js/body.js`).
- Service worker for offline use (`sw.js`).
- Vercel serverless function (`api/kb.mjs`) that reads the medical library from **Azure Cosmos DB**, falling back to the bundled JSON in `data/`.
- Strict Content Security Policy and security headers (`vercel.json`), self-hosted fonts, and validation of all stored data.
- Resilience: every panel is isolated so one error cannot take the console down; rolling backup with automatic recovery of damaged data; works with storage blocked; tabs stay in sync; update notice when a new version is deployed.

## Run it locally

```bash
git clone https://github.com/temuulenbuuveibaatar-glitch/sonnenblume.git
cd sonnenblume
npx serve .        # or any static server, then open http://localhost:3000/app.html
```

## Tests

`tests/smoke_test.py` runs 40 checks in a real browser with the production security headers: every page and view, the security policy, tampered and corrupted storage, blocked storage, a failing panel, two tabs in sync, offline use, the dose safety checks and an accessibility scan. They run on every push via GitHub Actions.

```bash
pip install playwright && python -m playwright install chromium
npm install --no-save axe-core   # optional, enables the accessibility scan
python tests/smoke_test.py
```

## Connect Azure Cosmos DB (optional)

See [AZURE-SETUP.md](AZURE-SETUP.md). In short:

```bash
npm install
COSMOS_ENDPOINT=... COSMOS_KEY=... npm run seed   # loads all library records
```

Then add `COSMOS_ENDPOINT` and the **read-only** `COSMOS_KEY` to the Vercel project's environment variables.

## Sources

- NASA Human Research Program, *Earth-Independent Medical Operations ConOps* (NTRS 20240001402)
- Diaz et al., *Expiration analysis of the ISS formulary*, npj Microgravity 2024, doi:10.1038/s41526-024-00414-3
- Zeitlin et al., Science 2013 (radiation in Mars transit); Hassler et al., Science 2014 (Mars surface); Zhang et al., Science Advances 2020 (lunar surface)
- Barger et al., Lancet Neurology 2014 (sleep in spaceflight); Trudel et al., Nature Medicine 2022 (space anaemia)

The full list is in the app's Library → Sources.

## License

[MIT](LICENSE) © 2026 Team Sonnenblume

NASA does not endorse any non-U.S. Government entity and is not responsible for information on non-U.S. Government websites.
