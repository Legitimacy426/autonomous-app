import { ConvexHttpClient } from "convex/browser";
import { PlannerAgent } from "./planner-agent";
import { ResearcherAgent } from "./researcher-agent";
import { ExecutorAgent } from "./executor-agent";

// Removed unused interface

/**
 * Coordinates the workflow between different agents
 */
export class AgentCoordinator {
  private planner: PlannerAgent;
  private researcher: ResearcherAgent;
  private executor: ExecutorAgent;

  constructor(convex: ConvexHttpClient) {
    this.planner = new PlannerAgent(convex);
    this.researcher = new ResearcherAgent(convex);
    this.executor = new ExecutorAgent(convex);
  }

  /**
   * Process a task through the multi-agent workflow
   */
  async processTask(input: string): Promise<{
    success: boolean;
    plan?: string;
    research?: string;
    execution?: string;
    error?: string;
  }> {
    try {
      // Step 1: Create a plan
      const planResult = await this.planner.process(input);
      if (!planResult.result) {
        return {
          success: false,
          error: "Failed to create plan",
        };
      }

      // Step 2: Research current state and potential issues
      const researchResult = await this.researcher.process(input);
      if (!researchResult.result) {
        return {
          success: false,
          plan: planResult.result,
          error: "Failed to complete research",
        };
      }

      // Step 3: Execute the plan with research insights
      const executionContext = `
Task: ${input}

Plan:
${planResult.result}

Research:
${researchResult.result}

Please execute the appropriate actions based on this information.`;

      const executionResult = await this.executor.process(executionContext);
      if (!executionResult.result) {
        return {
          success: false,
          plan: planResult.result,
          research: researchResult.result,
          error: "Failed to execute plan",
        };
      }

      // Return the complete workflow results
      return {
        success: true,
        plan: planResult.result,
        research: researchResult.result,
        execution: executionResult.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Format the workflow results into a readable string
   */
  formatResults(results: {
    success: boolean;
    plan?: string;
    research?: string;
    execution?: string;
    error?: string;
  }): string {
    let output = "🤖 Multi-Agent Workflow Results\n\n";

    if (!results.success) {
      output += "❌ Workflow Failed\n";
      output += `Error: ${results.error}\n\n`;
    } else {
      output += "✅ Workflow Completed Successfully\n\n";
    }

    if (results.plan) {
      output += "🗺️ Planning Phase\n";
      output += "───────────────\n";
      output += results.plan + "\n\n";
    }

    if (results.research) {
      output += "🔍 Research Phase\n";
      output += "───────────────\n";
      output += results.research + "\n\n";
    }

    if (results.execution) {
      output += "⚡ Execution Phase\n";
      output += "───────────────\n";
      output += results.execution + "\n";
    }

    return output;
  }

  /**
   * Get a summary of the workflow results
   */
  getSummary(results: {
    success: boolean;
    plan?: string;
    research?: string;
    execution?: string;
    error?: string;
  }): string {
    if (!results.success) {
      return `❌ Workflow failed: ${results.error}`;
    }

    const phases = [];
    if (results.plan) phases.push("Planning");
    if (results.research) phases.push("Research");
    if (results.execution) phases.push("Execution");

    return `✅ Successfully completed ${phases.join(", ")} phases`;
  }
}
