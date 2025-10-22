import { BaseAgent } from "./base-agent";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";

// Define the schema for a task step
const TaskStep = z.object({
  id: z.number(),
  description: z.string(),
  dependencies: z.array(z.number()),
  estimatedComplexity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  tools: z.array(z.string()),
});

type TaskStep = z.infer<typeof TaskStep>;

// Define the schema for a task plan
const TaskPlan = z.object({
  steps: z.array(TaskStep),
  context: z.string(),
  considerations: z.array(z.string()),
});

type TaskPlan = z.infer<typeof TaskPlan>;

/**
 * PlannerAgent is responsible for breaking down complex tasks into smaller steps
 */
export class PlannerAgent extends BaseAgent {
  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are a planning agent that helps break down complex tasks into smaller, manageable steps.
Your role is to:
1. Analyze the given task and identify its components
2. Break down the task into logical, sequential steps
3. Identify dependencies between steps
4. Estimate the complexity of each step
5. Suggest which tools might be needed for each step
6. Provide relevant context and considerations

Format your response as a JSON object with the following structure:
{
  "steps": [
    {
      "id": number,
      "description": "Clear description of the step",
      "dependencies": [array of step IDs this step depends on],
      "estimatedComplexity": "LOW" | "MEDIUM" | "HIGH",
      "tools": ["array of tool names needed"]
    }
  ],
  "context": "Additional context about the task",
  "considerations": ["Array of important points to consider"]
}

Available tools:
- createUser: Create a new user with name and email
- getUser: Get user details by email
- deleteUser: Delete a user by email
- listUsers: List all users in the database
- updateUser: Update user information (name, bio, location, website)

Always ensure your response is valid JSON and follows the schema exactly.`
    );
  }

  /**
   * Process the input task and create a detailed plan
   */
  async process(input: string) {
    const reasoning: string[] = [];
    let result = "";

    try {
      // Get initial plan from LLM
      reasoning.push("Analyzing task and generating initial plan");
      const planJson = await this.execute(
        `Create a detailed plan for the following task: ${input}`
      );

      // Parse and validate the plan
      reasoning.push("Validating generated plan");
      const plan = this.validatePlan(planJson);

      // Format the plan into a readable format
      result = this.formatPlan(plan);

      // Log the successful planning
      await this.logAction(input, reasoning, result);

      return { result, reasoning };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reasoning.push(`Error during planning: ${errorMessage}`);
      result = `Failed to create plan: ${errorMessage}`;

      // Log the failed attempt
      await this.logAction(input, reasoning, result, errorMessage);

      return { result, reasoning };
    }
  }

  /**
   * Validate the plan JSON and ensure it matches our schema
   */
  private validatePlan(planJson: string): TaskPlan {
    try {
      // Parse the JSON string
      const parsed = JSON.parse(planJson);
      
      // Validate against our schema
      const plan = TaskPlan.parse(parsed);

      // Additional validation
      this.validateDependencies(plan.steps);

      return plan;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid plan format: ${error.format()._errors.join(", ")}`);
      }
      throw error;
    }
  }

  /**
   * Validate that dependencies are valid (no cycles, no missing steps)
   */
  private validateDependencies(steps: TaskStep[]) {
    // Check all dependencies exist
    const stepIds = new Set(steps.map(step => step.id));
    for (const step of steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          throw new Error(`Step ${step.id} depends on non-existent step ${depId}`);
        }
      }
    }

    // Check for cycles
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (stepId: number): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (hasCycle(step.id)) {
        throw new Error(`Circular dependency detected in step ${step.id}`);
      }
    }
  }

  /**
   * Format the plan into a readable string
   */
  private formatPlan(plan: TaskPlan): string {
    let output = "📋 Task Plan\n\n";

    // Add context
    output += "🔍 Context:\n";
    output += plan.context + "\n\n";

    // Add steps
    output += "📝 Steps:\n";
    plan.steps
      .sort((a, b) => a.id - b.id)
      .forEach(step => {
        output += `${step.id}. ${step.description}\n`;
        if (step.dependencies.length > 0) {
          output += `   ↳ Depends on: ${step.dependencies.join(", ")}\n`;
        }
        output += `   ↳ Complexity: ${step.estimatedComplexity}\n`;
        output += `   ↳ Tools: ${step.tools.join(", ")}\n`;
        output += "\n";
      });

    // Add considerations
    output += "⚠️ Considerations:\n";
    plan.considerations.forEach(consideration => {
      output += `• ${consideration}\n`;
    });

    return output;
  }
}
