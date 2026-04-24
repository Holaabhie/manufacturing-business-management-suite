"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Send,
    Bot,
    Sparkles,
    Trash2,
    Copy,
    Check,
    RefreshCw,
    Zap,
    MessageSquare,
    TrendingUp,
    Package,
    Users,
    IndianRupee,
    FileText,
    HelpCircle,
    Lightbulb,
    BarChart3,
    AlertCircle,
    ChevronRight,
    History,
    WifiOff,
    FileBarChart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- iOS Components ---
import {
    IOSCard,
    IOSCardHeader,
    IOSCardContent,
} from "@/components/ui/ios";

// ─── Types ───────────────────────────────────────────────────
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    displayedContent?: string;
    timestamp: string;
    isLoading?: boolean;
    isTyping?: boolean;
    isError?: boolean;
    errorMessage?: string;
}

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    prompt: string;
    category: string;
}

interface BusinessContext {
    stats: Record<string, unknown>;
    orders: unknown[];
    payments: unknown[];
    inventory: unknown[];
    clients: unknown[];
}

// ─── Constants ───────────────────────────────────────────────
const CHAT_STORAGE_KEY = "ind_manager_chat_history";
const TYPING_SPEED_MS = 18;

const WELCOME_MESSAGE: Message = {
    id: "welcome",
    role: "assistant",
    content: `👋 Hello! I'm your **IND Manager AI Assistant**, powered by Google Gemini.

I can help you with:
• 📊 Business analytics & insights
• 📦 Inventory management
• 👥 Client information
• 💰 Payment tracking
• 📋 Order status
• 🏭 Production overview

**How can I help you today?**`,
    timestamp: new Date().toISOString(),
};

const QUICK_ACTIONS: QuickAction[] = [
    {
        icon: <TrendingUp className="h-4 w-4" />,
        label: "Revenue Summary",
        prompt: "Give me a summary of my revenue for this month including total collected, pending, and growth trends.",
        category: "Analytics",
    },
    {
        icon: <Package className="h-4 w-4" />,
        label: "Low Stock Alert",
        prompt: "Which inventory items are running low and need to be restocked soon?",
        category: "Inventory",
    },
    {
        icon: <Users className="h-4 w-4" />,
        label: "Top Clients",
        prompt: "Who are my top 5 clients by order value this quarter?",
        category: "Clients",
    },
    {
        icon: <IndianRupee className="h-4 w-4" />,
        label: "Outstanding Payments",
        prompt: "List all clients with outstanding payments and the amounts due.",
        category: "Payments",
    },
    {
        icon: <FileText className="h-4 w-4" />,
        label: "Pending Orders",
        prompt: "What orders are currently pending and when are their delivery dates?",
        category: "Orders",
    },
    {
        icon: <BarChart3 className="h-4 w-4" />,
        label: "Business Insights",
        prompt: "Analyze my business performance and suggest areas for improvement.",
        category: "Analytics",
    },
];

