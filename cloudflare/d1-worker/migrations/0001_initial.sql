PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'FFGlory',
  provider_url TEXT NOT NULL DEFAULT 'https://www.ffglory.pro/',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL DEFAULT 'prod-ff-guild-glory',
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bot_count INTEGER NOT NULL CHECK (bot_count >= 1 AND bot_count <= 100),
  selling_price_minor INTEGER NOT NULL CHECK (selling_price_minor > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  duration_label TEXT NOT NULL DEFAULT 'Standard Session',
  supported_regions_json TEXT NOT NULL DEFAULT '["BD","IND","SG"]',
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '',
  refund_note TEXT NOT NULL DEFAULT '',
  provider_price_note TEXT NOT NULL DEFAULT '',
  estimated_delivery TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS storefront_settings (
  id TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL DEFAULT 'FFGlory',
  provider_homepage TEXT NOT NULL DEFAULT 'https://www.ffglory.pro/',
  provider_tracking_url TEXT NOT NULL DEFAULT 'https://www.ffglory.pro/',
  currency TEXT NOT NULL DEFAULT 'USD',
  supported_handoff_method TEXT NOT NULL DEFAULT '',
  provider_transaction_fields_note TEXT NOT NULL DEFAULT '',
  service_instructions TEXT NOT NULL DEFAULT '',
  payment_instructions TEXT NOT NULL DEFAULT '',
  important_warnings TEXT NOT NULL DEFAULT '',
  refund_conditions TEXT NOT NULL DEFAULT '',
  support_whatsapp TEXT NOT NULL DEFAULT '',
  support_email TEXT NOT NULL DEFAULT '',
  support_hours TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  tracking_token_hash TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  guild_uid TEXT NOT NULL,
  guild_name TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL,
  whatsapp_contact TEXT NOT NULL DEFAULT '',
  quantity_multiplier INTEGER NOT NULL DEFAULT 1,
  bot_count INTEGER NOT NULL,
  total_bots INTEGER NOT NULL,
  unit_price_minor INTEGER NOT NULL,
  total_price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
  service_status TEXT NOT NULL DEFAULT 'AWAITING_PROVIDER_PAYMENT',
  provider_name TEXT NOT NULL DEFAULT 'FFGlory',
  provider_url TEXT NOT NULL DEFAULT 'https://www.ffglory.pro/',
  redeem_code_assigned TEXT,
  legacy_customer_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_timeline (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  previous_status TEXT,
  status TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_label TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT NOT NULL,
  binance_order_id TEXT NOT NULL DEFAULT '',
  provider_account_username TEXT NOT NULL DEFAULT '',
  payment_proof_url TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  verified_at TEXT,
  verified_by TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_tx_locks (
  tx_key TEXT PRIMARY KEY,
  raw_tx_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  provider_group_id TEXT NOT NULL,
  activation_tx_ref TEXT NOT NULL DEFAULT '',
  customer_status TEXT NOT NULL DEFAULT 'WAITING_15_MIN',
  redeem_code TEXT NOT NULL DEFAULT '',
  proof_url TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  verified_at TEXT,
  verified_by TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS redeem_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  normalized_code TEXT NOT NULL UNIQUE,
  package_name TEXT NOT NULL DEFAULT '',
  assigned_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  assigned_at TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider_tx_ref TEXT NOT NULL DEFAULT '',
  provider_group_ref TEXT NOT NULL DEFAULT '',
  ran_over_30_min_zero_glory INTEGER NOT NULL DEFAULT 0,
  running_minutes_observed INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  provider_refund_result TEXT NOT NULL DEFAULT 'PENDING',
  customer_refund_result TEXT NOT NULL DEFAULT 'PENDING',
  refund_amount_minor INTEGER NOT NULL DEFAULT 0,
  refund_currency TEXT NOT NULL DEFAULT 'USD',
  refund_amount_label TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refund_history (
  id TEXT PRIMARY KEY,
  refund_id TEXT NOT NULL,
  status TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  category TEXT NOT NULL DEFAULT 'SUPPORT',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  admin_reply TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_replies (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_role TEXT NOT NULL,
  author_label TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success INTEGER NOT NULL,
  attempted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id TEXT PRIMARY KEY,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS speed_tests (
  id TEXT PRIMARY KEY,
  client_ref TEXT NOT NULL,
  mode TEXT NOT NULL,
  download_bps REAL,
  upload_bps REAL,
  latency_ms REAL,
  jitter_ms REAL,
  down_loaded_latency_ms REAL,
  up_loaded_latency_ms REAL,
  packet_loss_supported INTEGER NOT NULL DEFAULT 0,
  total_duration_ms REAL,
  isp_or_colo TEXT NOT NULL DEFAULT '',
  scores_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uid_lookups (
  id TEXT PRIMARY KEY,
  client_ref TEXT NOT NULL,
  uid TEXT NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  level INTEGER,
  likes INTEGER,
  resolved_region TEXT NOT NULL DEFAULT '',
  provider_name TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  profile_json TEXT,
  queried_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legacy_records (
  id TEXT PRIMARY KEY,
  source_collection TEXT NOT NULL,
  source_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (id, applied_at)
VALUES ('0001_initial', '2026-11-18T00:00:00.000Z');

INSERT OR IGNORE INTO products (
  id, slug, name, category, description, provider_name, provider_url, active, created_at, updated_at
) VALUES (
  'prod-ff-guild-glory',
  'ff-guild-glory',
  'FF Guild Glory Bot Service',
  'GAMING_SERVICE',
  'Coordinated Guild Glory delivery routed through FFGlory official service panels with private order tracking.',
  'FFGlory',
  'https://www.ffglory.pro/',
  1,
  '2026-11-18T00:00:00.000Z',
  '2026-11-18T00:00:00.000Z'
);

INSERT OR IGNORE INTO packages (
  id, product_id, slug, name, bot_count, selling_price_minor, currency, duration_label,
  supported_regions_json, description, instructions, warnings, refund_note,
  provider_price_note, estimated_delivery, active, sort_order, updated_at
) VALUES
(
  'pkg-gg-starter', 'prod-ff-guild-glory', 'guild-glory-starter-bot',
  'FF Guild Glory Bot — Starter Pack', 2, 350, 'USD',
  'Standard Session · 2 Coordinated Bots',
  '["BD","IND","SG","ID","BR","TH","VN","ME","PK","EU","NA"]',
  'Entry-tier Guild Glory bot allocation routed through FFGlory service panels. Designed for small guilds testing regional delivery and monitoring initial Glory ticks.',
  'Confirm your Guild ID is public/joinable or accepts automated squad entries according to FFGlory panel guidance before clicking Launch Group.',
  'Requires active FFGlory account credits. Always double-check Guild ID and Region before launching on FFGlory.',
  'Eligible for FFGlory refund review only if the active group runs >30 minutes with zero Glory recorded.',
  'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
  'Manual verification ~15–60 min after provider submission',
  1, 1, '2026-11-18T18:18:00.351Z'
),
(
  'pkg-gg-squad', 'prod-ff-guild-glory', 'guild-glory-standard-squad',
  'FF Guild Glory Bot — Standard Squad', 4, 650, 'USD',
  'Standard Session · 4 Coordinated Bots',
  '["BD","IND","SG","ID","BR","TH","VN","ME","PK","EU","NA"]',
  'Balanced 4-bot Guild Glory formation for consistent clan Glory progression. Matches standard FFGlory group launch workflow with manual verification tracking.',
  'Wait at least 15 minutes inside FFGlory My Active Groups after clicking Launch Group to confirm status & Glory updates.',
  'Third-party automation carries Garena policy risk. Never share passwords or OTPs.',
  'Zero-Glory runs lasting >30 minutes qualify for provider verification; provider wallet credit vs store refund tracked separately.',
  'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
  'Manual verification ~15–60 min after provider submission',
  1, 2, '2026-11-18T18:18:00.351Z'
),
(
  'pkg-gg-platoon', 'prod-ff-guild-glory', 'guild-glory-platoon-surge',
  'FF Guild Glory Bot — High-Capacity Surge', 8, 1200, 'USD',
  'Extended Session · 8 Coordinated Bots',
  '["BD","IND","SG","ID","BR","TH","VN","ME","PK"]',
  'High-capacity 8-bot Guild Glory allocation built for competitive guild pushes. Tracked end-to-end from provider payment confirmation through Group ID verification.',
  'Verify credit balance on https://www.ffglory.pro/ before starting the group. Keep your Provider Transaction ID and Group ID recorded.',
  'Verify your Guild capacity has open slots if required by your selected FFGlory configuration.',
  'Refund eligibility requires >30 min runtime with 0 Glory and valid Group ID evidence.',
  'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
  'Manual verification ~15–60 min after provider submission',
  1, 3, '2026-11-18T18:18:00.351Z'
),
(
  'pkg-gg-full', 'prod-ff-guild-glory', 'guild-glory-full-dominion',
  'FF Guild Glory Bot — Full Guild Unit', 12, 1750, 'USD',
  'Priority Session · 12 Coordinated Bots',
  '["BD","IND","SG","ID","BR","TH","VN","ME"]',
  'Maximum 12-bot Guild Glory deployment with priority admin verification on Crazy.Org All in one and full timeline audit logging.',
  'Submit Binance Pay / FFGlory transaction reference immediately after payment, then wait for Admin verification before launching.',
  'Editable package pricing in Admin Console must mirror current FFGlory credit rates. Zero ban-safety guarantees.',
  'FFGlory issues approved refunds as provider credits unless store cash refund is explicitly authorized by Admin.',
  'Store selling rate shown. FFGlory credit pricing is billed separately on www.ffglory.pro.',
  'Priority manual verification ~15–45 min',
  1, 4, '2026-11-18T18:18:00.351Z'
);

INSERT OR IGNORE INTO storefront_settings (
  id, provider_name, provider_homepage, provider_tracking_url, currency,
  supported_handoff_method, provider_transaction_fields_note,
  service_instructions, payment_instructions, important_warnings, refund_conditions,
  support_whatsapp, support_email, support_hours, updated_at
) VALUES (
  'main',
  'FFGlory',
  'https://www.ffglory.pro/',
  'https://www.ffglory.pro/',
  'USD',
  'Second browser tab handoff + manual transaction & Group ID verification',
  'Fields submitted on FFGlory: Transaction ID, Credits requested, Amount to pay, Binance Pay ID, optional Binance Order ID, and clicking "I''ve Sent the Payment".',
  '1. Complete payment on the official FFGlory website (https://www.ffglory.pro/) and record your Transaction ID on Crazy.Org All in one.
2. Once your FFGlory credits are active, open the FFGlory service panel in your browser tab.
3. Select your exact Free Fire server Region and enter your numeric Guild/Clan ID.
4. Click Start Group, carefully review Guild ID, Region, and credit cost, then click Launch Group.
5. Open My Active Groups on FFGlory, wait at least 15 minutes to verify status and Glory gain, and submit your Provider Group ID back on Crazy.Org All in one.',
  '1. Click "CONTINUE TO OFFICIAL PROVIDER" to open https://www.ffglory.pro/ in a second browser tab while keeping Crazy.Org All in one open.
2. Register or sign in to your own FFGlory account.
3. Open the Buy Credits / Payment section, choose the credit amount needed for your selected package, and note the displayed Binance Pay ID and amount.
4. Send the payment and submit your Transaction ID, Credits requested, Amount to pay, Binance Pay ID, and optional Binance Order ID on FFGlory, then click "I''ve Sent the Payment".
5. FFGlory payments require manual admin confirmation (never instant). Return to Crazy.Org All in one to submit your provider payment references for tracking and verification.',
  'Third-Party Notice: Crazy.Org All in one and FFGlory are independent third-party services and are NOT affiliated with, endorsed by, or sponsored by Garena International.
Account Policy Risk: Automated bot/guild glory services carry third-party enforcement and game policy risks. No service can guarantee 100% ban-safety.
Credential Security: We NEVER request your Free Fire password, OTP, Facebook login, Google login, or session token. Only provide your public Guild ID and contact number.
Manual Verification: Do not close your order tab until your Order Number and Private Tracking Code are safely saved.',
  'FFGlory supports refund checks primarily when a launched group runs continuously for more than 30 minutes with zero Glory progress recorded.
Not every failure qualifies for a refund (for example: wrong Guild ID entered, wrong region selected, full/closed guild settings, or user-cancelled runs).
Provider vs Store Distinction: Approved FFGlory refunds are normally issued by FFGlory as Provider Wallet Credits on your FFGlory account, not automatic cash refunds. Cash or Store Credit refunds from Crazy.Org All in one are evaluated separately by an Admin after verifying the provider outcome.',
  '+880-000-000000',
  'abubakkarsiddiqueofficial@gmail.com',
  'Daily 10:00 – 23:00 UTC',
  '2026-11-18T18:18:00.351Z'
);
