# codearena26-disaster-response
AI-assisted disaster response platform for Sri Lanka: citizen hazard reporting, evidence verification, early warnings, route guidance, and coordinated emergency response. Built for CodeArena ’26.
## Milestone 1: foundation

Implemented: React/Vite/JavaScript/Tailwind shell, citizen text/coordinate reports saved through Express to MongoDB, Operations inbox, health endpoint, and a backend-only Gemini image smoke test. Crew, Relief and Admin are explicitly unfinished. The original project description above describes the eventual project, not currently working features. No authentication, emergency dispatch, photo uploads or live AI assessments are provided by the web app.

### Local setup

Use Node.js **22.18.0** and npm workspaces (your npm 11.1.0 is suitable; this sandbox was tested with npm 10.9.3). From the repository root:

```sh
npm ci
cp server/.env.example server/.env
```

PowerShell copy command: `Copy-Item server/.env.example server/.env`.

Install and start a real local MongoDB Community server, or supply an existing MongoDB Atlas URI. Set `MONGODB_URI` in `server/.env`; the example uses `mongodb://127.0.0.1:27017/codearena26`. For Atlas, use a database user, an allowed client IP and a database name; percent-encode special characters in credentials. No paid service is required or enabled by this repository. Never paste a real URI or API key into chat, frontend code, Git or screenshots.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to Express at http://127.0.0.1:3001. The backend loads `server/.env` independently of the current working directory. Keep port 3001, or update the Vite proxy if changing it. Backend binds to loopback by default. Health retries in the UI every 15 seconds; the server retries initial MongoDB connection failures every 10 seconds. Missing MongoDB never falls back to memory.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start client and backend together |
| `npm run build` | Build frontend to ignored `client/dist/` |
| `npm start` | Start Express; optionally serve the built frontend with SERVE_CLIENT=true |
| `npm test` | HTTP contract, input validation, model and AI schema tests; no external services |
| `npm run test:persistence` | Create a real MongoDB report through HTTP, reconnect app/database, read it through HTTP, then delete only the test report |
| `npm run smoke:gemini -- "C:/absolute/path/hazard.jpg"` | Send a local image to Gemini and print a validated structured assessment |

`npm test` uses explicitly named storage contract stubs. It does **not** prove database persistence. The separate persistence check uses real MongoDB only.

This machine's npm launcher may fail with `Cannot find module ...npm-cli.js`. A working alternative is `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" ci` (substitute other npm arguments as needed). Repair the npm installation/PATH for normal usage. No machine-wide settings are changed by this project.

If the Codex Windows sandbox blocks esbuild dependency optimization, run development commands in your normal local terminal. To inspect the built app locally, use `npm start` in one terminal and `npm run build` followed by `npm run preview -w client` in another, then open http://127.0.0.1:4173. Vite uses native JavaScript config loading, supported by the specified Node version.

### Verify saving and refresh

1. Check `/api/health`: expect HTTP 200, `server: "ready"`, `ready: true` and database `connected`. Without MongoDB expect HTTP 503 and `ready: false`; the server can still answer health requests.
2. In Citizen, enter a description of 10–2,000 characters and latitude/longitude within valid ranges. No coordinates are prefilled or inferred.
3. Submit and wait for a saved report ID. Open Operations and find the same ID.
4. Reload the browser while on `#operations`; the page fetches reports from MongoDB again. Restart the backend and check again if desired. Run `npm run test:persistence` for an automated reconnection check.
5. Disconnect MongoDB to verify errors: no success message should appear. If a request times out, check Operations before retrying because the write outcome may be uncertain.

### API

- `GET /api/health`: 200 when MongoDB is connected, otherwise 503; returns server readiness and non-sensitive database status.
- `POST /api/reports`: JSON `{ "description": "Water rising near the bridge", "latitude": 7.1, "longitude": 80.6 }`; returns 201 `{ "report": ... }` after saving. Coordinates must be finite JSON numbers. Unknown fields are rejected. Status is always `submitted`, location evidence `unverified`.
- `GET /api/reports?limit=20&offset=0`: newest first; returns `{ reports, hasMore, limit, offset }`. Limit 1–100, offset 0–100000. The UI pages in groups of 20. Offset pagination may shift if new reports arrive; refresh to return the current data.
- Validation errors: 400; wrong content type: 415; body over 16 KiB: 413; storage unavailable: 503. Responses and logs suppress database/provider error details.

### Gemini smoke test (opt-in, backend only)

The official Google SDK is `@google/genai`, pinned in the lockfile. The adapter uses image `inlineData` and structured JSON output with local Zod validation, following the [Google structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output). There is no public Gemini API route and the client has no SDK or key.

Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `server/.env`. Choose an image-input model supporting structured output that is available to your key; the model is intentionally not guessed. Use your existing permitted quota. Run the CLI with an absolute JPEG/PNG/WebP path (nonempty, maximum 5 MiB). This explicitly sends that image to Google. It prints a live-labelled assessment with hazard, risk, reasons, uncertainty, confidence, unknown location evidence and whether more information is needed. No GPS evidence is supplied, so location remains unknown. Model confidence is not a calibrated probability. Missing credentials, API failures and invalid output fail with nonzero exit status; no fake assessment is substituted.

Real `.env` files, images, uploads and generated outputs are ignored. Keep server secrets server-side; never create `VITE_` secret variables. Do not commit smoke-test outputs. The app has no authentication yet and is intended for local competition development only.

### Project layout and data flow

`client/src/main.jsx` contains navigation, report form, health state and Operations views. `server/src/app.js` defines HTTP contracts; `validation.js` validates input; `models/Report.js` defines MongoDB documents. `server/src/ai/gemini.js` is only imported by the CLI and tests. `docs/requirements.md` tracks the full competition scope and remaining work; `AGENTS.md` preserves constraints for future implementation.

The browser submits JSON to `/api/reports` → Vite proxies to Express → Express validates input and awaits Mongoose/MongoDB insertion → the browser receives the saved document ID. Operations fetches `/api/reports` on entry, refresh and pagination. Reloading reads the database again; no browser or in-memory report cache is used as persistent storage.

See `docs/validation.md` for the actual checks run and remaining credential-dependent verification.

## Current handoff

This working tree is the user's actual local clone. Read `docs/progress.md` for fresh results, `docs/requirements.md` for PDF-source mappings, `docs/plan.md` for deadline checkpoints, and `docs/decisions.md` for design choices. `docs/walkthrough.md` provides plain-English judge practice. Milestone 1 remains incomplete until real MongoDB and Gemini checks pass.

For the tested single-origin arrangement, run the build, set `SERVE_CLIENT=true` in `server/.env`, then `npm start`; open port 3001. See `docs/deployment.md`. This is local packaging verification, not public deployment or role-secured operation.
