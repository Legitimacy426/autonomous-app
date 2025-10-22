import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { SmartCoordinator } from "../agents/smart-coordinator";
import { ConvexMemory } from "../memory/convex-memory";
import { v4 as uuidv4 } from "uuid";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Logger utility for consistent logging format
 */
class AILogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🧠 ${this.context} - ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  error(message: string, error?: Error | string | unknown) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${this.context} - ${message}`, error || "");
  }

  success(message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${this.context} - ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
}

const logger = new AILogger("AI Agent");

// Initialize smart coordinator
const coordinator = new SmartCoordinator(convex);

/**
 * POST /api/ai
 * Accepts natural language commands and executes them using LangChain
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { text, sessionId = uuidv4() } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'text' field in request body"
        },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured. Please add a valid OPENAI_API_KEY to your .env.local file"
        },
        { status: 500 }
      );
    }

    // Initialize memory
    const memory = new ConvexMemory(convex, sessionId);

    // Process task through smart coordinator
    const result = await coordinator.processTask(text);
    
    // Save interaction to memory
    await memory.saveContext(
      { input: text },
      { output: coordinator.getSummary(result) }
    );

    // Format the response
    const response = {
      success: result.success,
      result: coordinator.formatResults(result),
      reasoning: result.reasoning,
      strategy: result.strategy,
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error("API Route Error", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("API key") || error.message.includes("Incorrect API key")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local"
          },
          { status: 401 }
        );
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI API rate limit exceeded. Please try again later."
          },
          { status: 429 }
        );
      }

      if (error.message.includes("quota")) {
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI API quota exceeded. Please check your OpenAI account."
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: process.env.NODE_ENV === "development" ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
