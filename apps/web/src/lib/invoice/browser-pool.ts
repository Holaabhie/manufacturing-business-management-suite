/**
 * Puppeteer Browser Pool — Production-Grade
 * ────────────────────────────────────────────
 * Singleton browser instance with lazy initialization,
 * configurable concurrency, and auto-reconnect.
 *
 * Auto-detects environment:
 *   - Serverless (Vercel): uses @sparticuz/chromium if available
 *   - Local/VPS/Docker: uses standard puppeteer
 */

// ─── Types ────────────────────────────────────────────────────

interface BrowserPoolConfig {
    maxConcurrentPages: number;
    pageTimeoutMs: number;
}

const DEFAULT_CONFIG: BrowserPoolConfig = {
    maxConcurrentPages: parseInt(process.env.PDF_MAX_CONCURRENT_PAGES || "10", 10),
    pageTimeoutMs: parseInt(process.env.PDF_PAGE_TIMEOUT_MS || "30000", 10),
};

// Retained flags: --no-sandbox, --disable-setuid-sandbox, and --disable-dev-shm-usage are required
// specifically for serverless/containerized runtimes (Vercel/Docker) without user namespaces.
const LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--font-render-hinting=none",
    "--disable-features=TranslateUI",
    "--hide-scrollbars",
    "--mute-audio",
];

// ─── Browser and Page structural types ─────────────────────────

interface RequestLike {
    url: () => string;
    continue: () => void;
    abort: () => void;
}

interface PageLike {
    setDefaultTimeout: (timeout: number) => void;
    setJavaScriptEnabled: (enabled: boolean) => Promise<void>;
    setRequestInterception: (enabled: boolean) => Promise<void>;
    on: (event: string, handler: (req: RequestLike) => void) => void;
    setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
    evaluateHandle: (fn: () => unknown) => Promise<unknown>;
    pdf: (options?: Record<string, unknown>) => Promise<Uint8Array | Buffer>;
    close: () => Promise<void>;
}

interface BrowserLike {
    isConnected: () => boolean;
    close: () => Promise<void>;
    newPage: () => Promise<PageLike>;
    on?: (event: string, handler: () => void) => void;
}

// ─── Singleton Browser Pool ───────────────────────────────────

let browserInstance: BrowserLike | null = null;
let activePageCount = 0;
let isLaunching = false;
let launchPromise: Promise<BrowserLike> | null = null;

/**
 * Get or create a shared browser instance.
 * Uses @sparticuz/chromium on serverless, standard puppeteer locally.
 */
