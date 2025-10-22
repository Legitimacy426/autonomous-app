import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Define types for audit log entries
type ToolExecution = {
  tool: string;
  params: any;
  result: any;
};

type AuditLogEntry = {
  timestamp: number;
  userPrompt: string;
  aiReasoning: string[];
  toolExecutions: ToolExecution[];
  result: string;
  error?: string;
};

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
export default defineSchema({
  // Auth tables for Convex Auth library
  ...authTables,
  
  // You can add custom fields to the users table
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Add any custom fields you want
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
  }),

  // Store conversation history for memory
  conversationHistory: defineTable({
    sessionId: v.string(), // Unique identifier for each conversation session
    messages: v.array(v.object({
      role: v.string(), // 'human' or 'ai'
      content: v.string(),
      timestamp: v.number(),
    })),
    lastAccessTime: v.number(), // For session management/cleanup
    metadata: v.optional(v.object({
      userId: v.optional(v.id("users")),
      context: v.optional(v.string()),
      summary: v.optional(v.string()),
    })),
  }),

  // Audit logs for AI actions
  aiAuditLogs: defineTable({
    timestamp: v.number(),
    userPrompt: v.string(),
    aiReasoning: v.array(v.string()),
    toolExecutions: v.array(v.object({
      tool: v.string(),
      params: v.any(),
      result: v.any()
    })),
    result: v.string(),
    error: v.optional(v.string()),
    userId: v.optional(v.id("users")), // Reference to user if action was performed on behalf of a user
  }),
});
