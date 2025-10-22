import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { PromptClassifier } from "./prompt-classifier";
import { DynamicCrudHandler } from "./dynamic-crud-handler";
import { PlannerAgent } from "./planner-agent";
import { ResearcherAgent } from "./researcher-agent";
import { ExecutorAgent } from "./executor-agent";
import { ComplexExecutor } from "./complex-executor";
import { IntelligentResponder } from "./intelligent-responder";

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
  private convex: ConvexHttpClient;
  private classifier: PromptClassifier;
  private crudHandler: DynamicCrudHandler;
  private planner: PlannerAgent;
  private researcher: ResearcherAgent;
  private executor: ExecutorAgent;
  private complexExecutor: ComplexExecutor;
  private intelligentResponder: IntelligentResponder;

  constructor(convex: ConvexHttpClient) {
    this.convex = convex;
    this.classifier = new PromptClassifier(convex);
    this.crudHandler = new DynamicCrudHandler(convex);
    this.planner = new PlannerAgent(convex);
    this.researcher = new ResearcherAgent(convex);
    this.executor = new ExecutorAgent(convex);
    this.complexExecutor = new ComplexExecutor(convex);
    this.intelligentResponder = new IntelligentResponder(convex);
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

      // Step 2: Route based on classification - using AI intelligence, not hardcoded logic
      switch (classification.intent) {
        case "GREETING":
          return await this.handleWithIntelligence(input, classification, "greeting");

        case "SIMPLE_QUESTION":
          return await this.handleWithIntelligence(input, classification, "question");

        case "CRUD_OPERATION":
          return await this.handleCrudOperation(input, classification);

        case "SAFETY_VIOLATION":
          return await this.handleWithIntelligence(input, classification, "safety");

        case "COMPLEX_WORKFLOW":
          return await this.handleComplexWorkflow(input);

        case "UNKNOWN":
        default:
          return await this.handleWithIntelligence(input, classification, "unknown");
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
   * Handle requests with true AI intelligence - no hardcoded if/else logic
   */
  private async handleWithIntelligence(
    input: string, 
    classification: Record<string, unknown>,
    context: "greeting" | "question" | "safety" | "unknown"
  ): Promise<ProcessResult> {
    console.log(`🤖 Using AI intelligence to handle ${context}:`, input);
    
    try {
      // Get the database state for context-aware responses
      const dbContext = await this.getDbContext();
      
      // Let the AI generate an intelligent, context-aware response
      const response = await this.intelligentResponder.generateResponse(
        input,
        classification,
        context,
        dbContext
      );
      
      return {
        success: true,
        result: response.message,
        strategy: "DIRECT",
        reasoning: [
          `Classified as ${classification.intent}`,
          "Generated intelligent response using AI reasoning",
          ...response.reasoning
        ]
      };
    } catch (error) {
      console.error("Error in intelligent handling:", error);
      // Fallback to a minimal intelligent response
      const fallbackResponse = await this.intelligentResponder.generateFallbackResponse(input, context);
      return {
        success: true,
        result: fallbackResponse,
        strategy: "DIRECT",
        reasoning: ["Used fallback intelligent response"]
      };
    }
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
   * Handle complex workflows using advanced execution
   */
  private async handleComplexWorkflow(input: string): Promise<ProcessResult> {
    console.log("🚀 Handling complex workflow with advanced executor");
    
    try {
      // Use ComplexExecutor for direct execution with reasoning
      const executionResult = await this.complexExecutor.process(input);
      
      if (!executionResult.result) {
        return {
          success: false,
          result: "Failed to execute complex workflow",
          strategy: "MULTI_AGENT",
          reasoning: ["Complex workflow execution failed"],
          error: "Execution failed"
        };
      }

      return {
        success: true,
        result: executionResult.result,
        strategy: "MULTI_AGENT",
        reasoning: [
          "Classified as complex workflow",
          "Used ComplexExecutor with actual database operations",
          ...executionResult.reasoning
        ]
      };
    } catch (error) {
      return {
        success: false,
        result: "Complex workflow processing failed",
        strategy: "MULTI_AGENT", 
        reasoning: ["Error in complex workflow execution"],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get database context for intelligent responses
   * Dynamically discovers all available entity types and their counts
   */
  private async getDbContext(): Promise<Record<string, unknown>> {
    try {
      // Get all available entity types from the dynamic CRUD handler
      const availableEntities = this.crudHandler.getAvailableEntityTypes();
      
      // Dynamically gather counts for each entity type
      const entityCounts: Record<string, number> = {};
      const entityStatus: Record<string, boolean> = {};
      
      for (const entityType of availableEntities) {
        try {
          // Get entity configuration to find the list operation
          const config = this.crudHandler.getEntityConfig(entityType);
          if (config?.operations.list) {
            // Try to get count by listing entities
            const result = await this.executeOperation(config.operations.list, {});
            
            // Parse the result to get count (works with the format "Found X items")
            const countMatch = result.match(/(\d+)/);
            const count = countMatch ? parseInt(countMatch[1]) : 0;
            
            entityCounts[entityType] = count;
            entityStatus[entityType] = count > 0;
          }
        } catch (error) {
          // If we can't get count for this entity, just skip it
          console.warn(`Could not get count for ${entityType}:`, error);
          entityCounts[entityType] = 0;
          entityStatus[entityType] = false;
        }
      }
      
      // Return dynamic context about ALL entity types
      return {
        availableEntities,
        entityCounts,
        entityStatus,
        totalEntities: Object.values(entityCounts).reduce((sum, count) => sum + count, 0),
        availableOperations: ["create", "read", "update", "delete", "list"],
        // Keep backward compatibility
        hasUsers: entityStatus.users || false,
        userCount: entityCounts.users || 0
      };
    } catch (error) {
      console.error("Error getting DB context:", error);
      // Fallback to minimal context
      return {
        availableEntities: this.crudHandler.getAvailableEntityTypes(),
        entityCounts: {},
        entityStatus: {},
        totalEntities: 0,
        availableOperations: ["create", "read", "update", "delete", "list"],
        hasUsers: false,
        userCount: 0
      };
    }
  }
  
  /**
   * Execute a database operation dynamically
   */
  private async executeOperation(operation: string, args: Record<string, unknown>): Promise<string> {
    try {
      // Parse operation path (e.g., "functions.users.listUsers")
      const parts = operation.split('.');
      let apiPath: unknown = api;
      
      for (const part of parts) {
        apiPath = (apiPath as Record<string, unknown>)[part];
        if (!apiPath) {
          throw new Error(`Operation ${operation} not found in API`);
        }
      }
      
      // Execute as query (list operations are queries)
      const result = await this.convex.query(apiPath as never, args as never);
      return result as string;
    } catch (error) {
      throw new Error(`Failed to execute ${operation}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
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
