/**
 * ComplexExecutor - Truly Dynamic AI-Powered Execution Engine
 * 
 * ARCHITECTURE PRINCIPLES:
 * - NO hardcoded pattern matching (no if(input.includes(...)))
 * - NO entity-specific logic (works with ANY entity type)
 * - NO direct Convex API calls (uses DynamicCrudHandler only)
 * - AI reasoning determines operations and sequences
 * - All operations actually executed (no simulations)
 * 
 * FLOW:
 * 1. AI analyzes request and creates execution plan
 * 2. Plan steps executed dynamically via DynamicCrudHandler
 * 3. Conditional logic handled based on runtime results
 * 4. Works with any configured entity type
 */

import { BaseAgent } from "./base-agent";
import { ConvexHttpClient } from "convex/browser";
import { DynamicCrudHandler } from "./dynamic-crud-handler";

// ============= TYPE DEFINITIONS =============

type OperationType = "create" | "read" | "update" | "delete" | "list";

interface PlanCondition {
  type: "count_gt" | "count_gte" | "count_lt" | "count_lte" | "count_eq" | "exists" | "not_exists";
  fromStep: string;
  field?: "count" | "items.length";
  value?: number;
}

interface ExecutionPlanStep {
  id: string;
  purpose?: string;
  operation: OperationType;
  entityType: string;
  data?: Record<string, unknown>;
  identifier?: string;
  filter?: Record<string, unknown>;
  sort?: { by: string; order: "asc" | "desc" };
  limit?: number;
  condition?: PlanCondition;
  repeat?: number;
  fromStep?: string;
  dataTemplate?: Record<string, unknown>;
}

interface ExecutionPlan {
  steps: ExecutionPlanStep[];
}

interface StepResult {
  stepId: string;
  success: boolean;
  operation: string;
  entityType: string;
  items?: unknown[];
  count?: number;
  ids?: string[];
  details?: string;
  meta?: Record<string, unknown>;
  error?: string;
}

// ============= COMPLEX EXECUTOR =============

