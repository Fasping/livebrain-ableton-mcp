import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodTypeAny } from "zod";
import { MockAbletonAdapter } from "../ableton/mock-adapter.js";
import { registerAbletonTools } from "../mcp/register-ableton-tools.js";

test("addressable Ableton tools publish and validate Master/Return track aliases", () => {
  const registered = new Map<string, { description: string; schema: Record<string, ZodTypeAny> }>();
  const server = {
    tool(name: string, description: string, schema: Record<string, ZodTypeAny>) {
      registered.set(name, { description, schema });
    },
  } as unknown as McpServer;

  registerAbletonTools(server, new MockAbletonAdapter());

  for (const name of [
    "ableton_get_devices",
    "ableton_get_device_parameters",
    "ableton_set_device_parameter",
    "ableton_set_track_mixer",
  ]) {
    const tool = registered.get(name);
    assert.ok(tool, `${name} should be registered`);
    assert.equal(tool.schema.trackIndex?.safeParse(-1).success, true);
    assert.equal(tool.schema.trackIndex?.safeParse(200).success, true);
    assert.equal(tool.schema.trackIndex?.safeParse(-2).success, false);
    assert.match(tool.schema.trackIndex?.description ?? "", /-1 = Master/);
  }

  assert.ok(registered.has("ableton_get_master_meter"));
});
