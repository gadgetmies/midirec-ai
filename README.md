# midirec-ai

Repository: https://github.com/gadgetmies/midirec-ai

Client-only SPA (Vite, React, TypeScript) that records MIDI to newline-delimited JSON, edits notes on a canvas timeline, syncs clock (internal or external byte stream), exports SMF, and plays back via Web MIDI to selected outputs (including virtual ports from IAC, loopMIDI, etc.).

## Requirements

- Chromium-based browser (Web MIDI API)
- **HTTPS** (GitHub Pages and `localhost` satisfy this)

## Development

```bash
npm install
npm run dev
```

- `npm run build` — typecheck + production bundle to `dist/`
- `npm run test` — Vitest unit tests
- `npm run lint` — ESLint

### GitHub Pages

The app uses `HashRouter` and default Vite **`base`** `/midirec-ai/` for project Pages URLs (`https://<user>.github.io/midirec-ai/`). Override at build time with `VITE_BASE=/` if you use a custom domain or user site root.

CI (`.github/workflows/ci.yml`) runs lint, test, and build on pushes and PRs. Pages deploy (`.github/workflows/pages.yml`) uploads `dist/` when pushing to `main`. In the repo **Settings → Pages**, set **Source** to **GitHub Actions** after the first successful deploy.

### Virtual MIDI

The browser cannot create OS MIDI ports; use **IAC Bus** (macOS) or **loopMIDI** (Windows) so another app exposes a port this app can open.
