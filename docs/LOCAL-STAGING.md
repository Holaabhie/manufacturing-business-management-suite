# Local Staging & Pre-Release Testing Guide

This guide details how to set up, seed, run, and test the **IND-Manager** manufacturing operating system on a local staging environment, including real mobile phone testing over local Wi-Fi/LAN and remote HTTPS tunneling.

---

## 1. Staging Database Setup (Local MongoDB or Atlas Free Tier)

You can run staging with either a local MongoDB Community daemon or MongoDB Atlas Free (M0) cluster.

### A. Safety Naming Rules (Mandatory)
The seed script and application guards strictly enforce database name suffixes to prevent accidental mutations of production data.
- **Allowed DB Suffixes**: `-staging`, `_staging`, `-dev`, `_dev`, `-local`, `_local`
- **Example Valid Staging Names**:
  - `ind-manager-staging`
  - `mfg_staging`
  - `acme_dev`
- **Forbidden Names**: Any database containing `prod`, `production`, `live`, or lacking an approved suffix will be refused immediately by the seed runner.

### B. MongoDB Options
1. **Local MongoDB**:
   - Start local daemon: `mongod --dbpath C:\data\db`
   - Connection URI: `mongodb://localhost:27017/ind-manager-staging`
2. **MongoDB Atlas (Free M0 Sandbox)**:
   - Create a free cluster on `mongodb.com/atlas`.
   - Add database user: `staging_user` / strong password.
   - Whitelist your current IP address (or `0.0.0.0/0` for development).
   - Connection URI: `mongodb+srv://staging_user:<password>@cluster0.abcde.mongodb.net/ind-manager-staging?retryWrites=true&w=majority`

---

## 2. Environment Configuration

1. Copy the example configuration template:
   ```bash
   cp apps/web/.env.staging.example apps/web/.env.staging.local
   ```
2. Populate `apps/web/.env.staging.local` with your database credentials:
   ```env
   NODE_ENV=staging
   ALLOW_SEED=1
   MONGODB_URI=mongodb://localhost:27017/ind-manager-staging
   NEXTAUTH_SECRET=your-32-byte-staging-secret
   NEXTAUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
3. **Safety Verification**: Verify that `.env.staging.local` is never tracked by git:
   ```bash
   git status -s apps/web/.env.staging.local
   # Must return EMPTY output (ignored)
   ```

---

## 3. Database Seeding Order & Verification

Seeding must always run in the following sequence:

### Step 1: Dry-Run Inspection (Default)
Verify database target name, safety guards, and projected record counts without mutating data:
```bash
# Run staging seed in dry-run mode
npm run staging:seed
```
Expected output:
```
=================================================================
 STAGING DATA SEED — MODE: DRY-RUN (Simulated)
 Target Environment: [staging]
=================================================================
Verified Target Database: [ind-manager-staging] (Approved staging suffix verified)
✓ DRY-RUN complete: No database mutations were performed.
```

### Step 2: Apply Database Indexes First
Before inserting documents, establish all Phase 3b/4 compound uniqueness and TTL indexes:
```bash
node --experimental-strip-types apps/web/src/scripts/create-phase4-indexes.ts --apply
```

### Step 3: Live Staging Seeding
```bash
# Set ALLOW_SEED=1 and run live execution
set ALLOW_SEED=1
node --experimental-strip-types apps/web/src/scripts/seed-staging-data.ts
```

Seeded Staging Test Credentials:
| Tenant | Role | Email | Password |
|--------|------|-------|----------|
| **Tenant A (Acme Pvt Ltd - Pro Plan)** | Owner | `owner@acme-staging.com` | `StagingPass@2026!` |
| Tenant A | Admin | `admin@acme-staging.com` | `StagingPass@2026!` |
| Tenant A | Manager | `manager@acme-staging.com` | `StagingPass@2026!` |
| Tenant A | Accountant | `accountant@acme-staging.com` | `StagingPass@2026!` |
| Tenant A | Staff | `staff@acme-staging.com` | `StagingPass@2026!` |
| **Tenant B (Zenith Ltd - Starter Plan)** | Owner | `owner@zenith-staging.com` | `StagingPass@2026!` |
| Tenant B | Manager | `manager@zenith-staging.com` | `StagingPass@2026!` |
| Tenant B | Staff | `staff@zenith-staging.com` | `StagingPass@2026!` |

---

## 4. Building & Running Local Production Server

To test exact production performance, bundle sizes, and route handlers locally:
```bash
# 1. Build the Next.js standalone application
npm run build -w apps/web

