import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FeedbackStore } from "../feedback/feedback-store.js";
import { textResult } from "./helpers.js";

export function registerFeedbackTools(server: McpServer, feedback: FeedbackStore) {
  server.tool("feedback_generation", "Attach structured human feedback to a generated result.", {
    generationId: z.string().uuid(), ratings: z.record(z.number().min(0).max(10)).default({}),
    tags: z.array(z.string().min(1)).default([]), note: z.string().max(4000).optional(),
  }, async ({ generationId, ratings, tags, note }) => textResult(await feedback.addFeedback(generationId, ratings, tags, note)));
  server.tool("feedback_get_preferences", "Summarize local statistical preferences without claiming model training.", {},
    async () => textResult(await feedback.preferences()));
}
