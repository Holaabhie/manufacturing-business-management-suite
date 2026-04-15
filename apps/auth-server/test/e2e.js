/**
 * End-to-End Verification Script
 * ────────────────────────────────
 * Proves the full auth flow works without a browser.
 * Uses the built-in `fetch` (Node 18+) — no extra dependencies required.
 *
 * Usage:  node test/e2e.js
 *         npm run test:e2e
 *
 * The auth server MUST be running on http://localhost:3000 first.
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function log(step, ok, detail) {
    const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`  [${tag}] Step ${step}: ${detail}`);
    ok ? passed++ : failed++;
}

/** Extract all Set-Cookie values and merge them into a cookie header string */
function extractCookies(res, existing = '') {
    const raw = res.headers.getSetCookie?.() || [];
    const map = {};

    // Parse existing cookies
    if (existing) {
        existing.split(';').forEach((c) => {
            const [k, ...v] = c.trim().split('=');
            if (k) map[k.trim()] = v.join('=');
        });
    }

    // Overwrite / add new cookies
    raw.forEach((hdr) => {
        const [pair] = hdr.split(';');
        const [k, ...v] = pair.split('=');
        if (k) map[k.trim()] = v.join('=');
    });

    return Object.entries(map)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

/** Pull the CSRF token from HTML body */
function extractCsrf(html) {
    const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
    return match ? match[1] : null;
}

async function run() {
    console.log('\n  ── Auth Server E2E Verification ──────────────────\n');

    let cookies = '';
    let csrf = '';

    // ──────────────────────────────────────────────────────
    // Step 1: GET /login → 200, session cookie, CSRF token
    // ──────────────────────────────────────────────────────
    try {
        const res = await fetch(`${BASE}/login`, { redirect: 'manual' });
        const html = await res.text();
        cookies = extractCookies(res);
        csrf = extractCsrf(html);
        const ok = res.status === 200 && cookies.includes('sid=') && csrf;
        log(1, ok, `GET /login → ${res.status}, cookie=${!!cookies}, csrf=${!!csrf}`);
    } catch (e) {
        log(1, false, `GET /login threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 2: POST /login → 302 → /dashboard, new session
    // ──────────────────────────────────────────────────────
    const oldCookies = cookies;
    try {
        const body = new URLSearchParams({
            email: 'admin@test.com',
            password: 'password123',
            _csrf: csrf,
        });
        const res = await fetch(`${BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
            body,
            redirect: 'manual',
        });
        cookies = extractCookies(res, cookies);
        const location = res.headers.get('location') || '';
        const regenerated = cookies !== oldCookies;
        const ok = res.status === 302 && location.includes('/dashboard') && regenerated;
        log(2, ok, `POST /login → ${res.status} Location=${location}, regenerated=${regenerated}`);
    } catch (e) {
        log(2, false, `POST /login threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 3: GET /dashboard → 200, contains user name
    // ──────────────────────────────────────────────────────
    try {
        const res = await fetch(`${BASE}/dashboard`, {
            headers: { Cookie: cookies },
            redirect: 'manual',
        });
        const html = await res.text();
        const ok = res.status === 200 && html.includes('Admin User');
        log(3, ok, `GET /dashboard → ${res.status}, hasUserName=${html.includes('Admin User')}`);
    } catch (e) {
        log(3, false, `GET /dashboard threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 4: GET /settings → 200, CSRF token in form
    // ──────────────────────────────────────────────────────
    try {
        const res = await fetch(`${BASE}/settings`, {
            headers: { Cookie: cookies },
            redirect: 'manual',
        });
        const html = await res.text();
        csrf = extractCsrf(html);
        const ok = res.status === 200 && csrf;
        log(4, ok, `GET /settings → ${res.status}, csrfInForm=${!!csrf}`);
    } catch (e) {
        log(4, false, `GET /settings threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 5: POST /settings → 302 (update display name)
    // ──────────────────────────────────────────────────────
    try {
        const body = new URLSearchParams({
            displayName: 'Updated Admin',
            _csrf: csrf,
        });
        const res = await fetch(`${BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
            body,
            redirect: 'manual',
        });
        cookies = extractCookies(res, cookies);
        const ok = res.status === 302;
        log(5, ok, `POST /settings → ${res.status}`);
    } catch (e) {
        log(5, false, `POST /settings threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 6: GET /settings → confirm updated name
    // ──────────────────────────────────────────────────────
    try {
        const res = await fetch(`${BASE}/settings`, {
            headers: { Cookie: cookies },
            redirect: 'manual',
        });
        const html = await res.text();
        csrf = extractCsrf(html); // grab fresh token for logout
        const ok = res.status === 200 && html.includes('Updated Admin');
        log(6, ok, `GET /settings → ${res.status}, nameUpdated=${html.includes('Updated Admin')}`);
    } catch (e) {
        log(6, false, `GET /settings threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 7: POST /logout → 302 → /login
    // ──────────────────────────────────────────────────────
    try {
        const body = new URLSearchParams({ _csrf: csrf });
        const res = await fetch(`${BASE}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
            body,
            redirect: 'manual',
        });
        const location = res.headers.get('location') || '';
        const ok = res.status === 302 && location.includes('/login');
        log(7, ok, `POST /logout → ${res.status} Location=${location}`);
    } catch (e) {
        log(7, false, `POST /logout threw: ${e.message}`);
    }

    // ──────────────────────────────────────────────────────
    // Step 8: GET /dashboard with old cookie → redirect to /login?reason=session_expired
    // ──────────────────────────────────────────────────────
    try {
        const res = await fetch(`${BASE}/dashboard`, {
            headers: { Cookie: cookies },
            redirect: 'manual',
        });
        const location = res.headers.get('location') || '';
        const ok = res.status === 302 && location.includes('reason=session_expired');
        log(8, ok, `GET /dashboard (old cookie) → ${res.status} Location=${location}`);
    } catch (e) {
        log(8, false, `GET /dashboard threw: ${e.message}`);
    }

    // ── Summary ─────────────────────────────────────────
    console.log(`\n  ── Results: ${passed} passed, ${failed} failed ──\n`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
