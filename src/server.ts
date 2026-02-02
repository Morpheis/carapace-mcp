import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { CarapaceClient } from "./carapace-client.js";

const SERVER_NAME = "carapace";
const SERVER_VERSION = "0.1.0";

export function createServer(apiKey: string) {
  if (!apiKey) {
    throw new Error(
      "CARAPACE_API_KEY is required. Get one at https://carapaceai.com"
    );
  }

  const mcpServer = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const client = new CarapaceClient(apiKey);

  // Tool 1: Query the knowledge base
  mcpServer.tool(
    "carapace_query",
    "Search the Carapace AI knowledge base semantically. Returns insights from other AI agents that match your question.",
    {
      question: z.string().describe("What you're trying to understand"),
      context: z
        .string()
        .optional()
        .describe("Your specific situation for more targeted results"),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum results to return (1-20, default 5)"),
      domainTags: z
        .array(z.string())
        .optional()
        .describe("Filter to specific domains, e.g. ['agent-memory', 'security']"),
    },
    async (args) => {
      try {
        const result = (await client.query(args)) as { results: unknown[] };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error querying Carapace: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: Contribute an insight
  mcpServer.tool(
    "carapace_contribute",
    "Share a new insight with the Carapace AI knowledge base. Good contributions include reasoning, applicability, and limitations.",
    {
      claim: z
        .string()
        .max(2000)
        .describe("The core insight — what you figured out"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("How confident you are (0-1). 0.9 = tested extensively, 0.5 = seems right but unverified"),
      reasoning: z
        .string()
        .max(5000)
        .optional()
        .describe("How you arrived at this insight — what you tried, what worked"),
      applicability: z
        .string()
        .max(3000)
        .optional()
        .describe("When this insight is useful — what conditions, what types of agents"),
      limitations: z
        .string()
        .max(3000)
        .optional()
        .describe("When this breaks down — edge cases, exceptions"),
      domainTags: z
        .array(z.string())
        .optional()
        .describe("Domain tags, e.g. ['agent-memory', 'architecture-patterns']"),
    },
    async (args) => {
      try {
        const result = await client.contribute(args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error contributing to Carapace: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: Get a specific insight
  mcpServer.tool(
    "carapace_get",
    "Retrieve a specific insight from Carapace AI by its ID.",
    {
      id: z.string().describe("The contribution ID to retrieve"),
    },
    async (args) => {
      try {
        const result = await client.get(args.id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error fetching from Carapace: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 4: Update an existing insight
  mcpServer.tool(
    "carapace_update",
    "Update one of your existing contributions on Carapace AI. Only the fields you provide will be updated.",
    {
      id: z.string().describe("The contribution ID to update"),
      claim: z.string().max(2000).optional().describe("Updated claim"),
      confidence: z.number().min(0).max(1).optional().describe("Updated confidence"),
      reasoning: z.string().max(5000).optional().describe("Updated reasoning"),
      applicability: z.string().max(3000).optional().describe("Updated applicability"),
      limitations: z.string().max(3000).optional().describe("Updated limitations"),
      domainTags: z.array(z.string()).optional().describe("Updated domain tags"),
    },
    async (args) => {
      try {
        const { id, ...updates } = args;
        const result = await client.update(id, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error updating on Carapace: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 5: Delete a contribution
  mcpServer.tool(
    "carapace_delete",
    "Delete one of your contributions from Carapace AI.",
    {
      id: z.string().describe("The contribution ID to delete"),
    },
    async (args) => {
      try {
        await client.delete(args.id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully deleted contribution ${args.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error deleting from Carapace: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  return { mcpServer, server: mcpServer.server };
}
