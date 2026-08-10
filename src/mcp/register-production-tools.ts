import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import { executeProduction } from "../production/production-executor.js";
import { planProduction } from "../production/production-planner.js";
import { textResult } from "./helpers.js";

const productionInput = {
  prompt: z.string().min(3).max(4000),
  bars: z.number().int().min(64).max(512).optional(),
  seed: z.number().int().default(1),
  bpm: z.number().min(40).max(300).optional(),
  rootNote: z.number().int().min(0).max(11).optional(),
};

export function registerProductionTools(server: McpServer, ableton: AbletonAdapter) {
  server.tool("music_plan_production", "Translate a natural-language vibe into a deterministic multi-track composition, arrangement and mix plan without changing Ableton.", productionInput,
    async ({ prompt, ...options }) => textResult(planProduction(prompt, options)));

  server.tool("music_create_production", "Build an eight-track production with instruments, MIDI, role-aware mixer settings and Arrangement placement. Defaults to dry-run.", {
    ...productionInput, dryRun: z.boolean().default(true),
  }, async ({ prompt, dryRun, ...options }) => textResult(await executeProduction(ableton, planProduction(prompt, options), dryRun)));
}
