"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send,
    Bot,
    User,
    Sparkles,
    Loader2,
    Trash2,
    Copy,
    Check,
    RefreshCw,
    Settings,
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
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
}

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    prompt: string;
    category: string;
}

const QUICK_ACTIONS: QuickAction[] = [
    {
        icon: <TrendingUp className="h-4 w-4" />,
        label: "Revenue Summary",
        prompt: "Give me a summary of my revenue for this month including total collected, pending, and growth trends.",
        category: "Analytics"
    },
    {
        icon: <Package className="h-4 w-4" />,
        label: "Low Stock Alert",
        prompt: "Which inventory items are running low and need to be restocked soon?",
        category: "Inventory"
    },
    {
        icon: <Users className="h-4 w-4" />,
        label: "Top Clients",
        prompt: "Who are my top 5 clients by order value this quarter?",
        category: "Clients"
    },
    {
        icon: <IndianRupee className="h-4 w-4" />,
        label: "Outstanding Payments",
        prompt: "List all clients with outstanding payments and the amounts due.",
        category: "Payments"
    },
    {
        icon: <FileText className="h-4 w-4" />,
        label: "Pending Orders",
        prompt: "What orders are currently pending and when are their delivery dates?",
        category: "Orders"
    },
    {
        icon: <BarChart3 className="h-4 w-4" />,
        label: "Business Insights",
        prompt: "Analyze my business performance and suggest areas for improvement.",
        category: "Analytics"
    }
];

