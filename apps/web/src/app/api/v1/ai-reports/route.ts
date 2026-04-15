/**
 * AI Smart Reports API — /api/v1/ai-reports
 * ─────────────────────────────────────────────────────────
 * Uses Gemini to generate structured business reports
 * with data-backed insights. Returns JSON with summary,
 * data points, and actionable insights.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

const SYSTEM_PROMPT = `You are **IND Manager Smart Reports AI** — a data analyst for manufacturing businesses.

Your job is to analyze business data and return STRUCTURED reports.

You MUST respond with valid JSON only, no markdown, no extra text.

Response format:
{
  "summary": "1-2 sentence plain-text summary",
  "data": [
    { "label": "Metric Name", "val": "₹1.2L or 42%", "color": "green|blue|orange|red|purple" }
  ],
  "insight": "One actionable insight or recommendation (plain text)",
  "type": "revenue|inventory|production|general"
}

Rules:
1. Always include 3-6 data items in the "data" array
2. Use ₹ for Indian Rupees, format large numbers as Lakhs (L) or Crores (Cr)
3. Pick "color" based on context: green=good, red=bad, orange=warning, blue=neutral, purple=highlight
4. Keep summary under 30 words
5. Make insight specific and actionable
6. If data is insufficient, still return valid JSON with available info
7. Never return markdown or text outside the JSON object`;

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_gemini_api_key_here") {
            return NextResponse.json(
                { success: false, error: "Gemini API key not configured." },
                { status: 500 },
            );
        }

        const body = await req.json();
        const { question, history = [] } = body;

        if (!question || typeof question !== "string" || !question.trim()) {
            return NextResponse.json(
                { success: false, error: "Question is required." },
                { status: 400 },
            );
        }

        const db = await getDb();
        const ownerId = getDataOwnerId(user);

        // ── Fetch live business context ─────────────────────
        const [orders, clients, inventory, payments] = await Promise.all([
            db.collection("orders").find({ userId: ownerId }).sort({ createdAt: -1 }).limit(30).toArray(),
            db.collection("clients").find({ userId: ownerId }).toArray(),
            db.collection("inventory").find({ userId: ownerId }).toArray(),
            db.collection("payments").find({ userId: ownerId }).sort({ createdAt: -1 }).limit(20).toArray(),
        ]);

        // ── Build context ──────────────────────────────────
        const contextParts: string[] = [];

        if (orders.length > 0) {
            const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
            const completed = orders.filter((o) => o.status === "completed").length;
            const pending = orders.filter((o) => o.status === "pending").length;
            const processing = orders.filter((o) => o.status === "processing").length;

            contextParts.push(
                `## Orders (${orders.length} recent)\nTotal Revenue: ₹${totalRevenue}\nCompleted: ${completed}, Processing: ${processing}, Pending: ${pending}\n${JSON.stringify(orders.slice(0, 10).map((o) => ({
                    product: o.product_name,
                    qty: o.quantity,
                    amount: o.total_amount,
                    status: o.status,
                    paymentStatus: o.payment_status,
                    materialCost: o.material_cost || 0,
                    labourCost: o.labour_cost || 0,
                    overheadCost: o.overhead_cost || 0,
                    date: o.createdAt,
                })), null, 2)}`,
            );
        }

        if (clients.length > 0) {
            contextParts.push(`## Clients (${clients.length} total)\n${JSON.stringify(clients.slice(0, 10).map((c) => ({ name: c.name, phone: c.phone })), null, 2)}`);
        }

        if (inventory.length > 0) {
            const lowStock = inventory.filter((i) => Number(i.quantity) <= Number(i.min_stock_level));
            contextParts.push(
                `## Inventory (${inventory.length} items, ${lowStock.length} low stock)\n${JSON.stringify(inventory.map((i) => ({
                    name: i.name,
                    stock: i.quantity,
                    unit: i.unit,
                    minLevel: i.min_stock_level,
                    cost: i.purchase_cost_per_unit,
                })), null, 2)}`,
            );
        }

        if (payments.length > 0) {
            const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            contextParts.push(`## Payments (${payments.length} recent, ₹${totalCollected} collected)\n${JSON.stringify(payments.slice(0, 8).map((p) => ({ amount: p.amount, date: p.payment_date, method: p.payment_method })), null, 2)}`);
        }

        const businessContext = contextParts.length > 0
            ? `\n---\n# BUSINESS DATA\n${contextParts.join("\n\n")}\n---`
            : "\n(No business data available.)";

        // ── Call Gemini ─────────────────────────────────────
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const chatHistory = history
            .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
            .slice(-10)
            .map((m: { role: string; content: string }) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            }));

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `${SYSTEM_PROMPT}${businessContext}\n\nAcknowledge briefly.` }],
                },
                {
                    role: "model",
                    parts: [{ text: '{"acknowledged": true}' }],
                },
                ...chatHistory,
            ],
        });

        const result = await chat.sendMessage(question.trim());
        const responseText = result.response.text();

        // ── Parse structured response ──────────────────────
        let structured;
        try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                structured = JSON.parse(jsonMatch[0]);
            } else {
                structured = {
                    summary: responseText.substring(0, 200),
                    data: [],
                    insight: "Unable to parse structured data. Please rephrase your question.",
                    type: "general",
                };
            }
        } catch {
            structured = {
                summary: responseText.substring(0, 200),
                data: [],
                insight: responseText,
                type: "general",
            };
        }

        return NextResponse.json({
            success: true,
            response: structured,
            raw: responseText,
        });
    } catch (error: unknown) {
        console.error("[AI Reports] Error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
