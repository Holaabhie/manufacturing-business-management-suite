import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { Content, FunctionDeclaration, Part } from "@google/genai";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const maxDuration = 60;

// ─── Constants ──────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 10;

// ─── System Instruction ─────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are **IND Manager AI Assistant** — an intelligent, read-only business advisor for a manufacturing company using the IND Manager platform.

Language: Respond in the same language the user writes. You support both English and Hinglish (Hindi-English mix). If the user writes in Hindi/Hinglish, respond naturally in Hinglish.

Your capabilities:
- Query live business data using the tools provided (orders, pending orders, order details)
- Present data clearly with markdown formatting (**bold**, bullet points, tables)
- Use ₹ (Indian Rupees) for ALL currency figures — format as ₹XX,XX,XXX (Indian numbering)
- Use relevant emojis sparingly to make responses scannable

Rules:
1. You are READ-ONLY. You cannot create, update, or delete any data. If asked to do so, politely explain you can only view data right now.
2. ONLY answer based on data returned by your tools. If a tool returns no data, say so honestly.
3. NEVER fabricate or hallucinate data — no invented order IDs, amounts, statuses, or client names.
4. If a tool returns an error or empty result, report that clearly instead of guessing.
5. Keep responses concise but thorough. Use bullet points and tables for lists.
6. Proactively suggest follow-up questions when relevant.
7. For greetings or non-data questions, respond warmly and offer to help with specific areas (orders, pending payments, order details, etc.).
8. If the user's question is ambiguous, ask for clarification.`;

// ─── Tool Declarations ──────────────────────────────────────────

const orderToolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_pending_orders",
    description:
      "Get all active/pending orders that are NOT fully completed. An order is pending if its production is not completed OR its payment is not fully paid. Excludes cancelled orders. Returns count and summary with outstanding amounts.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description:
            "Maximum number of pending orders to return. Defaults to 20, max 50.",
        },
      },
    },
  },
  {
    name: "get_orders",
    description:
      "Get orders with optional filters. Use this for general order queries — listing all orders, filtering by status, searching by product name, or getting recent orders.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            'Filter by order status: "pending", "processing", "completed", "cancelled"',
        },
        payment_status: {
          type: "string",
          description:
            'Filter by payment status: "pending", "partial", "paid"',
        },
        production_status: {
          type: "string",
          description:
            'Filter by production status: "pending", "processing", "completed"',
        },
        product_name: {
          type: "string",
          description: "Search by product name (case-insensitive partial match)",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of orders to return. Defaults to 20, max 50.",
        },
      },
    },
  },
  {
    name: "get_order_details",
    description:
      "Get complete details of a specific order by its ID. Returns full order information including client name, amounts, payment status, production status, materials, and dates.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "The MongoDB ObjectId string of the order to look up.",
        },
      },
      required: ["order_id"],
    },
  },
];

