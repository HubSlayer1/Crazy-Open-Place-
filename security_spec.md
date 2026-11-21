# Firestore Security Specification (No-Login PIN-Hash Capability Architecture)

## 1. Data Invariants
1. **Admin Authority**: Only `abubakkarsiddiqueofficial@gmail.com` (`email_verified == true`) or UIDs explicitly listed in `/admins/{uid}` satisfy `isAdmin()`. Customer accounts do NOT use Google Sign-In, email/password, or Firebase Anonymous Auth.
2. **Guest Order Creation & Pricing Integrity**: Anyone may create a customer order at `/orders/{orderId}` (`customerId == 'guest'` or admin) referencing an enabled/existing package (`/guildPackages/{packageId}`), pinned strictly to `providerUrl == 'https://www.ffglory.pro/'`, starting in `AWAITING_PROVIDER_PAYMENT`, with server-validated `createdAt == request.time`, `updatedAt == request.time`, valid 64-char hex `trackingHash = sha256(orderReference + ":" + normalizedPin)`, and optional `whatsapp` (`0..32` chars).
3. **Unforgeable No-Login PIN Capability Proof**:
   - Raw Private Tracking PINs are NEVER stored in Firestore.
   - `/orders/{orderId}`, `/orders/{orderId}/timeline/{eventId}`, `/refunds/{refundId}`, `/supportTickets/{ticketId}`, and `/providerTxLocks/{txKey}` enforce `allow get, list: if isAdmin();` so PII and `trackingHash` cannot be read or scraped by unauthenticated clients.
   - Cross-device customer access uses `/orderPinViews/{lookupHash}` (`allow get: if isValidTrackingHash(lookupHash); allow list: if false;`) and subcollections `/timeline`, `/refunds`, `/tickets` (`allow list: if isValidTrackingHash(lookupHash) && existing().trackingHash == lookupHash;` — zero `get()` in `list` rules).
   - Every customer mutation (`submitOrderPayment`, `submitOrderActivation`, `cancelCustomerOrder`, `refund`, `supportTicket`) must atomically create a single-use proof doc at `/orderPinViews/$(existing().trackingHash)/proofs/$(proofId)` in the same `writeBatch`, verified via `existsAfter(...)`. Knowing only `orderId` (`SER-...`) without the secret 64-char `trackingHash` fails with `PERMISSION_DENIED`.
4. **No Fake Payment / Admin Shortcut**: Customers can NEVER set `status` to `PAYMENT_CONFIRMED`, `ACTIVATION_VERIFIED`, `PROCESSING`, `COMPLETED`, or `REFUNDED`, and can NEVER write `paymentVerifiedAt`, `paymentVerifiedBy`, `activationVerifiedAt`, or `activationVerifiedBy`.
5. **Duplicate Transaction Lock**: Submitting a `providerTransactionId` atomically creates `/providerTxLocks/{txKey}` (`!exists`). Reusing an existing Transaction ID fails atomically.
6. **Official Provider Domain Lock**: `/guildSettings/main` (private to `isAdmin()`) and `/publicStorefront/checkout` (customer-safe `get` only, `list: false`) strictly reject any provider URL outside `https://www.ffglory.pro/` or `https://ffglory.pro/`.

## 2. Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Direct Order Scraping**: Unauthenticated client calls `get /orders/{orderId}` or `list /orders` -> **DENIED** (`isAdmin()` only).
2. **Customer ID Only Update Attack**: Attacker knows `orderId` (`SER-...`) without the Private Tracking PIN and calls `update /orders/{orderId}` -> **DENIED** (missing secret `trackingHash` proof path).
3. **PIN Projection Enumeration**: Attacker calls `list /orderPinViews` -> **DENIED** (`allow list: if false`).
4. **Privilege Escalation**: Non-admin attempts `create /admins/{uid}` or `create /users/{uid}` with extra fields -> **DENIED**.
5. **Fake Payment Confirmation Shortcut**: Client attempts `update /orders/{orderId}` or `/orderPinViews/{hash}` with `status: "PAYMENT_CONFIRMED"` or `"COMPLETED"` -> **DENIED**.
6. **Immutable Field Tampering**: Client updates `totalAmount`, `packageId`, `guildId`, `trackingHash`, or `createdAt` on an existing order -> **DENIED**.
7. **Terminal State Mutation**: Client attempts to update an order after `status == "COMPLETED"`, `"CANCELLED"`, or `"REFUNDED"` -> **DENIED**.
8. **Duplicate Provider Transaction Replay**: Client attempts `create /providerTxLocks/{existingTxKey}` already claimed -> **DENIED**.
9. **Path ID Poisoning**: Client uses invalid path characters or >128 char IDs -> **DENIED**.
10. **Forbidden Provider Domain Hijack**: Write attempts `providerUrl = "https://evil.example/"` -> **DENIED**.
11. **Timestamp Forgery**: Order creation or customer mutation uses backdated `updatedAt` instead of `request.time` -> **DENIED**.
12. **Redeem Code Vault Access**: Non-admin reads or lists `/redeemCodes` -> **DENIED**.
