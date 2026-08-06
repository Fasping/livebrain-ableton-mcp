import { z } from "zod";

export const clipTargetSchema = {
  trackIndex: z.number().int().min(0),
  slotIndex: z.number().int().min(0),
};

export const midiNoteSchema = z.object({
  pitch: z.number().int().min(0).max(127),
  start: z.number().min(0),
  duration: z.number().positive(),
  velocity: z.number().int().min(1).max(127),
  mute: z.boolean().optional(),
  probability: z.number().min(0).max(1).optional(),
});

export const dryRunSchema = z.boolean().default(false).describe("Validate and preview without changing Ableton.");