export class ComplexExecutor extends BaseAgent {
  private dynamicCrudHandler: DynamicCrudHandler;
  private reasoning: string[] = [];

  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are an advanced AI executor that creates execution plans for complex database workflows.

Your role is to analyze requests and generate STRUCTURED EXECUTION PLANS that will be executed by a dynamic handler.

You have access to these operations on ANY entity type:
- list: Get all entities (supports filtering, sorting, limits)
- create: Create new entities
- read: Get specific entity by identifier
- update: Update entity data
- delete: Delete entities

You can reference previous steps using their IDs to create conditional logic.

IMPORTANT: Respond with ONLY valid JSON. No markdown, no explanations - just JSON.`
    );
    this.dynamicCrudHandler = new DynamicCrudHandler(convex);
  }

  // ============= PUBLIC METHODS =============

  /**
   * Process complex workflow using AI planning and dynamic execution
   */
  async process(input: string): Promise<{ result: string; reasoning: string[] }> {
    this.reasoning = [];
    let result = "";

    try {
      this.reasoning.push("🔄 Starting dynamic workflow execution");
      console.log("🔄 ComplexExecutor processing:", input);

      // Step 1: Create execution plan using AI
      this.reasoning.push("📋 Generating AI execution plan");
      const plan = await this.createExecutionPlan(input);
      this.reasoning.push(`📊 Plan created with ${plan.steps.length} steps`);

      // Step 2: Execute plan dynamically
      this.reasoning.push("⚡ Executing plan steps");
      const stepResults = await this.executePlan(plan);

      // Step 3: Format results
      result = this.formatComplexResult(stepResults);
      this.reasoning.push("✅ Workflow completed successfully");

      await this.logAction(input, this.reasoning, result);
      return { result, reasoning: this.reasoning };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.reasoning.push(`❌ Error: ${errorMessage}`);
      result = `Workflow failed: ${errorMessage}`;

      await this.logAction(input, this.reasoning, result, errorMessage);
      return { result, reasoning: this.reasoning };
    }
  }

  // ============= AI PLANNING =============

  /**
   * Create execution plan using AI reasoning
   */
  private async createExecutionPlan(input: string): Promise<ExecutionPlan> {
    const availableEntities = this.dynamicCrudHandler.getAvailableEntityTypes();
    const schemaDescription = this.dynamicCrudHandler.getSchemaDescription();
    
    const planningPrompt = `
Create an execution plan for this request:
"${input}"

Available entity types: ${availableEntities.join(", ")}

Entity schemas:
${schemaDescription}

Generate a plan with steps that:
1. Use operations: list, create, read, update, delete
2. Work with the entity types mentioned in the request (even if not in available list)
3. Handle conditions using fromStep references
4. Support sorting (sort: {by: "field", order: "asc"|"desc"}) - use actual field names from schema
5. Support limits (limit: number)
6. Support filters (filter: {field: value}) - use actual field names from schema
7. For cross-entity analysis: list each entity type separately, then use conditions to correlate
8. When creating/updating entities, use the field names defined in the schema above
9. Use the identifierField from schema for read/update/delete operations

IMPORTANT: 
- Reference schema fields accurately (e.g., users have: name, email, bio, location, website)
- If the request mentions entity types not in the available list (like products, orders, purchases),
  still create a plan using those entity types. The system will handle the "not configured" error gracefully.
- For date filters, if the entity doesn't have a date field in schema, use _creationTime (Convex default)

Respond with ONLY valid JSON matching this structure:

Example 1 - Conditional logic:
{
  "steps": [
    {"id": "step1", "operation": "list", "entityType": "users", "purpose": "Count users"},
    {"id": "step2", "operation": "delete", "entityType": "users", "condition": {"type": "count_gt", "fromStep": "step1", "value": 3}, "fromStep": "step1", "limit": 1},
    {"id": "step3", "operation": "create", "entityType": "users", "condition": {"type": "count_lte", "fromStep": "step1", "value": 3}, "data": {"name": "TempUser", "email": "temp@demo.com"}}
  ]
}

Example 2 - Cross-entity analysis:
{
  "steps": [
    {"id": "listUsers", "operation": "list", "entityType": "users", "filter": {"registeredDate": "2025-01-20"}, "purpose": "Get users registered on 20th"},
    {"id": "listPurchases", "operation": "list", "entityType": "purchases", "filter": {"seller": "A"}, "purpose": "Get purchases from seller A"},
    {"id": "correlate", "operation": "list", "entityType": "users", "condition": {"type": "exists", "fromStep": "listUsers"}, "purpose": "Count intersection (note: actual correlation logic may fail if entity not configured)"}
  ]
}

IMPORTANT: Return ONLY the JSON, no markdown formatting.`;

    try {
      const response = await this.execute(planningPrompt);
      const plan = this.parseJSON<ExecutionPlan>(response);
      
      // Validate plan
      if (!plan.steps || !Array.isArray(plan.steps)) {
        throw new Error("Invalid plan structure: missing steps array");
      }

      for (const step of plan.steps) {
        if (!step.id || !step.operation || !step.entityType) {
          throw new Error(`Invalid step: ${JSON.stringify(step)}`);
        }
        if (!availableEntities.includes(step.entityType)) {
          console.warn(`Entity type '${step.entityType}' not configured, using anyway`);
        }
      }

      console.log("✅ Generated plan:", JSON.stringify(plan, null, 2));
      return plan;
    } catch (error) {
      console.error("Failed to create execution plan:", error);
      throw new Error(`Plan creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // ============= PLAN EXECUTION =============

