import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LockStore } from "../locks/lock-store.js";
import { textResult } from "./helpers.js";

const scopeSchema = z.object({ generationId: z.string().uuid().optional(), trackIndex: z.number().int().min(0).optional(), slotIndex: z.number().int().min(0).optional() });

export function registerLockTools(server: McpServer, locks: LockStore) {
  server.tool("generation_set_locks", "Persist dimensions to preserve and mutate for a generation or clip target.", {
    scope: scopeSchema,
    preserve: z.array(z.string().min(1)).default([]),
    mutate: z.array(z.string().min(1)).default([]),
  }, async ({ scope, preserve, mutate }) => textResult(await locks.set(scope, preserve, mutate)));
  server.tool("generation_get_locks", "Resolve persistent generation/track/clip dimension locks.", {
    scope: scopeSchema,
  }, async ({ scope }) => textResult(await locks.get(scope)));
}