// ─── Tool Execution Functions ───────────────────────────────────

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ownerId: string
): Promise<Record<string, unknown>> {
  const db = await getDb();

  switch (toolName) {
    case "get_pending_orders": {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);

      const pendingOrders = await db
        .collection("orders")
        .aggregate([
          {
            $match: {
              userId: ownerId,
              status: { $ne: "cancelled" },
              $or: [
                { production_status: { $ne: "completed" } },
                { production_status: { $exists: false } },
                { payment_status: { $ne: "paid" } },
              ],
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          // Client lookup
          {
            $addFields: {
              client_oid: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$client_id", null] },
                      { $ne: ["$client_id", ""] },
                    ],
                  },
                  then: { $toObjectId: "$client_id" },
                  else: null,
                },
              },
            },
          },
          {
            $lookup: {
              from: "clients",
              localField: "client_oid",
              foreignField: "_id",
              as: "client",
            },
          },
          {
            $project: {
              _id: 1,
              product_name: 1,
              quantity: 1,
              unit: 1,
              total_amount: 1,
              total_paid: 1,
              balance_due: 1,
              status: 1,
              production_status: 1,
              payment_status: 1,
              delivery_date: 1,
              priority: 1,
              createdAt: 1,
              client: { $arrayElemAt: ["$client", 0] },
            },
          },
        ])
        .toArray();

      // Also get total count of pending orders (not just the limited batch)
      const totalPendingCount = await db.collection("orders").countDocuments({
        userId: ownerId,
        status: { $ne: "cancelled" },
        $or: [
          { production_status: { $ne: "completed" } },
          { production_status: { $exists: false } },
          { payment_status: { $ne: "paid" } },
        ],
      });

      const formatted = pendingOrders.map((o: Record<string, unknown>) => {
        const totalAmount = Number(o.total_amount || 0);
        const totalPaid = Number(o.total_paid || 0);
        const balanceDue = Number(o.balance_due ?? (totalAmount - totalPaid));
        return {
          id: String(o._id),
          product_name: o.product_name,
          quantity: o.quantity,
          unit: o.unit || "kg",
          total_amount: totalAmount,
          total_paid: totalPaid,
          balance_due: balanceDue,
          status: o.status,
          production_status: o.production_status || "pending",
          payment_status: o.payment_status || "pending",
          delivery_date: o.delivery_date || null,
          priority: o.priority || "normal",
          created_at: o.createdAt,
          client_name: (o.client as Record<string, unknown> | undefined)?.name || "Walk-in",
        };
      });

      const totalOutstanding = formatted.reduce(
        (sum: number, o: { balance_due: number }) => sum + Math.max(0, o.balance_due),
        0
      );

      return {
        total_pending_count: totalPendingCount,
        showing: formatted.length,
        total_outstanding_amount: totalOutstanding,
        orders: formatted,
      };
    }

    case "get_orders": {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      const matchFilter: Record<string, unknown> = { userId: ownerId };

      if (args.status && typeof args.status === "string") {
        matchFilter.status = args.status;
      }
      if (args.payment_status && typeof args.payment_status === "string") {
        matchFilter.payment_status = args.payment_status;
      }
      if (args.production_status && typeof args.production_status === "string") {
        matchFilter.production_status = args.production_status;
      }
      if (args.product_name && typeof args.product_name === "string") {
        matchFilter.product_name = {
          $regex: args.product_name,
          $options: "i",
        };
      }

      const orders = await db
        .collection("orders")
        .aggregate([
          { $match: matchFilter },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $addFields: {
              client_oid: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$client_id", null] },
                      { $ne: ["$client_id", ""] },
                    ],
                  },
                  then: { $toObjectId: "$client_id" },
                  else: null,
                },
              },
            },
          },
          {
            $lookup: {
              from: "clients",
              localField: "client_oid",
              foreignField: "_id",
              as: "client",
            },
          },
          {
            $project: {
              _id: 1,
              product_name: 1,
              quantity: 1,
              unit: 1,
              total_amount: 1,
              total_paid: 1,
              balance_due: 1,
              status: 1,
              production_status: 1,
              payment_status: 1,
              delivery_date: 1,
              priority: 1,
              createdAt: 1,
              client: { $arrayElemAt: ["$client", 0] },
            },
          },
        ])
        .toArray();

      const formatted = orders.map((o: Record<string, unknown>) => {
        const totalAmount = Number(o.total_amount || 0);
        const totalPaid = Number(o.total_paid || 0);
        const balanceDue = Number(o.balance_due ?? (totalAmount - totalPaid));
        return {
          id: String(o._id),
          product_name: o.product_name,
          quantity: o.quantity,
          unit: o.unit || "kg",
          total_amount: totalAmount,
          total_paid: totalPaid,
          balance_due: balanceDue,
          status: o.status,
          production_status: o.production_status || "pending",
          payment_status: o.payment_status || "pending",
          delivery_date: o.delivery_date || null,
          priority: o.priority || "normal",
          created_at: o.createdAt,
          client_name: (o.client as Record<string, unknown> | undefined)?.name || "Walk-in",
        };
      });

      return {
        count: formatted.length,
        filters_applied: Object.keys(matchFilter).filter((k) => k !== "userId"),
        orders: formatted,
      };
    }

    case "get_order_details": {
      const orderId = args.order_id as string;
      if (!orderId) {
        return { error: "order_id is required" };
      }

      // Validate ObjectId format
      let oid: ObjectId;
      try {
        oid = new ObjectId(orderId);
      } catch {
        return {
          error: `Invalid order ID format: "${orderId}". Order IDs are 24-character hex strings.`,
        };
      }

      const results = await db
        .collection("orders")
        .aggregate([
          { $match: { _id: oid, userId: ownerId } },
          {
            $addFields: {
              client_oid: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$client_id", null] },
                      { $ne: ["$client_id", ""] },
                    ],
                  },
                  then: { $toObjectId: "$client_id" },
                  else: null,
                },
              },
            },
          },
          {
            $lookup: {
              from: "clients",
              localField: "client_oid",
              foreignField: "_id",
              as: "client",
            },
          },
        ])
        .toArray();

      if (results.length === 0) {
        return {
          error: `Order with ID "${orderId}" not found. It may not exist or may belong to a different account.`,
        };
      }

      const o = results[0];
      const totalAmount = Number(o.total_amount || o.grand_total || 0);
      const totalPaid = Number(o.total_paid || 0);
      const balanceDue = Number(o.balance_due ?? (totalAmount - totalPaid));

      return {
        order: {
          id: String(o._id),
          product_name: o.product_name,
          quantity: o.quantity,
          unit: o.unit || "kg",
          rate: Number(o.rate || 0),
          total_amount: totalAmount,
          total_paid: totalPaid,
          balance_due: balanceDue,
          status: o.status,
          production_status: o.production_status || "pending",
          payment_status: o.payment_status || "pending",
          delivery_date: o.delivery_date || null,
          priority: o.priority || "normal",
          material_source: o.material_source || "own",
          material_cost: Number(o.material_cost || 0),
          labour_cost: Number(o.labour_cost || 0),
          overhead_cost: Number(o.overhead_cost || 0),
          estimated_gross_profit: Number(o.estimated_gross_profit || 0),
          estimated_margin: Number(o.estimated_margin || 0),
          notes: o.notes || "",
          materials: o.materials || [],
          created_at: o.createdAt,
          processed_at: o.processedAt || null,
          completed_at: o.completedAt || null,
          client_name: (o.client as Array<Record<string, unknown>> | undefined)?.[0]?.name || "Walk-in",
          client_phone: (o.client as Array<Record<string, unknown>> | undefined)?.[0]?.phone || null,
        },
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Retry & Safety Helpers ─────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MUTATING_TOOLS = new Set<string>([
  "create_order",
  "update_order",
  "delete_order",
]);

function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("429") ||
    msg.includes("RATE_LIMIT") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("network")
  );
}

