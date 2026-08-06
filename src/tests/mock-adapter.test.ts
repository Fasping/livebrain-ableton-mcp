import assert from "node:assert/strict";
import test from "node:test";
import { MockAbletonAdapter } from "../ableton/mock-adapter.js";

test("mock adapter supports a complete MIDI writing flow", async () => {
  const adapter = new MockAbletonAdapter();
  await adapter.createMidiTrack({ name: "Drums" });
  await adapter.createMidiClip({ trackIndex: 0, slotIndex: 0, length: 16, name: "Pattern" });
  await adapter.replaceClipNotes({ trackIndex: 0, slotIndex: 0 }, [
    { pitch: 36, start: 0, duration: 0.1, velocity: 100 },
  ]);
  const notes = await adapter.getClipNotes({ trackIndex: 0, slotIndex: 0 });
  assert.equal(notes.length, 1);
  const snapshot = await adapter.snapshot("compact");
  assert.equal(snapshot.trackCount, 1);
  assert.equal(snapshot.tracks[0]?.clips[0]?.noteCount, 1);
});

test("dry-run validates without mutating", async () => {
  const adapter = new MockAbletonAdapter();
  const result = await adapter.createMidiTrack({ name: "Preview", dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal((await adapter.snapshot()).trackCount, 0);
});
