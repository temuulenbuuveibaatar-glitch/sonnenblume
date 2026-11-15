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
| **Anatomical body map** | Male and female bodies; organs and bones light up by status; tap any system to see what it does, how spaceflight affects it and what to do |
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
- **Mind** (`js/mind.js`): daily wellbeing check-in against the person's own baseline, weekly PHQ-9 and GAD-7 screens with a safety card and one-tap crew alert, isolation tracker, coping tools, a private journal and the optional on-device AI companion.
- **Crew ops** (`js/ops.js`): crew medical officer view, EVA and task readiness (Go / Caution / No-go with reasons), countermeasure planner and a 7-day ground handover report under 1.5 KB.
- **Label dose reference** (`data/kb-dosing.json`): adult doses traced to DailyMed plus a second source, with kidney, liver and older-adult notes and label vital-sign gates in the dose check.
- **Rust status engine** (`rust/core`): vital-sign thresholds, critical values, personal-baseline shift detection and the radiation budget, written in Rust and compiled to a 2 KB WebAssembly file (`wasm/sonnenblume_core.wasm`). The console uses it when the browser supports WebAssembly and falls back to the identical JavaScript rules otherwise; a test sweeps thousands of values to prove both agree. Rebuild with `npm run build:wasm` (needs Rust with the `wasm32-unknown-unknown` target).
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

## AI disclosure

This project was built with AI assistance, as required by the NASA Space Apps rules on Super Intelligence (SI):

- **Code:** the web app, Rust status engine, serverless API, service worker, tests and CI were written and debugged with Claude (Anthropic), directed and reviewed by the team.
- **Data:** the medical library text (medicines, protocols, shielding, conditions) was drafted with Claude from the public sources listed above. It is educational demo content, not medical guidance.
- **In the app:** the optional Mind companion runs Qwen2.5-1.5B-Instruct (4-bit, Apache-2.0) on the user's device through WebLLM (vendored in `vendor/web-llm`, Apache-2.0). It is opt-in, downloads about 0.9 GB once, needs WebGPU, labels every reply AI-generated, never diagnoses or gives doses, and a fixed non-AI safety check runs before it on every message. No conversation leaves the device.
- **Medicine doses:** label-sourced dose references in `data/kb-dosing.json` were gathered with Claude from the official DailyMed labels plus a second authoritative source, then validated by `scripts/check-dosing.py`.
- **Visuals:** the anatomical body map and landing animations are code-generated with Claude. The project image is AI-generated and carries a visible AI watermark.
- No personal or health data is sent to any AI service; the app runs entirely in the browser.

## License

[MIT](LICENSE) © 2026 Team Sonnenblume

NASA does not endorse any non-U.S. Government entity and is not responsible for information on non-U.S. Government websites.