// ─── POST Handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 }
      );
    }

    if (user.role !== "Admin" && user.role !== "Owner") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        },
        { status: 403 }
      );
    }
    const ownerId = getDataOwnerId(user);

    // ── API Key Check ───────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Gemini API key not configured.",
          },
        },
        { status: 500 }
      );
    }

    // ── Parse & Validate Request ────────────────────────
    const body = await req.json();
    const { message, history = [] } = body;
    // NOTE: body.context is intentionally ignored — all business data
    // comes exclusively from tool execution against the authenticated ownerId.

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Message is required." },
        },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
          },
        },
        { status: 400 }
      );
    }

    // ── Build Contents Array ─────────────────────────────
    // Map client history (role: "assistant" -> "model") and take last N items
    const validHistory = (Array.isArray(history) ? history : [])
      .filter(
        (msg: { role?: string; content?: string }) =>
          msg &&
          typeof msg.content === "string" &&
          (msg.role === "user" || msg.role === "assistant")
      )
      .slice(-MAX_HISTORY_ITEMS)
      .map(
        (msg: { role: string; content: string }): Content => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })
      );

    const contents: Content[] = [
      ...validHistory,
      { role: "user", parts: [{ text: message.trim() }] },
    ];

    // ── Initialize Gemini ───────────────────────────────
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });

    // Track whether any mutating tool was run in this request
    let hasMutated = false;

    // Retry runner for single generateContent calls
    async function callGeminiWithRetry(currentContents: Content[]) {
      const maxRetries = 2; // total 3 attempts
      const backoffs = [800, 2000]; // total backoff: 2.8s, well within route budget
      let lastErr: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await ai.models.generateContent({
            model: modelName,
            contents: currentContents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations: orderToolDeclarations }],
            },
          });
        } catch (err) {
          lastErr = err;
          console.error(`[AI Assistant] Gemini attempt ${attempt + 1} failed:`, err);

          // If a mutating tool already ran, NEVER retry
          if (hasMutated) {
            throw err;
          }

          if (attempt < maxRetries && isRetryableError(err)) {
            await sleep(backoffs[attempt]);
            continue;
          }
          break;
        }
      }

      // If primary model retries failed, check for optional fallback model
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL;
      if (
        fallbackModel &&
        fallbackModel !== modelName &&
        !hasMutated &&
        isRetryableError(lastErr)
      ) {
        try {
          console.log(`[AI Assistant] Attempting fallback model: ${fallbackModel}`);
          return await ai.models.generateContent({
            model: fallbackModel,
            contents: currentContents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations: orderToolDeclarations }],
            },
          });
        } catch (fallbackErr) {
          console.error(`[AI Assistant] Fallback model failed:`, fallbackErr);
          throw fallbackErr;
        }
      }

      throw lastErr;
    }

    // ── Tool-Calling Loop ───────────────────────────────
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await callGeminiWithRetry(contents);

      // If no function calls, we have a final text response
      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        const text =
          response.text || "I apologize, but I could not generate a response.";
        return NextResponse.json({ success: true, response: text });
      }

      // ── Execute ALL function calls in this turn ─────
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      // Batch all function responses into ONE content entry (role: "user")
      const functionResponseParts: Part[] = [];

      for (const fc of functionCalls) {
        const fnName = fc.name || "unknown";
        const fnArgs = (fc.args || {}) as Record<string, unknown>;

        if (MUTATING_TOOLS.has(fnName)) {
          hasMutated = true;
        }

        let result: Record<string, unknown>;
        try {
          result = await executeTool(fnName, fnArgs, ownerId);
        } catch (err) {
          console.error(`[AI Assistant] Tool execution error (${fnName}):`, err);
          result = {
            error: `Failed to execute ${fnName}: ${err instanceof Error ? err.message : "Unknown error"}`,
          };
        }

        functionResponseParts.push({
          functionResponse: {
            name: fnName,
            response: result,
          },
        });
      }

      contents.push({
        role: "user",
        parts: functionResponseParts,
      });
    }

    // If we exhausted iterations, send what we have
    return NextResponse.json({
      success: true,
      response:
        "I was working on your request but it required too many steps. Please try a simpler question or be more specific.",
    });
  } catch (error: unknown) {
    console.error("[AI Assistant] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle specific Gemini errors
    if (errorMessage.includes("API_KEY") || errorMessage.includes("API key")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_API_KEY",
            message: "Invalid Gemini API key. Please check your configuration.",
          },
        },
        { status: 401 }
      );
    }
    if (
      errorMessage.includes("RATE_LIMIT") ||
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT",
            message: "The AI is busy right now. Please try again in a moment.",
          },
        },
        { status: 429 }
      );
    }
    if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "The AI is busy right now. Please try again in a moment.",
          },
        },
        { status: 503 }
      );
    }
    if (errorMessage.includes("SAFETY")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SAFETY_BLOCKED",
            message:
              "The response was blocked by safety filters. Please rephrase your question.",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Something went wrong. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
