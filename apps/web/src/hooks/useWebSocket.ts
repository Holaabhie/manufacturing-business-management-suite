'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// ─── Types ──────────────────────────────────────────────
interface OrderEvent {
    action: string;
    orderId: string;
    data?: unknown;
    timestamp: string;
}

interface InventoryEvent {
    action: string;
    itemId: string;
    data?: unknown;
    timestamp: string;
}

interface UseWebSocketOptions {
    /** Tenant ID to join (auto-subscribes to tenant room) */
    tenantId?: string;
    /** WebSocket server URL — defaults to NEXT_PUBLIC_WS_URL or ws://localhost:3001 */
    url?: string;
    /** Auto-reconnect on disconnect (default true) */
    autoReconnect?: boolean;
}

interface UseWebSocketReturn {
    /** Whether the socket is currently connected */
    isConnected: boolean;
    /** Subscribe to order update events */
    onOrderUpdate: (callback: (event: OrderEvent) => void) => () => void;
    /** Subscribe to inventory update events */
    onInventoryUpdate: (callback: (event: InventoryEvent) => void) => () => void;
    /** Subscribe to arbitrary events */
    onEvent: (eventName: string, callback: (data: unknown) => void) => () => void;
    /** Manually disconnect */
    disconnect: () => void;
}

// ─── Dynamic import helper ──────────────────────────────
// socket.io-client is only imported on the client side
let ioModule: typeof import('socket.io-client') | null = null;

async function getIO() {
    if (!ioModule) {
        ioModule = await import('socket.io-client');
    }
    return ioModule;
}

// ─── Hook ───────────────────────────────────────────────
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
    const {
        tenantId,
        url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
        autoReconnect = true,
    } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socketRef = useRef<any>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // ── Connect ─────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        async function connect() {
            const { io } = await getIO();

            if (socketRef.current?.connected) return;

            const socket = io(url, {
                transports: ['websocket', 'polling'],
                reconnection: autoReconnect,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 10000,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                if (!mounted) return;
                setIsConnected(true);
                reconnectAttempts.current = 0;
                console.log('[WS] Connected:', socket.id);

                // Join tenant room if tenantId is provided
                if (tenantId) {
                    socket.emit('joinTenant', { tenantId });
                }
            });

            socket.on('disconnect', (reason: string) => {
                if (!mounted) return;
                setIsConnected(false);
                console.log('[WS] Disconnected:', reason);

                // Attempt manual reconnection with exponential backoff
                if (autoReconnect && reason !== 'io client disconnect') {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
                    reconnectAttempts.current += 1;
                    reconnectTimer.current = setTimeout(() => {
                        if (mounted && !socket.connected) {
                            socket.connect();
                        }
                    }, delay);
                }
            });

            socket.on('connect_error', (err: Error) => {
                console.warn('[WS] Connection error:', err.message);
            });

            socket.on('joinedTenant', (data: { tenantId: string }) => {
                console.log('[WS] Joined tenant room:', data.tenantId);
            });
        }

        connect();

        return () => {
            mounted = false;
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [url, tenantId, autoReconnect]);

    // ── Event subscription helpers ──────────────────────
    const onOrderUpdate = useCallback(
        (callback: (event: OrderEvent) => void) => {
            const socket = socketRef.current;
            if (!socket) return () => { };

            socket.on('order:updated', callback);
            return () => {
                socket.off('order:updated', callback);
            };
        },
        [],
    );

    const onInventoryUpdate = useCallback(
        (callback: (event: InventoryEvent) => void) => {
            const socket = socketRef.current;
            if (!socket) return () => { };

            socket.on('inventory:updated', callback);
            return () => {
                socket.off('inventory:updated', callback);
            };
        },
        [],
    );

    const onEvent = useCallback(
        (eventName: string, callback: (data: unknown) => void) => {
            const socket = socketRef.current;
            if (!socket) return () => { };

            socket.on(eventName, callback);
            return () => {
                socket.off(eventName, callback);
            };
        },
        [],
    );

    const disconnect = useCallback(() => {
        socketRef.current?.disconnect();
        setIsConnected(false);
    }, []);

    return { isConnected, onOrderUpdate, onInventoryUpdate, onEvent, disconnect };
}
