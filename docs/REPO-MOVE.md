# Repository Migration Guide: Moving to Fresh Private Repository

> **CRITICAL NOTICE**: This document contains step-by-step administrative instructions. **DO NOT execute deletion or repository changes automatically.** All steps must be reviewed and executed manually by the repository owner.

---

## 1. Overview & Rationale

- **Current Repository**: Forked / public upstream (`https://github.com/Holaabhie/manufacturing-business-management-suite.git` / upstream fork).
- **Target Repository**: Clean, standalone, private GitHub repository (e.g., `https://github.com/<org-or-username>/ind-manager-private.git`).
- **Goal**:
  - Break upstream public fork dependency.
  - Purge bloated test fixtures (`apps/web/tally-spike-output`) and legacy `.env.local` traces from historical commits before migration.
  - Establish a secure, private perimeter for proprietary manufacturing ERP code and credentials.

---

## 2. Pre-Migration Checklist (Before Doing Anything)

1. [ ] **Verify Working Directory**: Ensure all local changes, branches, and stash items are cleanly committed or pushed to current remote.
   ```bash
   git status
   git branch -a
   ```
2. [ ] **Install Purging Tools (Windows / macOS / Linux)**:
   - Requires Python 3.10+ and `git-filter-repo`:
     ```powershell
     # Windows (PowerShell)
     python --version
     pip install git-filter-repo
     ```
     Verify installation:
     ```powershell
     git filter-repo --version
     ```
3. [ ] **Identify Required Secrets & Variables**: Document all GitHub Actions secrets in the current repository settings (see Section 5 below).
4. [ ] **Notify Collaborators**: Alert team members to pause pushing new commits during the cutover window.

---

## 3. Step-by-Step Migration Process

### Step 1: Create New Private Repository on GitHub
1. Open GitHub: `https://github.com/new`
2. Set **Repository name**: e.g., `ind-manager` or `manufacturing-business-management-suite`
3. Set **Visibility**: **Private**
4. **IMPORTANT**: Do **NOT** check:
   - [ ] Add a README file
   - [ ] Add .gitignore
   - [ ] Choose a license
   *(The new repository must be completely empty!)*

---

### Step 2: Clean History via `git-filter-repo` (Recommended Option A)

To ensure past test artifact XML files (`tally-spike-output` — ~110 files) and legacy `.env.local` commits never enter your new private repository:

1. **Make a fresh temporary clone for filtering**:
   ```bash
   cd C:\Users\HP\OneDrive\Desktop
   git clone --no-local manufacturing-business-management-suite ind-manager-clean
   cd ind-manager-clean
   ```

2. **Purge bloated and sensitive paths across all historical commits**:
   ```bash
   git filter-repo \
     --path apps/web/tally-spike-output \
     --path .env.local \
     --path apps/web/.env.local \
     --path apps/api/.env \
     --invert-paths
   ```

3. **Verify cleanliness using the verification script**:
   ```bash
   bash scripts/repo-clean-check.sh
   ```
   *Expected output: `✅ AUDIT PASSED: Repository history is clean of blocked artifacts.`*

4. **Add your new private repository as remote**:
   ```bash
   git remote add private https://github.com/<your-account>/<new-private-repo>.git
   git push private --all --tags
   ```

---

### Alternative Option B: Fresh Orphan Tree (Start Clean Slate)

If you prefer to start the new private repository with zero past git baggage or commit bloat, preserving only the current production-ready tree as a clean `v1.0.0` root commit:

```bash
# 1. In your project directory:
git checkout --orphan main-fresh

# 2. Add all current production-ready files:
git add .
git commit -m "feat(init): initial clean production release for IND-Manager suite"
git tag -a v1.0.0 -m "Production release v1.0.0"

# 3. Push exclusively to your new private repository:
git remote add private https://github.com/<your-account>/<new-private-repo>.git
git push private main-fresh:main --tags
```

---

### Step 3: Switch Local Origin to New Private Repo

Once pushed to the new private repository:

```bash
# In your main working repository:
# Rename old origin to 'old-public' (for reference / backup)
git remote rename origin old-public

# Add 'origin' pointing to the new private repo
git remote add origin https://github.com/<your-account>/<new-private-repo>.git

# Verify active remotes
git remote -v
```

### Step 4: Configure Upstream Tracking
```bash
git branch --set-upstream-to=origin/chore/stabilize chore/stabilize
# or for main:
# git branch --set-upstream-to=origin/main main
```

---

## 4. GitHub Actions Secrets & Variables Setup

Navigate to: `https://github.com/<your-account>/<new-private-repo>/settings/secrets/actions`

Add the following repository secrets:
| Secret Name | Purpose | Example / Notes |
|-------------|---------|-----------------|
| `MONGODB_URI` | Database connection string for staging/CI tests | `mongodb+srv://...` |
| `NEXTAUTH_SECRET` | Auth session JWT signing | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application base URL | E.g. `http://localhost:3000` or production domain |
| `NEXT_PUBLIC_APP_URL` | Public origin URL | E.g. `https://your-domain.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key ID | `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay webhook / order secret | Razorpay dashboard secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification | Razorpay webhook dashboard |
| `GEMINI_API_KEY` | Google Gemini AI assistant key | AI Studio API Key |
| `RESEND_API_KEY` | Email transactional dispatch | Resend API dashboard |

---

## 5. Branch Protection Rules

Navigate to: `https://github.com/<your-account>/<new-private-repo>/settings/branches`

Click **Add branch protection rule** for `main` and `chore/stabilize`:
1. **Branch name pattern**: `main` (and `chore/stabilize`)
2. Check:
   - [x] **Require a pull request before merging**
   - [x] **Require status checks to pass before merging**
     - Require: `test`, `build`, `lint`, `typecheck` (GitHub Actions workflow jobs)
   - [x] **Require conversation resolution before merging**
   - [x] **Do not allow bypassing the above settings** (for admins)
   - [x] **Restrict pushes that lead to creation of matching branches**

---

## 6. Pre-Deletion Checklist for Old Repository

Do **NOT** delete the old public fork until ALL items below are verified:

- [ ] **1. CI Pipeline Runs Successfully on Private Repo**: Verify all 4 CI jobs (`test`, `build`, `lint`, `typecheck`) pass on the new repo.
- [ ] **2. Vercel / Hosting Provider Project Re-Linked**:
  - In Vercel: Project Settings -> Git -> Disconnect old repo -> Connect new private repo.
  - Update deploy hooks and environment variables.
- [ ] **3. Webhooks & Integrations Re-Pointed**:
  - Razorpay webhooks (point to active Vercel staging/prod URL).
  - Tally bridge or other external webhook endpoints.
- [ ] **4. Local Clones Updated**:
  - Ensure all team members update their `git remote set-url origin ...`.
- [ ] **5. Full Archive Backup Stored**:
  ```bash
  # Create a standalone mirror bundle backup before any deletion
  git clone --mirror https://github.com/<your-account>/<new-private-repo>.git repo-backup.bundle
  ```
- [ ] **6. First Archive Old Repo**:
  - In old repo -> Settings -> Danger Zone -> **Archive this repository** (read-only mode).
  - Keep archived for 7-14 days to ensure no broken references before final deletion.
