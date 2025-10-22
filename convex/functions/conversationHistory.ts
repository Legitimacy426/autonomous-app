import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a new conversation session or get existing one
 */
export const getOrCreateSession = mutation({
  args: {
    sessionId: v.string(),
    userId: v.optional(v.id("users")),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if session exists
    const existingSession = await ctx.db
      .query("conversationHistory")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (existingSession) {
      // Update last access time
      await ctx.db.patch(existingSession._id, {
        lastAccessTime: Date.now(),
      });
      return existingSession._id;
    }

    // Create new session
    const sessionId = await ctx.db.insert("conversationHistory", {
      sessionId: args.sessionId,
      messages: [],
      lastAccessTime: Date.now(),
      metadata: {
        userId: args.userId,
        context: args.context,
      },
    });

    return sessionId;
  },
});

/**
 * Add a message to the conversation history
 */
export const addMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the session
    const session = await ctx.db
      .query("conversationHistory")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`);
    }

    // Add message and update last access time
    await ctx.db.patch(session._id, {
      messages: [
        ...session.messages,
        {
          role: args.role,
          content: args.content,
          timestamp: Date.now(),
        },
      ],
      lastAccessTime: Date.now(),
    });

    return "✅ Message added to conversation history";
  },
});

/**
 * Get recent messages from a conversation session
 */
export const getRecentMessages = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("conversationHistory")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) {
      return [];
    }

    // Get messages, optionally limited
    const messages = args.limit
      ? session.messages.slice(-args.limit)
      : session.messages;

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString(),
    }));
  },
});

/**
 * Update session metadata (e.g., context or summary)
 */
export const updateSessionMetadata = mutation({
  args: {
    sessionId: v.string(),
    context: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("conversationHistory")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`);
    }

    const updates: any = {
      lastAccessTime: Date.now(),
    };

    if (args.context !== undefined || args.summary !== undefined) {
      updates.metadata = {
        ...session.metadata,
        context: args.context ?? session.metadata?.context,
        summary: args.summary ?? session.metadata?.summary,
      };
    }

    await ctx.db.patch(session._id, updates);

    return "✅ Session metadata updated";
  },
});

/**
 * Clean up old sessions (can be run periodically)
 */
export const cleanupOldSessions = mutation({
  args: {
    maxAgeMs: v.number(), // Maximum age in milliseconds
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.maxAgeMs;
    
    const oldSessions = await ctx.db
      .query("conversationHistory")
      .filter((q) => q.lt(q.field("lastAccessTime"), cutoffTime))
      .collect();

    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    return `✅ Cleaned up ${oldSessions.length} old sessions`;
  },
});
