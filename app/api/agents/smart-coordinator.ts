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
 * Intent metadata for efficient routing
 */
interface IntentMetadata {
  needsDbContext: boolean;
  requiresExecution: boolean;
}

/**
 * Configuration for each intent type
 * This allows us to optimize resource usage based on intent
 */
const INTENT_CONFIG: Record<string, IntentMetadata> = {
  "GREETING": { needsDbContext: false, requiresExecution: false },
  "SIMPLE_QUESTION": { needsDbContext: false, requiresExecution: false },
  "CRUD_OPERATION": { needsDbContext: true, requiresExecution: true },
  "COMPLEX_WORKFLOW": { needsDbContext: true, requiresExecution: true },
  "SAFETY_VIOLATION": { needsDbContext: false, requiresExecution: false },
  "UNKNOWN": { needsDbContext: false, requiresExecution: false }
};

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
   * Uses lazy context loading for efficiency
   */
  async processTask(input: string): Promise<ProcessResult> {
    console.log("🧠 Smart Coordinator: Processing task:", input);
    const startTime = Date.now();
    
    try {
      // Step 1: Classify the input
      console.log("📊 Step 1: Classifying input...");
      const classification = await this.classifier.classify(input);
      console.log("📋 Classification result:", classification);

      // Step 2: Lazy context loading - only fetch DB context if needed
      const intentConfig = INTENT_CONFIG[classification.intent as string] || INTENT_CONFIG["UNKNOWN"];
      
      let dbContext: Record<string, unknown> = {};
      if (intentConfig.needsDbContext) {
        console.log("📊 Fetching database context (required for this intent)...");
        dbContext = await this.getDbContext();
      } else {
        console.log("⏭️ Skipping database context (not needed for this intent)");
        // Provide minimal context for AI
        dbContext = {
          availableEntities: this.crudHandler.getAvailableEntityTypes(),
          entityCounts: {},
          totalEntities: 0,
          availableOperations: ["create", "read", "update", "delete", "list"]
        };
      }

      // Step 3: Route based on classification - using AI intelligence, not hardcoded logic
      let result: ProcessResult;
      switch (classification.intent) {
        case "GREETING":
          result = await this.handleWithIntelligence(input, classification, "greeting", dbContext);
          break;

        case "SIMPLE_QUESTION":
          result = await this.handleWithIntelligence(input, classification, "question", dbContext);
          break;

        case "CRUD_OPERATION":
          result = await this.handleCrudOperation(input, classification);
          break;

        case "SAFETY_VIOLATION":
          result = await this.handleWithIntelligence(input, classification, "safety", dbContext);
          break;

        case "COMPLEX_WORKFLOW":
          result = await this.handleComplexWorkflow(input);
          break;

        case "UNKNOWN":
        default:
          result = await this.handleWithIntelligence(input, classification, "unknown", dbContext);
          break;
      }
      
      // Log performance metrics
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Total processing time: ${totalTime}ms`);
      
      return result;
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
   * Now accepts dbContext as parameter for lazy loading
   */
  private async handleWithIntelligence(
    input: string, 
    classification: Record<string, unknown>,
    context: "greeting" | "question" | "safety" | "unknown",
    dbContext: Record<string, unknown>
  ): Promise<ProcessResult> {
    console.log(`🤖 Using AI intelligence to handle ${context}:`, input);
    
    try {
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
        } catch {
          // If we can't get count for this entity, just skip it silently
          // This happens when entity is configured but Convex function doesn't exist
          console.debug(`Skipping ${entityType} (function not available)`);
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
          // Function not found in API - this is expected when entity is configured but function doesn't exist
          throw new Error(`Function ${operation} not found in generated API`);
        }
      }
      
      // Execute as query (list operations are queries)
      const result = await this.convex.query(apiPath as never, args as never);
      return result as string;
    } catch (error) {
      // Don't log full stack trace for missing functions - it's expected
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found") || message.includes("Did you forget")) {
        throw new Error(`Function not available: ${operation}`);
      }
      throw new Error(`Failed to execute ${operation}: ${message}`);
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
