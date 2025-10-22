import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Base class for all agents with common functionality
 */
export abstract class BaseAgent {
  protected llm: ChatOpenAI;
  protected convex: ConvexHttpClient;
  protected systemMessage: string;

  constructor(
    convex: ConvexHttpClient,
    systemMessage: string,
    temperature = 0.3,
    model = "gpt-4o-mini"
  ) {
    this.llm = new ChatOpenAI({
      temperature,
      model,
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.convex = convex;
    this.systemMessage = systemMessage;
  }

  /**
   * Log agent's action to audit trail
   */
  protected async logAction(
    prompt: string,
    reasoning: string[],
    result: string,
    error?: string
  ) {
    try {
      await this.convex.mutation(api.functions.aiAuditLogs.logAiAction, {
        userPrompt: prompt,
        aiReasoning: reasoning,
        toolExecutions: [],
        result,
        error,
      });
    } catch (error) {
      console.error("Failed to log agent action:", error);
    }
  }

  /**
   * Execute a prompt and get response
   */
  protected async execute(
    prompt: string,
    previousMessages: Array<HumanMessage | AIMessage> = []
  ) {
    const messages = [
      new SystemMessage(this.systemMessage),
      ...previousMessages,
      new HumanMessage(prompt),
    ];

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  /**
   * Abstract method that each agent must implement
   */
  abstract process(input: string): Promise<{
    result: string;
    reasoning: string[];
  }>;
}