const SAMPLE_RESPONSES: Record<string, string> = {
    "revenue": `📊 **Monthly Revenue Summary**

Based on your current data:

• **Total Billed:** ₹2,45,000
• **Collected:** ₹1,89,500 (77.3%)
• **Outstanding:** ₹55,500

**Trend Analysis:**
- Revenue is up 12% compared to last month
- Collection efficiency has improved by 5%
- 3 clients have pending payments over 30 days

**Recommendations:**
1. Follow up with clients having overdue payments
2. Consider offering early payment discounts
3. Review pricing for high-demand products`,

    "inventory": `📦 **Low Stock Alert**

The following items need attention:

| Item | Current Stock | Min Level | Status |
|------|--------------|-----------|--------|
| Polyester Yarn | 45 kg | 100 kg | 🔴 Critical |
| Cotton Thread | 120 pcs | 150 pcs | 🟡 Low |
| Dye Powder Blue | 8 kg | 20 kg | 🔴 Critical |

**Action Required:**
- Contact suppliers for Polyester Yarn immediately
- Dye Powder Blue reorder suggested within 2 days
- Cotton Thread can wait 1 week

Would you like me to help draft a restock request for your suppliers?`,

    "clients": `👥 **Top 5 Clients This Quarter**

1. **Sharma Textiles** - ₹85,000
   - 12 orders, 100% payment record
   
2. **Krishna Fabrics** - ₹67,500
   - 8 orders, 2 pending payments
   
3. **Metro Industries** - ₹54,000
   - 6 orders, excellent track record
   
4. **Sunrise Garments** - ₹48,500
   - 10 orders, some delayed payments
   
5. **Quality Weavers** - ₹42,000
   - 5 large orders, premium client

**Insight:** Your top 5 clients contribute 68% of total revenue. Consider loyalty programs to retain them.`,

    "payments": `💰 **Outstanding Payments Summary**

**Total Outstanding:** ₹55,500

| Client | Amount | Days Overdue |
|--------|--------|--------------|
| Krishna Fabrics | ₹22,000 | 15 days |
| Sunrise Garments | ₹18,500 | 8 days |
| New Age Textiles | ₹15,000 | 3 days |

**Payment Health Score:** 77/100

**Suggested Actions:**
1. Send reminder to Krishna Fabrics (priority)
2. Schedule call with Sunrise Garments
3. New Age Textiles - standard reminder

Would you like me to draft payment reminder messages?`,

    "orders": `📋 **Pending Orders Overview**

You have **8 active orders** worth ₹1,24,500

**Priority Orders (Due This Week):**
• Order #INV2401 - Sharma Textiles
  Product: Cotton Fabric 200m
  Due: Tomorrow ⚠️

• Order #INV2402 - Metro Industries
  Product: Polyester Blend 150m
  Due: 3 days

**Production Status:**
- 3 orders in production
- 2 orders awaiting materials
- 3 orders scheduled

**Alert:** Order #INV2401 requires immediate attention!`,

    "insights": `🎯 **Business Performance Analysis**

**Overall Health Score: 82/100** ⭐

**Strengths:**
✅ Strong client retention (85%)
✅ Growing revenue trend (+12% MoM)
✅ Diverse product portfolio

**Areas for Improvement:**
⚠️ Collection efficiency at 77% (target: 90%)
⚠️ 3 inventory items frequently out of stock
⚠️ Average delivery time could be reduced

**Recommendations:**

1. **Payment Terms Review**
   - Implement milestone-based payments for large orders
   - Estimated impact: +15% cash flow

2. **Inventory Optimization**
   - Set up automatic reorder points
   - Expected reduction in stockouts: 60%

3. **Client Communication**
   - Use WhatsApp integration for order updates
   - Projected satisfaction increase: 20%

Would you like detailed action plans for any of these?`
};

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `👋 Hello! I'm your **IND Manager AI Assistant**.

I can help you with:
• 📊 Business analytics and insights
• 📦 Inventory management queries
• 👥 Client information
• 💰 Payment tracking
• 📋 Order status updates
• 📝 Generate reports and summaries

**How can I assist you today?**`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [savedWebhookUrl, setSavedWebhookUrl] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load saved webhook URL from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('n8n_webhook_url');
        if (saved) {
            setSavedWebhookUrl(saved);
            setWebhookUrl(saved);
        }
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const saveWebhookUrl = () => {
        localStorage.setItem('n8n_webhook_url', webhookUrl);
        setSavedWebhookUrl(webhookUrl);
        setIsSettingsOpen(false);
        toast.success("n8n webhook URL saved successfully!");
    };

    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Add loading message
        const loadingId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: loadingId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isLoading: true
        }]);

        try {
            let responseContent = '';

            // Check if n8n webhook is configured
            if (savedWebhookUrl) {
                try {
                    // Fetch business context data
                    const [statsRes, ordersRes, clientsRes, inventoryRes, paymentsRes] = await Promise.all([
                        fetch("/api/dashboard/stats").then(r => r.json()).catch(() => ({})),
                        fetch("/api/orders").then(r => r.json()).catch(() => []),
                        fetch("/api/clients").then(r => r.json()).catch(() => []),
                        fetch("/api/inventory").then(r => r.json()).catch(() => []),
                        fetch("/api/payments").then(r => r.json()).catch(() => [])
                    ]);

                    // Send to n8n webhook with business context
                    const response = await fetch(savedWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: content,
                            context: {
                                stats: statsRes,
                                recentOrders: ordersRes.slice(0, 10),
                                clients: clientsRes,
                                inventory: inventoryRes,
                                recentPayments: paymentsRes.slice(0, 10)
                            },
                            timestamp: new Date().toISOString()
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        responseContent = data.response || data.message || data.output ||
                            JSON.stringify(data, null, 2);
                    } else {
                        throw new Error('Webhook request failed');
                    }
                } catch (webhookError) {
                    console.error("n8n webhook error:", webhookError);
                    responseContent = `⚠️ **Connection Issue**

I couldn't reach the n8n webhook. Please check:
1. Your n8n workflow is active
2. The webhook URL is correct
3. Your network connection

In the meantime, here's what I can tell you locally:

${getLocalResponse(content)}`;
                }
            } else {
                // Use local demo responses
                responseContent = getLocalResponse(content);
            }

            // Remove loading message and add response
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingId);
                return [...filtered, {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                }];
            });
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingId);
                return [...filtered, {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant',
                    content: "I apologize, but I encountered an error processing your request. Please try again.",
                    timestamp: new Date()
                }];
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getLocalResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('revenue') || lowerQuery.includes('summary') || lowerQuery.includes('money')) {
            return SAMPLE_RESPONSES['revenue'];
        }
        if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('restock')) {
            return SAMPLE_RESPONSES['inventory'];
        }
        if (lowerQuery.includes('client') || lowerQuery.includes('customer') || lowerQuery.includes('top')) {
            return SAMPLE_RESPONSES['clients'];
        }
        if (lowerQuery.includes('payment') || lowerQuery.includes('outstanding') || lowerQuery.includes('due')) {
            return SAMPLE_RESPONSES['payments'];
        }
        if (lowerQuery.includes('order') || lowerQuery.includes('pending') || lowerQuery.includes('delivery')) {
            return SAMPLE_RESPONSES['orders'];
        }
        if (lowerQuery.includes('insight') || lowerQuery.includes('analysis') || lowerQuery.includes('improve') || lowerQuery.includes('performance')) {
            return SAMPLE_RESPONSES['insights'];
        }

        return `I understand you're asking about: "${query}"

To provide you with accurate, real-time data analysis, please configure the **n8n integration** by clicking the ⚙️ Settings button.

**What I can help with:**
• Revenue and payment summaries
• Inventory status and alerts
• Client analytics
• Order tracking
• Business insights

Try one of the **Quick Actions** below, or ask me anything about your business!`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleQuickAction = (prompt: string) => {
        sendMessage(prompt);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: `Chat cleared! 🧹

How can I help you today?`,
            timestamp: new Date()
        }]);
        toast.success("Chat history cleared");
    };

    const formatMessage = (content: string) => {
        // Simple markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm">$1</code>')
            .replace(/\n/g, '<br />');
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        AI Assistant
                    </h1>
                    <p className="text-zinc-500 mt-1 flex items-center gap-2">
                        Powered by n8n integration
                        {savedWebhookUrl ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                <Zap className="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Demo Mode
                            </Badge>
                        )}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearChat}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Chat
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        n8n Settings
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Chat Area */}
                <Card className="flex-1 flex flex-col overflow-hidden border-2">
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={cn(
                                            "flex gap-3",
                                            message.role === 'user' && "flex-row-reverse"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                            message.role === 'user'
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                                        )}>
                                            {message.role === 'user' ? (
                                                <User className="h-4 w-4" />
                                            ) : (
                                                <Bot className="h-4 w-4" />
                                            )}
                                        </div>

                                        <div className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-3 group relative",
                                            message.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-zinc-100 dark:bg-zinc-800 rounded-tl-sm"
                                        )}>
                                            {message.isLoading ? (
                                                <div className="flex items-center gap-2 py-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                                                    <span className="text-sm text-zinc-500">Thinking...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div
                                                        className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                                                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                                                    />
                                                    {message.role === 'assistant' && !message.isLoading && (
                                                        <button
                                                            onClick={() => copyToClipboard(message.content, message.id)}
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                                                        >
                                                            {copiedId === message.id ? (
                                                                <Check className="h-3 w-3 text-emerald-500" />
                                                            ) : (
                                                                <Copy className="h-3 w-3 text-zinc-400" />
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <span className="text-[10px] text-zinc-400 mt-2 block">
                                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t bg-zinc-50 dark:bg-zinc-900">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything about your business..."
                                className="flex-1 h-12 bg-white dark:bg-zinc-950 border-2 focus:border-violet-500"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isLoading || !input.trim()}
                                className="h-12 px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </Button>
                        </form>
                    </div>
                </Card>

                {/* Quick Actions Sidebar */}
                <div className="w-80 flex-shrink-0 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                Quick Actions
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Click to get instant insights
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {QUICK_ACTIONS.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickAction(action.prompt)}
                                    disabled={isLoading}
                                    className="w-full text-left p-3 rounded-xl border hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                                            {action.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{action.label}</p>
                                            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{action.category}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-violet-500 transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Lightbulb className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-violet-700 dark:text-violet-300">Pro Tip</h4>
                                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                                        Connect n8n to enable AI-powered insights with real-time data analysis using GPT-4, Claude, or any LLM of your choice.
                                    </p>
                                    <a
                                        href="https://n8n.io"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-violet-700 dark:text-violet-300 font-bold mt-2 hover:underline"
                                    >
                                        Learn about n8n
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
                                <HelpCircle className="h-4 w-4 text-zinc-400" />
                                Example Questions
                            </h4>
                            <ul className="space-y-2 text-xs text-zinc-500">
                                <li className="flex items-start gap-2">
                                    <MessageSquare className="h-3 w-3 mt-0.5 text-zinc-300" />
                                    "What's my revenue this month?"
                                </li>
                                <li className="flex items-start gap-2">
                                    <MessageSquare className="h-3 w-3 mt-0.5 text-zinc-300" />
                                    "Which clients have overdue payments?"
                                </li>
                                <li className="flex items-start gap-2">
                                    <MessageSquare className="h-3 w-3 mt-0.5 text-zinc-300" />
                                    "Analyze my order trends"
                                </li>
                                <li className="flex items-start gap-2">
                                    <MessageSquare className="h-3 w-3 mt-0.5 text-zinc-300" />
                                    "Create a summary for this week"
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* n8n Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-violet-500" />
                            n8n Integration Settings
                        </DialogTitle>
                        <DialogDescription>
                            Connect your n8n workflow to enable AI-powered responses with your business data.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="webhook">n8n Webhook URL</Label>
                            <Input
                                id="webhook"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://your-n8n-instance.com/webhook/xxx"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-zinc-500">
                                Create a webhook trigger in n8n and paste the URL here. The assistant will send messages with business context to your workflow.
                            </p>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-3">
                            <h4 className="font-bold text-sm">Webhook Payload Structure:</h4>
                            <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-3 rounded overflow-x-auto">
                                {`{
  "message": "User's question",
  "context": {
    "stats": { ... },
    "recentOrders": [ ... ],
    "clients": [ ... ],
    "inventory": [ ... ],
    "recentPayments": [ ... ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}`}
                            </pre>
                            <p className="text-xs text-zinc-500">
                                Your n8n workflow should return a JSON object with a <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">response</code> field containing the AI's reply.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveWebhookUrl} className="bg-violet-600 hover:bg-violet-700">
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
