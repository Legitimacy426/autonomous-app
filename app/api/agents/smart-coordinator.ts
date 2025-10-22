import { ConvexHttpClient } from "convex/browser";
import { PromptClassifier } from "./prompt-classifier";
import { DynamicCrudHandler } from "./dynamic-crud-handler";
import { PlannerAgent } from "./planner-agent";
import { ResearcherAgent } from "./researcher-agent";
import { ExecutorAgent } from "./executor-agent";

interface ProcessResult {
  success: boolean;
  result: string;
  strategy: "DIRECT" | "SIMPLE_CRUD" | "MULTI_AGENT" | "REJECTED";
  reasoning: string[];
  error?: string;
}

/**
 * Smart coordinator that intelligently routes requests based on complexity
 * Avoids unnecessary multi-agent workflows for simple requests
 */
export class SmartCoordinator {
  private classifier: PromptClassifier;
  private crudHandler: DynamicCrudHandler;
  private planner: PlannerAgent;
  private researcher: ResearcherAgent;
  private executor: ExecutorAgent;

  constructor(convex: ConvexHttpClient) {
    this.classifier = new PromptClassifier(convex);
    this.crudHandler = new DynamicCrudHandler(convex);
    this.planner = new PlannerAgent(convex);
    this.researcher = new ResearcherAgent(convex);
    this.executor = new ExecutorAgent(convex);
  }

