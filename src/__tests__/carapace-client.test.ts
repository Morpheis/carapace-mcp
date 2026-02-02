import { describe, it, expect, vi, beforeEach } from "vitest";
import { CarapaceClient } from "../carapace-client.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("CarapaceClient", () => {
  const API_KEY = "sc_key_test123";
  let client: CarapaceClient;

  beforeEach(() => {
    client = new CarapaceClient(API_KEY);
    mockFetch.mockReset();
  });

  describe("query", () => {
    it("sends correct request and parses response", async () => {
      const mockResponse = {
        results: [
          {
            id: "abc-123",
            claim: "Test insight",
            reasoning: "Test reasoning",
            confidence: 0.9,
            score: 0.85,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.query({ question: "How to handle memory?" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://carapaceai.com/api/v1/query",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ question: "How to handle memory?" }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("passes optional parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await client.query({
        question: "test",
        context: "my context",
        maxResults: 3,
        domainTags: ["agent-memory"],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context).toBe("my context");
      expect(body.maxResults).toBe(3);
      expect(body.domainTags).toEqual(["agent-memory"]);
    });
  });

  describe("contribute", () => {
    it("sends correct request and returns created contribution", async () => {
      const contribution = {
        claim: "Test claim",
        confidence: 0.85,
        reasoning: "Because I tested it",
      };

      const mockResponse = { id: "new-123", ...contribution };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.contribute(contribution);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://carapaceai.com/api/v1/contributions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
          }),
          body: JSON.stringify(contribution),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("get", () => {
    it("fetches a contribution by ID", async () => {
      const mockResponse = { id: "abc-123", claim: "Test" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.get("abc-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://carapaceai.com/api/v1/contributions/abc-123",
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("update", () => {
    it("sends PUT with updated fields", async () => {
      const updates = { reasoning: "Updated reasoning", confidence: 0.95 };
      const mockResponse = { id: "abc-123", ...updates };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.update("abc-123", updates);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://carapaceai.com/api/v1/contributions/abc-123",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
          }),
          body: JSON.stringify(updates),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("delete", () => {
    it("sends DELETE request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await client.delete("abc-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://carapaceai.com/api/v1/contributions/abc-123",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("throws on API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Unauthorized" } }),
      });

      await expect(
        client.query({ question: "test" })
      ).rejects.toThrow("Unauthorized");
    });

    it("throws on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        client.query({ question: "test" })
      ).rejects.toThrow("Network error");
    });

    it("includes status code when API returns non-JSON error body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => { throw new Error("not json"); },
      });

      await expect(
        client.query({ question: "test" })
      ).rejects.toThrow("API error: 502");
    });

    it("includes retry-after info on 429 responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: "Rate limit exceeded", retryAfter: 30 },
        }),
      });

      await expect(
        client.query({ question: "test" })
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
