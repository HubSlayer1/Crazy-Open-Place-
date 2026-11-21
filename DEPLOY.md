# Deploying Crazy.Org All in One (Cloudflare D1 Free + Workers Free + Express)

Crazy.Org All in One runs a Node.js 22 + Express application server (`node server.ts`) connected to **Cloudflare D1** via a private HMAC-SHA256 signed **Cloudflare Worker Bridge** (`cloudflare/d1-worker/`) on **Cloudflare Free Plans** — no Firebase runtime, no Blaze upgrade, and zero paid API plans required.

## Architecture Overview
- **Frontend**: React + Vite Cyber UI (`Cyber Dark` / `Cyber Light` themes) with zero customer login.
- **Customer Guest Checkout & Private Tracking**: Orders issue a unique reference (`SER-YYYYMMDD-XXXX`) plus a one-time 256-bit `base64url` Private Tracking Code stored only as an HMAC-SHA256 hash (`TRACKING_CODE_PEPPER`) in D1.
- **Admin Authentication**: Independent server-side `/admin` console protected by `ADMIN_USERNAME` + `ADMIN_PASSWORD` (`scrypt` or plaintext), HTTP-only sessions stored in D1 (`admin_sessions`), `X-CSRF-Token`, `Origin` validation, and DB-backed brute-force rate limiting.
- **Official Guild Glory Provider**: External payment & activation workflows are pinned strictly to `https://www.ffglory.pro/`.
- **Free Fire UID Inspector**: Uses `FREEFIRE_API_KEY` solely via stateless `POST /api/ff/lookup`.

---

## Step 1: Provision Cloudflare D1 + Worker (Free Plan)

Run these commands inside `cloudflare/d1-worker/`:

1. **Install dependencies**:
   ```bash
   cd cloudflare/d1-worker
   npm install
   ```

2. **Authenticate Wrangler with your free Cloudflare account**:
   ```bash
   npx wrangler login
   ```

3. **Create the D1 database**:
   ```bash
   npx wrangler d1 create crazy-org-production
   ```
   Copy the returned `database_id` into `cloudflare/d1-worker/wrangler.jsonc` (`REPLACE_WITH_REAL_CLOUDFLARE_DATABASE_ID`).

4. **Apply SQLite schema migrations to remote D1**:
   ```bash
   npm run migrate:remote
   ```

5. **Set the Worker bridge HMAC secret** (generate a strong 64-hex secret):
   ```bash
   npx wrangler secret put APP_BRIDGE_SECRET
   ```
   Use the **exact same value** for `D1_BRIDGE_SECRET` in your Express server environment.

6. **Deploy the Cloudflare Worker**:
   ```bash
   npm run deploy
   ```
   Copy the deployed Worker URL (`https://crazy-org-d1-bridge.<your-subdomain>.workers.dev`).

---

## Step 2: Configure Express Server Secrets

Set the following environment variables in AI Studio Secrets or your hosting provider (Render / Fly.io / Cloud Run / Koyeb / Railway):

- `D1_WORKER_URL`: Deployed Cloudflare Worker URL (e.g. `https://crazy-org-d1-bridge.<subdomain>.workers.dev`)
- `D1_BRIDGE_SECRET`: Exact matching secret set in Worker `APP_BRIDGE_SECRET` (minimum 16 chars; 64 hex chars recommended)
- `SESSION_SECRET`: Random secret for admin session & CSRF HMAC (minimum 32 chars)
- `TRACKING_CODE_PEPPER`: Random secret for order Private Tracking Code HMAC (minimum 32 chars)
- `ADMIN_USERNAME`: Administrator username (e.g. `admin`)
- `ADMIN_PASSWORD`: Strong password or `scrypt$<salt_hex>$<hash_hex>` hash
- `APP_URL`: Public HTTPS origin of your deployed web app (for CORS/CSRF Origin validation)
- `FREEFIRE_API_KEY`: Optional Free Fire Info API key (used solely for `/api/ff/lookup`)

*(Note: Never commit real secrets to `.env` or `.env.example`.)*

---

## Step 3: Build & Start Express

1. **Build**: `npm install && npm run build`
2. **Start**: `NODE_ENV=production node server.ts`
3. **Health Checks**:
   - Express + D1 Bridge: `GET /api/health` or `GET /healthz`
   - Full Diagnostics: `GET /api/status`

---

## Step 4: First-Time Data Migration (Firebase Backup -> Cloudflare D1)

1. Open `/admin` and sign in using `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. Navigate to **Tab I. Migration Center**.
3. Verify the archived Firebase backup (`migration/backup/latest-export.json`, SHA-256 verified) shows parity status cleanly.
4. Click **Import Archived Backup into D1** (or upload a custom backup JSON) to migrate packages, storefront settings, orders, refunds, redeem codes, tickets, and contacts idempotently.
5. Download the **Migration Recovery CSV** if any imported legacy orders had tracking tokens regenerated so affected customers can receive updated Private Tracking Codes.
