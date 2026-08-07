import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { MidiNote } from "../ableton/types.js";
import { MockAbletonAdapter } from "../ableton/mock-adapter.js";
import { LockStore } from "../locks/lock-store.js";
import { makeBassLessObvious } from "../music-brain/bass-less-obvious.js";
import { generateSequence } from "../music-brain/sequence-generator.js";
import { evolveSection } from "../music-brain/section-evolution.js";
import { afterhours2019 } from "../music-brain/style-profile.js";
import { createEffectiveStyleProfile } from "../style/effective-profile.js";
import { blendStyleProfiles } from "../style/profile-blender.js";

const bass: MidiNote[] = Array.from({ length: 48 }, (_, index) => ({
  pitch: index % 7 === 0 ? 33 : 36,
  start: index * 1.25,
  duration: .18,
  velocity: 88 + index % 12,
}));

test("persistent dimension locks preserve locked bass events", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-locks-"));
  const locks = new LockStore(directory);
  await locks.set({ generationId: "00000000-0000-4000-8000-000000000001", trackIndex: 1, slotIndex: 0 },
    ["bass.notes", "bass.pitch", "bass.timing", "groove"], ["bass.cycleLength"]);
  const lock = await locks.get({ generationId: "00000000-0000-4000-8000-000000000001", trackIndex: 1, slotIndex: 0 });
  const result = makeBassLessObvious(bass, { amount: .8, seed: 3, fewerNotes: 1, pitchMutation: 1 }, lock);
  assert.deepEqual(result, bass);
});

test("bass mutation leaves separate drum material untouched", () => {
  const drums: MidiNote[] = Array.from({ length: 16 }, (_, index) => ({ pitch: 36, start: index, duration: .1, velocity: 100 }));
  const originalDrums = structuredClone(drums);
  const result = makeBassLessObvious(bass, { amount: .6, seed: 8, fewerNotes: .8, moreRests: .8, longerCycle: .8, slightChromaticism: .5, preserveRhythm: true });
  assert.deepEqual(drums, originalDrums);
  assert.notDeepEqual(result, bass);
  assert.ok(result.length <= bass.length);
});

test("bass mutation amount zero is exact identity", () => {
  assert.deepEqual(makeBassLessObvious(bass, { amount: 0, seed: 123, fewerNotes: 1 }), bass);
});

test("16-to-64 evolution preserves first cycle and is deterministic", () => {
  const first = evolveSection(bass, { sourceBars: 16, targetBars: 64, amount: .32, seed: 55 });
  const second = evolveSection(bass, { sourceBars: 16, targetBars: 64, amount: .32, seed: 55 });
  assert.deepEqual(first, second);
  assert.deepEqual(first.filter((note) => note.start < 64), bass.filter((note) => note.start < 64));
  assert.ok(first.length >= bass.length * 3);
  assert.ok(Math.max(...first.map((note) => note.start)) > 192);
});

test("safe mock duplication never changes the source clip", async () => {
  const adapter = new MockAbletonAdapter();
  await adapter.createMidiTrack({ name: "Bass" });
  await adapter.createMidiClip({ trackIndex: 0, slotIndex: 0, length: 64, name: "Source" });
  await adapter.replaceClipNotes({ trackIndex: 0, slotIndex: 0 }, bass);
  await adapter.duplicateClip({ trackIndex: 0, slotIndex: 0 }, { trackIndex: 0, slotIndex: 1 });
  await adapter.setClipLoop({ trackIndex: 0, slotIndex: 1 }, 0, 256);
  const evolved = evolveSection(bass, { sourceBars: 16, targetBars: 64, amount: .25, seed: 7 });
  await adapter.replaceClipNotes({ trackIndex: 0, slotIndex: 1 }, evolved);
  assert.deepEqual(await adapter.getClipNotes({ trackIndex: 0, slotIndex: 0 }), bass);
  assert.notDeepEqual(await adapter.getClipNotes({ trackIndex: 0, slotIndex: 1 }), bass);
});

test("sequence generator responds to space and weirdness", () => {
  const sparse = createEffectiveStyleProfile(afterhours2019, { traits: { space: .95, weirdness: .2 } });
  const weird = createEffectiveStyleProfile(afterhours2019, { traits: { space: .1, weirdness: .95 } });
  const sparseNotes = generateSequence(sparse, { bars: 32, seed: 44 });
  const weirdNotes = generateSequence(weird, { bars: 32, seed: 44 });
  assert.ok(weirdNotes.length > sparseNotes.length);
  assert.ok(new Set(weirdNotes.map((note) => note.pitch)).size >= new Set(sparseNotes.map((note) => note.pitch)).size);
});

test("parameter blending creates measurably distinct sequence behavior", () => {
  const sparse = createEffectiveStyleProfile(afterhours2019, { traits: { space: 1, weirdness: .2 } });
  const dense = createEffectiveStyleProfile(afterhours2019, { traits: { space: 0, weirdness: .9 } });
  const mostlySparse = blendStyleProfiles("mostly_sparse", [{ profile: sparse, weight: .9 }, { profile: dense, weight: .1 }]);
  const mostlyDense = blendStyleProfiles("mostly_dense", [{ profile: sparse, weight: .1 }, { profile: dense, weight: .9 }]);
  assert.ok(mostlyDense.sequence.density > mostlySparse.sequence.density);
  const a = generateSequence(mostlySparse, { bars: 64, seed: 90 });
  const b = generateSequence(mostlyDense, { bars: 64, seed: 90 });
  assert.ok(b.length > a.length * 1.15);
});
