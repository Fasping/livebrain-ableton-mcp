#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PythonRemoteScriptAdapter } from "./ableton/python-remote-script-adapter.js";
import { MusicBrain } from "./music-brain/index.js";

const server = new McpServer({ name: "livebrain-mcp", version: "0.1.1" });
const ableton = new PythonRemoteScriptAdapter();
const brain = new MusicBrain();

server.tool("health", "Check LiveBrain MCP health.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify({ ok: true, version: "0.1.1" }) }],
}));

server.tool("ableton_capabilities", "Read bridge version and supported Ableton operations.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(await ableton.capabilities(), null, 2) }],
}));

server.tool("live_set_snapshot", "Read the current Ableton Live Set.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(await ableton.snapshot(), null, 2) }],
}));

server.tool(
  "generate_bassline",
  "Generate a deterministic style-aware bassline.",
  {
    bars: z.number().int().min(1).max(256).default(4),
    seed: z.number().int().default(1),
    rootMidi: z.number().int().min(0).max(127).default(36),
  },
  async (input) => ({
    content: [{ type: "text", text: JSON.stringify({ notes: brain.generateBassline(input) }, null, 2) }],
  }),
);

const shutdown = async () => {
  await ableton.close();
  await server.close();
};

process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

await server.connect(new StdioServerTransport());
