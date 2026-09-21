# IND Manager — Manufacturing Business Management Suite

IND Manager is a cloud-native, responsive Manufacturing Operating System and Business Management Suite engineered for Indian MSMEs and growing industrial enterprises.

---

## 🚀 Quick Links & Documentation

- **🍎 macOS Setup & Developer Handover Guide**: [`MAC_SETUP_GUIDE.md`](./MAC_SETUP_GUIDE.md) — *Complete zero-to-one setup for MacBook and AI agents.*
- **🏛 Architecture & Domain Specification**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **🔐 Authentication Setup**: [`AUTHENTICATION_SETUP.md`](./AUTHENTICATION_SETUP.md)
- **🤖 Agent Guidelines & Bug Fix Log**: [`.agents/AGENTS.md`](./.agents/AGENTS.md) — *Layout rules, Fix 1 through Fix 26.*

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15.1 (App Router, Turbopack, React 19), Tailwind CSS, Framer Motion, Radix UI, Lucide Icons.
- **Backend**: Next.js API Routes + NestJS (`apps/api`) + Express Auth Server (`apps/auth-server`).
- **Database & Cache**: MongoDB (Core DB), Redis (Session / Cache / Queue), TimescaleDB (Optional telemetry).
- **ERP Integration**: Tally Prime Desktop Bridge (`tools/tally-bridge`) via Electron.
- **AI Engine**: Google Gemini 2.0 / 3.x conversational assistant.
- **Mobile**: Responsive PWA + Capacitor Android wrapper (`android/`).

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js >= 20.x LTS (v22 recommended)
- MongoDB (local or MongoDB Atlas)
- Redis (local or cloud)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp apps/web/.env.example apps/web/.env.local
```
*(Fill in `MONGODB_URI`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, and optional third-party credentials. Refer to [`MAC_SETUP_GUIDE.md`](./MAC_SETUP_GUIDE.md) for full details).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

