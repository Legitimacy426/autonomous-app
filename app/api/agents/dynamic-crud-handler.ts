import { BaseAgent } from "./base-agent";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";

// Schema for CRUD operation results
const CrudResult = z.object({
  success: z.boolean(),
  operation: z.string(),
  table: z.string(),
  details: z.string(),
  data: z.optional(z.unknown()),
  error: z.optional(z.string())
});

type CrudResult = z.infer<typeof CrudResult>;

interface EntityConfig {
  table: string;
  operations: {
    create?: string;
    read?: string;
    update?: string;
    delete?: string;
    list?: string;
  };
  fields: {
    [key: string]: {
      type: "string" | "number" | "boolean" | "optional_string" | "optional_number";
      required: boolean;
      validate?: (value: unknown) => boolean;
    };
  };
  identifierField: string; // The field used to identify records (usually email or id)
}

/**
 * Dynamic CRUD handler that can work with any table/entity type
 * Makes the system extensible without hardcoding table-specific logic
 */
export class DynamicCrudHandler extends BaseAgent {
  private entityConfigs: Map<string, EntityConfig> = new Map();

  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are a dynamic CRUD handler that can perform database operations on any entity type.
Your role is to:
1. Parse entity data from natural language
2. Validate data according to entity schemas
3. Execute appropriate CRUD operations
4. Handle errors gracefully
5. Provide clear feedback

You work with any entity type that has been configured, not just users.
Always validate data before operations and provide detailed feedback.`
    );

    // Initialize with default configurations
    this.initializeEntityConfigs();
  }

  /**
   * Initialize entity configurations
   * This makes the system extensible - just add new configs here
   */
  private initializeEntityConfigs() {
    // Users configuration
    this.entityConfigs.set("users", {
      table: "users",
      operations: {
        create: "functions.users.createUser",
        read: "functions.users.getUser", 
        update: "functions.users.updateUser",
        delete: "functions.users.deleteUser",
        list: "functions.users.listUsers"
      },
      fields: {
        name: { type: "string", required: true },
        email: { type: "string", required: true, validate: (value: unknown) => typeof value === "string" && this.validateEmail(value) },
        bio: { type: "optional_string", required: false },
        location: { type: "optional_string", required: false },
        website: { type: "optional_string", required: false }
      },
      identifierField: "email"
    });

    // Example: Products configuration (for extensibility)
    // Uncomment when you create the products Convex functions
    /*
    this.entityConfigs.set("products", {
      table: "products",
      operations: {
        create: "functions.products.createProduct",
        read: "functions.products.getProduct",
        update: "functions.products.updateProduct", 
        delete: "functions.products.deleteProduct",
        list: "functions.products.listProducts"
      },
      fields: {
        name: { type: "string", required: true },
        price: { type: "number", required: true },
        description: { type: "optional_string", required: false },
        category: { type: "optional_string", required: false }
      },
      identifierField: "name"
    });
    */
    
    // To add a new entity type:
    // 1. Create Convex functions (convex/functions/entityType.ts)
    // 2. Add configuration here using this.entityConfigs.set()
    // 3. The system will automatically discover and use it!
  }

  /**
   * Add a new entity configuration dynamically
   */
  addEntityConfig(entityType: string, config: EntityConfig) {
    this.entityConfigs.set(entityType, config);
  }

  /**
   * Handle CRUD operations for any entity type
   */
  async handleCrudOperation(
    operation: "CREATE" | "READ" | "UPDATE" | "DELETE" | "LIST",
    entityType: string,
    input: string,
    entities: Array<{ type: string; value: string }>
  ): Promise<CrudResult> {
    try {
      const config = this.entityConfigs.get(entityType);
      if (!config) {
        return {
          success: false,
          operation,
          table: entityType,
          details: `Entity type '${entityType}' not configured`,
          error: `Unknown entity type: ${entityType}`
        };
      }

      switch (operation) {
        case "CREATE":
          return await this.handleCreate(config, input, entities);
        case "READ":
          return await this.handleRead(config, input, entities);
        case "UPDATE":
          return await this.handleUpdate(config, input, entities);
        case "DELETE":
          return await this.handleDelete(config, input, entities);
        case "LIST":
          return await this.handleList(config);
        default:
          return {
            success: false,
            operation,
            table: entityType,
            details: `Unsupported operation: ${operation}`,
            error: `Operation ${operation} not implemented`
          };
      }
    } catch (error) {
      return {
        success: false,
        operation,
        table: entityType,
        details: "Operation failed due to error",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Handle CREATE operations
   */
  private async handleCreate(
    config: EntityConfig,
    input: string,
    entities: Array<{ type: string; value: string }>
  ): Promise<CrudResult> {
    if (!config.operations.create) {
      return {
        success: false,
        operation: "CREATE",
        table: config.table,
        details: "Create operation not configured",
        error: "Create operation not available"
      };
    }

    // Extract and validate data
    const data = await this.extractEntityData(config, input, entities);
    const validation = this.validateEntityData(config, data, "CREATE");
    
    if (!validation.valid) {
      return {
        success: false,
        operation: "CREATE",
        table: config.table,
        details: validation.error!,
        error: validation.error
      };
    }

    // Execute create operation
    const result = await this.executeOperation(config.operations.create, data);
    
    return {
      success: !result.includes("❌"),
      operation: "CREATE",
      table: config.table,
      details: result,
      data
    };
  }

  /**
   * Handle READ operations
   */
  private async handleRead(
    config: EntityConfig,
    input: string,
    entities: Array<{ type: string; value: string }>
  ): Promise<CrudResult> {
    if (!config.operations.read) {
      return {
        success: false,
        operation: "READ",
        table: config.table,
        details: "Read operation not configured",
        error: "Read operation not available"
      };
    }

    // Find identifier value
    const identifier = entities.find(e => e.type === config.identifierField)?.value;
    if (!identifier) {
      return {
        success: false,
        operation: "READ",
        table: config.table,
        details: `${config.identifierField} is required`,
        error: `Missing ${config.identifierField}`
      };
    }

    const result = await this.executeOperation(config.operations.read, { [config.identifierField]: identifier });
    
    return {
      success: !result.includes("❌"),
      operation: "READ", 
      table: config.table,
      details: result
    };
  }

  /**
   * Handle UPDATE operations
   */
  private async handleUpdate(
    config: EntityConfig,
    input: string,
    entities: Array<{ type: string; value: string }>
  ): Promise<CrudResult> {
    if (!config.operations.update) {
      return {
        success: false,
        operation: "UPDATE",
        table: config.table,
        details: "Update operation not configured",
        error: "Update operation not available"
      };
    }

    // Extract data and identifier
    const data = await this.extractEntityData(config, input, entities);
    const identifier = entities.find(e => e.type === config.identifierField)?.value;
    
    if (!identifier) {
      return {
        success: false,
        operation: "UPDATE",
        table: config.table,
        details: `${config.identifierField} is required`,
        error: `Missing ${config.identifierField}`
      };
    }

    // Add identifier to update data
    data[config.identifierField] = identifier;

    const result = await this.executeOperation(config.operations.update, data);
    
    return {
      success: !result.includes("❌"),
      operation: "UPDATE",
      table: config.table,
      details: result,
      data
    };
  }

  /**
   * Handle DELETE operations
   */
  private async handleDelete(
    config: EntityConfig,
    input: string,
    entities: Array<{ type: string; value: string }>
  ): Promise<CrudResult> {
    if (!config.operations.delete) {
      return {
        success: false,
        operation: "DELETE",
        table: config.table,
        details: "Delete operation not configured",
        error: "Delete operation not available"
      };
    }

    const identifier = entities.find(e => e.type === config.identifierField)?.value;
    if (!identifier) {
      return {
        success: false,
        operation: "DELETE",
        table: config.table,
        details: `${config.identifierField} is required`,
        error: `Missing ${config.identifierField}`
      };
    }

    const result = await this.executeOperation(config.operations.delete, { [config.identifierField]: identifier });
    
    return {
      success: !result.includes("❌"),
      operation: "DELETE",
      table: config.table,
      details: result
    };
  }

  /**
   * Handle LIST operations
   */
  private async handleList(config: EntityConfig): Promise<CrudResult> {
    if (!config.operations.list) {
      return {
        success: false,
        operation: "LIST",
        table: config.table,
        details: "List operation not configured",
        error: "List operation not available"
      };
    }

    const result = await this.executeOperation(config.operations.list, {});
    
    return {
      success: true,
      operation: "LIST",
      table: config.table,
      details: result
    };
  }

  /**
   * Extract entity data from natural language input
   */
  private async extractEntityData(
    config: EntityConfig,
    input: string,
    entities: Array<{ type: string; value: string }>
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    
    // Map entities to data fields
    entities.forEach(entity => {
      if (config.fields[entity.type]) {
        data[entity.type] = entity.value;
      }
    });

    // Use LLM to extract additional data if needed
    const extractPrompt = `
Extract data for ${config.table} entity from this input: "${input}"

Available fields: ${Object.keys(config.fields).join(", ")}
Already found: ${JSON.stringify(data)}

Return JSON with any additional field values you can extract.
Only include fields that are clearly mentioned in the input.
Return empty object {} if no additional data found.`;

    try {
      const response = await this.execute(extractPrompt);
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const extractedData = JSON.parse(cleanedResponse);
      
      // Merge extracted data
      Object.assign(data, extractedData);
    } catch {
      // Continue with what we have if extraction fails
    }

    return data;
  }

  /**
   * Validate entity data against configuration
   */
  private validateEntityData(
    config: EntityConfig,
    data: Record<string, unknown>,
    operation: "CREATE" | "UPDATE"
  ): { valid: boolean; error?: string } {
    // Check required fields for CREATE operations
    if (operation === "CREATE") {
      for (const [field, fieldConfig] of Object.entries(config.fields)) {
        if (fieldConfig.required && !data[field]) {
          return { valid: false, error: `Required field '${field}' is missing` };
        }
      }
    }

    // Validate field types and custom validators
    for (const [field, value] of Object.entries(data)) {
      const fieldConfig = config.fields[field];
      if (fieldConfig?.validate && !fieldConfig.validate(value)) {
        return { valid: false, error: `Invalid value for field '${field}'` };
      }
    }

    return { valid: true };
  }

  /**
   * Execute database operation
   */
  private async executeOperation(operation: string, args: Record<string, unknown>): Promise<string> {
    try {
      // Parse operation path and get the API function
      const parts = operation.split('.');
      let apiPath: unknown = api;
      
      for (const part of parts) {
        apiPath = (apiPath as Record<string, unknown>)[part];
        if (!apiPath) {
          throw new Error(`Operation ${operation} not found`);
        }
      }

      // Execute the operation with proper type assertion
      if (operation.includes('list') || operation.includes('get')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await this.convex.query(apiPath as any, args as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await this.convex.mutation(apiPath as any, args as any);
      }
    } catch (error) {
      throw new Error(`Failed to execute ${operation}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Email validation helper
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Implementation of abstract process method from BaseAgent
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(_input: string): Promise<{ result: string; reasoning: string[] }> {
    // This method is mainly for testing purposes
    // In practice, handleCrudOperation will be called directly
    return {
      result: "Dynamic CRUD Handler initialized",
      reasoning: ["Handler ready to process CRUD operations for any configured entity type"]
    };
  }

