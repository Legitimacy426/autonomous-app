import { BaseAgent } from "./base-agent";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Define the schema for research findings
const ResearchFindings = z.object({
  databaseState: z.object({
    totalUsers: z.number(),
    relevantUsers: z.array(z.object({
      email: z.string(),
      details: z.record(z.string(), z.union([z.string(), z.boolean()])),
    })),
  }),
  potentialConflicts: z.array(z.string()),
  recommendations: z.array(z.string()),
  additionalContext: z.string(),
});

type ResearchFindings = z.infer<typeof ResearchFindings>;

interface UserDetails {
  [key: string]: string | boolean;
}

interface ParsedUserDetails extends UserDetails {
  name: string;
  email: string;
  verified: boolean;
}

/**
 * ResearcherAgent gathers and analyzes information before task execution
 */
export class ResearcherAgent extends BaseAgent {
  constructor(convex: ConvexHttpClient) {
    super(
      convex,
      `You are a research agent that gathers and analyzes information before task execution.
Your role is to:
1. Analyze the current database state
2. Identify potential conflicts or issues
3. Provide recommendations based on findings
4. Add relevant context for decision making

Format your response as a JSON object with the following structure:
{
  "databaseState": {
    "totalUsers": number,
    "relevantUsers": [
      {
        "email": "user's email",
        "details": { key-value pairs of relevant information }
      }
    ]
  },
  "potentialConflicts": ["Array of potential issues or conflicts"],
  "recommendations": ["Array of recommendations based on findings"],
  "additionalContext": "Any other relevant context"
}

Always ensure your response is valid JSON and follows the schema exactly.`
    );
  }

  /**
   * Process the input task and gather relevant information
   */
  async process(input: string) {
    const reasoning: string[] = [];
    let result = "";

    try {
      // First, get the current database state
      reasoning.push("Querying current database state");
      const usersResult = await this.convex.query(api.functions.users.listUsers, {}) as string;
      const users = usersResult === "📝 No users found in the database"
        ? []
        : usersResult
            .split('\n')
            .filter((line: string) => line.startsWith('-'))
            .map((line: string) => line.substring(2).trim());
      
      // Get any specifically mentioned users from the input
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const mentionedEmails = input.match(emailRegex) || [];
      
      // Get details for mentioned users
      reasoning.push("Gathering details for relevant users");
      const relevantUsers: Array<{ email: string; details: UserDetails }> = [];
      for (const email of mentionedEmails) {
        const userDetails = await this.convex.query(api.functions.users.getUser, { email });
        if (userDetails && !userDetails.startsWith("❌")) {
          relevantUsers.push({
            email,
            details: this.parseUserDetails(userDetails),
          });
        }
      }

      // Analyze the task and current state
      reasoning.push("Analyzing task requirements and current state");
      const analysisPrompt = `
Task: ${input}

Current Database State:
- Total Users: ${users.length}
- Mentioned Users: ${mentionedEmails.join(", ") || "None"}
- Found Users: ${relevantUsers.map(u => u.email).join(", ") || "None"}

Analyze this information and provide:
1. Potential conflicts or issues
2. Recommendations for proceeding
3. Any additional context that might be relevant
`;

      const analysisJson = await this.execute(analysisPrompt);
      const analysis = JSON.parse(analysisJson) as {
        potentialConflicts?: string[];
        recommendations?: string[];
        additionalContext?: string;
      };

      // Combine everything into our findings format
      const findings: ResearchFindings = {
        databaseState: {
          totalUsers: users.length,
          relevantUsers,
        },
        potentialConflicts: analysis.potentialConflicts || [],
        recommendations: analysis.recommendations || [],
        additionalContext: analysis.additionalContext || "",
      };

      // Format the findings into a readable format
      result = this.formatFindings(findings);

      // Log the successful research
      await this.logAction(input, reasoning, result);

      return { result, reasoning };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reasoning.push(`Error during research: ${errorMessage}`);
      result = `Failed to complete research: ${errorMessage}`;

      // Log the failed attempt
      await this.logAction(input, reasoning, result, errorMessage);

      return { result, reasoning };
    }
  }

  /**
   * Parse user details string into an object
   */
  private parseUserDetails(details: string): ParsedUserDetails {
    const parsed: Record<string, string | boolean> = {
      verified: false,
    };
    
    // Extract name
    const nameMatch = details.match(/Found user: (.*?) \(/);
    if (nameMatch) {
      parsed.name = nameMatch[1];
    }

    // Extract email
    const emailMatch = details.match(/\((.*?)\)/);
    if (emailMatch) {
      parsed.email = emailMatch[1];
    }

    // Extract verification status
    parsed.verified = details.includes("Email verified");

    return parsed as ParsedUserDetails;
  }

  /**
   * Format the findings into a readable string
   */
  private formatFindings(findings: ResearchFindings): string {
    let output = "🔍 Research Findings\n\n";

    // Database state
    output += "📊 Database State:\n";
    output += `• Total Users: ${findings.databaseState.totalUsers}\n`;
    if (findings.databaseState.relevantUsers.length > 0) {
      output += "• Relevant Users:\n";
      findings.databaseState.relevantUsers.forEach(user => {
        output += `  - ${user.email}\n`;
        Object.entries(user.details).forEach(([key, value]) => {
          output += `    ${key}: ${value}\n`;
        });
      });
    }
    output += "\n";

    // Potential conflicts
    if (findings.potentialConflicts.length > 0) {
      output += "⚠️ Potential Conflicts:\n";
      findings.potentialConflicts.forEach(conflict => {
        output += `• ${conflict}\n`;
      });
      output += "\n";
    }

    // Recommendations
    if (findings.recommendations.length > 0) {
      output += "💡 Recommendations:\n";
      findings.recommendations.forEach((recommendation: string) => {
        output += `• ${recommendation}\n`;
      });
      output += "\n";
    }

    // Additional context
    if (findings.additionalContext) {
      output += "📝 Additional Context:\n";
      output += findings.additionalContext + "\n";
    }

    return output;
  }
}
