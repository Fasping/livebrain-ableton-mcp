import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import { clipTargetSchema, dryRunSchema, midiNoteSchema } from "./schemas.js";
import { textResult } from "./helpers.js";

export function registerAbletonTools(server: McpServer, ableton: AbletonAdapter) {
  server.tool("livebrain_analyze_set", "Return a compact or detailed normalized Live Set snapshot.", {
    mode: z.enum(["compact", "detailed"]).default("compact"),
  }, async ({ mode }) => textResult(await ableton.snapshot(mode)));

  server.tool("ableton_create_midi_track", "Create a validated MIDI track as one undoable action.", {
    index: z.number().int().min(0).optional(), name: z.string().min(1).max(120).optional(), dryRun: dryRunSchema,
  }, async (input) => textResult(await ableton.createMidiTrack(input)));

  server.tool("ableton_create_midi_clip", "Create an empty Session View MIDI clip.", {
    ...clipTargetSchema, length: z.number().positive().max(4096), name: z.string().max(120).optional(), dryRun: dryRunSchema,
  }, async (input) => textResult(await ableton.createMidiClip(input)));

  server.tool("ableton_get_clip_notes", "Read normalized MIDI notes from a Session View clip.", clipTargetSchema,
    async (target) => textResult({ notes: await ableton.getClipNotes(target) }));

  server.tool("ableton_replace_notes", "Atomically replace all notes in a MIDI clip.", {
    ...clipTargetSchema, notes: z.array(midiNoteSchema).max(20000), dryRun: dryRunSchema,
  }, async ({ notes, dryRun, ...target }) => textResult(await ableton.replaceClipNotes(target, notes, dryRun)));

  server.tool("ableton_duplicate_clip", "Duplicate a Session clip into an explicitly empty destination before transforming it.", {
    sourceTrackIndex: z.number().int().min(0), sourceSlotIndex: z.number().int().min(0),
    destinationTrackIndex: z.number().int().min(0), destinationSlotIndex: z.number().int().min(0), dryRun: dryRunSchema,
  }, async ({ sourceTrackIndex, sourceSlotIndex, destinationTrackIndex, destinationSlotIndex, dryRun }) => textResult(await ableton.duplicateClip(
    { trackIndex: sourceTrackIndex, slotIndex: sourceSlotIndex },
    { trackIndex: destinationTrackIndex, slotIndex: destinationSlotIndex }, dryRun,
  )));

  server.tool("ableton_set_clip_loop", "Set a validated MIDI clip loop range.", {
    ...clipTargetSchema, loopStart: z.number().min(0), loopEnd: z.number().positive(), dryRun: dryRunSchema,
  }, async ({ loopStart, loopEnd, dryRun, ...target }) => textResult(await ableton.setClipLoop(target, loopStart, loopEnd, dryRun)));

  server.tool("ableton_get_devices", "List devices on a track.", { trackIndex: z.number().int().min(0) },
    async ({ trackIndex }) => textResult({ devices: await ableton.getDevices(trackIndex) }));

  server.tool("ableton_get_device_parameters", "Read every normalized parameter on a device.", {
    trackIndex: z.number().int().min(0), deviceIndex: z.number().int().min(0),
  }, async (target) => textResult({ parameters: await ableton.getDeviceParameters(target) }));

  server.tool("ableton_set_device_parameter", "Set one device parameter using a normalized 0..1 value.", {
    trackIndex: z.number().int().min(0), deviceIndex: z.number().int().min(0), parameterIndex: z.number().int().min(0),
    normalizedValue: z.number().min(0).max(1), dryRun: dryRunSchema,
  }, async ({ normalizedValue, dryRun, ...target }) => textResult(await ableton.setDeviceParameter(target, normalizedValue, dryRun)));
}
