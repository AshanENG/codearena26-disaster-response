# codearena26-disaster-response
AI-assisted disaster response platform for Sri Lanka: citizen hazard reporting, evidence verification, early warnings, route guidance, and coordinated emergency response. Built for CodeArena ’26.

The introduction describes the intended full project. **Current implementation: milestones 1–2, foundation and private evidence intake.** The five AI/system checks, incidents, public warnings/routes, dispatch, closure and relief allocation are not implemented yet.

## Setup on Windows / Antigravity
Use Node.js 22.18.0 and npm workspaces. npm 11.1.0 is suitable; checks in the Codex sandbox use npm 10.9.3.

```powershell
npm ci
# Only if server/.env does not already exist:
Copy-Item server/.env.example server/.env
npm run seed:demo
npm run dev
```

Preserve your existing server/.env. MONGODB_URI, GEMINI_API_KEY and GEMINI_MODEL are backend-only. A real MongoDB is required for reports, images, accounts and sessions. The verified Gemini model is gemini-3.8-flash. Never paste credentials into chat, frontend variables, Git or screenshots. Google AI Pro is not proof of API quota.

Open http://127.0.0.1:5173. Vite proxies /api to port 3001. If changing the backend port, update the proxy. The server loads server/.env independently of the terminal directory. Missing/unavailable MongoDB produces 503; there is no memory fallback.

The sandbox's default npm launcher may reference a missing roaming installation. Alternative:
```powershell
node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build
```
Use the same direct CLI for other npm commands if needed. No global npm settings were changed.

## Sign-in and demonstration accounts
Register through the app to create a **citizen** account. Public registration cannot set a staff role. Passwords must be 10–128 characters; usernames are 3–40 letters/numbers/hyphens.

`npm run seed:demo` creates demo-citizen, demo-officer, demo-crew, demo-relief and demo-admin only if absent. Random passwords are written to **server/generated/demo-accounts.json**, an ignored local file. Open it locally in your editor; passwords are never printed. Existing accounts/passwords are not reset. These are explicitly labelled demonstration identities, not an unauthenticated role switch. If an existing account's password file is lost, no automatic reset is performed.

| Role | Backend permission now |
|---|---|
| Citizen | Submit hazard/help with photo; list/read only own reports and photos |
| Officer / Admin | Read all report evidence, including preserved ownerless foundation records |
| Relief | Read help requests and their photos only |
| Crew | Sign in; no report access until assignments are implemented |

Crew/Admin workflow views remain labelled unfinished. Relief has a help intake queue, not shelter/supply allocation yet. Navigation never grants a role. Legacy ownerless reports are preserved for staff; no citizen can claim them.

Sessions use random 256-bit tokens in HttpOnly, SameSite=Lax cookies; only token hashes are stored in MongoDB. Sessions expire after 12 hours and are revoked on logout. Passwords use salted Node scrypt. API writes require X-Requested-With: CodeArena and reject mismatched Origin. No CORS is enabled. Login and upload rate limits are process-local, suitable for this single-process prototype; multi-instance/proxy deployment needs further review.

## Photo / GPS reporting
1. Sign in as a citizen. Choose hazard or help, a help category if applicable, and a description.
2. Select a JPEG, PNG or WebP (up to 5 MiB, 20 megapixels, non-animated). The server decodes the bytes; filename/MIME alone is not trusted.
3. Use device location or enter coordinates. Permission denial/timeout leaves a manual fallback; no coordinates are guessed. Device location normally requires HTTPS or localhost.
4. Review the point on the map, then submit. Original image bytes and EXIF are retained privately in MongoDB GridFS; the Report stores the file ID, SHA-256, metadata and submission audit event. Missing photo GPS remains unknown. GPS/metadata are not proof of location.
5. My reports shows only your records; the map shows the current page, not nationwide coverage. Staff sees the appropriate queue. Lists poll every 10 seconds while visible.
6. Refresh or restart the server: report, photo and session persist. An unchanged retry reuses its submission key; a reused key with different evidence returns 409.

Original photos are served only through an ownership/role-checked route, never a public uploads folder. Existing text-only records remain readable by staff. All **new** reports require a photo and authentication; the old anonymous JSON POST is intentionally no longer supported.

