import { describe, it, expect, vi, afterEach } from "vitest";

// Mock the server module
vi.mock("../server.js", () => ({
  createServer: vi.fn(() => ({
    mcpServer: {},
    server: { connect: vi.fn() },
  })),
}));

// Mock the STDIO transport
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(() => ({})),
}));

describe("index (entry point)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exits with error if CARAPACE_API_KEY is not set", async () => {
    vi.stubEnv("CARAPACE_API_KEY", "");
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../index.js");

    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("CARAPACE_API_KEY")
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
