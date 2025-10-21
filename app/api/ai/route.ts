import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { createAgent } from "langchain";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/ai
 * Accepts natural language commands and executes them using LangChain agents
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { text } = body;

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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file"
        },
        { status: 500 }
      );
    }

    console.log("🧠 AI Agent - Processing prompt:", text);

    // Initialize OpenAI LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.3,
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Define tools for the agent with structured schemas
    const tools = [
      new DynamicStructuredTool({
        name: "createUser",
        description: "Create a new user in the database",
        schema: z.object({
          name: z.string().describe("The name of the user"),
          email: z.string().email().describe("The email of the user"),
        }),
        func: async ({ name, email }) => {
          try {
            console.log("🔧 Tool: createUser - Input:", { name, email });
            // fix: use correct convex API reference
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await convex.mutation((api as any)["functions/users"].createUser, { name, email });
            console.log("✅ Tool: createUser - Result:", result);
            return result;
          } catch (error) {
            console.error("❌ Tool: createUser - Error:", error);
            return `❌ Error creating user: ${error instanceof Error ? error.message : "Unknown error"}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: "getUser",
        description: "Retrieve user details by email",
        schema: z.object({
          email: z.string().email().describe("The email of the user to retrieve"),
        }),
        func: async ({ email }) => {
          try {
            console.log("🔧 Tool: getUser - Input:", { email });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await convex.query((api as any)["functions/users"].getUser, { email });
            console.log("✅ Tool: getUser - Result:", result);
            return result;
          } catch (error) {
            console.error("❌ Tool: getUser - Error:", error);
            return `❌ Error getting user: ${error instanceof Error ? error.message : "Unknown error"}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: "deleteUser",
        description: "Delete a user by email",
        schema: z.object({
          email: z.string().email().describe("The email of the user to delete"),
        }),
        func: async ({ email }) => {
          try {
            console.log("🔧 Tool: deleteUser - Input:", { email });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await convex.mutation((api as any)["functions/users"].deleteUser, { email });
            console.log("✅ Tool: deleteUser - Result:", result);
            return result;
          } catch (error) {
            console.error("❌ Tool: deleteUser - Error:", error);
            return `❌ Error deleting user: ${error instanceof Error ? error.message : "Unknown error"}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: "listUsers",
        description: "List all users in the database",
        schema: z.object({}),
        func: async () => {
          try {
            console.log("🔧 Tool: listUsers - Executing");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await convex.query((api as any)["functions/users"].listUsers, {});
            console.log("✅ Tool: listUsers - Result:", result);
            return result;
          } catch (error) {
            console.error("❌ Tool: listUsers - Error:", error);
            return `❌ Error listing users: ${error instanceof Error ? error.message : "Unknown error"}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: "updateUser",
        description: "Update user information",
        schema: z.object({
          email: z.string().email().describe("The email of the user to update"),
          name: z.string().optional().describe("New name for the user"),
          bio: z.string().optional().describe("New bio for the user"),
          location: z.string().optional().describe("New location for the user"),
          website: z.string().optional().describe("New website for the user"),
        }),
        func: async (args) => {
          try {
            console.log("🔧 Tool: updateUser - Input:", args);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await convex.mutation((api as any)["functions/users"].updateUser, args);
            console.log("✅ Tool: updateUser - Result:", result);
            return result;
          } catch (error) {
            console.error("❌ Tool: updateUser - Error:", error);
            return `❌ Error updating user: ${error instanceof Error ? error.message : "Unknown error"}`;
          }
        },
      }),
    ];

    // Create the React agent
    console.log("🤖 Initializing React agent...");
    const agent = await createAgent({
      model: llm,
      tools,
    });

    // Execute the agent
    console.log("🚀 Executing agent with prompt:", text);
    const result = await agent.invoke({
      messages: [{ role: "human", content: text }]
    });

    console.log("✨ Agent execution complete:", result);

    // Return the result
    return NextResponse.json({
      success: true,
      result: result.messages[result.messages.length - 1]?.content || "No response generated",
      reasoning: result.messages || [],
    });

  } catch (error) {
    console.error("❌ API Route Error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
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
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
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
