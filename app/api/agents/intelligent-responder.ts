import { BaseAgent } from "./base-agent";
import { ConvexHttpClient } from "convex/browser";

/**
 * IntelligentResponder - Generates human-like responses using pure AI reasoning
 * NO hardcoded if/else logic - the LLM understands context and responds naturally
 */
export class IntelligentResponder extends BaseAgent {
  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are an intelligent, human-like AI assistant with deep understanding and reasoning capabilities.

Your role is to respond to ANY user prompt naturally and intelligently, like a human would.

CRITICAL PRINCIPLES:
1. You are NOT following pre-programmed rules or patterns
2. You understand context, intent, and nuance like a human
3. You can handle ANY scenario, even ones not explicitly anticipated
4. You adapt your responses based on the current situation
5. You think critically and reason about what the user actually needs

CAPABILITIES YOU HAVE:
- Database operations: create, read, update, delete users
- Multi-step workflows and complex operations
- Conditional logic and reasoning
- Data analysis and reflection
- Context awareness of current database state

RESPONSE STYLE:
- Be natural, conversational, and helpful
- Understand what the user is really asking for
- Provide actionable information
- Be concise but comprehensive
- Show understanding of context
- Handle unexpected requests gracefully

You will receive:
1. The user's input
2. Classification information (for context, not rigid rules)
3. Current database state
4. Context type (greeting, question, safety, unknown)

Respond in a way that shows true intelligence and understanding, not pattern matching.`
    );
  }

  /**
   * Generate an intelligent, context-aware response to any user input
   */
  async generateResponse(
    input: string,
    classification: Record<string, unknown>,
    context: "greeting" | "question" | "safety" | "unknown",
    dbContext: Record<string, unknown>
  ): Promise<{ message: string; reasoning: string[] }> {
    const reasoning: string[] = [];
    
    try {
      console.log("🧠 Generating intelligent response for:", input);
      reasoning.push("Analyzing user intent with AI reasoning");
      
      const prompt = `
User said: "${input}"

Context Information:
- Interaction type: ${context}
- Classification confidence: ${classification.confidence}
- Current database has ${dbContext.userCount} users
- Available operations: ${JSON.stringify(dbContext.availableOperations)}
- Available entities: ${JSON.stringify(dbContext.availableEntities)}

Classification details: ${JSON.stringify(classification, null, 2)}

YOUR TASK:
Understand what the user REALLY wants and respond in a natural, human-like way.

If they're greeting you: Respond warmly and offer help based on what they might need.
If they're asking a question: Answer it thoughtfully, considering their actual intent.
If they're unclear: Help them understand what you can do, but be conversational about it.
If it's a safety concern: Explain why you can't help with that specific request, but offer safe alternatives.

DO NOT use templates or patterns. Think about what a helpful human would say in this situation.

Respond with JSON:
{
  "message": "Your natural, context-aware response to the user",
  "understanding": "What you understood about their request",
  "reasoning": "Why you chose to respond this way"
}`;

      const response = await this.execute(prompt);
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      reasoning.push(`Understanding: ${parsed.understanding}`);
      reasoning.push(`Reasoning: ${parsed.reasoning}`);
      
      await this.logAction(
        input,
        reasoning,
        parsed.message
      );
      
      return {
        message: parsed.message,
        reasoning
      };
    } catch (error) {
      console.error("Error generating intelligent response:", error);
      reasoning.push("Fell back to adaptive response generation");
      
      // Even the fallback uses AI reasoning, not templates
      return this.generateAdaptiveResponse(input, context, dbContext, reasoning);
    }
  }

  /**
   * Generate adaptive response when primary generation fails
   * Still uses AI, not hardcoded logic
   */
  private async generateAdaptiveResponse(
    input: string,
    context: string,
    dbContext: Record<string, unknown>,
    reasoning: string[]
  ): Promise<{ message: string; reasoning: string[] }> {
    const adaptivePrompt = `
User said: "${input}"
Context: ${context}
Database state: ${dbContext.userCount} users exist

Generate a brief, helpful response that addresses their input naturally.
Be conversational and focus on what they might actually need.

Respond with just the message text, no JSON.`;

    try {
      const message = await this.execute(adaptivePrompt);
      reasoning.push("Generated adaptive response");
      return { message: message.trim(), reasoning };
    } catch {
      // Last resort: minimal but still contextual
      return {
        message: `I understand you said "${input}". I can help you with database operations like creating, reading, updating, or deleting users. I can also handle complex multi-step workflows. What would you like to do?`,
        reasoning: [...reasoning, "Used minimal contextual response"]
      };
    }
  }

  /**
   * Generate fallback response for error scenarios
   * Uses context, not hardcoded templates
   */
  async generateFallbackResponse(
    input: string,
    context: string
  ): Promise<string> {
    const fallbackPrompt = `
The user said: "${input}"
Context type: ${context}

Generate a brief, helpful response that acknowledges their input and offers assistance.
Be natural and conversational. Don't use templates.

Respond with just the message text.`;

    try {
      const response = await this.execute(fallbackPrompt);
      return response.trim();
    } catch {
      // Absolute last resort
      return `I heard you. I can help you with database operations and complex workflows. Could you tell me more about what you'd like to do?`;
    }
  }

  /**
   * Implementation of abstract process method from BaseAgent
   */
  async process(input: string): Promise<{ result: string; reasoning: string[] }> {
    const response = await this.generateResponse(
      input,
      { intent: "UNKNOWN", confidence: 0.5 },
      "unknown",
      { userCount: 0, hasUsers: false, availableOperations: [], availableEntities: [] }
    );
    
    return {
      result: response.message,
      reasoning: response.reasoning
    };
  }
}
