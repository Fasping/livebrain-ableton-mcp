import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import type { FeedbackStore } from "../feedback/feedback-store.js";
import { executeProduction } from "../production/production-executor.js";
import { planProduction } from "../production/production-planner.js";
import type { ReferenceService } from "../reference/reference-service.js";
import type { StylePackRegistry } from "../packs/registry.js";
import { getCuratedStyleContext, listCuratedStyleContexts } from "../style/curated-scenes.js";
import { blendResolvedStyles, resolveCuratedStyleMix, type StyleResolution } from "../style/style-resolver.js";
import { textResult } from "./helpers.js";

const profileIdSchema = z.string().regex(/^[a-zA-Z0-9._-]+$/);
const profileMixSchema = z.array(z.object({ profileId: profileIdSchema, weight: z.number().positive() })).min(2).max(6);

const productionInput = {
  prompt: z.string().min(3).max(4000),
  bars: z.number().int().min(64).max(512).optional(),
  seed: z.number().int().default(1),
  bpm: z.number().min(40).max(300).optional(),
  rootNote: z.number().int().min(0).max(11).optional(),
  profileId: profileIdSchema.optional(),
  profileMix: profileMixSchema.optional(),
  packId: profileIdSchema.optional().describe("Optional style pack id, such as pop, rnb-soul, rock, hip-hop, ambient, electronic, underground-electronic or underground-breaks."),
};

export function registerProductionTools(server: McpServer, ableton: AbletonAdapter, references: ReferenceService, feedback: FeedbackStore, packs: StylePackRegistry) {
  server.tool("music_list_style_packs", "List installed production packs. Packs define genres, aliases, track roles, generators, arrangement and mix defaults.", {}, async () => textResult({
    packs: packs.list().map(({ profile, sourcePath, ...pack }) => ({ ...pack, profile: { id: profile.id, name: profile.name, version: profile.version }, sourcePath: pack.source === "user" ? sourcePath : undefined })),
    diagnostics: packs.diagnostics,
  }));

  server.tool("music_get_style_pack", "Inspect one installed production pack, including its tracks, arrangement sections and style profile.", { packId: profileIdSchema },
    async ({ packId }) => {
      const pack = packs.get(packId);
      if (!pack) throw new Error(`Unknown style pack '${packId}'`);
      return textResult(pack);
    });

  server.tool("music_list_style_profiles", "List bundled underground style contexts, aliases, provenance and whether local audio analysis is still needed.", {},
    async () => textResult({
      profiles: listCuratedStyleContexts().map(({ profile, ...context }) => ({ ...context, styleProfile: profile })),
      note: "Curated contexts are research-backed hypotheses, not measurements. Import and analyze your own references for a personal profile.",
    }));

  server.tool("music_resolve_style", "Resolve one or several prompt references into an explainable weighted StyleProfile and apply locally learned preferences without changing Ableton.", {
    prompt: z.string().min(3).max(4000), profileId: profileIdSchema.optional(), profileMix: profileMixSchema.optional(), packId: profileIdSchema.optional(),
  }, async ({ prompt, profileId, profileMix, packId }) => {
    const options = await resolveProfileInput(prompt, profileId, profileMix, packId, references, feedback, packs, {});
    return textResult({
      pack: options.packResolution,
      profile: options.styleProfile,
      source: options.styleSource,
      components: options.styleComponents,
      explanation: options.styleExplanation,
      personalization: options.stylePersonalization,
    });
  });

  server.tool("music_plan_production", "Translate a natural-language vibe into a deterministic multi-track composition, arrangement and mix plan without changing Ableton.", productionInput,
    async ({ prompt, profileId, profileMix, packId, ...options }) => textResult(planProduction(prompt, await resolveProfileInput(prompt, profileId, profileMix, packId, references, feedback, packs, options))));

  server.tool("music_create_production", "Build a pack-driven multi-track production with instruments, MIDI, role-aware mixer settings and Arrangement placement. Defaults to dry-run.", {
    ...productionInput, dryRun: z.boolean().default(true),
  }, async ({ prompt, dryRun, profileId, profileMix, packId, ...options }) => {
    const resolvedOptions = await resolveProfileInput(prompt, profileId, profileMix, packId, references, feedback, packs, options);
    const plan = planProduction(prompt, resolvedOptions);
    const execution = await executeProduction(ableton, plan, dryRun);
    if (dryRun) return textResult(execution);
    try {
      const generation = await feedback.record({
        profileId: plan.brief.style.id, profileVersion: plan.styleProfile.version, seed: plan.brief.seed,
        parameters: { prompt, bars: plan.brief.bars, bpm: plan.brief.bpm, styleComponents: plan.brief.style.components },
        generatedFeatures: {
          trackCount: plan.tracks.length,
          clipCount: plan.tracks.reduce((sum, track) => sum + track.clips.length, 0),
          noteCount: plan.tracks.reduce((sum, track) => sum + track.clips.reduce((clipSum, clip) => clipSum + clip.notes.length, 0), 0),
          bpm: plan.brief.bpm, bars: plan.brief.bars,
        },
        styleProfile: plan.styleProfile,
        styleComponents: plan.brief.style.components.map(({ id, weight }) => ({ id, weight })),
      });
      return textResult({ ...execution, generationId: generation.generationId, feedbackHint: "Use feedback_generation with this generationId, or compare two generationIds with feedback_compare_generations." });
    } catch (error) {
      return textResult({ ...execution, feedbackWarning: `The Ableton production was applied, but local feedback recording failed: ${message(error)}` });
    }
  });
}

