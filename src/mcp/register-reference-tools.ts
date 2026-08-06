import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import type { ReferenceService } from "../reference/reference-service.js";
import { textResult } from "./helpers.js";

const rating = z.number().min(0).max(1);
const ratingsSchema = z.object({
  groove: rating.optional(), drums: rating.optional(), bass: rating.optional(), arrangement: rating.optional(),
  weirdness: rating.optional(), hypnosis: rating.optional(), darkness: rating.optional(), electro: rating.optional(),
  progressive: rating.optional(), space: rating.optional(), cheese: rating.optional(), overallReferenceValue: rating.optional(),
});

export function registerReferenceTools(server: McpServer, references: ReferenceService, ableton: AbletonAdapter) {
  server.tool("reference_add", "Register a local audio file without copying or committing the audio.", {
    audioPath: z.string().min(1), title: z.string().min(1), artist: z.string().optional(), release: z.string().optional(),
    label: z.string().optional(), year: z.number().int().min(1900).max(2200).optional(),
    groups: z.array(z.string().min(1)).default([]), tags: z.array(z.string().min(1)).default([]),
  }, async ({ audioPath, ...metadata }) => textResult(await references.add(audioPath, metadata)));

  server.tool("reference_analyze", "Analyze measured audio/rhythm features for a registered local reference.", {
    id: z.string().uuid(),
  }, async ({ id }) => textResult(await references.analyze(id)));

  server.tool("reference_tag", "Add human tags and curation groups to a reference.", {
    id: z.string().uuid(), tags: z.array(z.string().min(1)).default([]), groups: z.array(z.string().min(1)).default([]),
  }, async ({ id, tags, groups }) => textResult(await references.tag(id, tags, groups)));

  server.tool("reference_rate", "Store human musical ratings from 0 to 1; human judgement remains separate from measurements.", {
    id: z.string().uuid(), ratings: ratingsSchema, notes: z.string().max(4000).optional(),
  }, async ({ id, ratings, notes }) => textResult(await references.rate(id, ratings, notes)));

  server.tool("reference_get", "Get one reference record and its stored measured/human layers.", {
    id: z.string().uuid(),
  }, async ({ id }) => textResult(await references.get(id)));

  server.tool("reference_list", "List references, optionally filtered by curation group.", {
    group: z.string().min(1).optional(),
  }, async ({ group }) => textResult({ references: await references.list(group) }));

  server.tool("reference_build_profile", "Aggregate a curation group into distributions and a generator-consumable StyleProfile.", {
    group: z.string().regex(/^[a-zA-Z0-9._-]+$/),
  }, async ({ group }) => textResult(await references.buildProfile(group)));

  server.tool("music_compare_to_profile", "Compare current measurable Live Set facts with a curated profile and label facts, heuristics and human ratings separately.", {
    profileId: z.string().regex(/^[a-zA-Z0-9._-]+$/),
  }, async ({ profileId }) => textResult(await references.compareLiveSet(profileId, ableton)));
}
