/**
 * Type declarations for optional modules that may not be installed.
 * These modules are dynamically imported at runtime and only needed
 * in specific deployment environments.
 */

declare module "socket.io-client" {
    interface ManagerOptions {
        reconnection?: boolean;
        reconnectionAttempts?: number;
        reconnectionDelay?: number;
        reconnectionDelayMax?: number;
    }

    interface SocketOptions {
        transports?: string[];
    }

    interface Socket {
        id: string;
        connected: boolean;
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
        emit(event: string, ...args: any[]): void;
        connect(): void;
        disconnect(): void;
    }

    type IoOptions = Partial<ManagerOptions & SocketOptions>;

    export function io(url: string, options?: IoOptions): Socket;
}

declare module "puppeteer" {
    interface LaunchOptions {
        headless?: boolean | "new";
        args?: string[];
        executablePath?: string;
        defaultViewport?: { width: number; height: number } | null;
    }

    interface PDFOptions {
        format?: string;
        printBackground?: boolean;
        preferCSSPageSize?: boolean;
        margin?: { top?: string; right?: string; bottom?: string; left?: string };
        displayHeaderFooter?: boolean;
    }

    interface Page {
        setDefaultTimeout(timeout: number): void;
        setContent(html: string, options?: { waitUntil?: string[]; timeout?: number }): Promise<void>;
        evaluateHandle(fn: () => any): Promise<any>;
        pdf(options?: PDFOptions): Promise<Buffer>;
        close(): Promise<void>;
    }

    interface Browser {
        isConnected(): boolean;
        newPage(): Promise<Page>;
        close(): Promise<void>;
        on(event: string, callback: (...args: any[]) => void): void;
    }

    const _default: {
        launch(options?: LaunchOptions): Promise<Browser>;
    };
    export default _default;
}
