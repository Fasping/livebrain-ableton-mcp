import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { AudioAnalyzer } from "./audio-analyzer.js";
import type { MeasuredAudioFeatures, RhythmFeatures } from "./models.js";

interface DecodedAudio { samples: Float32Array; sampleRate: number; channels: number }

export class WavAudioAnalyzer implements AudioAnalyzer {
  readonly id = "pcm-wav";
  readonly version = "1.0.0";
  supports(path: string) { return [".wav", ".wave"].includes(extname(path).toLowerCase()); }

  async analyze(path: string): Promise<MeasuredAudioFeatures> {
    const audio = decodeWav(await readFile(path));
    return analyzeMonoPcm(audio.samples, audio.sampleRate, audio.channels, this.id, this.version);
  }
}

function decodeWav(buffer: Buffer): DecodedAudio {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV container");
  let offset = 12;
  let format: { code: number; channels: number; sampleRate: number; bits: number } | undefined;
  let data: Buffer | undefined;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) throw new Error("Corrupt WAV chunk");
    if (id === "fmt ") format = {
      code: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2),
      sampleRate: buffer.readUInt32LE(start + 4), bits: buffer.readUInt16LE(start + 14),
    };
    if (id === "data") data = buffer.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (!format || !data) throw new Error("WAV is missing fmt or data chunk");
  if (![1, 3].includes(format.code)) throw new Error(`Unsupported WAV encoding ${format.code}; use PCM or IEEE float`);
  if (![16, 24, 32].includes(format.bits)) throw new Error(`Unsupported WAV bit depth ${format.bits}`);
  const bytes = format.bits / 8;
  const frames = Math.floor(data.length / (bytes * format.channels));
  const mono = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel += 1) {
      const position = (frame * format.channels + channel) * bytes;
      if (format.code === 3 && format.bits === 32) sum += data.readFloatLE(position);
      else if (format.bits === 16) sum += data.readInt16LE(position) / 32768;
      else if (format.bits === 24) sum += data.readIntLE(position, 3) / 8388608;
      else sum += data.readInt32LE(position) / 2147483648;
    }
    mono[frame] = sum / format.channels;
  }
  return { samples: mono, sampleRate: format.sampleRate, channels: format.channels };
}

export function analyzeMonoPcm(samples: Float32Array, sampleRate: number, channels: number, analyzer: string, analyzerVersion: string): MeasuredAudioFeatures {
  const dynamics = measureDynamics(samples);
  return {
    analyzer, analyzerVersion, analyzedAt: new Date().toISOString(), sampleRate, channels,
    durationSeconds: samples.length / sampleRate,
    dynamics: { ...dynamics, crestFactor: dynamics.rms ? dynamics.peak / dynamics.rms : 0 },
    rhythm: analyzeRhythm(samples, sampleRate),
  };
}

function analyzeRhythm(samples: Float32Array, sampleRate: number): RhythmFeatures {
  const hop = Math.max(1, Math.round(sampleRate * 0.01));
  const window = Math.max(hop, Math.round(sampleRate * 0.02));
  const energies: number[] = [];
  for (let start = 0; start + window <= samples.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + window; i += 1) sum += samples[i]! * samples[i]!;
    energies.push(Math.sqrt(sum / window));
  }
  const flux = energies.map((value, index) => Math.max(0, value - (energies[index - 1] ?? value)));
  const threshold = median(flux) + 2.5 * medianAbsoluteDeviation(flux);
  const minimumGapFrames = Math.max(1, Math.round(0.06 / (hop / sampleRate)));
  const onsets: number[] = [];
  for (let i = 1; i < flux.length - 1; i += 1) {
    if (flux[i]! > threshold && flux[i]! >= flux[i - 1]! && flux[i]! > flux[i + 1]! && i - (onsets.at(-1) ?? -9999) >= minimumGapFrames) onsets.push(i);
  }
  const frameSeconds = hop / sampleRate;
  const duration = samples.length / sampleRate;
  const bpm = estimateBpm(onsets, frameSeconds, duration);
  const histogram = phaseHistogram(onsets, frameSeconds, bpm, 16);
  const accented = histogram.map((value, index) => value * ([0, 4, 8, 12].includes(index) ? 0 : 1)).reduce((a, b) => a + b, 0);
  const total = histogram.reduce((a, b) => a + b, 0);
  const microtiming = bpm ? onsets.map((frame) => deviationFromGrid(frame * frameSeconds, 60 / bpm / 4) * 1000) : [];
  const silenceThreshold = Math.max(0.0005, median(energies) * 0.18);
  const barFrames = bpm ? Math.max(1, Math.round((60 / bpm * 4) / frameSeconds)) : 400;
  const barVectors = chunkVectors(energies, barFrames, 16);
  return {
    onsetCount: onsets.length,
    onsetDensity: onsets.length / Math.max(duration, 0.001),
    estimatedBpm: bpm,
    beatRelativeOnsetHistogram: histogram,
    syncopationProxy: total ? accented / total : 0,
    repetition: consecutiveCosineSimilarity(barVectors),
    microtimingMeanMs: microtiming.length ? mean(microtiming.map(Math.abs)) : null,
    microtimingStdMs: microtiming.length ? standardDeviation(microtiming) : null,
    silenceRatio: energies.filter((value) => value < silenceThreshold).length / Math.max(1, energies.length),
    accentPattern: normalizedMeanVector(barVectors, 16),
    longCycleVariation: coefficientOfVariation(barVectors.map((vector) => mean(vector))),
  };
}

