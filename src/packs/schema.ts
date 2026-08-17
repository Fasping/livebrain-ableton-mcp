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

export const stylePackSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/), version: z.string().min(1), name: z.string().min(1), description: z.string().min(1),
  aliases: z.array(z.string().min(1)), genres: z.array(z.string().min(1)).min(1), priority: z.number().optional(), defaultGenre: z.string().min(1),
  defaultBars: z.number().int().min(8).max(512), clipBars: z.number().int().min(1).max(64), defaultRootNote: z.number().int().min(0).max(11),
  defaultMode: z.enum(["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian"]), drumPattern: z.enum(["four-on-floor", "broken", "backbeat", "half-time"]).optional(), profileIds: z.array(z.string()).optional(), profile: profileSchema,
  tracks: z.array(z.object({
    role: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/), name: z.string().min(1), color: z.number().int().min(0).max(0xffffff),
    generator: z.enum(["kick", "hats", "percussion", "drums", "bass", "harmony", "melody", "sequence", "texture", "fx"]),
    instrumentQueries: z.array(z.string().min(1)).min(1), effectQueries: z.array(z.string().min(1)), mixer: mixerSchema, pitchOffset: z.number().int().min(-36).max(36).optional(),
  })).min(1),
  sections: z.array(z.object({ name: z.string().min(1), bars: z.number().int().positive(), activeRoles: z.array(z.string()).min(1), energy: unit })).min(1),
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
});

export function parseStylePack(value: unknown): StylePack {
  return stylePackSchema.parse(value) as StylePack;
}
