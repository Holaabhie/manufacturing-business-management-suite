/**
 * Fake Tally Server (for testing without TallyPrime)
 * ─────────────────────────────────────────────────────────
 * A tiny HTTP server, configurable port (default 9911),
 * returning 200 with the text "TallyPrime Server is Running" on GET /.
 * Testing only.
 */

import * as http from "node:http";

function parsePort(): number {
    const portArgIdx = process.argv.findIndex((arg) => arg === "--port" || arg === "-p");
    if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
        const p = parseInt(process.argv[portArgIdx + 1], 10);
        if (!isNaN(p) && p > 0) return p;
    }
    if (process.env.TALLY_PORT) {
        const p = parseInt(process.env.TALLY_PORT, 10);
        if (!isNaN(p) && p > 0) return p;
    }
    return 9911;
}

const port = parsePort();

export function createFakeTallyServer(serverPort: number = port): http.Server {
    const server = http.createServer((req, res) => {
        if (req.method === "GET" && (req.url === "/" || req.url === "")) {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("TallyPrime Server is Running");
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    });
    return server;
}

if (require.main === module) {
    const server = createFakeTallyServer(port);
    server.listen(port, "127.0.0.1", () => {
        console.log(`[FakeTally] Listening on http://127.0.0.1:${port}`);
    });

    process.on("SIGINT", () => {
        server.close(() => process.exit(0));
    });
    process.on("SIGTERM", () => {
        server.close(() => process.exit(0));
    });
}
