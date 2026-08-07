import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { generateBass } from "../music-brain/bass-generator.js";
import { generateSequence } from "../music-brain/sequence-generator.js";
import { makeBassLessObvious } from "../music-brain/bass-less-obvious.js";
import { evolveSection } from "../music-brain/section-evolution.js";
import { makeLessObvious, mutateNotes } from "../music-brain/mutation-engine.js";
import { afterhours2019 } from "../music-brain/style-profile.js";
import type { ReferenceService } from "../reference/reference-service.js";
import { clipTargetSchema, dryRunSchema } from "./schemas.js";
import { textResult } from "./helpers.js";
import { createEffectiveStyleProfile } from "../style/effective-profile.js";
import type { FeedbackStore } from "../feedback/feedback-store.js";
import type { LockStore } from "../locks/lock-store.js";

const traitsSchema = z.object({
  groove: z.number().min(0).max(1).optional(), electro: z.number().min(0).max(1).optional(),
  progressive: z.number().min(0).max(1).optional(), weirdness: z.number().min(0).max(1).optional(), space: z.number().min(0).max(1).optional(),
}).default({});

export function registerMusicTools(server: McpServer, ableton: AbletonAdapter, references: ReferenceService, feedback: FeedbackStore, locks: LockStore) {
  server.tool("music_generate_drum_groove", "Generate a deterministic sparse drum groove and optionally write it to a clip.", {
    bars: z.number().int().min(1).max(64).default(4), seed: z.number().int().default(1),
    profileId: z.string().regex(/^[a-zA-Z0-9._-]+$/).optional(),
    bpm: z.number().min(40).max(300).optional(), traits: traitsSchema,
    apply: z.boolean().default(false), trackIndex: z.number().int().min(0).optional(), slotIndex: z.number().int().min(0).optional(),
    dryRun: dryRunSchema,
  }, async ({ bars, seed, profileId, bpm, traits, apply, trackIndex, slotIndex, dryRun }) => {
    const base = profileId ? (await references.getProfile(profileId)).styleProfile : afterhours2019;
    const profile = createEffectiveStyleProfile(base, { bpm, traits });
    const notes = generateDrumGroove(profile, { bars, seed });
    const generation = await feedback.record({ profileId: base.id, profileVersion: base.version, seed, parameters: { bars, bpm, traits, instrument: "drums" }, generatedFeatures: { noteCount: notes.length, bars } });
    if (!apply) return textResult({ profile: profile.id, effectiveProfileVersion: profile.version, seed, generationId: generation.generationId, notes });
    if (trackIndex === undefined || slotIndex === undefined) throw new Error("trackIndex and slotIndex are required when apply=true");
    const change = await ableton.replaceClipNotes({ trackIndex, slotIndex }, notes, dryRun);
    return textResult({ profile: profile.id, seed, generationId: generation.generationId, generatedNotes: notes.length, change });
  });

  server.tool("music_generate_bass", "Generate an original deterministic rhythm-first bass motif using a stored or built-in profile.", {
    bars: z.number().int().min(1).max(64).default(4), seed: z.number().int(), rootMidi: z.number().int().min(0).max(127).optional(),
    profileId: z.string().regex(/^[a-zA-Z0-9._-]+$/).optional(), bpm: z.number().min(40).max(300).optional(), traits: traitsSchema,
    apply: z.boolean().default(false), trackIndex: z.number().int().min(0).optional(), slotIndex: z.number().int().min(0).optional(), dryRun: dryRunSchema,
  }, async ({ bars, seed, rootMidi, profileId, bpm, traits, apply, trackIndex, slotIndex, dryRun }) => {
    const base = profileId ? (await references.getProfile(profileId)).styleProfile : afterhours2019;
    const profile = createEffectiveStyleProfile(base, { bpm, traits });
    const notes = generateBass(profile, { bars, seed, rootMidi });
    const generation = await feedback.record({ profileId: base.id, profileVersion: base.version, seed, parameters: { bars, bpm, traits, instrument: "bass" }, generatedFeatures: { noteCount: notes.length, bars } });
    if (!apply) return textResult({ profile: profile.id, seed, generationId: generation.generationId, notes });
    if (trackIndex === undefined || slotIndex === undefined) throw new Error("trackIndex and slotIndex are required when apply=true");
    const change = await ableton.replaceClipNotes({ trackIndex, slotIndex }, notes, dryRun);
    return textResult({ profile: profile.id, seed, generationId: generation.generationId, generatedNotes: notes.length, change });
  });

  server.tool("music_generate_sequence", "Generate short alien/digital sequences, bleeps, stabs or chord fragments without generic melody logic.", {
    bars: z.number().int().min(1).max(64).default(4), seed: z.number().int(), rootMidi: z.number().int().min(0).max(127).optional(),
    kind: z.enum(["shortSequence", "alienStab", "bleep", "chordFragment", "oneShot"]).default("shortSequence"),
    profileId: z.string().regex(/^[a-zA-Z0-9._-]+$/).optional(), bpm: z.number().min(40).max(300).optional(), traits: traitsSchema,
    apply: z.boolean().default(false), trackIndex: z.number().int().min(0).optional(), slotIndex: z.number().int().min(0).optional(), dryRun: dryRunSchema,
  }, async ({ bars, seed, rootMidi, kind, profileId, bpm, traits, apply, trackIndex, slotIndex, dryRun }) => {
    const base = profileId ? (await references.getProfile(profileId)).styleProfile : afterhours2019;
    const profile = createEffectiveStyleProfile(base, { bpm, traits });
    const notes = generateSequence(profile, { bars, seed, rootMidi, kind });
    const generation = await feedback.record({ profileId: base.id, profileVersion: base.version, seed, parameters: { bars, bpm, traits, kind }, generatedFeatures: { noteCount: notes.length, bars, kind } });
    if (!apply) return textResult({ profile: profile.id, seed, generationId: generation.generationId, notes });
    if (trackIndex === undefined || slotIndex === undefined) throw new Error("trackIndex and slotIndex are required when apply=true");
    const change = await ableton.replaceClipNotes({ trackIndex, slotIndex }, notes, dryRun);
    return textResult({ profile: profile.id, seed, generationId: generation.generationId, generatedNotes: notes.length, change });
  });

  server.tool("music_make_bass_less_obvious", "Duplicate a bass clip and selectively reduce obviousness without touching drums.", {
    sourceTrackIndex: z.number().int().min(0), sourceSlotIndex: z.number().int().min(0),
    destinationTrackIndex: z.number().int().min(0).optional(), destinationSlotIndex: z.number().int().min(0),
    generationId: z.string().uuid().optional(), seed: z.number().int(), amount: z.number().min(0).max(1).default(.35),
    fewerNotes: z.number().min(0).max(1).default(.5), moreRests: z.number().min(0).max(1).default(.5),
    longerCycle: z.number().min(0).max(1).default(.5), delayedResolution: z.number().min(0).max(1).default(.3),
    slightChromaticism: z.number().min(0).max(1).default(.25), phraseOffset: z.number().min(0).max(1).default(.15),
    pitchMutation: z.number().min(0).max(1).default(.2), preserveRhythm: z.boolean().default(true), dryRun: dryRunSchema,
  }, async ({ sourceTrackIndex, sourceSlotIndex, destinationTrackIndex, destinationSlotIndex, generationId, dryRun, ...options }) => {
    const source = { trackIndex: sourceTrackIndex, slotIndex: sourceSlotIndex };
    const destination = { trackIndex: destinationTrackIndex ?? sourceTrackIndex, slotIndex: destinationSlotIndex };
    const lock = await locks.get({ generationId, ...source });
    const sourceNotes = await ableton.getClipNotes(source);
    const notes = makeBassLessObvious(sourceNotes, options, lock);
    const generation = await feedback.record({ profileId: "selective-mutation", profileVersion: "0.1", seed: options.seed, parameters: { ...options, source, destination, preserve: lock.preserve }, generatedFeatures: { sourceNotes: sourceNotes.length, resultNotes: notes.length } });
    if (dryRun) return textResult({ dryRun: true, generationId: generation.generationId, seed: options.seed, source, destination, sourceNotes: sourceNotes.length, resultNotes: notes.length, preserved: lock.preserve, notes });
    await ableton.duplicateClip(source, destination, false);
    const length = await clipLength(ableton, source);
    await ableton.setClipLoop(destination, 0, length, false);
    const change = await ableton.replaceClipNotes(destination, notes, false);
    return textResult({ generationId: generation.generationId, seed: options.seed, created: destination, sourceUnchanged: true, sourceNotes: sourceNotes.length, resultNotes: notes.length, preserved: lock.preserve, change });
  });

  server.tool("music_evolve_section", "Duplicate a 16-bar MIDI loop and evolve it to 64 bars through long-cycle mutation and subtraction without adding instruments.", {
    sourceTrackIndex: z.number().int().min(0), sourceSlotIndex: z.number().int().min(0),
    destinationTrackIndex: z.number().int().min(0).optional(), destinationSlotIndex: z.number().int().min(0),
    generationId: z.string().uuid().optional(), seed: z.number().int(), amount: z.number().min(0).max(1).default(.3),
    sourceBars: z.number().int().positive().default(16), targetBars: z.number().int().positive().default(64), dryRun: dryRunSchema,
  }, async ({ sourceTrackIndex, sourceSlotIndex, destinationTrackIndex, destinationSlotIndex, generationId, dryRun, ...options }) => {
    const source = { trackIndex: sourceTrackIndex, slotIndex: sourceSlotIndex };
    const destination = { trackIndex: destinationTrackIndex ?? sourceTrackIndex, slotIndex: destinationSlotIndex };
    const lock = await locks.get({ generationId, ...source });
    const sourceNotes = await ableton.getClipNotes(source);
    const notes = evolveSection(sourceNotes, options, lock);
    const generation = await feedback.record({ profileId: "section-evolution", profileVersion: "0.1", seed: options.seed, parameters: { ...options, source, destination, preserve: lock.preserve }, generatedFeatures: { sourceNotes: sourceNotes.length, resultNotes: notes.length, targetBars: options.targetBars } });
    if (dryRun) return textResult({ dryRun: true, generationId: generation.generationId, seed: options.seed, source, destination, sourceNotes: sourceNotes.length, resultNotes: notes.length, notes });
    await ableton.duplicateClip(source, destination, false);
    await ableton.setClipLoop(destination, 0, options.targetBars * 4, false);
    const change = await ableton.replaceClipNotes(destination, notes, false);
    return textResult({ generationId: generation.generationId, seed: options.seed, created: destination, sourceUnchanged: true, targetBars: options.targetBars, instrumentsAdded: 0, change });
  });

  server.tool("music_mutate_clip", "Create a deterministic variation while preserving selected MIDI pitches.", {
    ...clipTargetSchema, amount: z.number().min(0).max(1), seed: z.number().int(),
    preservePitches: z.array(z.number().int().min(0).max(127)).default([36]), dryRun: dryRunSchema,
  }, async ({ amount, seed, preservePitches, dryRun, ...target }) => {
    const source = await ableton.getClipNotes(target);
    const notes = mutateNotes(source, { amount, seed, preservePitches });
    const change = await ableton.replaceClipNotes(target, notes, dryRun);
    return textResult({ sourceNotes: source.length, resultNotes: notes.length, seed, change });
  });

  server.tool("music_make_less_obvious", "Reduce predictable repetition without randomizing the entire drum/percussion clip.", {
    ...clipTargetSchema, amount: z.number().min(0).max(1).default(0.35), seed: z.number().int(),
    preservePitches: z.array(z.number().int().min(0).max(127)).default([36]), dryRun: dryRunSchema,
  }, async ({ amount, seed, preservePitches, dryRun, ...target }) => {
    const source = await ableton.getClipNotes(target);
    const notes = makeLessObvious(source, amount, seed, preservePitches);
    const change = await ableton.replaceClipNotes(target, notes, dryRun);
    return textResult({ sourceNotes: source.length, resultNotes: notes.length, seed, change });
  });
}

async function clipLength(ableton: AbletonAdapter, target: { trackIndex: number; slotIndex: number }) {
  const snapshot = await ableton.snapshot("compact");
  const clip = snapshot.tracks[target.trackIndex]?.clips.find((item) => item.slotIndex === target.slotIndex);
  if (!clip) throw new Error("Source clip not found in snapshot");
  return clip.length;
}
