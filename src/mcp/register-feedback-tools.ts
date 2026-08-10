import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { preferenceDimensions, type FeedbackStore } from "../feedback/feedback-store.js";
import { textResult } from "./helpers.js";

export function registerFeedbackTools(server: McpServer, feedback: FeedbackStore) {
  server.tool("feedback_generation", "Attach structured human feedback to a generated result.", {
    generationId: z.string().uuid(), ratings: z.record(z.number().min(0).max(10)).default({}),
    tags: z.array(z.string().min(1)).default([]), note: z.string().max(4000).optional(),
  }, async ({ generationId, ratings, tags, note }) => textResult(await feedback.addFeedback(generationId, ratings, tags, note)));
  server.tool("feedback_get_preferences", "Summarize local statistical preferences without claiming model training.", {},
    async () => textResult(await feedback.preferences()));
  server.tool("feedback_compare_generations", "Record an A/B preference between two LiveBrain generations so future style profiles move cautiously toward the winner on selected dimensions.", {
    winnerGenerationId: z.string().uuid(), loserGenerationId: z.string().uuid(),
    dimensions: z.array(z.enum(preferenceDimensions)).default([]), note: z.string().max(4000).optional(),
  }, async ({ winnerGenerationId, loserGenerationId, dimensions, note }) => textResult(await feedback.compare(winnerGenerationId, loserGenerationId, dimensions, note)));
}
