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
  assert.equal(first.brief.style.id, "afterhours_2019");
  assert.equal(first.brief.style.source, "curated");
  assert.equal(first.brief.style.components[0]?.id, "afterhours_2019");
  assert.equal(first.brief.bpm, 131);
  assert.equal(first.brief.mode, "Phrygian");
  assert.equal(first.tracks.length, 8);
  assert.deepEqual(first.tracks.map((track) => track.role), ["kick", "hats", "percussion", "bass", "chords", "lead", "texture", "fx"]);
  assert.ok(first.tracks.every((track) => track.notes.length > 0));
  assert.ok(first.tracks.every((track) => track.clips.length > 0));
  assert.equal(first.brief.sections.reduce((sum, section) => sum + section.bars, 0), 128);
});

test("requested scene profiles shape the plan and sections receive independent clip variants", () => {
  const timeless = planProduction("minimal house rollo Francesco Del Garda y Timeless", { bars: 128, seed: 22 });
  const wicked = planProduction("minimal electro raw de Wicked Bass y Noizar", { bars: 128, seed: 22 });
  assert.equal(timeless.brief.style.id, "timeless_del_garda");
  assert.equal(timeless.brief.bpm, 129);
  assert.equal(wicked.brief.style.id, "wicked_bass_noizar");
  assert.equal(wicked.brief.bpm, 131);
  assert.notDeepEqual(timeless.tracks.find((track) => track.role === "bass")?.notes, wicked.tracks.find((track) => track.role === "bass")?.notes);
  const timelessLead = timeless.tracks.find((track) => track.role === "lead");
  assert.ok(timelessLead && timelessLead.clips.length >= 3);
  assert.ok(new Set(timelessLead.clips.map((clip) => JSON.stringify(clip.notes))).size > 1);
});

test("a multi-label prompt blends profiles automatically without an explicit profileId", () => {
  const plan = planProduction("algo entre Timeless, Phonotheque y Perlon", { bars: 64, seed: 12 });
  assert.match(plan.brief.style.id, /^mix_/);
  assert.equal(plan.brief.style.components.length, 3);
  assert.equal(plan.styleProfile.id, plan.brief.style.id);
  assert.ok(Math.abs(plan.brief.style.components.reduce((sum, component) => sum + component.weight, 0) - 1) < 1e-9);
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
  assert.ok(snapshot.tracks.some((track) => track.clips.length >= 4));
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

test("compatible stock instruments receive the selected variant synthesis hints", async () => {
  const ableton = new MockAbletonAdapter();
  const plan = planProduction("EKBOX Cabaret eerie machine funk", { bars: 64, seed: 3 });
  assert.equal(plan.brief.pack.variant?.id, "cabaret-eerie-machine");
  await executeProduction(ableton, plan, false);
  const bass = plan.tracks.findIndex((track) => track.role === "bass");
  const instrument = (await ableton.getDevices(bass))[0]!;
  const parameters = await ableton.getDeviceParameters({ trackIndex: bass, deviceIndex: instrument.index });
  assert.equal(parameters.find((parameter) => parameter.name === "Filter Freq")?.normalizedValue, .34);
  assert.equal(parameters.find((parameter) => parameter.name === "Resonance")?.normalizedValue, .58);
});
