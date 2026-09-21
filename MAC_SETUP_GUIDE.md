# IND Manager — macOS Setup & Agent Handoff Guide

> **Target Audience**: Developers setting up this repository on a MacBook (Apple Silicon M1/M2/M3/M4 or Intel) and AI Agents continuing feature development, debugging, or deployment from macOS.

---

## 1. Executive Project Overview

**IND Manager** is a modern, enterprise-grade Manufacturing Business Management Suite tailored for Indian MSMEs/SMEs. It streamlines production floor tracking, inventory stock deductions, multi-currency / GST billing, purchasing orders, client CRM, machine health monitoring, team shifts, and automated multi-channel notifications (WhatsApp, SMS, Email, Telegram).

### Key Highlights & Differentiators
- **Multi-Language (i18n)**: English (`en`), Hindi (`hi`), Gujarati (`gu`), and Marathi (`mr`).
- **Tally Prime Bridge**: Embedded Electron companion app (`tools/tally-bridge`) syncing ledgers and vouchers with local Tally ERP installations.
- **AI Business Assistant**: Integrated Google Gemini 2.0 / 3.x conversational assistant (`/dashboard/assistant`) for inventory queries and analytics.
- **Indian Financial Localization**: Indian numbering system (`₹1.18Cr`, `₹11.79L`), GST proforma/tax invoices, and DLT SMS compliance.
- **Mobile-First Responsive PWA**: Native-like bottom sheets, touch interactions, full-bleed mobile views, and Capacitor Android wrapper.

---

## 2. Monorepo Architecture & Tech Stack

The repository is organized as a Turborepo monorepo with npm workspaces:

```
manufacturing-business-management-suite/
├── apps/
│   ├── web/               # Primary Next.js 15 (App Router, Turbopack, React 19)
│   ├── api/               # NestJS v11 microservice API
│   └── auth-server/       # Express session + CSRF + Redis auth server
├── packages/
│   ├── database/          # Shared database client & schemas
│   ├── ui/                # Shared UI primitives & components
│   └── tsconfig/          # Shared TypeScript configurations
├── tools/
│   └── tally-bridge/      # Desktop Electron + TS Bridge for Tally Prime ERP
├── android/               # Native Android wrapper project (Capacitor)
├── .agents/
│   └── AGENTS.md          # Mandatory agent layout rules, fix log (Fix 1 - Fix 26)
├── docker-compose.yml     # Local services (TimescaleDB / Postgres & Redis)
└── package.json           # Root workspace config (npm@10.2+)
```

### Core Technologies
- **Frontend / Fullstack**: Next.js 15.1 (`apps/web`), React 19, TypeScript 5.7, Tailwind CSS, Lucide React, Framer Motion, Radix UI.
- **Authentication**: NextAuth / Auth.js v5 (`@auth/mongodb-adapter`, `better-auth`), Google OAuth 2.0, Microsoft Azure AD.
- **Databases**:
  - **MongoDB**: Primary application database (orders, clients, inventory, production, users, notifications).
  - **Redis**: Session caching, rate limiting, and background workers.
  - **PostgreSQL / TimescaleDB** (Optional): Available via Docker for time-series machine telemetry.
- **Notifications**: Twilio (WhatsApp & SMS), MSG91 (India SMS/OTP), Resend & Nodemailer SMTP (Email), Telegram Bot.
- **Payments**: Stripe & Razorpay (India UPI / Cards / NetBanking).

---

## 3. macOS Zero-to-One Setup (Step-by-Step)

Follow these exact steps in Terminal on your Mac.

### Step 3.1: Install macOS Command Line Tools & Homebrew

```bash
# Install Apple Command Line Developer Tools (if not already installed)
xcode-select --install

# Install Homebrew package manager
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to your PATH (Apple Silicon /opt/homebrew)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Step 3.2: Install Node.js & Essential CLI Tools

We recommend Node.js v20 LTS or v22 (LTS):

```bash
# Option A: Via Homebrew directly
brew install node@22 git gh

# Option B: Via NVM (Recommended for managing multiple Node versions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 22
nvm use 22
nvm alias default 22

# Verify installation
node -v   # Expected: v20.x or v22.x
npm -v    # Expected: 10.x or 11.x
```

### Step 3.3: Configure Git Line Endings on macOS

Because this codebase was developed across Windows and macOS, configure Git to handle line endings cleanly:

```bash
git config --global core.autocrlf input
```

### Step 3.4: Setup Databases on macOS

You can run MongoDB and Redis locally via Homebrew or Docker, or connect to cloud instances (MongoDB Atlas & Upstash).

#### Option A: Native Homebrew Services (Recommended for fast local dev)
```bash
# 1. Install & start MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# 2. Install & start Redis
brew install redis
brew services start redis