  /**
   * Get available entity types
   */
  getAvailableEntityTypes(): string[] {
    return Array.from(this.entityConfigs.keys());
  }

  /**
   * Get entity configuration
   */
  getEntityConfig(entityType: string): EntityConfig | undefined {
    return this.entityConfigs.get(entityType);
  }

  /**
   * Get schema information for all configured entities
   * Used by AI for better understanding of available data structures
   */
  getSchemaInfo(): Record<string, { fields: Record<string, { type: string; required: boolean }>; identifierField: string }> {
    const schemaInfo: Record<string, { fields: Record<string, { type: string; required: boolean }>; identifierField: string }> = {};
    
    for (const [entityType, config] of this.entityConfigs.entries()) {
      schemaInfo[entityType] = {
        fields: Object.fromEntries(
          Object.entries(config.fields).map(([field, fieldConfig]) => [
            field,
            { type: fieldConfig.type, required: fieldConfig.required }
          ])
        ),
        identifierField: config.identifierField
      };
    }
    
    return schemaInfo;
  }

  /**
   * Get human-readable schema description
   */
  getSchemaDescription(): string {
    const schemas: string[] = [];
    
    for (const [entityType, config] of this.entityConfigs.entries()) {
      const fields = Object.entries(config.fields)
        .map(([field, fieldConfig]) => {
          const req = fieldConfig.required ? "required" : "optional";
          return `  - ${field}: ${fieldConfig.type} (${req})`;
        })
        .join("\n");
      
      schemas.push(`${entityType}:\n${fields}\n  identifier: ${config.identifierField}`);
    }
    
    return schemas.join("\n\n");
  }
}
