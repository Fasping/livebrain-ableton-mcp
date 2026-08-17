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

test("detailed snapshots and addressable operations expose Master and Returns", async () => {
  const adapter = new MockAbletonAdapter();
  const compact = await adapter.snapshot("compact");
  const detailed = await adapter.snapshot("detailed");

  assert.equal(compact.masterTrack, undefined);
  assert.equal(compact.returnTracks, undefined);
  assert.equal(detailed.masterTrack?.index, -1);
  assert.deepEqual(detailed.returnTracks?.map((track) => track.index), [200, 201]);
  assert.deepEqual(await adapter.getDevices(-1), []);
  assert.deepEqual(await adapter.getDevices(200), []);

  await adapter.setTrackMixer(-1, { volume: 0.7, pan: -0.1 });
  await adapter.setTrackMixer(200, { mute: true, solo: true });
  const changed = await adapter.snapshot("detailed");
  assert.equal(changed.masterTrack?.mixer.volume, 0.7);
  assert.equal(changed.returnTracks?.[0]?.mixer.mute, true);
  await assert.rejects(adapter.setTrackMixer(-1, { arm: true }), /not applicable to master\/return tracks/);
  await assert.rejects(adapter.setTrackMixer(200, { arm: true }), /not applicable to master\/return tracks/);
});

test("mock Master meter represents digital silence explicitly", async () => {
  const meter = await new MockAbletonAdapter().getMasterMeter();
  assert.equal(meter.leftLinear, 0);
  assert.equal(meter.leftDbfs, null);
  assert.equal(meter.peakDbfs, null);
});
