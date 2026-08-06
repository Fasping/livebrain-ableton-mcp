import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { makeLessObvious, mutateNotes } from "../music-brain/mutation-engine.js";
import { afterhours2019 } from "../music-brain/style-profile.js";
import { clipTargetSchema, dryRunSchema } from "./schemas.js";
import { textResult } from "./helpers.js";

export function registerMusicTools(server: McpServer, ableton: AbletonAdapter) {
  server.tool("music_generate_drum_groove", "Generate a deterministic sparse drum groove and optionally write it to a clip.", {
    bars: z.number().int().min(1).max(64).default(4), seed: z.number().int().default(1),
    apply: z.boolean().default(false), trackIndex: z.number().int().min(0).optional(), slotIndex: z.number().int().min(0).optional(),
    dryRun: dryRunSchema,
  }, async ({ bars, seed, apply, trackIndex, slotIndex, dryRun }) => {
    const notes = generateDrumGroove(afterhours2019, { bars, seed });
    if (!apply) return textResult({ profile: afterhours2019.id, seed, notes });
    if (trackIndex === undefined || slotIndex === undefined) throw new Error("trackIndex and slotIndex are required when apply=true");
    const change = await ableton.replaceClipNotes({ trackIndex, slotIndex }, notes, dryRun);
    return textResult({ profile: afterhours2019.id, seed, generatedNotes: notes.length, change });
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
