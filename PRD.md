🧠 Product Requirements Document (PRD)
Project Name: Autonomous AI Backend with LangChain + Next.js + Convex
🧭 1. Overview
Goal

Build an autonomous AI-powered backend that interprets natural language commands and executes database actions (create, read, delete users, etc.) via LangChain agents, connected to a Convex database, within a Next.js app.

Core Idea

Users can type prompts like:

“Add a user named Alice with email alice@example.com
.”

The system will:

Parse the natural language prompt using OpenAI (via LangChain.js).

Determine which Convex database action to take (e.g., createUser).

Execute it safely and return a structured result.

🎯 2. Objectives
#	Objective	Description
1	Natural language execution	Allow AI to interpret and execute database operations (CRUD) autonomously.
2	Secure database manipulation	Only allow predefined Convex functions to be called, with input validation.
3	Reusable backend	Provide modular design for easily adding new tools/functions.
4	Transparent reasoning	Log every AI reasoning step and tool execution.
5	Developer-friendly	Easy to deploy and extend (Next.js API routes + Convex).
🧩 3. Architecture Overview
System Diagram
Frontend (Next.js)
  ↓
API Route (/api/ai)
  ↓
LangChain Agent (OpenAI GPT-4o-mini)
  ↓
Tool Layer (Convex API Functions)
  ↓
Convex Database (users table)

Main Components
Component	Description
Next.js App	Hosts API routes and (optional) UI
LangChain Agent	LLM reasoning engine that plans and executes actions
Convex Backend	Manages data persistence (users table, queries, mutations)
OpenAI GPT-4o-mini	Underlying LLM for reasoning
Environment Config (.env)	Stores API keys and Convex URL
🧱 4. Functional Requirements
4.1 Core Features
1️⃣ Natural Language Processing

The system accepts text prompts like:

“Create a user named John with email john@example.com
”

“Get the details for mary@company.com
”

“Delete the user bob@demo.com
”

2️⃣ LangChain Function Calling

Uses ChatOpenAI with function calling capabilities.

Defines OpenAI function schemas for each database operation.

Automatically selects which Convex function to invoke based on user intent.

Uses structured logging with AILogger for transparency.

Handles function call results and generates natural language responses.

3️⃣ Convex Database

Stores users with expanded schema:

{
  name: "string",
  email: "string",
  bio: "optional<string>",
  location: "optional<string>",
  website: "optional<string>",
  emailVerificationTime: "optional<number>"
}

Exposes 5 backend functions:

createUser({ name, email })

getUser({ email })

deleteUser({ email })

listUsers({})

updateUser({ email, name?, bio?, location?, website? })

4️⃣ API Endpoint

Endpoint: POST /api/ai

Accepts: { "text": "Natural language prompt" }

Returns: { "success": true, "result": "Action outcome", "reasoning": [...] }

Validates response before executing any database mutation.

Includes comprehensive error handling for API key, quota, and rate limit issues.

5️⃣ Reasoning + Transparency

Uses OpenAI function calling for structured tool execution.

Maintains conversation context through message history.

Provides detailed reasoning steps in API responses.

Logs all tool executions with timestamps and structured data.

Example: "If bob@example.com exists, delete him; otherwise, create him."

Agent runs getUser() first, checks result, then chooses next step.

6️⃣ Safety & Logging

Uses AILogger class for structured, timestamped logging.

Logs all AI decisions and tool executions to server console.

Ensures email format validation before creating users.

Prevents unauthorized tool access — only whitelisted functions.

Comprehensive error handling with specific error types.

Development mode includes detailed error information.

🧰 5. Technical Design
5.1 Next.js Directory Structure
/app
  /api
    /ai
      route.ts              → LangChain function calling + Convex integration
/convex
  schema.ts                 → Database schema
  functions/
    users.ts                → Convex functions (create, read, update, delete, list)
/.env.local                 → Environment variables

5.2 Environment Variables
Variable	Description
OPENAI_API_KEY	OpenAI API key
NEXT_PUBLIC_CONVEX_URL	Convex deployment URL
5.3 Convex Schema

convex/schema.ts

import { defineSchema, defineTable } from "convex/schema";

export default defineSchema({
  users: defineTable({
    name: "string",
    email: "string",
    bio: "optional<string>",
    location: "optional<string>",
    website: "optional<string>",
    emailVerificationTime: "optional<number>",
  }),
});

5.4 Convex Functions

convex/functions/users.ts

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error(`❌ Invalid email format: ${args.email}`);
    }

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUser) {
      return `⚠️ User with email ${args.email} already exists`;
    }

    // Create the new user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      emailVerificationTime: Date.now(), // Mark as verified for demo purposes
    });

    return `✅ Created user ${args.name} (${args.email})`;
  },
});

export const getUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return `❌ No user found with email ${args.email}`;
    }

    return `👤 Found user: ${user.name} (${user.email})${
      user.emailVerificationTime ? " - Email verified" : ""
    }`;
  },
});

