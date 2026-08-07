#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MockAbletonAdapter } from "./ableton/mock-adapter.js";
import { PythonRemoteScriptAdapter } from "./ableton/python-remote-script-adapter.js";
import { loadConfig } from "./config.js";
import { log } from "./logger.js";
import { registerAbletonTools } from "./mcp/register-ableton-tools.js";
import { registerMusicTools } from "./mcp/register-music-tools.js";
import { registerReferenceTools } from "./mcp/register-reference-tools.js";
import { registerFeedbackTools } from "./mcp/register-feedback-tools.js";
import { textResult } from "./mcp/helpers.js";
import { createReferenceService } from "./reference/create-reference-service.js";
import { FeedbackStore } from "./feedback/feedback-store.js";

const config = loadConfig();
const server = new McpServer({ name: "livebrain-mcp", version: "0.2.0" });
const ableton = config.adapter === "mock" ? new MockAbletonAdapter() : new PythonRemoteScriptAdapter();
const references = createReferenceService(config.dataDir);
const feedback = new FeedbackStore(config.dataDir);

server.tool("health", "Check LiveBrain MCP and configured adapter.", {}, async () => textResult({
  ok: true, version: "0.2.0", adapter: config.adapter,
}));
server.tool("ableton_capabilities", "Read bridge version and explicitly supported operations.", {},
  async () => textResult(await ableton.capabilities()));

registerAbletonTools(server, ableton);
registerMusicTools(server, ableton, references, feedback);
registerReferenceTools(server, references, ableton);
registerFeedbackTools(server, feedback);

const shutdown = async () => {
  log("info", "LiveBrain shutting down");
  await ableton.close();
  await server.close();
};
process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

log("info", "LiveBrain starting", { adapter: config.adapter, host: config.host, port: config.port });
await server.connect(new StdioServerTransport());
