import { z } from "zod";
import type { StylePack } from "./types.js";

const unit = z.number().min(0).max(1);
const profileSchema = z.object({
  id: z.string().min(1), version: z.string().min(1), name: z.string().min(1),
  tempo: z.object({ min: z.number().min(30).max(300), max: z.number().min(30).max(300), preferred: z.number().min(30).max(300) }),
  rhythm: z.object({ density: unit, syncopation: unit, swing: unit, microtiming: unit, repetition: unit, mutationRate: unit, silence: unit, predictability: unit }),
  drums: z.object({ kickWeight: unit, hatDensity: unit, ghostDensity: unit, electroInfluence: unit }),
  bass: z.object({ density: unit, chromaticism: unit, tonalStability: unit, rests: unit, register: z.tuple([z.number().int(), z.number().int()]) }),
  sequence: z.object({ density: unit, cycleSteps: z.number().int().min(1).max(64), chromaticism: unit, chordProbability: unit, rareEventProbability: unit, register: z.tuple([z.number().int(), z.number().int()]) }),
  timbre: z.object({ weirdness: unit, brightness: unit, rawness: unit, digital: unit }),
  arrangement: z.object({ evolutionRate: unit, subtraction: unit, cycleBars: z.array(z.number().int().positive()).min(1) }),
  mix: z.object({ loudness: unit, lowEnd: unit, brightness: unit, space: unit }),
  constraints: z.array(z.string()), negativeTraits: z.array(z.string()),
});

const mixerSchema = z.object({
  volume: unit.optional(), pan: z.number().min(-1).max(1).optional(), mute: z.boolean().optional(), solo: z.boolean().optional(), arm: z.boolean().optional(),
  sends: z.array(z.object({ sendIndex: z.number().int().nonnegative(), value: unit })).optional(),
});

const synthesisSchema = z.object({
  architecture: z.string().min(1), oscillator: z.string().min(1), filter: z.string().min(1),
  modulation: z.array(z.string().min(1)), processing: z.array(z.string().min(1)),
  parameterHints: z.array(z.object({
    namePatterns: z.array(z.string().min(1)).min(1), normalizedValue: unit, purpose: z.string().min(1),
  })).optional(),
});

const trackSchema = z.object({
  role: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/), name: z.string().min(1), color: z.number().int().min(0).max(0xffffff),
  generator: z.enum(["kick", "hats", "percussion", "drums", "bass", "harmony", "melody", "sequence", "texture", "fx"]),
  instrumentQueries: z.array(z.string().min(1)).min(1), effectQueries: z.array(z.string().min(1)), mixer: mixerSchema,
  pitchOffset: z.number().int().min(-36).max(36).optional(), synthesis: synthesisSchema.optional(),
});

const sectionSchema = z.object({ name: z.string().min(1), bars: z.number().int().positive(), activeRoles: z.array(z.string()).min(1), energy: unit });

const profileOverrideSchema = z.object({
  tempo: profileSchema.shape.tempo.partial().optional(), rhythm: profileSchema.shape.rhythm.partial().optional(),
  drums: profileSchema.shape.drums.partial().optional(), bass: profileSchema.shape.bass.partial().optional(),
  sequence: profileSchema.shape.sequence.partial().optional(), timbre: profileSchema.shape.timbre.partial().optional(),
  arrangement: profileSchema.shape.arrangement.partial().optional(), mix: profileSchema.shape.mix.partial().optional(),
  constraints: z.array(z.string()).optional(), negativeTraits: z.array(z.string()).optional(),
});

const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/), name: z.string().min(1), description: z.string().min(1), aliases: z.array(z.string().min(1)),
  priority: z.number().optional(), defaultRootNote: z.number().int().min(0).max(11).optional(),
  defaultMode: z.enum(["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian"]).optional(),
  clipBars: z.number().int().min(1).max(64).optional(), drumPattern: z.enum(["four-on-floor", "broken", "backbeat", "half-time"]).optional(),
  profileOverride: profileOverrideSchema.optional(),
  trackOverrides: z.array(z.object({
    role: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/), name: z.string().min(1).optional(),
    instrumentQueries: z.array(z.string().min(1)).min(1).optional(), effectQueries: z.array(z.string().min(1)).optional(),
    mixer: mixerSchema.optional(), pitchOffset: z.number().int().min(-36).max(36).optional(), synthesis: synthesisSchema.optional(),
  })).optional(),
  sections: z.array(sectionSchema).min(1).optional(), reviewVocabulary: z.array(z.string().min(1)), productionPractices: z.array(z.string().min(1)),
});

export const stylePackSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/), version: z.string().min(1), name: z.string().min(1), description: z.string().min(1),
  aliases: z.array(z.string().min(1)), genres: z.array(z.string().min(1)).min(1), priority: z.number().optional(), defaultGenre: z.string().min(1),
  defaultBars: z.number().int().min(8).max(512), clipBars: z.number().int().min(1).max(64), defaultRootNote: z.number().int().min(0).max(11),
  defaultMode: z.enum(["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian"]), drumPattern: z.enum(["four-on-floor", "broken", "backbeat", "half-time"]).optional(),
  defaultVariantId: z.string().optional(), variants: z.array(variantSchema).optional(), profileIds: z.array(z.string()).optional(), profile: profileSchema,
  tracks: z.array(trackSchema).min(1), sections: z.array(sectionSchema).min(1),
  mixTargets: z.object({ headroomDb: z.number().min(-24).max(0), sidechainRequested: z.boolean(), spectralAnalysisRequired: z.boolean() }),
}).superRefine((pack, context) => {
  if (pack.profile.tempo.min > pack.profile.tempo.max || pack.profile.tempo.preferred < pack.profile.tempo.min || pack.profile.tempo.preferred > pack.profile.tempo.max) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["profile", "tempo"], message: "preferred tempo must be within min/max" });
  }
  const roles = new Set<string>();
  pack.tracks.forEach((track, index) => {
    if (roles.has(track.role)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["tracks", index, "role"], message: `duplicate role '${track.role}'` });
    roles.add(track.role);
  });
  pack.sections.forEach((section, sectionIndex) => section.activeRoles.forEach((role, roleIndex) => {
    if (!roles.has(role)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["sections", sectionIndex, "activeRoles", roleIndex], message: `unknown role '${role}'` });
  }));
  const variantIds = new Set<string>();
  pack.variants?.forEach((variant, variantIndex) => {
    if (variantIds.has(variant.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", variantIndex, "id"], message: `duplicate variant '${variant.id}'` });
    variantIds.add(variant.id);
    variant.trackOverrides?.forEach((track, trackIndex) => {
      if (!roles.has(track.role)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", variantIndex, "trackOverrides", trackIndex, "role"], message: `unknown role '${track.role}'` });
    });
    variant.sections?.forEach((section, sectionIndex) => section.activeRoles.forEach((role, roleIndex) => {
      if (!roles.has(role)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", variantIndex, "sections", sectionIndex, "activeRoles", roleIndex], message: `unknown role '${role}'` });
    }));
  });
  if (pack.defaultVariantId && !variantIds.has(pack.defaultVariantId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["defaultVariantId"], message: `unknown default variant '${pack.defaultVariantId}'` });
  }
});

export function parseStylePack(value: unknown): StylePack {
  return stylePackSchema.parse(value) as StylePack;
}
