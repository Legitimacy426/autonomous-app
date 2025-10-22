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
    {"type": "table", "value": "users"}
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

3. CRUD_OPERATION (single database operations with specific data):
   - "Create a user named John with email john@example.com"  
   - "Show me user alice@demo.com"
   - "Delete user bob@example.com"
   - "List all users"
   - "Update user email to new@example.com"

4. COMPLEX_WORKFLOW (actual multi-step execution requests):
   - Conditional logic: "If there are more than X users, then..."
   - Multi-step with specific data: "Create users Alice, Bob, Charlie then list them"
   - Sequential operations: "Create Maria Lopez with maria@demo.com, then update her email"
   - Bulk operations: "For every user that contains 'Admin', update their emails"
   - Analysis requests: "Analyze all users and clean up duplicates"

5. SAFETY_VIOLATION: "drop tables", "delete all", "shutdown server", "destroy database"

6. UNKNOWN: Unclear, ambiguous, or unrelated requests

Key Decision Factors:
- Asking "how to" or "how do I" = SIMPLE_QUESTION (instruction request)
- Single operation with specific data = CRUD_OPERATION
- Multiple operations with specific data = COMPLEX_WORKFLOW  
- Asking for guidance/instructions = SIMPLE_QUESTION
- Requesting actual execution = CRUD_OPERATION or COMPLEX_WORKFLOW

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
