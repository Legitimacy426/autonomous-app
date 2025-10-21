import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a new user in the database
 * Used by the AI agent to add users via natural language
 */
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error(`❌ Invalid email format: ${args.email}`);
    }

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUser) {
      return `⚠️ User with email ${args.email} already exists`;
    }

    // Create the new user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      emailVerificationTime: Date.now(), // Mark as verified for demo purposes
    });

    return `✅ Created user ${args.name} (${args.email})`;
  },
});

/**
 * Get user details by email
 * Used by the AI agent to retrieve user information
 */
export const getUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return `❌ No user found with email ${args.email}`;
    }

    return `👤 Found user: ${user.name} (${user.email})${
      user.emailVerificationTime ? " - Email verified" : ""
    }`;
  },
});

/**
 * Delete a user by email
 * Used by the AI agent to remove users from the database
 */
export const deleteUser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return `❌ No user found with email ${args.email}`;
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return `🗑️ Deleted user ${user.name} with email ${args.email}`;
  },
});

/**
 * List all users (additional function for better AI interaction)
 * Used by the AI agent to get an overview of all users
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    if (users.length === 0) {
      return "📝 No users found in the database";
    }

    const userList = users
      .map((user) => `- ${user.name} (${user.email})`)
      .join("\n");

    return `📋 Found ${users.length} user(s):\n${userList}`;
  },
});

/**
 * Update user information
 * Used by the AI agent to modify user details
 */
export const updateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return `❌ No user found with email ${args.email}`;
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.location !== undefined) updates.location = args.location;
    if (args.website !== undefined) updates.website = args.website;

    // Update the user
    await ctx.db.patch(user._id, updates);

    return `✅ Updated user ${user.name} (${args.email})`;
  },
});
