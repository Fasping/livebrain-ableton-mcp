#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AbletonBridgeClient } from "./bridge/client.js";
import { MusicBrain } from "./music-brain/index.js";

const server = new McpServer({ name: "livebrain-mcp", version: "0.1.0" });
const bridge = new AbletonBridgeClient();
const brain = new MusicBrain();

server.tool("health", "Check LiveBrain MCP health.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify({ ok: true, version: "0.1.0" }) }],
}));

server.tool("live_set_snapshot", "Read the current Ableton Live Set.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(await bridge.request("live_set.snapshot"), null, 2) }],
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

await server.connect(new StdioServerTransport());