// ─── Typing Dots Component ───────────────────────────────────
function TypingDots() {
    return (
        <div className="flex items-center gap-1.5 py-2 px-1">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-[var(--ios-purple)]"
                    animate={{
                        y: [0, -6, 0],
                        opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

// ─── Format Message Content ──────────────────────────────────
function formatMessage(content: string): string {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>')
        .replace(/\n/g, '<br />');
}

// ─── Main Component ─────────────────────────────────────────
export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
    const [isContextLoaded, setIsContextLoaded] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Smart Reports State ──
    const [viewMode, setViewMode] = useState<"chat" | "reports">("chat");
    const [reportQuestion, setReportQuestion] = useState("");
    const [reportLoading, setReportLoading] = useState(false);
    const [reportHistory, setReportHistory] = useState<Array<{ question: string; response: any; timestamp: string }>>([]);

    const REPORT_PROMPTS = [
        { label: "Revenue Analysis", prompt: "Analyze my total revenue, top products by revenue, and month-over-month growth trends.", icon: "📊" },
        { label: "Inventory Health", prompt: "Give me a full inventory health check — which items need restocking, total inventory value, and turnover rate.", icon: "📦" },
        { label: "Profit Breakdown", prompt: "Break down my profit margins across all orders. What are my highest and lowest margin products?", icon: "💰" },
        { label: "Client Insights", prompt: "Who are my most valuable clients? Show revenue per client and payment reliability.", icon: "👥" },
        { label: "Cash Flow", prompt: "Analyze my cash flow — total collected vs outstanding, overdue payments, and collection rate.", icon: "🏦" },
        { label: "Production Efficiency", prompt: "How efficient is my production? Show order completion rate, average delivery time, and bottlenecks.", icon: "🏭" },
    ];

    const sendReport = async (question: string) => {
        if (!question.trim() || reportLoading) return;
        setReportLoading(true);
        try {
            const res = await fetch("/api/v1/ai-reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: question.trim(),
                    history: reportHistory.slice(-6).map((r) => ({
                        role: "user",
                        content: r.question,
                    })),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setReportHistory((prev) => [
                    { question: question.trim(), response: data.response, timestamp: new Date().toISOString() },
                    ...prev,
                ]);
                setReportQuestion("");
            } else {
                toast.error(data.error || "Failed to generate report");
            }
        } catch {
            toast.error("Failed to generate report");
        } finally {
            setReportLoading(false);
        }
    };

    // ─── Load Chat History ───────────────────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CHAT_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Message[];
                if (parsed.length > 0) {
                    // Restore messages, clearing any in-progress states
                    const restored = parsed.map((m) => ({
                        ...m,
                        isLoading: false,
                        isTyping: false,
                        displayedContent: m.content,
                    }));
                    setMessages(restored);
                }
            }
        } catch {
            // Corrupted storage, start fresh
        }
        setHistoryLoaded(true);
    }, []);

    // ─── Save Chat History ───────────────────────────────────
    useEffect(() => {
        if (!historyLoaded) return;
        try {
            const toSave = messages
                .filter((m) => !m.isLoading)
                .map(({ id, role, content, timestamp, isError, errorMessage }) => ({
                    id,
                    role,
                    content,
                    timestamp,
                    isError,
                    errorMessage,
                }));
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
        } catch {
            // Storage full, silently fail
        }
    }, [messages, historyLoaded]);

    // ─── Fetch Business Context ──────────────────────────────
    useEffect(() => {
        async function fetchContext() {
            try {
                const [statsRes, ordersRes, clientsRes, inventoryRes, paymentsRes] =
                    await Promise.all([
                        fetch("/api/dashboard/stats").then((r) => r.json()).catch(() => ({})),
                        fetch("/api/orders").then((r) => r.json()).catch(() => []),
                        fetch("/api/clients").then((r) => r.json()).catch(() => []),
                        fetch("/api/inventory").then((r) => r.json()).catch(() => []),
                        fetch("/api/payments").then((r) => r.json()).catch(() => []),
                    ]);
                setBusinessContext({
                    stats: statsRes,
                    orders: Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || [],
                    payments: Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.payments || [],
                    inventory: Array.isArray(inventoryRes) ? inventoryRes : inventoryRes?.items || [],
                    clients: Array.isArray(clientsRes) ? clientsRes : clientsRes?.clients || [],
                });
                setIsContextLoaded(true);
            } catch {
                setIsContextLoaded(true); // proceed without context
            }
        }
        fetchContext();
    }, []);

    // ─── Auto-scroll ─────────────────────────────────────────
    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // ─── Typing Animation ────────────────────────────────────
    const startTypingAnimation = useCallback(
        (messageId: string, fullContent: string) => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }

            let charIndex = 0;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? { ...m, isTyping: true, displayedContent: "" }
                        : m
                )
            );

            typingIntervalRef.current = setInterval(() => {
                charIndex++;
                if (charIndex >= fullContent.length) {
                    if (typingIntervalRef.current) {
                        clearInterval(typingIntervalRef.current);
                        typingIntervalRef.current = null;
                    }
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === messageId
                                ? { ...m, isTyping: false, displayedContent: fullContent }
                                : m
                        )
                    );
                    return;
                }
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, displayedContent: fullContent.slice(0, charIndex) }
                            : m
                    )
                );
                scrollToBottom();
            }, TYPING_SPEED_MS);
        },
        [scrollToBottom]
    );

    // ─── Cleanup interval on unmount ─────────────────────────
    useEffect(() => {
        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
        };
    }, []);

    // ─── Auto-resize textarea ────────────────────────────────
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height =
                Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [input]);

    // ─── Send Message ────────────────────────────────────────
    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: content.trim(),
            displayedContent: content.trim(),
            timestamp: new Date().toISOString(),
        };

        const loadingId = (Date.now() + 1).toString();
        const loadingMessage: Message = {
            id: loadingId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            isLoading: true,
        };

        setMessages((prev) => [...prev, userMessage, loadingMessage]);
        setInput("");
        setIsLoading(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            // Build history for API (exclude welcome, loading, error messages)
            const history = messages
                .filter((m) => m.id !== "welcome" && !m.isLoading && !m.isError)
                .map((m) => ({ role: m.role, content: m.content }));

            const res = await fetch("/api/assistant/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content.trim(),
                    history: history.slice(-20), // Last 20 messages for context
                    context: businessContext || {},
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to get response");
            }

            const responseId = (Date.now() + 2).toString();

            // Replace loading with response
            setMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== loadingId);
                return [
                    ...filtered,
                    {
                        id: responseId,
                        role: "assistant" as const,
                        content: data.response,
                        displayedContent: "",
                        timestamp: new Date().toISOString(),
                        isTyping: true,
                    },
                ];
            });

            // Start typing animation
            startTypingAnimation(responseId, data.response);
        } catch (error: unknown) {
            const errorMsg =
                error instanceof Error ? error.message : "Something went wrong";
            toast.error(errorMsg);

            // Replace loading with error
            setMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== loadingId);
                return [
                    ...filtered,
                    {
                        id: (Date.now() + 2).toString(),
                        role: "assistant" as const,
                        content: `⚠️ **Error:** ${errorMsg}`,
                        displayedContent: `⚠️ **Error:** ${errorMsg}`,
                        timestamp: new Date().toISOString(),
                        isError: true,
                        errorMessage: errorMsg,
                    },
                ];
            });
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Retry last message ──────────────────────────────────
    const retryLastMessage = () => {
        // Find the last user message
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
        if (!lastUserMsg) return;

        // Remove the error message
        setMessages((prev) => {
            const lastErr = [...prev].reverse().find((m) => m.isError);
            if (lastErr) return prev.filter((m) => m.id !== lastErr.id);
            return prev;
        });

        // Also remove the last user message so sendMessage re-adds it
        setMessages((prev) => prev.filter((m) => m.id !== lastUserMsg.id));

        // Re-send
        setTimeout(() => sendMessage(lastUserMsg.content), 100);
    };

    // ─── Handlers ────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clearChat = () => {
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }
        const fresh: Message = {
            ...WELCOME_MESSAGE,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            displayedContent: WELCOME_MESSAGE.content,
        };
        setMessages([fresh]);
        localStorage.removeItem(CHAT_STORAGE_KEY);
        toast.success("Chat history cleared");
    };

    // ─── Render ──────────────────────────────────────────────
    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            {/* ── Premium Gradient Header ── */}
            <div
                className="flex justify-between items-start mb-4 flex-shrink-0 rounded-2xl px-5 py-4 relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #1a1f3e 0%, #0f1623 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                {/* Subtle animated glow behind icon */}
                <div className="absolute top-3 left-5 w-20 h-20 rounded-full opacity-40 blur-2xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)" }} />

                <div className="relative z-10">
                    <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-3 text-white">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 8px 24px rgba(168,85,247,0.3)" }}>
                            <Bot className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <span>AI Assistant</span>
                            {/* Powered by Gemini pill */}
                            <div className="flex items-center gap-2 mt-1.5">
                                <span
                                    className="text-xs font-medium px-3 py-1 rounded-full"
                                    style={{
                                        background: "rgba(34,197,94,0.15)",
                                        color: "#4ade80",
                                        border: "1px solid rgba(34,197,94,0.30)",
                                    }}
                                >
                                    Powered by Google Gemini
                                </span>
                                {isContextLoaded ? (
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-400">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                                        </span>
                                        READY
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-orange-400">
                                        <WifiOff className="h-3 w-3" />
                                        Loading…
                                    </span>
                                )}
                            </div>
                        </div>
                    </h1>
                    {/* Mode Toggle */}
                    <div className="flex mt-3 gap-1 rounded-[10px] p-0.5 w-fit" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <button
                            onClick={() => setViewMode("chat")}
                            className={cn(
                                "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                                viewMode === "chat"
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-white/50 hover:text-white/80"
                            )}
                        >
                            <MessageSquare className="h-3.5 w-3.5" /> Chat
                        </button>
                        <button
                            onClick={() => setViewMode("reports")}
                            className={cn(
                                "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                                viewMode === "reports"
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-white/50 hover:text-white/80"
                            )}
                        >
                            <FileBarChart className="h-3.5 w-3.5" /> Smart Reports
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 relative z-10">
                    {viewMode === "chat" && (
                        <>
                            <button
                                onClick={clearChat}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                            >
                                <Trash2 className="h-4 w-4 text-red-400" />
                                Clear
                            </button>
                            {messages.length > 1 && (
                                <span
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase self-center"
                                    style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}
                                >
                                    <History className="h-3 w-3" />
                                    {messages.filter((m) => m.id !== "welcome").length} msgs
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {viewMode === "chat" && (
            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                {/* Chat Area */}
                <IOSCard variant="elevated" className="flex-1 flex flex-col overflow-hidden border border-[var(--border-card)] p-0">
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4 pb-4">
                            <AnimatePresence mode="popLayout">
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                        className={cn(
                                            "flex gap-3",
                                            message.role === "user" && "flex-row-reverse"
                                        )}
                                    >
                                        {/* Avatar — only for AI */}
                                        {message.role === "assistant" && (
                                            <div
                                                className="h-8 w-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                                                    boxShadow: "0 2px 8px rgba(168,85,247,0.3)",
                                                }}
                                            >
                                                <Bot className="h-4 w-4 text-white" />
                                            </div>
                                        )}

                                        {/* Bubble */}
                                        <div
                                            className={cn(
                                                "max-w-[80%] px-4 py-3 group relative shadow-md",
                                                message.role === "user"
                                                    ? "rounded-2xl rounded-tr-sm text-white"
                                                    : message.isError
                                                        ? "rounded-2xl rounded-tl-sm border border-red-800/50"
                                                        : "rounded-2xl rounded-tl-sm border border-white/5"
                                            )}
                                            style={
                                                message.role === "user"
                                                    ? { background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" }
                                                    : message.isError
                                                        ? { background: "linear-gradient(135deg, rgba(127,29,29,0.3) 0%, rgba(30,20,38,0.5) 100%)" }
                                                        : { background: "linear-gradient(135deg, #1e2d4a 0%, #1a2038 100%)" }
                                            }
                                        >
                                            {message.isLoading ? (
                                                <TypingDots />
                                            ) : (
                                                <>
                                                    <div
                                                        className={cn(
                                                            "text-[15px] leading-relaxed whitespace-pre-wrap",
                                                            message.role === "user"
                                                                ? "text-white"
                                                                : "text-[var(--label-primary)]"
                                                        )}
                                                        dangerouslySetInnerHTML={{
                                                            __html: formatMessage(
                                                                message.displayedContent ?? message.content
                                                            ),
                                                        }}
                                                    />

                                                    {/* Typing cursor */}
                                                    {message.isTyping && (
                                                        <motion.span
                                                            className="inline-block w-[2px] h-[16px] bg-[var(--ios-purple)] ml-0.5 align-middle"
                                                            animate={{ opacity: [1, 0] }}
                                                            transition={{
                                                                duration: 0.6,
                                                                repeat: Infinity,
                                                                repeatType: "reverse",
                                                            }}
                                                        />
                                                    )}

                                                    {/* Copy button */}
                                                    {message.role === "assistant" &&
                                                        !message.isLoading &&
                                                        !message.isTyping && (
                                                            <button
                                                                onClick={() =>
                                                                    copyToClipboard(message.content, message.id)
                                                                }
                                                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--fill-tertiary)] shadow-sm rounded-full border border-[var(--border-card)]"
                                                            >
                                                                {copiedId === message.id ? (
                                                                    <Check className="h-3 w-3 text-[var(--ios-green)]" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3 text-[var(--label-secondary)]" />
                                                                )}
                                                            </button>
                                                        )}

                                                    {/* Error retry button */}
                                                    {message.isError && (
                                                        <button
                                                            onClick={retryLastMessage}
                                                            className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--ios-purple)] font-semibold hover:underline"
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            Retry
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {/* Timestamp */}
                                            {!message.isLoading && (
                                                <span
                                                    className={cn(
                                                        "text-[10px] mt-2 block",
                                                        message.role === "user"
                                                            ? "text-white/70"
                                                            : "text-[var(--label-tertiary)]"
                                                    )}
                                                >
                                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>

                    {/* Input Area — Dark Premium Bar */}
                    <div className="p-4 flex-shrink-0" style={{ background: "linear-gradient(180deg, rgba(15,22,35,0) 0%, rgba(15,22,35,0.8) 100%)" }}>
                        <form
                            onSubmit={handleSubmit}
                            className="flex gap-3 max-w-4xl mx-auto items-end relative"
                        >
                            <div
                                className="flex-1 flex items-end rounded-2xl px-4 py-3"
                                style={{
                                    background: "#1a1f2e",
                                    border: "1px solid rgba(255,255,255,0.10)",
                                }}
                            >
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything about your business..."
                                    rows={1}
                                    className={cn(
                                        "flex-1 resize-none bg-transparent text-[15px] text-white placeholder:text-white/30",
                                        "focus:outline-none",
                                        "transition-all duration-200",
                                        "disabled:opacity-50"
                                    )}
                                    disabled={isLoading}
                                    style={{ maxHeight: 120 }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                                    "hover:opacity-90 active:scale-95",
                                    "transition-all duration-150",
                                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                                )}
                                style={{
                                    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                    boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                                }}
                            >
                                {isLoading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </motion.div>
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-white/25 mt-2">
                            Press <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] border border-white/10">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] border border-white/10">Shift+Enter</kbd> for new line
                        </p>
                    </div>
                </IOSCard>

                {/* Quick Actions Sidebar */}
                <div className="w-80 flex-shrink-0 space-y-4 hidden xl:block">
                    <IOSCard variant="elevated">
                        <IOSCardHeader
                            title={
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-[var(--ios-purple)]" />
                                        Quick Actions
                                    </div>
                                    <p className="text-[13px] text-[var(--label-secondary)] font-normal">
                                        Click to get instant insights
                                    </p>
                                </div>
                            }
                            className="[&_h3]:text-[15px] pb-2"
                        />
                        <IOSCardContent className="space-y-2 pb-4">
                            {QUICK_ACTIONS.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(action.prompt)}
                                    disabled={isLoading}
                                    className="w-full text-left p-3 rounded-[12px] border border-[var(--border-card)] hover:border-[var(--ios-purple)]/30 hover:bg-[var(--ios-purple)]/5 transition-all group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-[8px] bg-[var(--fill-tertiary)] flex items-center justify-center group-hover:bg-[var(--ios-purple)]/10 text-[var(--label-secondary)] group-hover:text-[var(--ios-purple)] transition-colors">
                                            {action.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[13px] text-[var(--label-primary)]">
                                                {action.label}
                                            </p>
                                            <p className="text-[10px] text-[var(--label-tertiary)] uppercase tracking-wider mt-0.5">
                                                {action.category}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-[var(--label-tertiary)] group-hover:text-[var(--ios-purple)] transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </IOSCardContent>
                    </IOSCard>

                    <IOSCard
                        variant="elevated"
                        className="!bg-gradient-to-br from-[var(--ios-purple)]/10 to-[var(--ios-indigo)]/5 border border-[var(--ios-purple)]/20"
                    >
                        <IOSCardContent className="pt-5 pb-5">
                            <div className="flex items-start gap-3">
                                <Lightbulb className="h-5 w-5 text-[var(--ios-purple)] flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-[13px] text-[var(--ios-purple)]">
                                        Pro Tip
                                    </h4>
                                    <p className="text-[12px] text-[var(--label-secondary)] mt-1 leading-relaxed">
                                        Your chat history is saved automatically. Ask follow-up questions to drill deeper into any topic!
                                    </p>
                                </div>
                            </div>
                        </IOSCardContent>
                    </IOSCard>

                    <IOSCard variant="elevated">
                        <IOSCardContent className="pt-5 pb-5">
                            <h4 className="font-semibold text-[13px] text-[var(--label-primary)] flex items-center gap-2 mb-3">
                                <HelpCircle className="h-4 w-4 text-[var(--label-tertiary)]" />
                                Example Questions
                            </h4>
                            <ul className="space-y-2.5 text-[12px] text-[var(--label-secondary)]">
                                {[
                                    "What's my revenue this month?",
                                    "Which clients have overdue payments?",
                                    "Analyze my order trends",
                                    "What inventory needs restocking?",
                                ].map((q, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <MessageSquare className="h-3 w-3 mt-0.5 text-[var(--label-tertiary)]" />
                                        <button
                                            onClick={() => sendMessage(q)}
                                            disabled={isLoading}
                                            className="text-left hover:text-[var(--ios-purple)] transition-colors disabled:opacity-50"
                                        >
                                            &ldquo;{q}&rdquo;
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </IOSCardContent>
                    </IOSCard>
                </div>
            </div>
            )}

            {/* ══════════════════════════════════════════════════════
                SMART REPORTS — Structured AI Analytics
               ══════════════════════════════════════════════════════ */}
            {viewMode === "reports" && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex-1 overflow-y-auto space-y-5 ind-page"
                >
                    {/* Report Header */}
                    <div className="ind-page-header" style={{ marginBottom: 0 }}>
                        <div className="ind-label">
                            <span className="ind-pulse-dot" style={{ background: "var(--ind-purple)" }} />
                            AI-Powered Analytics
                        </div>
                        <p className="ind-subtitle">Generate structured business reports with data-backed insights</p>
                    </div>

                    {/* Preset Prompts Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {REPORT_PROMPTS.map((rp, idx) => (
                            <motion.button
                                key={idx}
                                whileHover={{ scale: 1.01, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => sendReport(rp.prompt)}
                                disabled={reportLoading}
                                className="ind-card ind-card--interactive text-left disabled:opacity-50 cursor-pointer"
                                style={{ padding: 16 }}
                            >
                                <span className="text-[20px] mb-2 block">{rp.icon}</span>
                                <span className="text-[13px] font-semibold block" style={{ color: "var(--ind-text)" }}>{rp.label}</span>
                                <span className="text-[11px] mt-1 block" style={{ color: "var(--ind-text-muted)" }}>{rp.prompt.substring(0, 50)}...</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Custom Question Input */}
                    <div className="ind-card" style={{ padding: 16 }}>
                        <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ind-text-muted)" }}>
                            Ask a Custom Question
                        </p>
                        <div className="flex gap-2">
                            <input
                                value={reportQuestion}
                                onChange={(e) => setReportQuestion(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendReport(reportQuestion); }}
                                placeholder="e.g., What's my best performing product category?"
                                className="flex-1 h-[40px] rounded-[10px] px-4 text-[14px] outline-none"
                                style={{
                                    background: "var(--ind-input-bg)",
                                    border: "1px solid var(--ind-input-border)",
                                    color: "var(--ind-text)",
                                }}
                                disabled={reportLoading}
                            />
                            <button
                                onClick={() => sendReport(reportQuestion)}
                                disabled={!reportQuestion.trim() || reportLoading}
                                className="ind-btn ind-btn--primary ind-btn--pill disabled:opacity-50"
                            >
                                {reportLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Analyze
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {reportLoading && (
                        <div className="ind-card ind-card--glow-purple" style={{ padding: 24 }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="ind-chat-avatar">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-[14px] font-semibold" style={{ color: "var(--ind-text)" }}>Analyzing your data...</span>
                            </div>
                            <div className="ind-bounce-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}

                    {/* Report History */}
                    {reportHistory.map((report, idx) => {
                        const r = report.response;
                        const colorMap: Record<string, string> = {
                            green: "var(--ind-green)",
                            blue: "var(--ind-blue)",
                            orange: "var(--ind-orange)",
                            red: "var(--ind-red)",
                            purple: "var(--ind-purple)",
                        };

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="space-y-3"
                            >
                                {/* User Question */}
                                <div className="flex justify-end">
                                    <div className="ind-chat-user">
                                        {report.question}
                                    </div>
                                </div>

                                {/* AI Response Card */}
                                <div className="flex gap-3 items-start">
                                    <div className="ind-chat-avatar flex-shrink-0">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ind-chat-ai flex-1">
                                        {/* Summary */}
                                        {r.summary && (
                                            <p className="text-[15px] font-medium mb-4" style={{ color: "var(--ind-text)", lineHeight: 1.5 }}>
                                                {r.summary}
                                            </p>
                                        )}

                                        {/* Data Grid */}
                                        {r.data && r.data.length > 0 && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                                {r.data.map((d: any, di: number) => (
                                                    <div key={di} className="ind-stat-card" style={{ padding: 12 }}>
                                                        <span className="ind-stat-card__label" style={{ fontSize: 10 }}>{d.label}</span>
                                                        <span
                                                            className="ind-stat-card__value ind-mono"
                                                            style={{
                                                                fontSize: 18,
                                                                color: colorMap[d.color] || "var(--ind-text)",
                                                            }}
                                                        >
                                                            {d.val}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Insight */}
                                        {r.insight && (
                                            <div className="ind-insight-box">
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--ind-purple)" }} />
                                                    <p className="text-[13px]" style={{ color: "var(--ind-text)", lineHeight: 1.6 }}>
                                                        {r.insight}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <p className="text-[10px] mt-3" style={{ color: "var(--ind-text-muted)" }}>
                                            {new Date(report.timestamp).toLocaleString("en-IN", {
                                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Empty State */}
                    {!reportLoading && reportHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="ind-chat-avatar mb-3" style={{ width: 48, height: 48 }}>
                                <FileBarChart className="h-5 w-5 text-white" />
                            </div>
                            <p className="text-[15px] font-medium" style={{ color: "var(--ind-text)" }}>No reports yet</p>
                            <p className="text-[13px]" style={{ color: "var(--ind-text-muted)" }}>
                                Click a preset above or ask a custom question
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
