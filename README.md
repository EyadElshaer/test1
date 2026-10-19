# PremiKeys — Full-Stack E-Commerce Platform for Digital Products & Game Keys

PremiKeys is a production-ready, full-stack digital products e-commerce platform built specifically for software licenses, Windows/Office activation keys, and PC game activations. It features persistent relational data models, dynamic category and attribute filtering, manual payment verification workflows (InstaPay, Vodafone Cash, Bank Transfer, Crypto), private payment screenshot storage, customer order lookup with phone OTP verification, customer refund request management, and a comprehensive administrative portal.

---

## 🚀 Key Highlights & Architectural Features

1. **Persistent Relational Database (Prisma ORM)**
   - Normalized relational schema supporting SQLite locally (`prisma/dev.db`) and PostgreSQL / Supabase in production.
   - 17 models covering Products, Categories, Dynamic Filters, Orders, Order Items, Status History, Payment Methods, Promo Codes, Refund Requests, Audit Logs, and Store Settings.
   - Zero hardcoded product arrays or mock browser storage as source of truth.

2. **Server-Side Financial Integrity**
   - Client-submitted totals are strictly discarded: `/api/orders/create` pulls real prices directly from the database and recalculates subtotal, percentage/fixed discounts, promo code eligibility, and final total.
   - Multi-tier promo code validation engine with date ranges, maximum usages, minimum subtotal requirements, and per-item minimum price rules (`minProductPrice`).

3. **Manual Payment Verification System**
   - Supports Egypt-focused and international manual payment channels: InstaPay, Vodafone Cash, Bank Wire, and Cryptocurrency.
   - Uploaded payment receipt screenshots are saved to a secure private folder (`storage/screenshots/`) outside the `public/` web root.
   - Protected streaming endpoints (`/api/admin/screenshots/[filename]` and `/api/orders/my-screenshot/[filename]`) require session verification.

4. **Customer Self-Service & Privacy-Preserving Lookup**
   - Order tracking (`/my-orders`) via unique unpredictable `#DN...` order numbers.
   - Phone-based OTP verification: customers can enter their mobile number, receive an OTP verification code, and access their complete order history without mandatory account creation.
   - Customer phone numbers are masked in public lookups (e.g. `+201 0987 *** 32`).

5. **Refund Request Workflow**
   - Customer can request refunds directly from their order page.
   - Unique `#RF...` refund tracking reference generated for each case.
   - Multi-stage status progression: `PENDING` ➔ `APPROVED` ➔ `DONE` or `REJECTED`.
   - Built-in duplicate prevention rejects multiple active refund submissions for the same order.

6. **Comprehensive Admin Portal (`/admin`)**
   - Server-side HttpOnly cookie session management and bcrypt password hashing.
   - One-time initial setup credentials with mandatory password change on first login.
   - Revenue analytics distinguishing submitted order volume from confirmed/approved revenue.
   - Complete CRUD management for Products, Categories, Dynamic Filters, Orders, Refunds, Payment Methods, Promo Codes, FAQ items, and Global Store Settings.
   - Comprehensive audit logging recording every administrative action with IP and user-agent metadata.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript)
- **Styling**: Tailwind CSS v4, Lucide React icons, Custom PremiKeys Dark Theme
- **Database & ORM**: Prisma ORM, SQLite (local) / PostgreSQL ready
- **Authentication & Security**: Bcrypt.js, HttpOnly Secure Cookies, In-memory Token-Bucket Rate Limiter
- **Testing**: Native TypeScript end-to-end integration test suite (`test/e2e-workflow.ts`)

---

## 📁 Project Structure