  /**
   * Process task with intelligent routing
   */
  async processTask(input: string): Promise<ProcessResult> {
    console.log("🧠 Smart Coordinator: Processing task:", input);
    
    try {
      // Step 1: Classify the input
      console.log("📊 Step 1: Classifying input...");
      const classification = await this.classifier.classify(input);
      console.log("📋 Classification result:", classification);

      // Step 2: Route based on classification
      switch (classification.intent) {
        case "GREETING":
          return this.handleGreeting(input);

        case "SIMPLE_QUESTION":
          return this.handleSimpleQuestion(input);

        case "CRUD_OPERATION":
          return await this.handleCrudOperation(input, classification);

        case "SAFETY_VIOLATION":
          return this.handleSafetyViolation(input);

        case "COMPLEX_WORKFLOW":
          return await this.handleComplexWorkflow(input);

        case "UNKNOWN":
        default:
          return this.handleUnknown(input, classification);
      }
    } catch (error) {
      console.error("❌ Smart Coordinator Error:", error);
      return {
        success: false,
        result: "I encountered an error while processing your request. Please try again.",
        strategy: "REJECTED",
        reasoning: ["Error in coordinator processing"],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Handle greeting requests directly
   */
  private handleGreeting(_input: string): ProcessResult {
    console.log("👋 Handling greeting directly");
    
    const greetingResponses = [
      "Hello! I'm your AI assistant. I can help you with database operations, answer questions, or handle complex tasks. What would you like me to do?",
      "Hi there! I'm ready to help with CRUD operations, data management, or any other tasks you have in mind.",
      "Greetings! I can assist with creating, reading, updating, or deleting data, as well as more complex workflows. How can I help you today?"
    ];
    
    // Simple random selection
    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
    
    return {
      success: true,
      result: response,
      strategy: "DIRECT",
      reasoning: ["Classified as greeting", "Handled with direct response"]
    };
  }

  /**
   * Handle simple questions directly
   */
  private handleSimpleQuestion(_input: string): ProcessResult {
    console.log("❓ Handling simple question directly");
    
    // For simple questions, provide helpful information about capabilities
    let response = "I'm an AI assistant that can help you with:\n\n";
    response += "🗃️ **Database Operations:**\n";
    response += "- Create, read, update, delete users\n";
    response += "- List all users\n";
    response += "- Handle complex multi-step workflows\n\n";
    response += "🤖 **Smart Features:**\n";
    response += "- Understand natural language requests\n";
    response += "- Validate data automatically\n";
    response += "- Handle conditional logic\n";
    response += "- Extensible to other entity types\n\n";
    response += "💡 Try asking me to create a user, list users, or perform complex operations!";
    
    return {
      success: true,
      result: response,
      strategy: "DIRECT",
      reasoning: ["Classified as simple question", "Provided capability overview"]
    };
  }

  /**
   * Handle CRUD operations using the dynamic handler
   */
  private async handleCrudOperation(input: string, classification: Record<string, unknown>): Promise<ProcessResult> {
    console.log("🔧 Handling CRUD operation:", classification.operation, "on", classification.table);
    
    try {
      // Type guards and safe extraction
      const entities = Array.isArray(classification.entities) ? classification.entities as Array<{ type: string; value: string }> : [];
      const operation = (classification.operation as string) || "LIST";
      const table = classification.table as string;
      
      // Determine entity type - default to users if not specified
      const entityType = table || this.inferEntityType(entities) || "users";
      
      // Check if entity type is supported
      const availableTypes = this.crudHandler.getAvailableEntityTypes();
      if (!availableTypes.includes(entityType)) {
        return {
          success: false,
          result: `Entity type '${entityType}' is not currently supported. Available types: ${availableTypes.join(", ")}`,
          strategy: "REJECTED",
          reasoning: ["Unsupported entity type"],
          error: `Unknown entity type: ${entityType}`
        };
      }

      // Validate operation
      const validOperations = ["CREATE", "READ", "UPDATE", "DELETE", "LIST"];
      const validOperation = validOperations.includes(operation.toUpperCase()) 
        ? operation.toUpperCase() as "CREATE" | "READ" | "UPDATE" | "DELETE" | "LIST"
        : "LIST";

      // Handle the CRUD operation
      const crudResult = await this.crudHandler.handleCrudOperation(
        validOperation,
        entityType,
        input,
        entities
      );

      // Format response based on result
      let formattedResult = "";
      if (crudResult.success) {
        formattedResult = `✅ **${crudResult.operation} ${entityType.toUpperCase()}**\n\n`;
        formattedResult += crudResult.details;
      } else {
        formattedResult = `❌ **Operation Failed**\n\n`;
        formattedResult += `**Error:** ${crudResult.error}\n`;
        formattedResult += `**Details:** ${crudResult.details}`;
      }

      return {
        success: crudResult.success,
        result: formattedResult,
        strategy: "SIMPLE_CRUD",
        reasoning: [
          `Classified as ${operation} operation`,
          `Used dynamic CRUD handler for ${entityType}`,
          `Operation ${crudResult.success ? "completed successfully" : "failed"}`
        ],
        error: crudResult.error
      };
    } catch (error) {
      return {
        success: false,
        result: "Failed to process CRUD operation",
        strategy: "REJECTED",
        reasoning: ["Error in CRUD operation processing"],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Handle complex workflows using multi-agent system
   */
  private async handleComplexWorkflow(input: string): Promise<ProcessResult> {
    console.log("🚀 Handling complex workflow with multi-agent system");
    
    try {
      // Step 1: Create a plan
      const planResult = await this.planner.process(input);
      if (!planResult.result) {
        return {
          success: false,
          result: "Failed to create execution plan",
          strategy: "MULTI_AGENT",
          reasoning: ["Multi-agent workflow failed at planning stage"],
          error: "Planning failed"
        };
      }

      // Step 2: Research current state
      const researchResult = await this.researcher.process(input);
      if (!researchResult.result) {
        return {
          success: false,
          result: "Failed to complete research phase",
          strategy: "MULTI_AGENT",
          reasoning: ["Multi-agent workflow failed at research stage"],
          error: "Research failed"
        };
      }

      // Step 3: Execute with full context
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
          result: "Failed to execute planned actions",
          strategy: "MULTI_AGENT",
          reasoning: ["Multi-agent workflow failed at execution stage"],
          error: "Execution failed"
        };
      }

      // Format comprehensive result
      let formattedResult = "🤖 **Complex Workflow Results**\n\n";
      formattedResult += "📋 **Planning Phase:**\n";
      formattedResult += planResult.result + "\n\n";
      formattedResult += "🔍 **Research Phase:**\n";
      formattedResult += researchResult.result + "\n\n";
      formattedResult += "⚡ **Execution Phase:**\n";
      formattedResult += executionResult.result;

      return {
        success: true,
        result: formattedResult,
        strategy: "MULTI_AGENT",
        reasoning: [
          "Classified as complex workflow",
          "Used full multi-agent system (Planner → Researcher → Executor)",
          "All phases completed successfully"
        ]
      };
    } catch (error) {
      return {
        success: false,
        result: "Complex workflow processing failed",
        strategy: "MULTI_AGENT",
        reasoning: ["Error in multi-agent workflow"],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Handle safety violations
   */
  private handleSafetyViolation(_input: string): ProcessResult {
    console.log("🚫 Blocking safety violation");
    
    const response = "⚠️ **Safety Notice**\n\n" +
      "I cannot process requests that involve:\n" +
      "- Destructive database operations (dropping tables, etc.)\n" +
      "- System shutdown or server control\n" +
      "- Potentially harmful actions\n\n" +
      "Please rephrase your request to focus on safe database operations like creating, reading, updating, or deleting individual records.";

    return {
      success: false,
      result: response,
      strategy: "REJECTED",
      reasoning: ["Classified as safety violation", "Request blocked for security"],
      error: "Safety violation detected"
    };
  }

  /**
   * Handle unknown/unclear requests
   */
  private handleUnknown(_input: string, classification: Record<string, unknown>): ProcessResult {
    console.log("❓ Handling unknown request");
    
    let response = "🤔 **I'm not sure how to help with that**\n\n";
    response += "I can help you with:\n\n";
    response += "**Simple Operations:**\n";
    response += "- \"Create a user named John with email john@example.com\"\n";
    response += "- \"Show me the user alice@demo.com\"\n";
    response += "- \"List all users\"\n";
    response += "- \"Delete user bob@example.com\"\n\n";
    response += "**Complex Operations:**\n";
    response += "- \"Create 3 users then list them all\"\n";
    response += "- \"If there are more than 5 users, delete the oldest one\"\n";
    response += "- \"Update all admin users to have company email addresses\"\n\n";
    response += "Could you please rephrase your request?";
    
    const confidence = typeof classification.confidence === "number" ? classification.confidence : 0;
    if (confidence < 0.5) {
      response += `\n\n*Classification confidence was low (${Math.round(confidence * 100)}%), so I might have misunderstood your request.*`;
    }

    return {
      success: false,
      result: response,
      strategy: "REJECTED",
      reasoning: [
        "Could not classify request clearly",
        `Confidence: ${classification.confidence}`,
        "Provided examples for user guidance"
      ],
      error: "Request unclear or unclassifiable"
    };
  }

  /**
   * Infer entity type from extracted entities
   */
  private inferEntityType(entities: Array<{ type: string; value: string }>): string | null {
    // Look for explicit entity type mentions
    const entityTypeMapping: Record<string, string> = {
      email: "users",
      name: "users", 
      user: "users",
      product: "products",
      price: "products"
    };

    for (const entity of entities) {
      if (entityTypeMapping[entity.type.toLowerCase()]) {
        return entityTypeMapping[entity.type.toLowerCase()];
      }
    }

    return null;
  }

  /**
   * Get summary of processing result
   */
  getSummary(result: ProcessResult): string {
    const strategy = result.strategy;
    const status = result.success ? "✅" : "❌";
    
    return `${status} Processed via ${strategy} strategy: ${result.success ? "Success" : result.error || "Failed"}`;
  }

  /**
   * Format results for API response
   */
  formatResults(result: ProcessResult): string {
    return result.result;
  }
}
