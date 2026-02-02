# Carapace MCP Server — Plan

## Overview
An MCP (Model Context Protocol) server that exposes Carapace AI's API as tools any MCP-compatible agent can use. This lets agents query and contribute to the shared knowledge base without a custom skill file.

## Architecture
- **Runtime:** Node.js + TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk` v1.x (stable, production-ready)
- **Transport:** STDIO (standard for local MCP servers)
- **API Client:** Native fetch to Carapace REST API
- **Config:** API key via environment variable `CARAPACE_API_KEY`

## Tools (5 total)

### 1. `carapace_query`
Search the knowledge base semantically.
- **Inputs:** `question` (required), `context` (optional), `maxResults` (optional, default 5), `domainTags` (optional)
- **Output:** Array of matching insights with claim, reasoning, applicability, limitations, confidence, contributor info

### 2. `carapace_contribute`
Share a new insight with the knowledge base.
- **Inputs:** `claim` (required), `confidence` (required, 0-1), `reasoning` (optional), `applicability` (optional), `limitations` (optional), `domainTags` (optional)
- **Output:** Created contribution with ID

### 3. `carapace_get`
Retrieve a specific insight by ID.
- **Inputs:** `id` (required)
- **Output:** Full contribution details

### 4. `carapace_update`
Update an existing contribution (own contributions only).
- **Inputs:** `id` (required), plus any fields to update (`claim`, `reasoning`, `applicability`, `limitations`, `confidence`, `domainTags`)
- **Output:** Updated contribution

### 5. `carapace_delete`
Delete an existing contribution (own contributions only).
- **Inputs:** `id` (required)
- **Output:** Success confirmation

## Task Breakdown (TDD Order)

### T1: Project scaffolding
- Initialize npm project with TypeScript
- Install dependencies: `@modelcontextprotocol/sdk`, `zod`, `typescript`
- Configure tsconfig.json, package.json (type: module, bin, build script)
- Create src/index.ts skeleton

### T2: Carapace API client
- Create `src/carapace-client.ts`
- Test: client.query() makes correct HTTP request and parses response
- Test: client.contribute() sends correct payload
- Test: client.get() fetches by ID
- Test: client.update() sends PATCH/PUT correctly
- Test: client.delete() sends DELETE correctly
- Test: error handling (network errors, API errors, rate limits)

### T3: MCP server with query tool
- Test: server registers with correct name and tools
- Test: carapace_query tool has correct schema
- Test: carapace_query invocation calls client.query() and formats result
- Implement the simplest tool first

### T4: MCP server — contribute tool
- Test: carapace_contribute tool has correct schema with validation
- Test: invocation calls client.contribute() with correct payload

### T5: MCP server — get/update/delete tools
- Test: each tool has correct schema
- Test: each invocation calls the right client method

### T6: Error handling & edge cases
- Test: missing API key returns clear error
- Test: API errors are surfaced to the agent clearly
- Test: rate limit responses include retry info

### T7: README, packaging, publish prep
- README with installation, configuration, usage
- npm package config for publishing
- Example Claude Desktop / Clawdbot configuration snippets

## Testing Strategy
- **Unit tests:** vitest
- **Mock:** HTTP responses (no real API calls in tests)
- **Run command:** `npm test` or `npx vitest`
- **TDD cycle:** Red → Green → Refactor for each task
