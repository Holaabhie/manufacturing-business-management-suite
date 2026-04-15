import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are **IND Manager AI Assistant** — an intelligent business advisor for a manufacturing company using the IND Manager platform.

Your capabilities:
- Analyze orders, payments, inventory, production data, and client info
- Provide actionable business insights and recommendations
- Answer questions about the business in a friendly, professional manner
- Format responses with markdown (**bold**, bullet points, tables) for readability
- Use ₹ (Indian Rupees) for all currency figures
- Use relevant emojis sparingly to make responses scannable

Rules:
1. Only answer based on the provided business context. If data is missing, say so.
2. Keep responses concise but thorough. Use bullet points and tables.
3. Proactively suggest follow-up actions when relevant.
4. If the user's question is ambiguous, ask for clarification.
5. Never fabricate data — only reference what's in the context.
6. For greetings, respond warmly and offer to help with specific areas.`;

interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API key not configured. Please set GEMINI_API_KEY in your .env.local file.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history = [], context = {} } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required." },
        { status: 400 }
      );
    }

    // Build context summary from business data
    const contextParts: string[] = [];

    if (context.stats && Object.keys(context.stats).length > 0) {
      contextParts.push(
        `## Dashboard Stats\n${JSON.stringify(context.stats, null, 2)}`
      );
    }
    if (context.orders?.length > 0) {
      contextParts.push(
        `## Recent Orders (${context.orders.length} shown)\n${JSON.stringify(context.orders.slice(0, 15), null, 2)}`
      );
    }
    if (context.payments?.length > 0) {
      contextParts.push(
        `## Recent Payments (${context.payments.length} shown)\n${JSON.stringify(context.payments.slice(0, 15), null, 2)}`
      );
    }
    if (context.inventory?.length > 0) {
      contextParts.push(
        `## Inventory (${context.inventory.length} items)\n${JSON.stringify(context.inventory.slice(0, 20), null, 2)}`
      );
    }
    if (context.clients?.length > 0) {
      contextParts.push(
        `## Clients (${context.clients.length} total)\n${JSON.stringify(context.clients.slice(0, 15), null, 2)}`
      );
    }

    const businessContext =
      contextParts.length > 0
        ? `\n\n---\n# CURRENT BUSINESS DATA\n${contextParts.join("\n\n")}\n---`
        : "\n\n(No business data available at the moment.)";

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Convert chat history to Gemini format
    const geminiHistory: ChatMessage[] = history
      .filter(
        (msg: { role: string; content: string }) =>
          msg.role === "user" || msg.role === "assistant"
      )
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    // Start chat with system context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}${businessContext}\n\nPlease acknowledge that you understand your role and the data context. Keep the acknowledgment very brief.`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "Understood. I'm ready to assist with your manufacturing business queries using the available data.",
            },
          ],
        },
        ...geminiHistory,
      ],
    });

    const result = await chat.sendMessage(message.trim());
    const response = result.response.text();

    return NextResponse.json({ success: true, response });
  } catch (error: unknown) {
    console.error("[AI Assistant] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle specific Gemini errors
    if (errorMessage.includes("API_KEY")) {
      return NextResponse.json(
        { success: false, error: "Invalid Gemini API key. Please check your configuration." },
        { status: 401 }
      );
    }
    if (errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429")) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    if (errorMessage.includes("SAFETY")) {
      return NextResponse.json(
        {
          success: false,
          error: "The response was blocked by safety filters. Please rephrase your question.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `AI service error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