# Verify MongoDB and Redis are running
mongosh --eval "db.version()"
redis-cli ping   # Should return "PONG"
```

#### Option B: Docker Desktop or OrbStack
If you prefer containers:
```bash
# Start Postgres & Redis from the root docker-compose
docker compose up -d

# Run local MongoDB in Docker
docker run -d --name ind-mongo -p 27017:27017 -v ind_mongo_data:/data/db mongo:7.0
```

#### Option C: Cloud Instances (Atlas + Cloud Redis)
Simply configure `MONGODB_URI` in `.env.local` to point to your MongoDB Atlas cluster.

---

## 4. Repository Installation & Dependencies

```bash
# 1. Clone your repository
git clone https://github.com/Holaabhie/manufacturing-business-management-suite.git
cd manufacturing-business-management-suite

# 2. Install root and workspace dependencies
npm install

# 3. (Optional) Install Tally Bridge dependencies if developing desktop bridge
cd tools/tally-bridge && npm install && cd ../..
```

---

## 5. Comprehensive Environment Parameters Guide

All web application environment variables live in `apps/web/.env.local`.  
A complete template is available at `apps/web/.env.example`.

### Fast Setup
```bash
cp apps/web/.env.example apps/web/.env.local
```

### Parameter Reference Matrix

| Parameter | Required / Dev Default | Purpose & Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | **Required** (`mongodb://localhost:27017/ind_manager`) | MongoDB connection string (Local or MongoDB Atlas). |
| `MONGODB_DB` | `ind_manager` | Database name. |
| `NEXTAUTH_SECRET` | **Required** (32-byte string) | Encryption secret for NextAuth JWT session tokens. Generate with `openssl rand -base64 32`. |
| `AUTH_SECRET` | **Required** | Same as `NEXTAUTH_SECRET` (Auth.js v5 compatibility). |
| `NEXTAUTH_URL` | `http://localhost:3000` | Base URL for auth callbacks. |
| `AUTH_TRUST_HOST` | `true` | Required for NextAuth v5 in local development and containerized hosts. |
| `DEV_MODE` | `true` (for local dev) | **Critical**: When `true`, bypasses all feature gates and subscription tier paywalls. |
| `NEXT_PUBLIC_DEV_MODE` | `true` | Exposes dev mode bypass flag to client-side components. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID for SSO. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional | Client-side Google SSO ID. |
| `AZURE_AD_*` | Optional | Microsoft Entra ID integration parameters. |
| `GEMINI_API_KEY` | Recommended | Google Gemini AI key from [Google AI Studio](https://aistudio.google.com/apikey) for `/dashboard/assistant`. |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Gemini model variant used for the assistant. |
| `AI_WEBHOOK_URL` | Optional | External webhook (n8n / Make / custom) for assistant workflows. |
| `STRIPE_SECRET_KEY` | Optional (`sk_test_...`) | Stripe secret key for subscriptions and international billing. |
| `STRIPE_PRO_PRICE_ID` | Optional (`price_...`) | Stripe recurring product price ID. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional (`pk_test_...`) | Stripe public key. |
| `RAZORPAY_KEY_ID` | Optional (`rzp_test_...`) | Razorpay Key ID for Indian UPI, cards, and netbanking payments. |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay Key Secret. |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio Account SID. If left empty, system uses built-in `MockAdapter` safely. |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio Auth Token. |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio WhatsApp/SMS sender number in E.164 format (e.g. `+14155238886`). |
| `MSG91_API_KEY` | Optional | MSG91 Indian SMS / OTP API Key. |
| `RESEND_API_KEY` | Optional | Resend transactional email API key. |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `587` | Nodemailer SMTP host & port for direct email dispatch. |
| `SMTP_USER` / `SMTP_PASS` | Optional | Email address & Gmail App Password for SMTP dispatch. |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram Bot token from `@BotFather` for dispatch alerts. |
| `TELEGRAM_CHAT_ID` | Optional | Target Telegram chat ID. |
| `PLATFORM_ADMIN_EMAILS` | Optional (`admin@indmanager.com`) | Comma-separated list of super-admin emails granted tenant override privileges. |

---

## 6. Running the Application on macOS

### Primary Development Server (`apps/web`)

From repository root:
```bash
npm run dev
```
Or directly inside `apps/web`:
```bash
cd apps/web
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Auxiliary Services

- **Tally Desktop Bridge** (Electron app):
  ```bash
  cd tools/tally-bridge
  npm run dev
  ```
- **NestJS API Service**:
  ```bash
  cd apps/api
  npm run start:dev
  ```
- **Auth Express Server**:
  ```bash
  cd apps/auth-server
  npm run dev
  ```

---

## 7. Crucial Architectural Rules for AI Agents & Developers

When creating or modifying components, you **must adhere to the architectural rules documented in `.agents/AGENTS.md`**:

### Rule 1: Portal Overlay Enforcement (Anti-Trapping)
Any modal, sheet, or overlay rendered inside `PageTransition` (or any `motion.div` / transform-bearing ancestor) **MUST** use `createPortal(..., document.body)` or Radix UI's `DialogPrimitive.Portal`.
> **Why**: CSS `position: fixed` is trapped by ancestors with `transform`, `filter`, or `will-change`. Radix dialogs handle this via portals, but custom sheet overlays must explicitly portal to `document.body`.

### Rule 2: Full-Screen Mobile Sheet Pattern
For all forms, details, and complex sheets on mobile:
- `w-full h-[100dvh] max-h-[100dvh]` — no pixel offsets or `calc()` gaps.
- `z-[100]` to sit cleanly above bottom navigation (`z-50`).
- `rounded-none sm:rounded-[20px]` (full-screen page on mobile, rounded card on desktop).
- Translate-only transitions (`translate-y-full` → `translate-y-0`). **Never use `scale` transforms on mobile** to prevent sub-pixel border gaps.
- Use `fullScreenMobile` prop on `DialogContent` for Radix dialogs.
- Always apply body scroll lock on open.

### Rule 3: Layout Overflow Containment
- Page roots in `/dashboard` **must** include `w-full min-w-0 overflow-x-clip` (or `overflow-x-hidden`).
- All grid items inside CSS grid containers (like `.kpi-grid`) must have `min-w-0 w-full overflow-hidden` on their parent wrapper elements.
- Dynamic table columns must use `table-fixed` with explicit widths (`w-[Npx]`) and `min-w-0 truncate` on cell contents.

### Rule 4: Theme Variable Consistency
Dialog headers, borders, and text colors **must** use theme CSS variables:
```css
/* CORRECT */
color: var(--foreground);
background: var(--card);
border-color: var(--border);

/* INCORRECT */
color: #f1f5f9; /* Hardcoded dark-mode breaks in light mode */
```

### Rule 5: Indian Currency Formatting
For KPI cards and high-value financial summaries, use `formatIndianCurrencyCompact` from `@/lib/formatters`:
- `>= 1,00,00,000` (1 Crore) → `₹X.XXCr` (e.g. `₹1.18Cr`)
- `>= 1,00,000` (1 Lakh) → `₹X.XXL` (e.g. `₹11.79L`)
- Tooltip (`title`) displays full unabbreviated amount (e.g. `₹11,78,650`).

### Rule 6: Notification Read State Persistence
In-app notification read state is persisted to MongoDB via `GET /api/notifications/read` and `POST /api/notifications/read` with FIFO eviction (1000 IDs cap), and cached in `localStorage`. Do not remove the server sync from `use-app-notifications.ts`.

---

## 8. Common macOS Gotchas & Troubleshooting

### Port 3000 Already in Use
On macOS, AirPlay Receiver or a background Node process might bind port 5000 or 7000, and sometimes a previous Next.js process stays open on 3000:
```bash
# Find what's listening on port 3000
lsof -i :3000

# Kill the process
kill -9 $(lsof -t -i:3000)
```

### MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
Check if MongoDB Homebrew service is active:
```bash
brew services list
brew services restart mongodb-community@7.0
```
If using IPv6 / `localhost` resolution issues on macOS, change `MONGODB_URI` from `localhost` to `127.0.0.1`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/ind_manager
```

### File Permissions or Turbopack Lock
If Next.js gives a cache error when switching branches:
```bash
rm -rf apps/web/.next
npm run dev
```

---

## 9. Next Steps for the Mac Agent

1. **Verify Setup**: Run `npm install` and `npm run dev` in `apps/web`.
2. **Review Ongoing Work**:
   - Check `.agents/AGENTS.md` for recent fixes (Fix 1 through Fix 26).
   - Check `tools/tally-bridge` for Tally integration status.
   - Run existing tests or check route handlers under `apps/web/src/app/api/`.
3. **Continue Development**: The codebase is clean, configured for Turbopack, and ready for development.
