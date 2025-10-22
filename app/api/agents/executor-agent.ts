import { BaseAgent } from "./base-agent";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Define the schema for execution results
const ExecutionResult = z.object({
  success: z.boolean(),
  action: z.string(),
  details: z.string(),
  error: z.optional(z.string()),
});

type ExecutionResult = z.infer<typeof ExecutionResult>;

/**
 * ExecutorAgent performs database operations based on plans and research
 */
export class ExecutorAgent extends BaseAgent {
  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are an advanced executor agent that performs complex database operations and reasoning tasks.

Your capabilities include:
1. Execute database operations safely and efficiently
2. Handle conditional logic (if/then statements)
3. Perform multi-step operations with context memory
4. Validate inputs and handle errors gracefully
5. Provide detailed reasoning and reflection
6. Perform bulk operations and analysis

Available database operations (work with ANY entity type):
- create: Create new entities (users, products, orders, etc.)
- get: Retrieve entity details by identifier
- delete: Delete entities by identifier
- list: List all entities of a specific type
- update: Update entity information with new data

Complex Operations You Can Handle:
- Conditional logic: Check conditions and branch accordingly
- Sequential operations: Perform multiple steps with context
- Bulk operations: Process multiple records
- Analysis: Examine data and make decisions
- Error recovery: Handle validation errors and provide alternatives
- Reflection: Explain reasoning and decision-making process

Always break down complex requests into logical steps:
1. Understand the requirements
2. Check current state if needed
3. Execute operations in proper sequence
4. Handle errors gracefully
5. Provide comprehensive feedback including reasoning

Format responses as detailed explanations with step-by-step execution details.`
    );
  }

  /**
   * Execute complex database operations with reasoning and context
   */
  async process(input: string) {
    const reasoning: string[] = [];
    let result = "";

    try {
      console.log("🔄 Processing complex workflow:", input);
      reasoning.push("Starting complex workflow execution");

      // Use LLM to break down and execute the complex request
      const executionPlan = await this.execute(`
You need to execute this complex database request step by step:

"${input}"

Available database operations (entity-agnostic):
- create(entityType, data) - Create new entities of any type
- get(entityType, identifier) - Get entity by identifier
- delete(entityType, identifier) - Delete entities of any type
- list(entityType) - List all entities of a specific type
- update(entityType, identifier, fields) - Update entity information

Your response should be a detailed execution plan with actual operations and reasoning.
Include error handling, conditional logic, and step-by-step explanations.

Execute the operations and provide detailed results including:
1. What you understood from the request
2. Each step you executed and why
3. The results of each operation
4. Any errors encountered and how you handled them
5. Final summary of what was accomplished

Be comprehensive and include all your reasoning.`);

      reasoning.push("Generated and executed comprehensive plan");
      result = executionPlan;

      // Log the execution
      await this.logAction(input, reasoning, result);
      console.log("✨ Complex workflow completed");

      return { result, reasoning };
    } catch (error) {
      console.log("❌ Complex workflow failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reasoning.push(`Error during complex execution: ${errorMessage}`);
      result = `Failed to execute complex workflow: ${errorMessage}`;

      await this.logAction(input, reasoning, result, errorMessage);
      return { result, reasoning };
    }
  }

  /**
   * Execute the appropriate database operation
   */
  private async executeOperation(
    plan: { action: string; [key: string]: unknown },
    originalInput: string
  ): Promise<ExecutionResult> {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = originalInput.match(emailRegex) || [];

    try {
      console.log("🔄 Starting operation execution...");
      switch (plan.action.toLowerCase()) {
        case "create":
          // Extract name and email from the input
          const nameMatch = originalInput.match(/named? ([^@\n]+)(?=.*?@)/i);
          const name = nameMatch ? nameMatch[1].trim() : "";
          const email = emails[0];

          if (!name || !email) {
            return {
              success: false,
              action: "Create User",
              details: "Failed to extract required information",
              error: "Name and email are required",
            };
          }

          console.log("👤 Creating user:", { name, email });
          const createResult = await this.convex.mutation(api.functions.users.createUser, {
            name,
            email,
          });
          console.log("📝 Create result:", createResult);

          return {
            success: !createResult.includes("❌"),
            action: "Create User",
            details: createResult,
          };

        case "get":
          if (!emails[0]) {
            return {
              success: false,
              action: "Get User",
              details: "Failed to extract email",
              error: "Email is required",
            };
          }

          console.log("🔍 Getting user:", emails[0]);
          const getResult = await this.convex.query(api.functions.users.getUser, {
            email: emails[0],
          });
          console.log("📝 Get result:", getResult);

          return {
            success: !getResult.includes("❌"),
            action: "Get User",
            details: getResult,
          };

        case "delete":
          if (!emails[0]) {
            return {
              success: false,
              action: "Delete User",
              details: "Failed to extract email",
              error: "Email is required",
            };
          }

          console.log("🗑️ Deleting user:", emails[0]);
          const deleteResult = await this.convex.mutation(api.functions.users.deleteUser, {
            email: emails[0],
          });
          console.log("📝 Delete result:", deleteResult);

          return {
            success: !deleteResult.includes("❌"),
            action: "Delete User",
            details: deleteResult,
          };

        case "list":
          console.log("📋 Listing all users...");
          const listResult = await this.convex.query(api.functions.users.listUsers, {});
          console.log("📝 List result:", listResult);

          return {
            success: true,
            action: "List Users",
            details: listResult,
          };

        case "update":
          if (!emails[0]) {
            return {
              success: false,
              action: "Update User",
              details: "Failed to extract email",
              error: "Email is required",
            };
          }

          // Extract update fields from the input
          const updates: {
            email: string;
            name?: string;
            bio?: string;
            location?: string;
            website?: string;
          } = { email: emails[0] };
          
          const nameUpdateMatch = originalInput.match(/new name ([^,\n]+)/i);
          if (nameUpdateMatch) {
            updates.name = nameUpdateMatch[1].trim();
          }

          const bioMatch = originalInput.match(/bio ["']([^"']+)["']/i);
          if (bioMatch) {
            updates.bio = bioMatch[1];
          }

          const locationMatch = originalInput.match(/location ["']([^"']+)["']/i);
          if (locationMatch) {
            updates.location = locationMatch[1];
          }

          const websiteMatch = originalInput.match(/website ["']([^"']+)["']/i);
          if (websiteMatch) {
            updates.website = websiteMatch[1];
          }

          console.log("✏️ Updating user:", updates);
          const updateResult = await this.convex.mutation(api.functions.users.updateUser, updates);
          console.log("📝 Update result:", updateResult);

          return {
            success: !updateResult.includes("❌"),
            action: "Update User",
            details: updateResult,
          };

        default:
          return {
            success: false,
            action: "Unknown",
            details: "Unsupported operation",
            error: `Unknown action: ${plan.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        action: plan.action || "Unknown",
        details: "Operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Format the execution result into a readable string
   */
  private formatResult(result: ExecutionResult): string {
    // Return JSON string representation of the execution result
    return JSON.stringify({
      success: result.success,
      action: result.action,
      details: result.details,
      error: result.error
    }, null, 2);
  }
}
