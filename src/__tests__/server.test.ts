import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch before importing anything that uses it
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { createServer } from "../server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

async function setupClientServer(apiKey = "sc_key_test123") {
  const { mcpServer, server } = createServer(apiKey);
  const client = new Client({ name: "test-client", version: "1.0.0" });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, server, mcpServer, cleanup: async () => {
    await client.close();
    await server.close();
  }};
}

describe("Carapace MCP Server", () => {
  describe("configuration", () => {
    it("throws if no API key is provided", () => {
      expect(() => createServer("")).toThrow("CARAPACE_API_KEY");
    });
  });

  describe("tool listing", () => {
    it("exposes all 5 tools", async () => {
      const { client, cleanup } = await setupClientServer();
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);

      expect(toolNames).toContain("carapace_query");
      expect(toolNames).toContain("carapace_contribute");
      expect(toolNames).toContain("carapace_get");
      expect(toolNames).toContain("carapace_update");
      expect(toolNames).toContain("carapace_delete");
      expect(toolNames).toHaveLength(5);
      await cleanup();
    });

    it("carapace_query has question as required param", async () => {
      const { client, cleanup } = await setupClientServer();
      const result = await client.listTools();
      const queryTool = result.tools.find((t) => t.name === "carapace_query");

      expect(queryTool).toBeDefined();
      expect(queryTool!.inputSchema.required).toContain("question");
      await cleanup();
    });

    it("carapace_contribute requires claim and confidence", async () => {
      const { client, cleanup } = await setupClientServer();
      const result = await client.listTools();
      const tool = result.tools.find((t) => t.name === "carapace_contribute");

      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain("claim");
      expect(tool!.inputSchema.required).toContain("confidence");
      await cleanup();
    });
  });

  describe("tool invocation", () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it("carapace_query calls API and returns results", async () => {
      const mockResults = {
        results: [
          {
            id: "abc-123",
            claim: "Memory should use WAL pattern",
            reasoning: "Tested extensively",
            confidence: 0.9,
            score: 0.85,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_query",
        arguments: { question: "How to handle memory?" },
      });

      expect(result.content).toBeDefined();
      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].type).toBe("text");
      expect(textContent[0].text).toContain("Memory should use WAL pattern");
      await cleanup();
    });

    it("carapace_contribute calls API and returns confirmation", async () => {
      const mockResponse = {
        id: "new-123",
        claim: "Test insight",
        confidence: 0.85,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_contribute",
        arguments: { claim: "Test insight", confidence: 0.85 },
      });

      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("new-123");
      await cleanup();
    });

    it("carapace_get fetches contribution by ID", async () => {
      const mockResponse = {
        id: "abc-123",
        claim: "Test claim",
        confidence: 0.9,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_get",
        arguments: { id: "abc-123" },
      });

      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("abc-123");
      expect(textContent[0].text).toContain("Test claim");
      await cleanup();
    });

    it("carapace_update sends correct request", async () => {
      const mockResponse = {
        id: "abc-123",
        reasoning: "Updated reasoning",
        confidence: 0.95,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_update",
        arguments: {
          id: "abc-123",
          reasoning: "Updated reasoning",
          confidence: 0.95,
        },
      });

      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("Updated reasoning");

      // Verify the fetch was called with PUT and correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        "https://carapaceai.com/api/v1/contributions/abc-123",
        expect.objectContaining({ method: "PUT" })
      );
      await cleanup();
    });

    it("carapace_delete removes contribution", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_delete",
        arguments: { id: "abc-123" },
      });

      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("Successfully deleted");
      expect(textContent[0].text).toContain("abc-123");
      await cleanup();
    });

    it("handles API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { code: "RATE_LIMITED", message: "Rate limit exceeded" },
        }),
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_query",
        arguments: { question: "test" },
      });

      expect(result.isError).toBe(true);
      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("Rate limit");
      await cleanup();
    });

    it("handles non-JSON error responses without crashing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => { throw new Error("not json"); },
      });

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_query",
        arguments: { question: "test" },
      });

      expect(result.isError).toBe(true);
      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("502");
      await cleanup();
    });

    it("surfaces network errors clearly", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const { client, cleanup } = await setupClientServer();
      const result = await client.callTool({
        name: "carapace_contribute",
        arguments: { claim: "test", confidence: 0.5 },
      });

      expect(result.isError).toBe(true);
      const textContent = result.content as Array<{ type: string; text: string }>;
      expect(textContent[0].text).toContain("ECONNREFUSED");
      await cleanup();
    });
  });
});
