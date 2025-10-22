import { BaseMemory, InputValues, OutputValues } from "@langchain/core/memory";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * ConvexMemory implements LangChain's BaseMemory interface using Convex as storage
 */
export class ConvexMemory extends BaseMemory {
  private sessionId: string;
  private convex: ConvexHttpClient;
  private returnMessages: boolean;

  constructor(
    convex: ConvexHttpClient,
    sessionId: string,
    returnMessages = true
  ) {
    super();
    this.sessionId = sessionId;
    this.convex = convex;
    this.returnMessages = returnMessages;
  }

  /**
   * Get memory variables that should be loaded for the next generation
   */
  async loadMemoryVariables() {
    const messages = await this.convex.query(api.functions.conversationHistory.getRecentMessages, {
      sessionId: this.sessionId,
      limit: 10, // Load last 10 messages
    });

    if (this.returnMessages) {
      // Return as chat messages
      return {
        history: messages.map(msg => ({
          type: msg.role === "human" ? "human" : "ai",
          data: {
            content: msg.content,
            additional_kwargs: {},
          },
        })),
      };
    }

    // Return as string
    return {
      history: messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join("\n"),
    };
  }

  /**
   * Save context from this conversation to memory
   */
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues
  ): Promise<void> {
    // Ensure session exists
    await this.convex.mutation(api.functions.conversationHistory.getOrCreateSession, {
      sessionId: this.sessionId,
    });

    // Save human message
    if (inputValues.input) {
      await this.convex.mutation(api.functions.conversationHistory.addMessage, {
        sessionId: this.sessionId,
        role: "human",
        content: inputValues.input,
      });
    }

    // Save AI message
    if (outputValues.output) {
      await this.convex.mutation(api.functions.conversationHistory.addMessage, {
        sessionId: this.sessionId,
        role: "ai",
        content: outputValues.output,
      });
    }
  }

  /**
   * Get memory keys that should be loaded
   */
  get memoryKeys() {
    return ["history"];
  }

  /**
   * Clear conversation history for this session
   */
  async clear(): Promise<void> {
    await this.convex.mutation(api.functions.conversationHistory.cleanupOldSessions, {
      maxAgeMs: 0, // Immediately remove this session
    });
  }
}
