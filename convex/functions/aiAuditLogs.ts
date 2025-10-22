import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Log an AI action with its context and results
 */
export const logAiAction = mutation({
  args: {
    userPrompt: v.string(),
    aiReasoning: v.array(v.string()),
    toolExecutions: v.array(v.object({
      tool: v.string(),
      params: v.any(),
      result: v.any()
    })),
    result: v.string(),
    error: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const logEntry = await ctx.db.insert("aiAuditLogs", {
      timestamp: Date.now(),
      userPrompt: args.userPrompt,
      aiReasoning: args.aiReasoning,
      toolExecutions: args.toolExecutions,
      result: args.result,
      error: args.error,
      userId: args.userId,
    });

    return `✅ Logged AI action: ${logEntry}`;
  },
});

/**
 * Get audit logs with optional filtering
 */
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("aiAuditLogs");

    // Apply filters
    if (args.userId !== undefined) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId!));
    }
    if (args.startTime !== undefined) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startTime!));
    }
    if (args.endTime !== undefined) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endTime!));
    }

    // Get logs and sort by timestamp
    let logs = await query.collect();
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit if specified
    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }

    if (logs.length === 0) {
      return "📝 No audit logs found matching the criteria";
    }

    // Format logs for display
    const formattedLogs = logs.map((log: {
      timestamp: number;
      userPrompt: string;
      aiReasoning: string[];
      toolExecutions: Array<{
        tool: string;
        params: any;
        result: any;
      }>;
      result: string;
      error?: string;
      userId?: any;
    }) => ({
      timestamp: new Date(log.timestamp).toISOString(),
      userPrompt: log.userPrompt,
      aiReasoning: log.aiReasoning,
      toolExecutions: log.toolExecutions,
      result: log.result,
      error: log.error,
      userId: log.userId,
    }));

    return {
      count: logs.length,
      logs: formattedLogs
    };
  },
});

/**
 * Get recent audit logs for a specific user
 */
export const getUserRecentLogs = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("aiAuditLogs")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit after collection
    const limitedLogs = args.limit ? logs.slice(0, args.limit) : logs.slice(0, 10);

    if (logs.length === 0) {
      return `📝 No audit logs found for user ${args.userId}`;
    }

    // Format logs for display
    const formattedLogs = limitedLogs.map((log: {
      timestamp: number;
      userPrompt: string;
      result: string;
      error?: string;
    }) => ({
      timestamp: new Date(log.timestamp).toISOString(),
      userPrompt: log.userPrompt,
      result: log.result,
      error: log.error,
    }));

    return {
      count: logs.length,
      logs: formattedLogs
    };
  },
});
