#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const apiKey = process.env.CARAPACE_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: CARAPACE_API_KEY environment variable is required.\n" +
        "Get your API key at https://carapaceai.com"
    );
    process.exit(1);
    return; // unreachable in prod, but lets tests continue safely
  }

  const { server } = createServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
