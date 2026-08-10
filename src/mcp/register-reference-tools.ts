import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import type { ReferenceService } from "../reference/reference-service.js";
import { textResult } from "./helpers.js";

const rating = z.number().min(0).max(10);
const ratingsSchema = z.object({
  groove: rating.optional(), drums: rating.optional(), bass: rating.optional(), synth: rating.optional(), arrangement: rating.optional(),
  weirdness: rating.optional(), hypnosis: rating.optional(), darkness: rating.optional(), electro: rating.optional(),
  progressive: rating.optional(), space: rating.optional(), rawness: rating.optional(), subtlety: rating.optional(),
  predictability: rating.optional(), cheese: rating.optional(), overallReferenceValue: rating.optional(),
});
const idSchema = z.string().regex(/^[a-zA-Z0-9._-]+$/);
const influenceSchema = z.object({
  groove: z.number().min(0).max(1).optional(), drums: z.number().min(0).max(1).optional(), bass: z.number().min(0).max(1).optional(),
  synth: z.number().min(0).max(1).optional(), sequence: z.number().min(0).max(1).optional(), arrangement: z.number().min(0).max(1).optional(),
  timbre: z.number().min(0).max(1).optional(), harmony: z.number().min(0).max(1).optional(), space: z.number().min(0).max(1).optional(),
  rawness: z.number().min(0).max(1).optional(), weirdness: z.number().min(0).max(1).optional(), hypnosis: z.number().min(0).max(1).optional(),
  electro: z.number().min(0).max(1).optional(), progressive: z.number().min(0).max(1).optional(),
});

export function registerReferenceTools(server: McpServer, references: ReferenceService, ableton: AbletonAdapter) {
  server.tool("reference_add", "Register a local audio file without copying or committing the audio.", {
    audioPath: z.string().min(1), title: z.string().min(1), artist: z.string().optional(), release: z.string().optional(),
    label: z.string().optional(), year: z.number().int().min(1900).max(2200).optional(),
    groups: z.array(z.string().min(1)).default([]), tags: z.array(z.string().min(1)).default([]),
  }, async ({ audioPath, ...metadata }) => textResult(await references.add(audioPath, metadata)));

  server.tool("reference_analyze", "Analyze measured audio/rhythm features for a registered local reference.", {
    id: idSchema,
  }, async ({ id }) => textResult(await references.analyze(id)));

  server.tool("reference_import_directory", "Recursively import a local folder of audio references, avoid duplicate paths, analyze them and build a reusable style profile in one step.", {
    directoryPath: z.string().min(1),
    group: z.string().regex(/^[a-zA-Z0-9._-]+$/),
    artist: z.string().min(1).optional(), label: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).default([]),
    analyze: z.boolean().default(true), buildProfile: z.boolean().default(true),
    influence: influenceSchema.optional(),
  }, async (options) => textResult(await references.importDirectory(options)));

  server.tool("reference_tag", "Add human tags and curation groups to a reference.", {
    id: idSchema, tags: z.array(z.string().min(1)).default([]), groups: z.array(z.string().min(1)).default([]),
  }, async ({ id, tags, groups }) => textResult(await references.tag(id, tags, groups)));

  server.tool("reference_rate", "Store human musical ratings from 0 to 10; human judgement remains separate from measurements.", {
    id: idSchema, ratings: ratingsSchema, notes: z.string().max(4000).optional(),
  }, async ({ id, ratings, notes }) => textResult(await references.rate(id, ratings, notes)));

  server.tool("reference_get", "Get one reference record and its stored measured/human layers.", {
    id: idSchema,
  }, async ({ id }) => textResult(await references.get(id)));

  server.tool("reference_list", "List references, optionally filtered by curation group.", {
    group: z.string().min(1).optional(),
  }, async ({ group }) => textResult({ references: await references.list(group) }));

  server.tool("reference_build_profile", "Aggregate a curation group into distributions and a generator-consumable StyleProfile.", {
    group: z.string().regex(/^[a-zA-Z0-9._-]+$/),
  }, async ({ group }) => textResult(await references.buildProfile(group)));

  server.tool("reference_set_influence", "Set independent per-dimension contribution weights from 0 to 1.", {
    id: idSchema, influence: influenceSchema,
  }, async ({ id, influence }) => textResult(await references.setInfluence(id, influence)));

  server.tool("reference_explain_profile", "Explain normalized per-dimension reference contributions.", {
    profileId: idSchema,
  }, async ({ profileId }) => textResult(await references.explainProfile(profileId)));

  server.tool("reference_blend_profiles", "Blend stored profile parameters and measured distributions using normalized weights.", {
    id: idSchema,
    components: z.array(z.object({ profileId: idSchema, weight: z.number().positive() })).min(2).max(8),
  }, async ({ id, components }) => textResult(await references.blendProfiles(id, components)));

  server.tool("reference_seed_curated_priors", "Import bundled human-curation priors without pretending they are audio measurements.", {},
    async () => textResult({ references: await references.seedCuratedPriors() }));

  server.tool("music_compare_to_profile", "Compare current measurable Live Set facts with a curated profile and label facts, heuristics and human ratings separately.", {
    profileId: z.string().regex(/^[a-zA-Z0-9._-]+$/),
  }, async ({ profileId }) => textResult(await references.compareLiveSet(profileId, ableton)));
}