GridFS avoids dependence on ephemeral host disk. It still consumes MongoDB storage and needs database backups. Report creation and GridFS upload are separate writes: normal failures/duplicates clean up the new file; an abrupt process crash between writes may leave an orphan. File metadata includes owner/submission IDs for later maintenance; no automatic deletion of unrelated evidence occurs.

Basemap tiles come from OpenStreetMap with attribution through Leaflet; internet is required. Tile failure leaves the coordinate list available. Pins are private, unverified submissions, not confirmed incidents, warnings or safe-route advice. No seeded operational areas or road-routing coverage are claimed in this milestone.

## Commands
| Command | Purpose |
|---|---|
| npm run dev | Vite and Express together |
| npm run build | Compile React into ignored client/dist |
| npm start | Express; also serves build when SERVE_CLIENT=true |
| npm test | Offline/unit/HTTP security, validation, model, image and schema checks |
| npm run test:persistence | Real MongoDB/GridFS integration, roles/ownership, retries and reconnection; cleans only test-owned data |
| npm run seed:demo | Provision missing local demo identities; never reset existing accounts |
| npm run smoke:gemini -- "C:/absolute/path/image.jpg" | Opt-in live backend Gemini image call |

### Single-origin built mode
If the Codex sandbox blocks esbuild's development optimizer, the production build works:
```powershell
npm run build
$env:SERVE_CLIENT = 'true'
npm start
```
Open http://127.0.0.1:3001. Set NODE_ENV=production only with HTTPS: session cookies then use Secure. See docs/deployment.md. No public deployment or paid service was enabled.

## API contracts
- GET /api/health: 200 only when MongoDB connected, otherwise 503; non-sensitive readiness.
- POST /api/auth/register or /login: JSON username/password, protected write header; returns user and sets cookie. Registration creates citizens only.
- GET /api/auth/me: current user or null. POST /api/auth/logout revokes the session.
- POST /api/reports: authenticated citizen, multipart field **report** (JSON) plus file **photo**. JSON fields: kind (hazard/help), description, latitude, longitude, locationSource (manual/device), submissionKey (UUID), optional gpsAccuracy for device, helpCategory required for help. Unknown fields rejected. 201 created; 200 exact replay; 409 conflicting key.
- GET /api/reports?limit=20&offset=0&kind=help: authenticated role-scoped page; limit 1–100, offset 0–100000, optional kind. Returns reports/hasMore/limit/offset.
- GET /api/reports/:id and /:id/photo: same ownership/role checks. Other citizens receive 404. Anonymous requests receive 401; crew is denied 403.
- Common errors: 400 invalid content; 413 too large; 415 wrong upload type; 429 rate limit; 503 storage failure. Errors do not echo secrets or raw database/provider details.

## Gemini boundary
server/src/ai/gemini.js uses the official @google/genai Interactions API, image input, JSON response_format, store=false and Zod validation. The [official structured output guide](https://ai.google.dev/gemini-api/docs/structured-output) describes this interface. The earlier generateContent endpoint returned 404 during real verification and was replaced.

The CLI explicitly sends the specified image to Google using existing configured quota. It returns hazard/risk/reasons/uncertainty/confidence and unknown location evidence. Confidence is subjective, not calibrated accuracy. A screenshot live smoke test passed; disaster-photo classification accuracy and the five-check aggregator remain unverified. No public API route invokes Gemini yet.

## Code map / explanation
- client/src/main.jsx: shell, session and role-specific views.
- Citizen.jsx: photo/GPS/form; ReportQueue.jsx: polling and pagination; ReportMap.jsx: Leaflet; AuthPanel.jsx: sign-in.
- server/src/auth.js: hashing, sessions, authentication and role helpers.
- reports.js: upload validation, scoped queries, deduplication and protected downloads.
- evidence.js: decode/hash/EXIF and GridFS; models/: User, Session, Report.
- scripts/check-persistence.js: real integration checks; scripts/seed-demo-accounts.js: labelled demo identities.
- docs/requirements.md: PDF requirement -> implementation -> test -> demo evidence.
- docs/progress.md, plan.md, decisions.md and walkthrough.md: verified status, remaining work and presenter notes.

Citizen -> authenticated multipart request -> backend validation -> GridFS original image + Mongoose Report -> private polling queue. Photos and session data survive backend restarts because MongoDB stores them, not React state.
