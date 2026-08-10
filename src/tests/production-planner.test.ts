import assert from "node:assert/strict";
import test from "node:test";
import { MockAbletonAdapter } from "../ableton/mock-adapter.js";
import { executeProduction } from "../production/production-executor.js";
import { planProduction } from "../production/production-planner.js";

test("Binh/Cabaret language compiles into a complete deterministic minimal production", () => {
  const prompt = "Tema oscuro, hipnótico y raro inspirado en Cabaret y Binh alrededor de 2019";
  const first = planProduction(prompt, { bars: 128, seed: 19 });
  const second = planProduction(prompt, { bars: 128, seed: 19 });

  assert.deepEqual(first, second);
  assert.equal(first.brief.genre, "minimal");
  assert.equal(first.brief.bpm, 130);
  assert.equal(first.brief.mode, "Dorian");
  assert.equal(first.tracks.length, 8);
  assert.deepEqual(first.tracks.map((track) => track.role), ["kick", "hats", "percussion", "bass", "chords", "lead", "texture", "fx"]);
  assert.ok(first.tracks.every((track) => track.notes.length > 0));
  assert.equal(first.brief.sections.reduce((sum, section) => sum + section.bars, 0), 128);
});

test("production execution dry-runs safely and builds independent tracks with mock Ableton", async () => {
  const ableton = new MockAbletonAdapter();
  const plan = planProduction("minimal house oscuro, espacial y con melodía", { bars: 64, seed: 7 });
  const preview = await executeProduction(ableton, plan, true);
  assert.equal(preview.dryRun, true);
  assert.equal((await ableton.snapshot()).trackCount, 0);

  const applied = await executeProduction(ableton, plan, false);
  const snapshot = await ableton.snapshot("detailed");
  assert.equal(applied.trackIndices.kick, 0);
  assert.equal(snapshot.trackCount, 8);
  assert.ok(snapshot.tracks.every((track) => track.clips[0]?.noteCount && track.clips[0].noteCount! > 0));
  assert.ok(snapshot.tracks.every((track) => track.devices.length >= 1));
  assert.ok((await ableton.getArrangementClips(3)).length > 0);
  const kickDevices = await ableton.getDevices(0);
  const kickEq = kickDevices.find((device) => device.name === "EQ Eight");
  const kickCompressor = kickDevices.find((device) => device.name === "Compressor");
  assert.ok(kickEq);
  assert.ok(kickCompressor);
  assert.equal((await ableton.getDeviceParameters({ trackIndex: 0, deviceIndex: kickEq.index }))[0]?.normalizedValue, 1);
  assert.equal((await ableton.getDeviceParameters({ trackIndex: 0, deviceIndex: kickCompressor.index }))[0]?.normalizedValue, .68);

  const deviceCounts = await Promise.all(Array.from({ length: 8 }, (_, trackIndex) => ableton.getDevices(trackIndex).then((devices) => devices.length)));
  const arrangementCounts = await Promise.all(Array.from({ length: 8 }, (_, trackIndex) => ableton.getArrangementClips(trackIndex).then((clips) => clips.length)));
  const resumed = await executeProduction(ableton, plan, false);
  assert.equal((await ableton.snapshot()).trackCount, 8);
  assert.deepEqual(await Promise.all(Array.from({ length: 8 }, (_, trackIndex) => ableton.getDevices(trackIndex).then((devices) => devices.length))), deviceCounts);
  assert.deepEqual(await Promise.all(Array.from({ length: 8 }, (_, trackIndex) => ableton.getArrangementClips(trackIndex).then((clips) => clips.length))), arrangementCounts);
  assert.ok(resumed.changes.some((change) => typeof change === "object" && change !== null && "operation" in change && change.operation === "arrangement.reuse"));
});

test("mock adapter can delete a temporary anchor track without corrupting indexes", async () => {
  const ableton = new MockAbletonAdapter();
  await ableton.createMidiTrack({ name: "LB Length Anchor" });
  await ableton.createMidiTrack({ name: "LB Kick" });
  await ableton.deleteTrack(0, false);
  const snapshot = await ableton.snapshot();
  assert.equal(snapshot.trackCount, 1);
  assert.equal(snapshot.tracks[0]?.index, 0);
  assert.equal(snapshot.tracks[0]?.name, "LB Kick");
});
