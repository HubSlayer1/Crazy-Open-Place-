# Crazy.Org All in One — Cloudflare D1 Bridge Worker

Free-plan Cloudflare Worker (`crazy-org-d1-bridge`) providing an authenticated, parameterized bridge to Cloudflare D1 (`crazy-org-production`).

## Setup Commands (Cloudflare Free Tier)

1. Install dependencies:
   ```bash
   cd cloudflare/d1-worker
   npm install
   ```

2. Authenticate Wrangler with your free Cloudflare account:
   ```bash
   npx wrangler login
   ```

3. Create the D1 database on Cloudflare Free Plan:
   ```bash
   npx wrangler d1 create crazy-org-production
   ```
   Copy the returned `database_id` into `cloudflare/d1-worker/wrangler.jsonc`.

4. Apply SQLite schema and index migrations:
   ```bash
   npm run migrate:local
   npm run migrate:remote
   ```

5. Configure the shared HMAC secret (`APP_BRIDGE_SECRET` must match `D1_BRIDGE_SECRET` in your Node.js server secrets):
   ```bash
   npx wrangler secret put APP_BRIDGE_SECRET
   ```

6. Deploy Worker:
   ```bash
   npm run deploy
   ```

7. Local D1 + Worker testing:
   ```bash
   # Create .dev.vars with APP_BRIDGE_SECRET for local wrangler dev
   npm run dev
   ```
