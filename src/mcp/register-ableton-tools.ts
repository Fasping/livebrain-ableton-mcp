import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AbletonAdapter } from "../ableton/adapter.js";
import { clipTargetSchema, dryRunSchema, midiNoteSchema } from "./schemas.js";
import { textResult } from "./helpers.js";

const addressableTrackIndexSchema = z.number().int().min(-1).describe(
  "Track address: -1 = Master, 0..N = regular tracks, 200 + i = Return i (A = 200, B = 201).",
);

export function registerAbletonTools(server: McpServer, ableton: AbletonAdapter) {
  server.tool("livebrain_analyze_set", "Return a compact or detailed normalized Live Set snapshot. Detailed mode includes Master and Return tracks.", {
    mode: z.enum(["compact", "detailed"]).default("compact"),
  }, async ({ mode }) => textResult(await ableton.snapshot(mode)));

  server.tool("ableton_create_midi_track", "Create a validated MIDI track as one undoable action.", {
    index: z.number().int().min(0).optional(), name: z.string().min(1).max(120).optional(), dryRun: dryRunSchema,
  }, async (input) => textResult(await ableton.createMidiTrack(input)));

  server.tool("ableton_delete_track", "Delete one explicitly indexed track as an undoable action.", {
    trackIndex: z.number().int().min(0), dryRun: dryRunSchema,
  }, async ({ trackIndex, dryRun }) => textResult(await ableton.deleteTrack(trackIndex, dryRun)));

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

  server.tool("ableton_get_devices", "List devices on a regular, Master (-1), or Return (200 + return index) track.", { trackIndex: addressableTrackIndexSchema },
    async ({ trackIndex }) => textResult({ devices: await ableton.getDevices(trackIndex) }));

  server.tool("ableton_get_device_parameters", "Read every normalized parameter on a device.", {
    trackIndex: addressableTrackIndexSchema, deviceIndex: z.number().int().min(0),
  }, async (target) => textResult({ parameters: await ableton.getDeviceParameters(target) }));

  server.tool("ableton_set_device_parameter", "Set one device parameter using a normalized 0..1 value.", {
    trackIndex: addressableTrackIndexSchema, deviceIndex: z.number().int().min(0), parameterIndex: z.number().int().min(0),
    normalizedValue: z.number().min(0).max(1), dryRun: dryRunSchema,
  }, async ({ normalizedValue, dryRun, ...target }) => textResult(await ableton.setDeviceParameter(target, normalizedValue, dryRun)));

  server.tool("ableton_set_song", "Set validated tempo, time signature, scale and arrangement loop settings.", {
    tempo: z.number().min(20).max(999).optional(),
    timeSignature: z.object({ numerator: z.number().int().min(1).max(16), denominator: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)]) }).optional(),
    scale: z.object({ rootNote: z.number().int().min(0).max(11), name: z.string().min(1).max(80) }).optional(),
    loop: z.object({ start: z.number().min(0), length: z.number().positive(), enabled: z.boolean().default(true) }).optional(),
    dryRun: dryRunSchema,
  }, async ({ dryRun, ...settings }) => textResult(await ableton.setSongSettings(settings, dryRun)));

  server.tool("ableton_set_track_mixer", "Set mixer values on a regular, Master (-1), or Return (200 + return index) track. Arm is not applicable to Master/Returns; mute, solo and sends are not applicable to Master.", {
    trackIndex: addressableTrackIndexSchema, volume: z.number().min(0).max(1).optional(), pan: z.number().min(-1).max(1).optional(),
    mute: z.boolean().optional(), solo: z.boolean().optional(), arm: z.boolean().optional(),
    sends: z.array(z.object({ sendIndex: z.number().int().min(0), value: z.number().min(0).max(1) })).max(32).optional(), dryRun: dryRunSchema,
  }, async ({ trackIndex, dryRun, ...mixer }) => textResult(await ableton.setTrackMixer(trackIndex, mixer, dryRun)));

  server.tool("ableton_get_master_meter", "Read the Master output meter as linear amplitude and dBFS. dBFS is null at digital silence.", {},
    async () => textResult(await ableton.getMasterMeter()));

  server.tool("ableton_transport", "Start or stop Ableton playback.", {
    action: z.enum(["start", "stop"]), dryRun: dryRunSchema,
  }, async ({ action, dryRun }) => textResult(await ableton.setTransport(action, dryRun)));

  server.tool("ableton_search_browser", "Search loadable instruments, sounds, drums and effects in Ableton's browser.", {
    query: z.string().min(1).max(160),
    categories: z.array(z.enum(["instruments", "sounds", "drums", "audio_effects", "midi_effects"])).max(5).optional(),
    maxResults: z.number().int().min(1).max(50).default(12),
  }, async (input) => textResult({ items: await ableton.searchBrowser(input) }));

  server.tool("ableton_load_browser_item", "Load a browser item URI onto a selected track.", {
    trackIndex: z.number().int().min(0), uri: z.string().min(1).max(2048), dryRun: dryRunSchema,
  }, async ({ trackIndex, uri, dryRun }) => textResult(await ableton.loadBrowserItem(trackIndex, uri, dryRun)));

  server.tool("ableton_duplicate_to_arrangement", "Copy a Session clip into Arrangement at a beat position.", {
    ...clipTargetSchema, destinationTime: z.number().min(0).max(100000), dryRun: dryRunSchema,
  }, async ({ destinationTime, dryRun, ...target }) => textResult(await ableton.duplicateToArrangement(target, destinationTime, dryRun)));

  server.tool("ableton_duplicate_many_to_arrangement", "Copy many Session clips into Arrangement in one bridge operation.", {
    placements: z.array(z.object({
      trackIndex: z.number().int().min(0), slotIndex: z.number().int().min(0), destinationTime: z.number().min(0).max(100000),
    })).min(1).max(2048), dryRun: dryRunSchema,
  }, async ({ placements, dryRun }) => textResult(await ableton.duplicateManyToArrangement(placements, dryRun)));

  server.tool("ableton_get_arrangement_clips", "List clips currently placed in Arrangement for a track.", {
    trackIndex: z.number().int().min(0),
  }, async ({ trackIndex }) => textResult({ clips: await ableton.getArrangementClips(trackIndex) }));

  server.tool("ableton_show_arrangement", "Switch Ableton's main view to Arrangement.", {
    dryRun: dryRunSchema,
  }, async ({ dryRun }) => textResult(await ableton.showArrangement(dryRun)));
}
