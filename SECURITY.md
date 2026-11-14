# Security Architecture, Incident Response & Operations Runbook

## 1. Security Architecture Overview

PremiKeys is hardened according to **OWASP ASVS 5.0.0** and **OWASP Top 10:2025**:

- **Zero Exposed Client Secrets**: All private credentials (`DATABASE_URL`, `DIRECT_URL`, `RECAPTCHA_SECRET_KEY`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`) are strictly server-only. Startup validation in `src/lib/env.ts` blocks any `NEXT_PUBLIC_*` variable from containing secret keys.
- **Authentication & Session Security**:
  - Passwords hashed with `bcryptjs` (work factor 12 for customers/staff, constant-time dummy hash comparison on unknown identifiers to prevent timing enumeration).
  - Progressive exponential tarpit delays (`applyTarpitDelay`), IP + identifier brute-force lockouts (`src/lib/security.ts`), and CAPTCHA challenges after 2 failed attempts.
  - Cryptographically random 256-bit (`crypto.randomBytes(32)`) server-side session tokens stored in `UserSession` and `AdminSession` with `HttpOnly`, `SameSite=Lax`, and `Secure` (production) flags.
  - Immediate server-side session revocation upon logout, password change, or admin revocation.
- **Granular Role-Based Access Control (RBAC)**:
  - Roles: `SUPER_ADMIN`, `ADMIN` (with granular permission scopes: `orders`, `refunds`, `products`, `categories`, `filters`, `promo-codes`, `payment-methods`, `faq`, `customers`, `staff`, `settings`, `security`), and `Customer`.
  - Enforced server-side via `requireAdmin(permission)` in `src/lib/auth.ts` and edge-checked in `src/proxy.ts`.
  - Anti-privilege escalation checks in `src/app/api/admin/staff` prevent non-`SUPER_ADMIN` staff managers from creating/modifying `SUPER_ADMIN` accounts or granting permissions they do not personally hold.
- **Transactional Checkout & Race Condition Protection**:
  - `src/app/api/orders/create/route.ts` executes inventory deduction (`updateMany` with `stockQuantity >= quantity` and `.count === 0` rollback), promo code usage limits (`maxUses` and `maxUsesPerCustomer`), and duplicate payment receipt replay detection atomically inside `prisma.$transaction`.
- **Database Row-Level Security (RLS)**:
  - `prisma/rls_policies.sql` enables and forces PostgreSQL Row-Level Security (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`) across all 22 tables.

---

## 2. Encryption & Data Protection Coverage

| Data Asset | In Transit | At Rest | Application-Layer Controls |
| :--- | :--- | :--- | :--- |
| Customer & Admin Passwords | TLS 1.2/1.3 (HTTPS + HSTS) | `bcrypt` salted hash | Never logged or returned in API responses |
| Session Tokens & OAuth State | TLS 1.2/1.3 + `HttpOnly` Cookie | 256-bit random hex in PostgreSQL | Revoked on logout/password reset; 7-day / 30-day TTL |
| Store API Keys (`StoreSetting`) | TLS 1.2/1.3 | PostgreSQL AES-256 volume encryption + RLS | Masked (`••••••••XXXX`) in `GET /api/admin/settings` |
| Payment Proof Screenshots | TLS 1.2/1.3 | Private DB blob / non-public `/storage/screenshots` | Served exclusively via authenticated `/api/admin/screenshots/[filename]` or owner-verified `/api/orders/my-screenshot/[filename]` with `Cache-Control: private, no-store` |
| Digital License Keys (`adminCustomerNote`) | TLS 1.2/1.3 | PostgreSQL AES-256 volume encryption + RLS | Stripped from summary endpoints (`/api/admin/stats`); guest orders isolated from unverified account claiming |

---

## 3. Backup, Recovery & Verification Procedure

### Automated & Manual Database Backups
1. **Cloud PostgreSQL Point-in-Time Recovery (PITR)**:
   - Enable automated daily backups and Point-in-Time Recovery (PITR, minimum 7–30 days retention) in your managed PostgreSQL provider dashboard (Supabase / Neon / AWS RDS).
   - Ensure backup storage encryption (AES-256) is enabled and public snapshot sharing is disabled.
2. **On-Demand Encrypted Logical Backup (`pg_dump`)**:
   ```bash
   pg_dump "$DIRECT_URL" --format=custom --no-owner --no-acl --file="backup_$(date +%Y%m%d_%H%M%S).dump"
   ```
3. **Monthly Restore Verification Drill**:
   - Provision an isolated staging PostgreSQL database.
   - Restore the latest `.dump` archive:
     ```bash
     pg_restore --clean --no-owner --no-acl --dbname="$STAGING_DATABASE_URL" backup_latest.dump
     ```
   - Apply `prisma/rls_policies.sql` and run `npm run test:security` against the restored instance to verify schema, data integrity, and RLS enforcement.

---

## 4. Security Incident Response Procedure

### Step 1: Credential Compromise / Leaked Secret Rotation
1. **Google reCAPTCHA Keys**:
   - Rotate the previously committed `6LdWVf8tAAAA...` key pair in [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
   - Set the new `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` in the hosting provider's secret manager or Admin Settings.
2. **Database Credentials (`DATABASE_URL` / `DIRECT_URL`)**:
   - Rotate the PostgreSQL password in the cloud database dashboard, update the hosting environment secret, and redeploy.
3. **Telegram Bot Token / Gemini API Key / Google OAuth Secret**:
   - Revoke via `@BotFather` (Telegram), [Google AI Studio](https://aistudio.google.com/app/apikey), or [Google Cloud Console](https://console.cloud.google.com/apis/credentials), and update in Admin Settings / environment secrets.

### Step 2: Active Session Revocation (Emergency Lockdown)
- **Revoke a Specific Compromised Customer**:
  - In Admin Dashboard → Customers → Select Customer → Click **Revoke All Sessions** (`DELETE /api/admin/customers/[id]/sessions`).
- **Global Emergency Session Invalidation (All Admins & Customers)**:
  ```sql
  TRUNCATE TABLE "AdminSession";
  TRUNCATE TABLE "UserSession";
  ```

### Step 3: Suspicious Order, Payment Proof, or Admin Activity Investigation
1. Review immutable admin audit events in Admin Dashboard → Security (`GET /api/admin/security`) or query `AdminAuditLog`:
   ```sql
   SELECT a.username, l.action, l.details, l."ipAddress", l."createdAt"
   FROM "AdminAuditLog" l
   JOIN "Admin" a ON a.id = l."adminId"
   ORDER BY l."createdAt" DESC
   LIMIT 100;
   ```
2. Inspect `OrderStatusHistory` and `RefundStatusHistory` for unauthorized status transitions.
3. If an admin account is suspected of compromise, immediately set `isActive = false` and `mustChangePassword = true` on the `Admin` record and delete its `AdminSession` rows.

