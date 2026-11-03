# NOVA

NOVA is a Cloudflare-native social + gaming platform foundation inspired by modern community apps. This repository includes a working baseline for:

- Secure username/password authentication with hashed credentials and cookie sessions.
- Server and channel creation.
- Real-time text chat over WebSockets + Durable Objects.
- Persistent chat and social data in D1.
- Initial modular game framework with a playable Tic-Tac-Toe implementation.
- Cloudflare-ready deployment configuration (Workers, D1, KV, R2, Durable Objects).

## Repository Structure

- `src/` — React + TypeScript frontend.
- `workers/` — Cloudflare Worker backend, APIs, and Durable Objects.
- `database/migrations/` — D1 SQL migrations.
- `tests/` — unit/integration/e2e test folders.
- `.github/workflows/` — GitHub Actions CI.

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and adjust values.

### 3) Create and bind Cloudflare resources

1. Create D1:
   ```bash
   npx wrangler d1 create nova-db
   ```
2. Create R2 bucket:
   ```bash
   npx wrangler r2 bucket create nova-media
   ```
4. Put resulting IDs into `wrangler.jsonc`.

### 4) Apply D1 migrations

```bash
npx wrangler d1 migrations apply nova-db --local
npx wrangler d1 migrations apply nova-db --remote
```

### 5) Run frontend and worker

```bash
npm run dev
npm run dev:worker
```

Frontend defaults to `http://localhost:5173` and proxies API calls to local worker on port `8787`.

## Cloudflare Bindings

Configured in `wrangler.jsonc`:

- `DB` (D1 database)
- `NOVA_CHANNELS` (Durable Object for channel real-time fanout)
- `MEDIA_BUCKET` (R2 media storage)

## Environment Variables / Secrets

`ALLOWED_ORIGIN`, `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.

Set production values via Cloudflare secrets/vars (never commit production credentials):

```bash
npx wrangler secret put TURN_USERNAME
npx wrangler secret put TURN_CREDENTIAL
```

## Testing and Quality

```bash
npm run typecheck
npm run test
npm run build
```

CI workflow runs these checks on pushes/PRs.

## Deployment

### Option A: GitHub ↔ Cloudflare integration

- Connect repository in Cloudflare dashboard.
- Set build command: `npm run build`.
- Set output directory: `dist`.
- Ensure Worker bindings from `wrangler.jsonc` are mirrored in Cloudflare settings.

### Option B: Wrangler CI/CD

Use GitHub Actions with Cloudflare API token and account ID secrets, then run `wrangler deploy` after checks pass.

## External Services Requiring Configuration

Voice/video and screen sharing at scale require TURN/SFU configuration. This repository exposes TURN env vars and is structured to wire adapters without embedding vendor-specific secrets in the frontend.

## Known Limitations

This milestone provides functional foundation features (auth, core communities, real-time messaging, schema, and game module architecture) and a playable Tic-Tac-Toe game. Full production-grade implementation of all advanced calls/moderation/search/multi-game requirements should continue iteratively using this architecture.