# 2. Start the local server binding to all network interfaces (LAN accessible)
npm run staging:start
# (Runs: next start -H 0.0.0.0 -p 3000)
```

---

## 5. Mobile Testing Over Local Wi-Fi / LAN

To test the responsive UI, mobile sheets, swipe actions, and camera capture directly from an Android/iOS smartphone:

### Step 1: Find Local IP Address
In Windows PowerShell:
```powershell
ipconfig
# Note your IPv4 Address (e.g., 192.168.1.105)
```

### Step 2: Configure Windows Defender Firewall (One-Time)
Allow incoming TCP traffic on port 3000 for your local private network:
```powershell
# Run in Administrator PowerShell
netsh advfirewall firewall add rule name="IND-Manager Staging Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=private
```

### Step 3: Update `NEXTAUTH_URL` for LAN
In `apps/web/.env.staging.local`:
```env
NEXTAUTH_URL=http://192.168.1.105:3000
NEXT_PUBLIC_APP_URL=http://192.168.1.105:3000
```

### Step 4: Access From Phone
1. Connect smartphone to the same Wi-Fi router.
2. Open Chrome/Safari on phone: `http://192.168.1.105:3000`
3. Log in with `owner@acme-staging.com` / `StagingPass@2026!`.

---

## 6. HTTPS & Camera / PWA Access Options

Certain browser capabilities require secure contexts (HTTPS), though **standard camera capture works on plain HTTP**:

### A. Camera Capture via File Input (`<input type="file" capture>`)
> [!NOTE]
> **No HTTPS required for bill photo capture!**
> Standard HTML file inputs with `accept="image/*"` and `capture="environment"` (e.g. `<input type="file" accept="image/*" capture="environment" />`) invoke the native camera app directly on both Android (Chrome) and iOS (Safari) **over plain HTTP**. WebRTC / `getUserMedia()` requires HTTPS, but standard upload/photo capture does not.

### B. HTTPS Tunneling Options (For PWA & Service Worker Testing)
If you need to test Service Worker registration, offline caching, or Web Push:
1. **Option 1: Cloudflare Tunnel (`cloudflared`) [Recommended]**:
   ```bash
   # Install cloudflared via winget or brew
   winget install Cloudflare.cloudflared

   # Launch free, instant HTTPS tunnel to local port 3000
   cloudflared tunnel --url http://localhost:3000
   ```
   Copy the generated `https://<random-id>.trycloudflare.com` URL and test on mobile.
2. **Option 2: Next.js Experimental HTTPS**:
   ```bash
   # In development mode with local self-signed certificates
   npx next dev --experimental-https -H 0.0.0.0
   ```

---

## 7. Cloud Staging on Vercel [POST GO-LIVE / GO-LIVE KE BAAD]

> [!IMPORTANT]
> **POST GO-LIVE ONLY**: Do NOT connect cloud staging until repository migration to the private repo is complete and local verification passes.

When ready to establish Vercel preview/staging:
1. Create a dedicated Vercel Project `ind-manager-staging`.
2. Connect to the private repository `chore/stabilize` or `staging` branch.
3. Configure Vercel environment variables:
   - `MONGODB_URI`: Dedicated Atlas Staging cluster connection string.
   - `NEXTAUTH_SECRET`: Staging secret.
   - `NEXTAUTH_URL`: `https://staging.yourdomain.com`
   - `GEMINI_API_KEY`: Staging AI key with billing quotas enabled.
4. Enable Vercel Password Protection or SSO to prevent public indexing of pre-release staging.