function estimateBpm(onsets: number[], frameSeconds: number, duration: number): number | null {
  if (onsets.length < 8 || duration < 8) return null;
  const envelopeLength = Math.ceil(duration / frameSeconds);
  const envelope = new Float32Array(envelopeLength);
  for (const onset of onsets) envelope[onset] = 1;
  let bestBpm = 0, bestScore = -1;
  for (let bpm = 70; bpm <= 180; bpm += 0.25) {
    const lag = Math.round((60 / bpm) / frameSeconds);
    let score = 0;
    for (let i = lag; i < envelope.length; i += 1) score += envelope[i]! * envelope[i - lag]!;
    if (score > bestScore) { bestScore = score; bestBpm = bpm; }
  }
  while (bestBpm < 105) bestBpm *= 2;
  while (bestBpm > 155) bestBpm /= 2;
  return Math.round(bestBpm * 100) / 100;
}

function phaseHistogram(onsets: number[], frameSeconds: number, bpm: number | null, bins: number) {
  const output = Array.from({ length: bins }, () => 0);
  if (!bpm || !onsets.length) return output;
  const bar = 60 / bpm * 4;
  for (const onset of onsets) output[Math.min(bins - 1, Math.floor(((onset * frameSeconds) % bar) / bar * bins))]! += 1;
  const total = output.reduce((a, b) => a + b, 0);
  return output.map((value) => value / Math.max(1, total));
}

function chunkVectors(values: number[], chunkSize: number, bins: number) {
  const result: number[][] = [];
  for (let start = 0; start + chunkSize <= values.length; start += chunkSize) {
    const vector = Array.from({ length: bins }, () => 0);
    for (let i = 0; i < chunkSize; i += 1) vector[Math.min(bins - 1, Math.floor(i / chunkSize * bins))]! += values[start + i]!;
    result.push(vector.map((value) => value / Math.max(1, chunkSize / bins)));
  }
  return result;
}

function normalizedMeanVector(vectors: number[][], length: number) {
  if (!vectors.length) return Array.from({ length }, () => 0);
  const values = Array.from({ length }, (_, index) => mean(vectors.map((vector) => vector[index] ?? 0)));
  const max = Math.max(...values, 0.000001);
  return values.map((value) => value / max);
}
function consecutiveCosineSimilarity(vectors: number[][]) { if (vectors.length < 2) return 0; return mean(vectors.slice(1).map((vector, index) => cosine(vectors[index]!, vector))); }
function cosine(a: number[], b: number[]) { const dot = a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0); const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0)); const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0)); return na && nb ? dot / (na * nb) : 0; }
function deviationFromGrid(time: number, grid: number) { const nearest = Math.round(time / grid) * grid; return time - nearest; }
function measureDynamics(samples: Float32Array) { let squares = 0, peak = 0; for (const sample of samples) { squares += sample * sample; peak = Math.max(peak, Math.abs(sample)); } return { rms: Math.sqrt(squares / Math.max(1, samples.length)), peak }; }
function mean(values: number[]) { return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length); }
function median(values: number[]) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2; }
function medianAbsoluteDeviation(values: number[]) { const center = median(values); return median(values.map((value) => Math.abs(value - center))); }
function standardDeviation(values: number[]) { const center = mean(values); return Math.sqrt(mean(values.map((value) => (value - center) ** 2))); }
function coefficientOfVariation(values: number[]) { const center = mean(values); return center ? Math.min(1, standardDeviation(values) / Math.abs(center)) : 0; }