```text
├── prisma/
│   ├── schema.prisma              # 17 Relational Data Models
│   ├── seed.ts                    # Realistic Store Data & Admin Seeding Script
│   └── dev.db                     # SQLite Local Database
├── public/
│   ├── images/
│   │   └── premikeys-logo.png     # Official PremiKeys High-Res Logo
│   └── logo.png                   # Root branding asset
├── src/
│   ├── app/
│   │   ├── (public pages)
│   │   │   ├── page.tsx           # Storefront Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx       # Catalog with Dynamic Filters & Sorting
│   │   │   │   └── [slug]/page.tsx# Product Details with instant key delivery specs
│   │   │   ├── cart/page.tsx      # Shopping Cart Page
│   │   │   ├── checkout/page.tsx  # Multi-step Checkout & Screenshot Upload
│   │   │   ├── order-confirmation/[orderNumber]/page.tsx
│   │   │   ├── my-orders/page.tsx # Order Lookup, Phone OTP, & Refund Request
│   │   │   ├── faq/page.tsx       # FAQ & Support Center
│   │   │   ├── privacy-policy/
│   │   │   ├── terms-of-service/
│   │   │   └── refund-policy/
│   │   ├── admin/
│   │   │   ├── page.tsx           # Admin Login Screen
│   │   │   ├── layout.tsx         # Sidebar & Mandatory Password Change Modal
│   │   │   ├── dashboard/page.tsx # Financial KPI Counters & Recent Activity
│   │   │   ├── orders/page.tsx    # Order Verification & License Key Dispatch
│   │   │   ├── refunds/page.tsx   # Refund Review & Processing
│   │   │   ├── products/page.tsx  # Product Catalog Management
│   │   │   ├── categories/page.tsx# Category Management
│   │   │   ├── filters/page.tsx   # Dynamic Attribute Group/Option Management
│   │   │   ├── payment-methods/   # Manual Gateway Config (InstaPay, Vodafone Cash, etc.)
│   │   │   ├── promo-codes/page.tsx# Discount & Coupon Code Management
│   │   │   ├── faq/page.tsx       # FAQ Item Management
│   │   │   └── settings/page.tsx  # Store Settings, Currency, Social Links, Maintenance
│   │   └── api/
│   │       ├── products/          # Catalog & Detail APIs
│   │       ├── categories/        # Category Listing API
│   │       ├── filters/           # Dynamic Filter Groups API
│   │       ├── promo/validate/    # Server-Side Promo Validation API
│   │       ├── checkout/upload-screenshot/ # Private Screenshot Upload API
│   │       ├── orders/create/     # Transactional Order Creation API
│   │       ├── orders/lookup/     # Masked Customer Lookup API
│   │       ├── orders/phone-verify/# Phone OTP Verification API
│   │       ├── refunds/request/   # Customer Refund Request Submission API
│   │       └── admin/             # 14 Protected Admin REST Endpoints
│   ├── components/
│   │   ├── Header.tsx             # Navbar with Official Logo, Live Search, & Cart Drawer
│   │   └── Footer.tsx             # Storefront Footer with Policies & Social Links
│   ├── context/
│   │   └── CartContext.tsx        # Persistent Client Cart & Validation Hooks
│   └── lib/
│       ├── prisma.ts              # Global Prisma Client Singleton
│       ├── auth.ts                # Session Cookie Auth & Audit Log Helpers
│       ├── orderNumber.ts         # Cryptographic #DN... and #RF... Generators
│       ├── rateLimit.ts           # Token Bucket Rate Limiter
│       └── countryCodes.ts        # E.164 Phone Normalization & Country Codes
├── storage/
│   └── screenshots/               # Private Payment Screenshot Directory (outside public/)
├── test/
│   └── e2e-workflow.ts            # Automated End-to-End Verification Test Script
└── INITIAL_ADMIN_SETUP.json       # Generated Initial Admin Credentials
```

---

## ⚡ Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL="file:./dev.db"
ADMIN_SESSION_SECRET="premikeys-super-secret-session-key-change-in-production-2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Initialize & Seed Database
```bash
# Push Prisma schema to SQLite
npx prisma db push

# Seed initial categories, products, filters, payment methods, promos, and admin account
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Administrator Access

Initial administrative credentials are automatically generated upon database seed and stored in `INITIAL_ADMIN_SETUP.json`:

- **Admin Login URL**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Username**: `admin`
- **Initial Password**: `PK-5B56C1E8009D!`
- **Enforced Security**: Upon first login, the admin is required to set a new secure password.

---

## 💳 Payment Methods Configuration

The platform comes pre-configured with 4 active manual payment channels (editable in `/admin/payment-methods`):

1. **InstaPay (Egypt)**:
   - Recipient Handle: `premikeys@instapay`
   - Account Name: PremiKeys Digital Services
2. **Vodafone Cash (Egypt)**:
   - Wallet Number: `01029384756`
   - Instructions: Transfer exact order total and upload screenshot showing transaction ID.
3. **Bank Wire Transfer (National Bank of Egypt)**:
   - IBAN: `EG380002000100000001234567890`
   - Account Name: PremiKeys Digital Solutions LLC
4. **Cryptocurrency (USDT / TRC20)**:
   - Network: TRON (TRC-20)
   - Wallet Address: `TJ3kP9Q4d8E7L1M2N5V6X8Y0Z9A8B7C6D5`

---

## 🧪 Automated Testing

A comprehensive end-to-end test suite validates all critical storefront and admin workflows:
```bash
npx tsx test/e2e-workflow.ts
```

**Test Coverage Highlights (25/25 Tests Passing)**:
- [x] Storefront homepage & public settings
- [x] Catalog product retrieval & automatic discount percentage calculation
- [x] Dynamic attribute filter groups
- [x] Promo code percentage calculation & minimum subtotal requirement enforcement
- [x] Item-level `minProductPrice` promo rule enforcement
- [x] Unpredictable `#DN...` order number format generation
- [x] Server-side price recalculation & client price tampering rejection
- [x] Masked customer order lookup & OTP phone verification
- [x] Duplicate refund submission prevention
- [x] Protected admin route authentication & brute-force rejection
- [x] Admin order status transition, manual payment approval, and digital license key dispatch

---

## 🚢 Production Deployment Instructions

1. **Database Migration to PostgreSQL**:
   - Update `prisma/schema.prisma` datasource provider from `"sqlite"` to `"postgresql"`.
   - Set `DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"` in production environment.
   - Run `npx prisma db push` or `npx prisma migrate deploy`.

2. **Private File Storage in Production**:
   - For containerized or serverless hosting (e.g. AWS / Vercel), replace local disk storage in `src/app/api/checkout/upload-screenshot/route.ts` with S3 / Cloudflare R2 / Supabase Storage signed URLs.

3. **Email / SMS Gateway Configuration**:
   - Set up SMTP provider (Resend, SendGrid, or AWS SES) and SMS provider (Twilio or local aggregator) using the environment variable configuration documented in `/admin/settings`.

4. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📄 License & Attribution

Designed and developed for **PremiKeys**. All rights reserved.