async function getBrowser(config: BrowserPoolConfig = DEFAULT_CONFIG): Promise<BrowserLike> {
    // Return existing healthy browser
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    // If already launching, wait for it
    if (isLaunching && launchPromise) {
        return launchPromise;
    }

    isLaunching = true;

    launchPromise = (async () => {
        try {
            // Close stale browser if disconnected
            if (browserInstance) {
                try {
                    await browserInstance.close();
                } catch {
                    // ignore close errors on stale browser
                }
                browserInstance = null;
            }

            // Try serverless Chromium first (Vercel/Lambda)
            let executablePath: string | undefined;
            let chromiumArgs = [...LAUNCH_ARGS];

            try {
                // @ts-ignore — optional serverless dependency (Vercel/Lambda)
                const chromium = await import(/* webpackIgnore: true */ "@sparticuz/chromium");
                executablePath = await chromium.default.executablePath();
                chromiumArgs = chromium.default.args;
                console.log("[browser-pool] Using @sparticuz/chromium (serverless)");
            } catch {
                // Not in serverless — use standard puppeteer
                console.log("[browser-pool] Using standard puppeteer");
            }

            let puppeteer: { default?: { launch: (opts: Record<string, unknown>) => Promise<BrowserLike> }; launch?: (opts: Record<string, unknown>) => Promise<BrowserLike> };
            try {
                // @ts-ignore
                puppeteer = await import(/* webpackIgnore: true */ "puppeteer");
            } catch {
                // @ts-ignore
                puppeteer = await import(/* webpackIgnore: true */ "puppeteer-core");
            }

            if (!executablePath && process.env.PUPPETEER_EXECUTABLE_PATH) {
                executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            } else if (!executablePath && process.platform === "win32") {
                const fs = await import("fs");
                const defaultChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
                const defaultEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
                if (fs.existsSync(defaultChrome)) {
                    executablePath = defaultChrome;
                } else if (fs.existsSync(defaultEdge)) {
                    executablePath = defaultEdge;
                }
            }

            const launchOptions: Record<string, unknown> = {
                headless: true,
                args: chromiumArgs,
                defaultViewport: {
                    width: 794,  // A4 width at 96 DPI
                    height: 1123, // A4 height at 96 DPI
                },
            };

            if (executablePath) {
                launchOptions.executablePath = executablePath;
            }

            const launchFn = puppeteer.default?.launch || puppeteer.launch;
            if (!launchFn) {
                throw new Error("Puppeteer launch function not found");
            }
            const launched = await launchFn.call(puppeteer.default || puppeteer, launchOptions);
            browserInstance = launched;

            // Auto-reconnect on disconnect
            browserInstance?.on?.("disconnected", () => {
                console.warn("[browser-pool] Browser disconnected, will reconnect on next request");
                browserInstance = null;
                activePageCount = 0;
            });

            return browserInstance;
        } finally {
            isLaunching = false;
            launchPromise = null;
        }
    })();

    const result = await launchPromise;
    if (!result) {
        throw new Error("Failed to initialize browser pool instance");
    }
    return result;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Generate a PDF from HTML content using the browser pool.
 *
 * @param html - Full HTML document string
 * @param options - PDF generation options
 * @returns Promise<Uint8Array> - PDF bytes
 */
export async function generatePDFFromHTML(
    html: string,
    options: {
        format?: string;
        margin?: { top?: string; right?: string; bottom?: string; left?: string };
        waitForFonts?: boolean;
        timeout?: number;
    } = {},
): Promise<Uint8Array> {
    const config = DEFAULT_CONFIG;

    // Concurrency check
    if (activePageCount >= config.maxConcurrentPages) {
        throw new Error(
            `Browser pool at capacity: ${activePageCount}/${config.maxConcurrentPages} pages in use. Try again later.`,
        );
    }

    const browser = await getBrowser(config);
    let page: PageLike | null = null;
    activePageCount++;

    try {
        page = await browser.newPage();

        // Set page timeout
        const timeout = options.timeout ?? config.pageTimeoutMs;
        page.setDefaultTimeout(timeout);

        // Disable JavaScript execution for security (invoice/quote/challan templates do not require client JS)
        await page.setJavaScriptEnabled(false);

        // Strict request interception: allow only Google Fonts and data/about URIs. Block all private/internal network access.
        await page.setRequestInterception(true);
        const ALLOWED_EXTERNAL_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

        page.on("request", (req: RequestLike) => {
            try {
                const urlStr = req.url();
                if (urlStr.startsWith("data:") || urlStr.startsWith("about:")) {
                    req.continue();
                    return;
                }
                const parsed = new URL(urlStr);
                if (
                    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
                    ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase())
                ) {
                    req.continue();
                    return;
                }
                // Abort all other requests (including internal/private network requests and redirects)
                req.abort();
            } catch {
                req.abort();
            }
        });

        // Set content and wait for network + DOM
        await page.setContent(html, {
            waitUntil: ["networkidle0", "domcontentloaded"],
            timeout,
        });

        // Wait for Google Fonts to fully load
        if (options.waitForFonts !== false) {
            try {
                await page.evaluateHandle(() =>
                    (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready || Promise.resolve(),
                );
                // Small stabilization delay for font rendering
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch {
                // fonts.ready not supported — continue anyway
            }
        }

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: options.format || "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: options.margin || {
                top: "15mm",
                right: "12mm",
                bottom: "20mm",
                left: "12mm",
            },
            displayHeaderFooter: false,
        });

        return new Uint8Array(pdfBuffer);
    } finally {
        activePageCount--;
        if (page) {
            try {
                await page.close();
            } catch {
                // ignore page close errors
            }
        }
    }
}

/**
 * Generate PDF with retry logic.
 * Retries once with a 2-second delay on failure.
 */
export async function generatePDFWithRetry(
    html: string,
    options: Parameters<typeof generatePDFFromHTML>[1] = {},
    maxRetries: number = 1,
): Promise<Uint8Array> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await generatePDFFromHTML(html, options);
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            lastError = err;
            console.warn(`[browser-pool] PDF generation attempt ${attempt + 1} failed:`, err.message);

            if (attempt < maxRetries) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Force reconnect on retry
                browserInstance = null;
            }
        }
    }

    throw lastError || new Error("PDF generation failed after retries");
}

/**
 * Get pool health status.
 */
export function getPoolStatus(): {
    connected: boolean;
    activePages: number;
    maxPages: number;
} {
    return {
        connected: browserInstance?.isConnected() ?? false,
        activePages: activePageCount,
        maxPages: DEFAULT_CONFIG.maxConcurrentPages,
    };
}

/**
 * Gracefully close the browser pool.
 * Call this during server shutdown.
 */
export async function closeBrowserPool(): Promise<void> {
    if (browserInstance) {
        try {
            await browserInstance.close();
        } catch {
            // ignore
        }
        browserInstance = null;
        activePageCount = 0;
    }
}
