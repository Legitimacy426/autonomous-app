import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

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

  info(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🧠 ${this.context} - ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${this.context} - ${message}`, error || "");
  }

  success(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${this.context} - ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  tool(toolName: string, input: any, result: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔧 Tool: ${toolName}`);
    console.log(`   Input:`, JSON.stringify(input, null, 2));
    console.log(`   Result:`, result);
  }
}

const logger = new AILogger("AI Agent");

// Define the tool functions
const toolFunctions = {
  createUser: async (args: { name: string; email: string }) => {
    try {
      logger.tool("createUser", args, "Executing...");
      const result = await convex.mutation(api.functions.users.createUser, args);
      logger.success("createUser completed", result);
      return result;
    } catch (error) {
      logger.error("createUser failed", error);
      return `❌ Error creating user: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },

  getUser: async (args: { email: string }) => {
    try {
      logger.tool("getUser", args, "Executing...");
      const result = await convex.query(api.functions.users.getUser, args);
      logger.success("getUser completed", result);
      return result;
    } catch (error) {
      logger.error("getUser failed", error);
      return `❌ Error getting user: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },

  deleteUser: async (args: { email: string }) => {
    try {
      logger.tool("deleteUser", args, "Executing...");
      const result = await convex.mutation(api.functions.users.deleteUser, args);
      logger.success("deleteUser completed", result);
      return result;
    } catch (error) {
      logger.error("deleteUser failed", error);
      return `❌ Error deleting user: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },

  listUsers: async () => {
    try {
      logger.tool("listUsers", {}, "Executing...");
      const result = await convex.query(api.functions.users.listUsers, {});
      logger.success("listUsers completed", result);
      return result;
    } catch (error) {
      logger.error("listUsers failed", error);
      return `❌ Error listing users: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },

  updateUser: async (args: { 
    email: string; 
    name?: string; 
    bio?: string; 
    location?: string; 
    website?: string; 
  }) => {
    try {
      logger.tool("updateUser", args, "Executing...");
      const result = await convex.mutation(api.functions.users.updateUser, args);
      logger.success("updateUser completed", result);
      return result;
    } catch (error) {
      logger.error("updateUser failed", error);
      return `❌ Error updating user: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};

// OpenAI function definitions
const functions = [
  {
    name: "createUser",
    description: "Create a new user in the database",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The full name of the user" },
        email: { type: "string", description: "The email address of the user" }
      },
      required: ["name", "email"]
    }
  },
  {
    name: "getUser",
    description: "Retrieve user details by email",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "The email of the user to retrieve" }
      },
      required: ["email"]
    }
  },
  {
    name: "deleteUser",
    description: "Delete a user by email",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "The email of the user to delete" }
      },
      required: ["email"]
    }
  },
  {
    name: "listUsers",
    description: "List all users in the database",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "updateUser",
    description: "Update user information",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "The email of the user to update" },
        name: { type: "string", description: "New name for the user" },
        bio: { type: "string", description: "New bio for the user" },
        location: { type: "string", description: "New location for the user" },
        website: { type: "string", description: "New website for the user" }
      },
      required: ["email"]
    }
  }
];

/**
 * Execute a prompt with tools
 */
async function executeWithTools(prompt: string) {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
    apiKey: process.env.OPENAI_API_KEY,
  });

  // System message
  const systemMessage = new SystemMessage(
    `You are an AI assistant that helps manage users in a database. You can create, read, update, and delete users.
    
Available functions:
- createUser: Create a new user with name and email
- getUser: Get user details by email
- deleteUser: Delete a user by email
- listUsers: List all users in the database
- updateUser: Update user information (name, bio, location, website)

When the user asks you to perform an action, use the appropriate function.
Always be helpful and clear in your responses.`
  );

  const humanMessage = new HumanMessage(prompt);

  // Get initial response with functions
  const response = await llm.invoke([systemMessage, humanMessage], {
    functions,
  });

  const intermediateSteps: any[] = [];
  let finalResult = "";

  // Check if the model wants to use a function
  const functionCall = (response as any).additional_kwargs?.function_call;
  
  if (functionCall) {
    const toolName = functionCall.name as keyof typeof toolFunctions;
    const toolInput = JSON.parse(functionCall.arguments);
    
    logger.info(`Using tool: ${toolName}`, toolInput);
    
    // Execute the appropriate tool
    let toolResult = "";
    if (toolName in toolFunctions) {
      toolResult = await toolFunctions[toolName](toolInput);
    } else {
      toolResult = `Unknown tool: ${toolName}`;
    }
    
    intermediateSteps.push({
      action: { tool: toolName, toolInput },
      observation: toolResult
    });

    // Get final response with the tool result
    const messages = [
      systemMessage,
      humanMessage,
      new AIMessage({
        content: "",
        additional_kwargs: { function_call: functionCall }
      }),
      new HumanMessage(`Function ${toolName} returned: ${toolResult}`)
    ];

    const finalResponse = await llm.invoke(messages);
    finalResult = finalResponse.content as string;
  } else {
    // Direct response without tool use
    finalResult = response.content as string;
  }

  return { output: finalResult, intermediateSteps };
}

/**
 * POST /api/ai
 * Accepts natural language commands and executes them using LangChain
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
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured. Please add a valid OPENAI_API_KEY to your .env.local file"
        },
        { status: 500 }
      );
    }

    logger.info("Processing prompt", { text });

    // Execute with tools
    logger.info("Executing with tools...");
    const result = await executeWithTools(text);
    
    logger.success("Execution completed", {
      output: result.output,
      steps: result.intermediateSteps?.length || 0
    });

    // Format the response
    const response = {
      success: true,
      result: result.output,
      reasoning: result.intermediateSteps?.map((step: any) => ({
        action: step.action.tool,
        input: step.action.toolInput,
        observation: step.observation
      })) || [],
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
