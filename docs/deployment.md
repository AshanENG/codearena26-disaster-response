# Early deployment feasibility

## Verified locally
One Node/Express process can serve the compiled React frontend and /api from one origin. This avoids a separate frontend origin/CORS configuration. Native Vite config loading and a production build work on Node 22.18.0. API paths retain JSON 404s and health reports unavailable MongoDB honestly.

PowerShell, from the repository root:

```powershell
npm run build
$env:SERVE_CLIENT = 'true'
$env:PORT = '3001'
npm start
```

Open http://127.0.0.1:3001. Alternatively set SERVE_CLIENT=true in server/.env. MONGODB_URI is still required for storage. The frontend is not a replacement for the database.

## Not verified or provisioned
No hosting account, public deployment, HTTPS domain, cloud MongoDB, Gemini quota or persistent uploaded-image volume has been verified. No paid service is enabled. The current app is not authorized for public exposure: backend role enforcement and ownership are pending.

A suitable later arrangement needs a Node 22-compatible process, configured PORT/HOST (0.0.0.0 only on the intended host), HTTPS, persistent MongoDB/network access, backend-only secrets, and durable image storage. Do not assume an ephemeral host filesystem preserves photos across restarts. Do not choose a provider based on unverified free-tier claims.

Before claiming deployment: build/start on chosen host; verify browser/API origin; submit and reload; restart service and read same report; restart and retrieve the uploaded evidence once M2 exists; exercise role denial; run permitted live Gemini; record logs/results without secrets. Do not proceed with a paid option without approval.
