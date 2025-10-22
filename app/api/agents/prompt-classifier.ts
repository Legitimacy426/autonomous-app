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

Consider these patterns:
- Greetings: "hello", "hi", "hey", etc.
- Simple questions: "what is...", "how do...", etc.  
- CRUD operations: "create user", "delete user", "list users", etc.
- Complex workflows: multi-step operations, conditional logic, bulk operations
- Safety violations: "drop tables", "delete all", "shutdown", destructive commands

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
