# Repository Migration Guide: Moving to Fresh Private Repository

> **CRITICAL NOTICE**: This document contains step-by-step administrative instructions. **DO NOT execute deletion or repository changes automatically.** All steps must be reviewed and executed manually by the repository owner.

---

## 1. Overview & Rationale

- **Current Repository**: Forked / public upstream (`https://github.com/Holaabhie/manufacturing-business-management-suite.git` / upstream fork).
- **Target Repository**: Clean, standalone, private GitHub repository (e.g., `https://github.com/<org-or-username>/ind-manager-private.git`).
- **Goal**:
  - Break upstream public fork dependency.
  - Preserve full commit history, branches, and tags.
  - Establish a secure, private perimeter for proprietary manufacturing ERP code and credentials.

---

## 2. Pre-Migration Checklist (Before Doing Anything)

1. [ ] **Verify Working Directory**: Ensure all local changes, branches, and stash items are cleanly committed or pushed to current remote.
   ```bash
   git status
   git branch -a
   ```
2. [ ] **Identify Required Secrets & Variables**: Document all GitHub Actions secrets in the current repository settings (see Section 5 below).
3. [ ] **Notify Collaborators**: Alert team members to pause pushing new commits during the 15-minute cutover window.
4. [ ] **Export Open Issues / Pull Requests (if any)**: Download or take notes of any active GitHub discussions/issues on the old repo.

---

## 3. Step-by-Step Migration Process

### Step 1: Create New Private Repository on GitHub
1. Open GitHub: `https://github.com/new`
2. Set **Repository name**: e.g., `manufacturing-business-management-suite` or `ind-manager`
3. Set **Visibility**: **Private**
4. **IMPORTANT**: Do **NOT** check:
   - [ ] Add a README file
   - [ ] Add .gitignore
   - [ ] Choose a license
   *(The new repository must be completely empty!)*

### Step 2: Add New Remote Locally
Open terminal in your project root:
```bash
# Add the new private repo as a remote named 'private'
git remote add private https://github.com/<your-account>/<new-private-repo>.git

# Verify remotes
git remote -v
```

### Step 3: Push All Branches and Tags to Private Repo
Push all commits, branches, and tags in full history:
```bash
# Push all local branches
git push private --all

# Push all tags
git push private --tags
```

### Step 4: Verify Remote Contents
1. Navigate to `https://github.com/<your-account>/<new-private-repo>`.
2. Verify:
   - Default branch (`main` or `chore/stabilize`) matches.
   - All commits and trees are present.
   - Tags match git tag count.

### Step 5: Switch Local Origin to New Private Repo
```bash
# Rename old origin to 'old-origin' (for reference / backup)
git remote rename origin old-public

# Rename 'private' to 'origin'
git remote rename private origin

# Verify active origin
git remote -v
```

### Step 6: Configure Upstream Tracking
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
     - Require: `test`, `build`, `lint` (GitHub Actions workflow jobs)
   - [x] **Require conversation resolution before merging**
   - [x] **Do not allow bypassing the above settings** (for admins)
   - [x] **Restrict pushes that lead to creation of matching branches**

---

## 6. Pre-Deletion Checklist for Old Repository

Do **NOT** delete the old public fork until ALL items below are verified:

- [ ] **1. CI Pipeline Runs Successfully on Private Repo**: Trigger a workflow dispatch or push a test commit to verify all 4 CI jobs pass on the new repo.
- [ ] **2. Vercel / Hosting Provider Project Re-Linked**:
  - If using Vercel: Project Settings -> Git -> Disconnect old repo -> Connect new private repo.
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
