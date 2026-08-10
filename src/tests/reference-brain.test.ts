import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { AnalyzerRegistry } from "../reference/audio-analyzer.js";
import type { MeasuredAudioFeatures, ReferenceTrack } from "../reference/models.js";
import { buildReferenceProfile } from "../reference/profile-builder.js";
import { ReferenceService } from "../reference/reference-service.js";
import { ReferenceStore } from "../reference/store.js";
import { WavAudioAnalyzer } from "../reference/wav-audio-analyzer.js";

test("reference library stores local paths separately and builds a consumable profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-reference-"));
  const audioPath = join(directory, "pulse.wav");
  await writeFile(audioPath, pulseWav(16, 22050, 120));
  const service = new ReferenceService(new ReferenceStore(join(directory, "data")), new AnalyzerRegistry([new WavAudioAnalyzer()]));
  const added = await service.add(audioPath, { title: "Local Pulse", groups: ["machine_funk"], tags: ["dry"] });
  assert.equal(JSON.stringify(added).includes(audioPath), false);
  const analyzed = await service.analyze(added.id);
  assert.ok(analyzed.measured);
  assert.ok(analyzed.measured.rhythm.onsetCount > 8);
  await service.rate(added.id, { groove: 9, space: 7, electro: 8 });
  await service.setInfluence(added.id, { groove: 1, space: 1, electro: 1, drums: .8 });
  const profile = await service.buildProfile("machine_funk");
  assert.equal(profile.styleProfile.id, "machine_funk");
  assert.ok(profile.styleProfile.rhythm.density >= 0 && profile.styleProfile.rhythm.density <= 1);
});

test("a local reference folder imports, analyzes and builds a profile without duplicating paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-folder-"));
  const folder = join(directory, "records");
  await mkdir(folder);
  await writeFile(join(folder, "Timeless Tool.wav"), pulseWav(8, 22050, 128));
  await writeFile(join(folder, "Phonotheque Cut.wav"), pulseWav(8, 22050, 130));
  await writeFile(join(folder, "notes.txt"), "ignored");
  const service = new ReferenceService(new ReferenceStore(join(directory, "data")), new AnalyzerRegistry([new WavAudioAnalyzer()]));
  const first = await service.importDirectory({ directoryPath: folder, group: "my_afterhours" });
  assert.equal(first.discovered, 2);
  assert.equal(first.imported.length, 2);
  assert.equal(first.failed.length, 0);
  assert.ok(first.imported.every((reference) => reference.measured));
  assert.equal(first.profile?.styleProfile.id, "my_afterhours");
  const second = await service.importDirectory({ directoryPath: folder, group: "my_afterhours" });
  assert.equal(second.imported.length, 0);
  assert.equal(second.skipped.length, 2);
  assert.equal((await service.list("my_afterhours")).length, 2);
});

test("different reference profiles produce measurably different patterns", () => {
  const sparse = buildReferenceProfile("sparse", [reference("sparse", features(0.8, 0.72, 0.9), { space: 9 })]);
  const dense = buildReferenceProfile("dense", [reference("dense", features(6.2, 0.35, 0.15), { space: 2 })]);
  const sparseNotes = generateDrumGroove(sparse.styleProfile, { bars: 16, seed: 404 });
  const denseNotes = generateDrumGroove(dense.styleProfile, { bars: 16, seed: 404 });
  assert.notDeepEqual(sparseNotes, denseNotes);
  assert.ok(denseNotes.length > sparseNotes.length * 1.25, `${denseNotes.length} should be denser than ${sparseNotes.length}`);
});

test("reference audio extensions and local path index are gitignored", async () => {
  const gitignore = await readFile(new URL("../../.gitignore", import.meta.url), "utf8");
  assert.match(gitignore, /data\/references\/\.local-index\.json/);
  for (const extension of ["wav", "aiff", "mp3", "flac"]) assert.match(gitignore, new RegExp(`\\*\\*/\\*\\.${extension}`));
});

test("curated priors remain human-only and can build an influence-weighted profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livebrain-priors-"));
  const service = new ReferenceService(new ReferenceStore(join(directory, "data")), new AnalyzerRegistry([new WavAudioAnalyzer()]));
  const priors = await service.seedCuratedPriors();
  assert.ok(priors.length >= 20);
  assert.ok(priors.every((reference) => reference.measured === undefined));
  const profile = await service.buildProfile("afterhours_2019");
  assert.ok((profile.contributions.groove?.length ?? 0) > 5);
  assert.ok(profile.styleProfile.rhythm.density >= 0 && profile.styleProfile.rhythm.density <= 1);
});

function reference(group: string, measured: MeasuredAudioFeatures, ratings: ReferenceTrack["human"]["ratings"]): ReferenceTrack {
  return {
    id: `${group}-id`, version: 2, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: { title: group, groups: [group], tags: [], sourceFileName: `${group}.wav` }, measured,
    human: { ratings, notes: [] }, influence: { groove: 1, drums: 1, space: 1 },
  };
}

function features(onsetDensity: number, repetition: number, silenceRatio: number): MeasuredAudioFeatures {
  return {
    analyzer: "test", analyzerVersion: "1", analyzedAt: "2026-01-01T00:00:00.000Z", durationSeconds: 60, sampleRate: 22050, channels: 1,
    dynamics: { rms: 0.2, peak: 0.8, crestFactor: 4 },
    rhythm: {
      onsetCount: Math.round(onsetDensity * 60), onsetDensity, estimatedBpm: 130, bpmConfidence: .8,
      beatRelativeOnsetHistogram: Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? 0.15 : 0.025),
      syncopationProxy: onsetDensity > 3 ? 0.75 : 0.35, repetition, onsetRegularity: .7, predictabilityProxy: .5,
      microtimingMeanMs: 7, microtimingStdMs: onsetDensity > 3 ? 18 : 6, silenceRatio,
      accentPattern: Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? 1 : 0.3), longCycleVariation: onsetDensity > 3 ? 0.45 : 0.12,
    },
  };
}

function pulseWav(seconds: number, sampleRate: number, bpm: number): Buffer {
  const frames = seconds * sampleRate;
  const pcm = Buffer.alloc(frames * 2);
  const interval = Math.round(sampleRate * 60 / bpm / 2);
  for (let i = 0; i < frames; i += 1) {
    const phase = i % interval;
    const value = phase < 300 ? Math.sin(phase / sampleRate * Math.PI * 2 * 1000) * Math.exp(-phase / 80) * 0.8 : 0;
    pcm.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  const output = Buffer.alloc(44 + pcm.length);
  output.write("RIFF", 0); output.writeUInt32LE(36 + pcm.length, 4); output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(1, 22);
  output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * 2, 28); output.writeUInt16LE(2, 32); output.writeUInt16LE(16, 34);
  output.write("data", 36); output.writeUInt32LE(pcm.length, 40); pcm.copy(output, 44);
  return output;
}
