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
      `You are an executor agent that performs database operations.
Your role is to:
1. Execute database operations safely and efficiently
2. Handle errors gracefully
3. Validate inputs before execution
4. Provide clear feedback on actions taken

Available tools:
- createUser: Create a new user with name and email
- getUser: Get user details by email
- deleteUser: Delete a user by email
- listUsers: List all users in the database
- updateUser: Update user information (name, bio, location, website)

Format your execution results as a JSON object with the following structure:
{
  "success": boolean,
  "action": "Description of the action taken",
  "details": "Detailed results of the operation",
  "error": "Error message if any (optional)"
}

Always ensure your response is valid JSON and follows the schema exactly.`
    );
  }

  /**
   * Execute a database operation based on the input
   */
  async process(input: string) {
    const reasoning: string[] = [];
    let result = "";

    try {
      // First, analyze the input to determine the required action
      reasoning.push("Analyzing input to determine required action");
      const actionPlan = await this.execute(
        `Analyze the following request and determine the appropriate database action. Return ONLY a JSON object with an 'action' property set to one of: 'create', 'get', 'delete', 'list', or 'update'.

Example response:
{
  "action": "create"
}

For the request: ${input}`
      );
      
      // Parse the action plan, handling potential JSON formatting issues
      let plan;
      try {
        // Remove any markdown formatting or extra text, keeping only the JSON object
        const jsonStr = actionPlan.replace(/```json\n|\n```/g, '').trim();
        plan = JSON.parse(jsonStr);
        if (!plan.action) {
          throw new Error("Invalid action plan format");
        }
        reasoning.push(`Planning to execute: ${plan.action}`);
      } catch (_error) {
        throw new Error("Failed to parse action plan: Invalid JSON response");
      }

      // Execute the appropriate database operation
      const executionResult = await this.executeOperation(plan, input);
      
      // Format the result
      result = this.formatResult(executionResult);

      // Log the successful execution
      await this.logAction(input, reasoning, result);

      return { result, reasoning };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reasoning.push(`Error during execution: ${errorMessage}`);
      result = `Failed to execute operation: ${errorMessage}`;

      // Log the failed attempt
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

          const createResult = await this.convex.mutation(api.functions.users.createUser, {
            name,
            email,
          });

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

          const getResult = await this.convex.query(api.functions.users.getUser, {
            email: emails[0],
          });

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

          const deleteResult = await this.convex.mutation(api.functions.users.deleteUser, {
            email: emails[0],
          });

          return {
            success: !deleteResult.includes("❌"),
            action: "Delete User",
            details: deleteResult,
          };

        case "list":
          const listResult = await this.convex.query(api.functions.users.listUsers, {});

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

          const updateResult = await this.convex.mutation(api.functions.users.updateUser, updates);

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
