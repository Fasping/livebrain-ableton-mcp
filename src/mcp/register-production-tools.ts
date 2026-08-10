import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import { executeProduction } from "../production/production-executor.js";
import { planProduction } from "../production/production-planner.js";
import type { ReferenceService } from "../reference/reference-service.js";
import { getCuratedStyleContext, listCuratedStyleContexts } from "../style/curated-scenes.js";
import { textResult } from "./helpers.js";

const productionInput = {
  prompt: z.string().min(3).max(4000),
  bars: z.number().int().min(64).max(512).optional(),
  seed: z.number().int().default(1),
  bpm: z.number().min(40).max(300).optional(),
  rootNote: z.number().int().min(0).max(11).optional(),
  profileId: z.string().regex(/^[a-zA-Z0-9._-]+$/).optional(),
};

export function registerProductionTools(server: McpServer, ableton: AbletonAdapter, references: ReferenceService) {
  server.tool("music_list_style_profiles", "List bundled underground style contexts, aliases, provenance and whether local audio analysis is still needed.", {},
    async () => textResult({
      profiles: listCuratedStyleContexts().map(({ profile, ...context }) => ({ ...context, styleProfile: profile })),
      note: "Curated contexts are research-backed hypotheses, not measurements. Import and analyze your own references for a personal profile.",
    }));

  server.tool("music_plan_production", "Translate a natural-language vibe into a deterministic multi-track composition, arrangement and mix plan without changing Ableton.", productionInput,
    async ({ prompt, profileId, ...options }) => textResult(planProduction(prompt, await resolveProfile(profileId, references, options))));

  server.tool("music_create_production", "Build an eight-track production with instruments, MIDI, role-aware mixer settings and Arrangement placement. Defaults to dry-run.", {
    ...productionInput, dryRun: z.boolean().default(true),
  }, async ({ prompt, dryRun, profileId, ...options }) => textResult(await executeProduction(ableton, planProduction(prompt, await resolveProfile(profileId, references, options)), dryRun)));
}

async function resolveProfile(profileId: string | undefined, references: ReferenceService, options: Omit<Parameters<typeof planProduction>[1], "styleProfile">) {
  if (!profileId) return options;
  const curated = getCuratedStyleContext(profileId);
  if (curated) return { ...options, styleProfile: curated.profile, styleSource: "curated" as const, styleNeedsAudioAnalysis: true };
  const stored = await references.getProfile(profileId);
  const hasMeasurements = Boolean(stored.measured.bpm || stored.measured.onsetDensity || stored.measured.syncopation);
  return { ...options, styleProfile: stored.styleProfile, styleSource: "reference-profile" as const, styleNeedsAudioAnalysis: !hasMeasurements };
}