export const deleteUser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return `❌ No user found with email ${args.email}`;
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return `🗑️ Deleted user ${user.name} with email ${args.email}`;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    if (users.length === 0) {
      return "📝 No users found in the database";
    }

    const userList = users
      .map((user) => `- ${user.name} (${user.email})`)
      .join("\n");

    return `📋 Found ${users.length} user(s):\n${userList}`;
  },
});

export const updateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return `❌ No user found with email ${args.email}`;
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.location !== undefined) updates.location = args.location;
    if (args.website !== undefined) updates.website = args.website;

    // Update the user
    await ctx.db.patch(user._id, updates);

    return `✅ Updated user ${user.name} (${args.email})`;
  },
});

5.5 LangChain Agent Implementation

app/api/ai/route.ts

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

      if (error.message.includes("quota")) {
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI API quota exceeded. Please check your OpenAI account."
          },
          { status: 429 }
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
        details: process.env.NODE_ENV === "development" ? error : undefined
      },
      { status: 500 }
    );
  }
}

📡 6. API Specifications
Method	Endpoint	Input	Output
POST	/api/ai	{ "text": "natural language instruction" }	{ "success": true, "result": "execution result", "reasoning": [...] }

Example Input:

{ "text": "Create a user named Alice with email alice@example.com" }

Example Output:

{ 
  "success": true,
  "result": "I've successfully created a new user named Alice with email alice@example.com.",
  "reasoning": [
    {
      "action": "createUser",
      "input": { "name": "Alice", "email": "alice@example.com" },
      "observation": "✅ Created user Alice (alice@example.com)"
    }
  ]
}

🧠 7. Agent Reasoning Flow

1. Receive user input from /api/ai
2. Initialize ChatOpenAI with function calling capabilities
3. Send system message + user prompt to LLM with function definitions
4. LLM decides whether to use a function or respond directly
5. If function call is made:
   - Parse function name and arguments
   - Execute corresponding tool function (createUser, getUser, etc.)
   - Log tool execution with AILogger
   - Send tool result back to LLM for final response
6. Return structured response with result and reasoning steps

Example Flow:
- Input: "Create a user named Alice with email alice@example.com"
- LLM decides to call createUser function
- Tool execution: convex.mutation(api.functions.users.createUser, {name: "Alice", email: "alice@example.com"})
- Tool result: "✅ Created user Alice (alice@example.com)"
- LLM generates final response: "I've successfully created a new user named Alice with email alice@example.com."
- Response includes reasoning steps for transparency

🔐 8. Security Considerations
Concern	Mitigation
AI injection (prompt exploits)	Validate all AI output as JSON before execution
Email format errors	Regex validation in tool layer
Unauthorized DB operations	Only expose approved Convex functions
Logging sensitive data	Sanitize logs
Model rate limits	Cache or queue requests if needed
🧰 9. Deployment Plan
Component	Platform	Notes
Next.js App	Vercel / Netlify / Railway	Deployed with /api/ai endpoint
Convex Backend	Convex Cloud	Auto-scaled, persistent DB
OpenAI API	OpenAI	API key stored in .env.local
📈 10. Future Enhancements
Feature	Description
🧩 Add memory	Use LangChain memory to maintain long-term state across sessions
🧠 Multi-agent	Add planner/researcher agents for more complex workflows
🧾 Audit trail	Store AI actions + reasoning logs in Convex for transparency
⚙️ More tools	Add updateUser, listUsers, sendEmail functions

✅ 11. Success Criteria
Metric	Target
Natural-language command accuracy	≥ 95% correctly interpreted
API latency	< 3 seconds end-to-end
AI error rate	< 5% invalid JSON responses
Database consistency	100% (via Convex ACID guarantees)
Extensibility	New tool added in <10 min
🔄 12. Key Implementation Updates

**Architecture Changes:**
- Migrated from LangChain AgentExecutor to OpenAI Function Calling
- Replaced DynamicStructuredTool with native OpenAI function definitions
- Added structured logging with AILogger class
- Enhanced error handling with specific error types

**New Features:**
- Added listUsers and updateUser functions
- Expanded user schema with bio, location, website fields
- Comprehensive API response format with reasoning steps
- Development/production error detail handling

**Import Fixes:**
- Updated to use @langchain/core/messages for message types
- Removed deprecated LangChain agent imports
- Fixed Convex API references to use api.functions.users.* pattern
- Added proper TypeScript type assertions

**Error Prevention:**
- Comprehensive API key validation
- Structured function parameter validation
- Proper error logging and user feedback
- Type-safe Convex function calls

🏁 13. Summary

This system provides:

A Next.js-based autonomous AI backend

OpenAI Function Calling for reliable tool execution

Convex-managed database for persistent, real-time data

Structured logging and comprehensive error handling

Safe, modular, and extendable architecture
Perfect for scalable AI-driven SaaS products or internal automation systems.