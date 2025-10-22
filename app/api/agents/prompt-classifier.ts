import { BaseAgent } from "./base-agent";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

// Schema for classification result
const ClassificationResult = z.object({
  intent: z.enum([
    "GREETING",
    "SIMPLE_QUESTION", 
    "CRUD_OPERATION",
    "COMPLEX_WORKFLOW",
    "SAFETY_VIOLATION",
    "UNKNOWN"
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string()
  })),
  operation: z.optional(z.enum(["CREATE", "READ", "UPDATE", "DELETE", "LIST"])).nullable(),
  table: z.optional(z.string()).nullable(),
  requiresMultiAgent: z.boolean(),
  reasoning: z.string()
});

type ClassificationResult = z.infer<typeof ClassificationResult>;

/**
 * Intelligent prompt classifier that determines the appropriate response strategy
 */
export class PromptClassifier extends BaseAgent {
  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are an intelligent prompt classifier that analyzes user input to determine the appropriate response strategy.

Your role is to classify prompts into these categories:
1. GREETING - Simple greetings, hello, hi, etc.
2. SIMPLE_QUESTION - Basic questions that don't require database operations
3. CRUD_OPERATION - Single database operations (create, read, update, delete, list)
4. COMPLEX_WORKFLOW - Multi-step operations requiring planning and research
5. SAFETY_VIOLATION - Dangerous requests that should be rejected
6. UNKNOWN - Unclear or ambiguous requests

For each prompt, extract:
- Entities (emails, names, table names, etc.)
- CRUD operation type if applicable
- Target table/entity type if applicable
- Whether it requires multi-agent workflow

Respond with JSON only:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.0-1.0,
  "entities": [
    {"type": "email", "value": "user@example.com"},
    {"type": "name", "value": "John Doe"},
    {"type": "table", "value": "users|products|orders|etc"}
  ],
  "operation": "CREATE|READ|UPDATE|DELETE|LIST", // only for CRUD_OPERATION, otherwise null
  "table": "table_name", // only for CRUD_OPERATION, otherwise null
  "requiresMultiAgent": boolean,
  "reasoning": "Brief explanation of classification"
}

IMPORTANT: Set operation and table to null for GREETING, SIMPLE_QUESTION, SAFETY_VIOLATION, and UNKNOWN intents.`
    );
  }

  /**
   * Classify the input prompt and determine response strategy
   */
  async classify(input: string): Promise<ClassificationResult> {
    try {
      const classificationPrompt = `
Analyze this user input and classify it according to the guidelines:

User Input: "${input}"

Classification Patterns:

1. GREETING: "hello", "hi", "hey", "good morning"

2. SIMPLE_QUESTION: 
   - "what is...", "how do...", "what can you do", "help me understand"
   - "how do I start", "how to create", "what's the process", "how should I"
   - "explain how", "tell me how", "show me how", "guide me"
   - Requests for instructions or guidance (not actual execution)
   - Generic questions about concepts, NOT data queries

3. CRUD_OPERATION (single database operations with specific data on ANY entity type):
   - "Create a user named John with email john@example.com"  
   - "Show me product SKU-123"
   - "Delete order #456"
   - "List all users" or "List all products" or "List all orders"
   - "How many users are there" or "How many products do we have" or "Count users"
   - "Show me all users" or "Get all products" or "Fetch orders"
   - "What users exist" or "What products are in the database"
   - "Update product price to $29.99"
   - ANY question asking for actual data from the database (use LIST operation)

4. COMPLEX_WORKFLOW (actual multi-step execution requests on ANY entity types):
   - Conditional logic: "If there are more than X users/products/orders, then..."
   - Multi-step: "Create users Alice, Bob, Charlie then list them" or "Add products then check inventory"
   - Sequential operations: "Create Maria Lopez with maria@demo.com, then update her email"
   - Bulk operations: "For every user that contains 'Admin', update their emails"
   - Analysis requests: "Analyze all users and clean up duplicates" or "Review all products"
   - Cross-entity queries: "How many users registered on 20th bought from seller A" or "Show users who purchased product X"
   - Filtering/joining: "Users where X" combined with "products/orders where Y"

5. SAFETY_VIOLATION: "drop tables", "delete all", "shutdown server", "destroy database"

6. UNKNOWN: Unclear, ambiguous, or unrelated requests

Key Decision Factors:
- Asking "how to" or "how do I" = SIMPLE_QUESTION (instruction request)
- Asking "how many", "what data", "show me", "list", "count" = CRUD_OPERATION (data query, use LIST)
- Single operation with specific data = CRUD_OPERATION
- Multiple operations with specific data = COMPLEX_WORKFLOW  
- Asking for guidance/instructions = SIMPLE_QUESTION
- Requesting actual data from database = CRUD_OPERATION (LIST)
- Requesting actual execution = CRUD_OPERATION or COMPLEX_WORKFLOW

IMPORTANT: "How many users" or "What users exist" requires querying the database = CRUD_OPERATION with LIST operation!

Respond with classification JSON only.`;

      const response = await this.execute(classificationPrompt);
      
      // Clean and parse JSON response
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate against schema
      const result = ClassificationResult.parse(parsed);
      
      // Log classification for debugging
      await this.logAction(input, [`Classified as ${result.intent}`], JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error("Classification error:", error);
      
      // Fallback classification
      return {
        intent: "UNKNOWN",
        confidence: 0.0,
        entities: [],
        requiresMultiAgent: false,
        reasoning: "Failed to classify prompt - using fallback"
      };
    }
  }

  /**
   * Implementation of abstract process method from BaseAgent
   */
  async process(input: string): Promise<{ result: string; reasoning: string[] }> {
    const classification = await this.classify(input);
    return {
      result: JSON.stringify(classification, null, 2),
      reasoning: [`Classified prompt as ${classification.intent}`, classification.reasoning]
    };
  }
}