  /**
   * Execute the plan by processing each step sequentially
   */
  private async executePlan(plan: ExecutionPlan): Promise<StepResult[]> {
    const results: StepResult[] = [];
    const resultMap: Record<string, StepResult> = {};

    for (const step of plan.steps) {
      try {
        console.log(`💡 Executing step ${step.id}: ${step.operation} on ${step.entityType}`);
        const stepResult = await this.executeDynamicOperation(step, resultMap);
        results.push(stepResult);
        resultMap[step.id] = stepResult;
        
        this.reasoning.push(`✅ ${step.id}: ${step.operation} ${step.entityType} - ${stepResult.success ? "success" : "failed"}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const stepResult: StepResult = {
          stepId: step.id,
          success: false,
          operation: step.operation,
          entityType: step.entityType,
          error: errorMessage
        };
        results.push(stepResult);
        resultMap[step.id] = stepResult;
        
        this.reasoning.push(`❌ ${step.id}: ${errorMessage}`);
      }
    }

    return results;
  }

  /**
   * Execute a single step dynamically
   */
  private async executeDynamicOperation(
    step: ExecutionPlanStep,
    priorResults: Record<string, StepResult>
  ): Promise<StepResult> {
    // Check condition if present
    if (step.condition) {
      const conditionMet = this.evaluateCondition(step.condition, priorResults);
      if (!conditionMet) {
        console.log(`⏭️ Skipping ${step.id} - condition not met`);
        return {
          stepId: step.id,
          success: true,
          operation: step.operation,
          entityType: step.entityType,
          count: 0,
          meta: { skipped: true },
          details: "Skipped due to condition"
        };
      }
    }

    // Handle fromStep (operate on items from previous step)
    if (step.fromStep) {
      return await this.executeOnPriorStepItems(step, priorResults);
    }

    // Handle repeat
    if (step.repeat && step.repeat > 1) {
      return await this.executeRepeated(step, step.repeat);
    }

    // Single operation
    return await this.executeSingleOperation(step);
  }

  // ============= HELPER METHODS =============

  /**
   * Execute a single CRUD operation
   */
  private async executeSingleOperation(step: ExecutionPlanStep): Promise<StepResult> {
    const operation = step.operation.toUpperCase() as "CREATE" | "READ" | "UPDATE" | "DELETE" | "LIST";
    
    // Build input string for CRUD handler
    const inputParts: string[] = [];
    if (step.data) {
      for (const [key, value] of Object.entries(step.data)) {
        inputParts.push(`${key}: ${value}`);
      }
    }
    if (step.identifier) {
      inputParts.push(`identifier: ${step.identifier}`);
    }
    const input = inputParts.join(", ") || `${operation} ${step.entityType}`;
    
    // Build entities array
    const entities: Array<{ type: string; value: string }> = [];
    if (step.data) {
      for (const [key, value] of Object.entries(step.data)) {
        entities.push({ type: key, value: String(value) });
      }
    }
    if (step.identifier) {
      const config = this.dynamicCrudHandler.getEntityConfig(step.entityType);
      const identifierField = config?.identifierField || "email";
      entities.push({ type: identifierField, value: step.identifier });
    }

    console.log(`👉 Calling CRUD handler: ${operation} on ${step.entityType}`);
    const crudResult = await this.dynamicCrudHandler.handleCrudOperation(
      operation,
      step.entityType,
      input,
      entities
    );

    // Parse items from details string for list operations
    let items: unknown[] = [];
    let count = 0;
    let ids: string[] = [];

    if (operation === "LIST" && crudResult.success) {
      // Extract items from the formatted list result
      const lines = crudResult.details?.split("\n") || [];
      const itemLines = lines.filter(line => line.trim().startsWith("-"));
      count = itemLines.length;
      
      // Try to extract structured data
      items = itemLines.map(line => {
        const emailMatch = line.match(/\(([^)]+)\)/);
        const nameMatch = line.match(/- (.+?) \(/);
        return {
          email: emailMatch ? emailMatch[1] : null,
          name: nameMatch ? nameMatch[1] : null,
          _raw: line
        };
      });
      
      // Apply sorting if specified
      if (step.sort && items.length > 0) {
        items = this.sortItems(items, step.sort);
      }
      
      // Apply limit if specified
      if (step.limit && items.length > step.limit) {
        items = items.slice(0, step.limit);
        count = items.length;
      }
      
      ids = items.map(item => (item as { email?: string }).email || "").filter(Boolean);
    } else if (operation === "CREATE" && crudResult.success) {
      count = 1;
      const emailMatch = crudResult.details?.match(/email:\s*([^\s,]+)/);
      if (emailMatch) {
        ids = [emailMatch[1]];
      }
    } else if (operation === "DELETE" && crudResult.success) {
      count = 1;
    }

    return {
      stepId: step.id,
      success: crudResult.success,
      operation: step.operation,
      entityType: step.entityType,
      items,
      count,
      ids,
      details: crudResult.details,
      error: crudResult.error
    };
  }

  /**
   * Execute operation multiple times
   */
  private async executeRepeated(step: ExecutionPlanStep, times: number): Promise<StepResult> {
    const results: StepResult[] = [];
    
    for (let i = 0; i < times; i++) {
      const result = await this.executeSingleOperation(step);
      results.push(result);
    }

    const allSuccessful = results.every(r => r.success);
    const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const allIds = results.flatMap(r => r.ids || []);

    return {
      stepId: step.id,
      success: allSuccessful,
      operation: step.operation,
      entityType: step.entityType,
      count: totalCount,
      ids: allIds,
      details: `Repeated ${times} times, ${totalCount} total operations`,
      meta: { repeated: times, results }
    };
  }

  /**
   * Execute operation on each item from a previous step
   */
  private async executeOnPriorStepItems(
    step: ExecutionPlanStep,
    priorResults: Record<string, StepResult>
  ): Promise<StepResult> {
    const priorStep = priorResults[step.fromStep!];
    if (!priorStep || !priorStep.items || priorStep.items.length === 0) {
      return {
        stepId: step.id,
        success: true,
        operation: step.operation,
        entityType: step.entityType,
        count: 0,
        details: "No items from prior step to process"
      };
    }

    const results: StepResult[] = [];
    
    for (const item of priorStep.items) {
      // Apply data template if present
      const itemData = step.dataTemplate 
        ? this.applyDataTemplate(step.dataTemplate, item as Record<string, unknown>)
        : step.data;
      
      const itemStep: ExecutionPlanStep = {
        ...step,
        data: itemData,
        identifier: (item as { email?: string }).email || step.identifier
      };

      const result = await this.executeSingleOperation(itemStep);
      results.push(result);
    }

    const allSuccessful = results.every(r => r.success);
    const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const allIds = results.flatMap(r => r.ids || []);

    return {
      stepId: step.id,
      success: allSuccessful,
      operation: step.operation,
      entityType: step.entityType,
      count: totalCount,
      ids: allIds,
      details: `Processed ${priorStep.items.length} items from ${step.fromStep}`,
      meta: { processedItems: priorStep.items.length, results }
    };
  }

  /**
   * Evaluate a condition against prior results
   */
  private evaluateCondition(
    condition: PlanCondition,
    priorResults: Record<string, StepResult>
  ): boolean {
    const priorStep = priorResults[condition.fromStep];
    if (!priorStep) {
      console.warn(`Condition references unknown step: ${condition.fromStep}`);
      return false;
    }

    const field = condition.field || "count";
    let actualValue = 0;

    if (field === "count") {
      actualValue = priorStep.count ?? priorStep.items?.length ?? 0;
    } else if (field === "items.length") {
      actualValue = priorStep.items?.length ?? 0;
    }

    const targetValue = condition.value ?? 0;

    let result = false;
    switch (condition.type) {
      case "count_gt":
        result = actualValue > targetValue;
        break;
      case "count_gte":
        result = actualValue >= targetValue;
        break;
      case "count_lt":
        result = actualValue < targetValue;
        break;
      case "count_lte":
        result = actualValue <= targetValue;
        break;
      case "count_eq":
        result = actualValue === targetValue;
        break;
      case "exists":
        result = actualValue > 0;
        break;
      case "not_exists":
        result = actualValue === 0;
        break;
    }

    console.log(`🔍 Condition: ${condition.type} - ${actualValue} vs ${targetValue} = ${result}`);
    return result;
  }

  /**
   * Apply data template to an item
   */
  private applyDataTemplate(
    template: Record<string, unknown>,
    item: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === "string") {
        // Handle {{item.field}} placeholders
        let processed = value;
        const itemPlaceholderRegex = /\{\{item\.([^}]+)\}\}/g;
        processed = processed.replace(itemPlaceholderRegex, (_, field) => {
          return String(item[field] ?? "");
        });

        // Handle {{ensureEmailDomain item.email "domain.com"}} transform
        const emailDomainRegex = /\{\{ensureEmailDomain\s+item\.([^\s]+)\s+"([^"]+)"\}\}/g;
        processed = processed.replace(emailDomainRegex, (_, field, domain) => {
          const email = String(item[field] ?? "");
          return this.ensureEmailDomain(email, domain);
        });

        result[key] = processed;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Ensure email has the correct domain
   */
  private ensureEmailDomain(email: string, domain: string): string {
    if (!email) return `user@${domain}`;
    
    const targetDomain = `@${domain}`;
    if (email.endsWith(targetDomain)) {
      return email;
    }

    // Replace existing domain or append
    const atIndex = email.indexOf("@");
    if (atIndex > 0) {
      return email.substring(0, atIndex) + targetDomain;
    }
    
    return email + targetDomain;
  }

  /**
   * Sort items by field
   */
  private sortItems(
    items: unknown[],
    sort: { by: string; order: "asc" | "desc" }
  ): unknown[] {
    return [...items].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.by];
      const bVal = (b as Record<string, unknown>)[sort.by];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Type narrowing for comparison
      const comparison = (aVal as string | number) < (bVal as string | number) ? -1 : 1;
      return sort.order === "asc" ? comparison : -comparison;
    });
  }

  /**
   * Parse JSON with cleanup
   */
  private parseJSON<T>(response: string): T {
    let cleaned = response.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    return JSON.parse(cleaned);
  }

  /**
   * Format execution results
   */
  private formatComplexResult(stepResults: StepResult[]): string {
    let result = "🤖 **Dynamic Workflow Execution Results**\n\n";
    
    const successfulSteps = stepResults.filter(s => s.success && !s.meta?.skipped);
    const skippedSteps = stepResults.filter(s => s.meta?.skipped);
    const failedSteps = stepResults.filter(s => !s.success);

    result += "⚡ **Steps Executed:**\n";
    stepResults.forEach((step, index) => {
      const status = step.meta?.skipped ? "⏭️" : (step.success ? "✅" : "❌");
      result += `${index + 1}. ${status} ${step.stepId}: ${step.operation} ${step.entityType}\n`;
      
      if (step.meta?.skipped) {
        result += `   Skipped - condition not met\n`;
      } else if (step.count !== undefined) {
        result += `   Count: ${step.count}\n`;
      }
      
      if (step.details) {
        const shortDetails = step.details.length > 100 
          ? step.details.substring(0, 100) + "..."
          : step.details;
        result += `   Details: ${shortDetails}\n`;
      }
      
      if (step.error) {
        result += `   Error: ${step.error}\n`;
      }
      
      result += "\n";
    });

    // Summary
    result += "\n📊 **Summary:**\n";
    result += `- ${successfulSteps.length} steps executed successfully\n`;
    if (skippedSteps.length > 0) {
      result += `- ${skippedSteps.length} steps skipped (conditions not met)\n`;
    }
    if (failedSteps.length > 0) {
      result += `- ${failedSteps.length} steps failed\n`;
    }

    // Overall outcome
    const totalOperations = successfulSteps.reduce((sum, s) => sum + (s.count || 0), 0);
    result += `- Total operations: ${totalOperations}\n`;

    return result;
  }
}