function message(error: unknown) { return error instanceof Error ? error.message : String(error); }

async function resolveProfileInput(
  prompt: string,
  profileId: string | undefined,
  profileMix: Array<{ profileId: string; weight: number }> | undefined,
  packId: string | undefined,
  references: ReferenceService,
  feedback: FeedbackStore,
  packs: StylePackRegistry,
  options: Omit<Parameters<typeof planProduction>[1], "styleProfile">,
) {
  if (profileId && profileMix) throw new Error("Use profileId or profileMix, not both");
  const packResolution = packs.resolve(prompt, packId);
  let resolution: StyleResolution;
  if (profileMix) {
    const loaded = await Promise.all(profileMix.map(async (item) => ({ ...(await loadProfile(item.profileId, references)), weight: item.weight })));
    resolution = blendResolvedStyles(`custom_${profileMix.map((item) => item.profileId).sort().join("__")}`, loaded.map((item) => ({ profile: item.profile, component: item.component, weight: item.weight })));
  } else if (profileId) {
    const loaded = await loadProfile(profileId, references);
    resolution = blendResolvedStyles(profileId, [{ profile: loaded.profile, component: loaded.component, weight: 1 }]);
  } else {
    const curated = resolveCuratedStyleMix(prompt);
    const allowedIds = packResolution.pack.profileIds ?? [];
    resolution = curated?.components.every((component) => allowedIds.includes(component.id)) ? curated : {
      profile: structuredClone(packResolution.pack.profile), source: "pack", needsAudioAnalysis: false,
      components: [{ id: packResolution.pack.profile.id, name: packResolution.pack.profile.name, source: "pack", weight: 1, matchedAliases: [], needsAudioAnalysis: false, weightReason: "selected style pack default" }],
      explanation: [`Using the '${packResolution.pack.profile.name}' profile supplied by '${packResolution.pack.name}'.`],
    };
  }
  const personalized = await feedback.personalize(resolution.profile);
  return {
    ...options,
    packResolution,
    styleProfile: personalized.profile,
    styleSource: resolution.source,
    styleNeedsAudioAnalysis: resolution.needsAudioAnalysis,
    styleComponents: resolution.components,
    styleExplanation: [...resolution.explanation, ...personalized.adjustments],
    stylePersonalization: { applied: personalized.applied, evidenceCount: personalized.evidenceCount, adjustments: personalized.adjustments },
  };
}

async function loadProfile(profileId: string, references: ReferenceService) {
  const curated = getCuratedStyleContext(profileId);
  if (curated) return {
    profile: curated.profile,
    component: { id: curated.id, name: curated.name, source: "curated" as const, matchedAliases: [], needsAudioAnalysis: true, weightReason: "explicit profile weight" },
  };
  const stored = await references.getProfile(profileId);
  const hasMeasurements = Boolean(stored.measured.bpm || stored.measured.onsetDensity || stored.measured.syncopation);
  return {
    profile: stored.styleProfile,
    component: { id: stored.id, name: stored.styleProfile.name, source: "reference-profile" as const, matchedAliases: [], needsAudioAnalysis: !hasMeasurements, weightReason: "explicit profile weight" },
  };
}
