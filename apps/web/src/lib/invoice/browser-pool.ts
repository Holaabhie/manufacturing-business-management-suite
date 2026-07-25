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

const LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--font-render-hinting=none",
    "--disable-features=TranslateUI",
    "--hide-scrollbars",
    "--mute-audio",
];

// ─── Singleton Browser Pool ───────────────────────────────────

let browserInstance: any = null;
let activePageCount = 0;
let isLaunching = false;
let launchPromise: Promise<any> | null = null;

/**
 * Get or create a shared browser instance.
 * Uses @sparticuz/chromium on serverless, standard puppeteer locally.
 */
async function getBrowser(config: BrowserPoolConfig = DEFAULT_CONFIG): Promise<any> {
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
                const chromium = await import(/* webpackIgnore: true */ "@sparticuz/chromium");
                executablePath = await chromium.default.executablePath();
                chromiumArgs = chromium.default.args;
                console.log("[browser-pool] Using @sparticuz/chromium (serverless)");
            } catch {
                // Not in serverless — use standard puppeteer
                console.log("[browser-pool] Using standard puppeteer");
            }

            const puppeteer = await import(/* webpackIgnore: true */ "puppeteer");
            const launchOptions: any = {
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

            browserInstance = await puppeteer.default.launch(launchOptions);

            // Auto-reconnect on disconnect
            browserInstance.on("disconnected", () => {
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

    return launchPromise;
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
    let page: any = null;
    activePageCount++;

    try {
        page = await browser.newPage();

        // Set page timeout
        const timeout = options.timeout ?? config.pageTimeoutMs;
        page.setDefaultTimeout(timeout);

        // Set content and wait for network + DOM
        await page.setContent(html, {
            waitUntil: ["networkidle0", "domcontentloaded"],
            timeout,
        });

        // Wait for Google Fonts to fully load
        if (options.waitForFonts !== false) {
            try {
                await page.evaluateHandle(() =>
                    (document as any).fonts?.ready || Promise.resolve(),
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
        } catch (error: any) {
            lastError = error;
            console.warn(`[browser-pool] PDF generation attempt ${attempt + 1} failed:`, error.message);

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
