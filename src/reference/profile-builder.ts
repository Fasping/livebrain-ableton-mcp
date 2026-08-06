import { afterhours2019, clamp01, type StyleProfile } from "../music-brain/style-profile.js";
import { ratingKeys, type Distribution, type ReferenceProfile, type ReferenceTrack } from "./models.js";

export function buildReferenceProfile(group: string, references: ReferenceTrack[]): ReferenceProfile {
  const selected = references.filter((reference) => reference.metadata.groups.includes(group));
  if (!selected.length) throw new Error(`No references found in group ${group}`);
  const analyzed = selected.filter((reference) => reference.measured);
  if (!analyzed.length) throw new Error(`Group ${group} has no analyzed references`);
  const values = (selector: (reference: ReferenceTrack) => number | null | undefined) => analyzed.map(selector).filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  const measured = {
    bpm: distribution(values((r) => r.measured?.rhythm.estimatedBpm)),
    onsetDensity: distribution(values((r) => r.measured?.rhythm.onsetDensity)),
    syncopation: distribution(values((r) => r.measured?.rhythm.syncopationProxy)),
    repetition: distribution(values((r) => r.measured?.rhythm.repetition)),
    microtimingStdMs: distribution(values((r) => r.measured?.rhythm.microtimingStdMs)),
    silenceRatio: distribution(values((r) => r.measured?.rhythm.silenceRatio)),
    longCycleVariation: distribution(values((r) => r.measured?.rhythm.longCycleVariation)),
    accentPattern: meanVectors(analyzed.map((r) => r.measured!.rhythm.accentPattern)),
  };
  const human = Object.fromEntries(ratingKeys.flatMap((key) => {
    const result = distribution(selected.map((r) => r.human.ratings[key]).filter((value): value is number => value !== undefined));
    return result ? [[key, result]] : [];
  }));
  return {
    id: group, version: "0.1", builtAt: new Date().toISOString(), group,
    referenceIds: selected.map((reference) => reference.id), measured, human,
    styleProfile: deriveStyleProfile(group, measured, human),
  };
}

type Measured = ReferenceProfile["measured"];
type Human = ReferenceProfile["human"];

function deriveStyleProfile(id: string, measured: Measured, human: Human): StyleProfile {
  const bpm = measured.bpm?.median ?? afterhours2019.tempo.preferred;
  const rating = (key: keyof Human, fallback: number) => human[key]?.median ?? fallback;
  return {
    ...structuredClone(afterhours2019), id, version: "reference-0.1", name: id.replaceAll("_", " "),
    tempo: { min: Math.round(measured.bpm?.min ?? bpm - 4), max: Math.round(measured.bpm?.max ?? bpm + 4), preferred: Math.round(bpm) },
    rhythm: {
      ...afterhours2019.rhythm,
      density: clamp01((measured.onsetDensity?.median ?? 2.8) / 8),
      syncopation: clamp01(measured.syncopation?.median ?? afterhours2019.rhythm.syncopation),
      microtiming: clamp01((measured.microtimingStdMs?.median ?? 10) / 45),
      repetition: clamp01(measured.repetition?.median ?? afterhours2019.rhythm.repetition),
      mutationRate: clamp01(measured.longCycleVariation?.median ?? afterhours2019.rhythm.mutationRate),
      silence: clamp01(measured.silenceRatio?.median ?? afterhours2019.rhythm.silence),
      predictability: clamp01((measured.repetition?.median ?? 0.7) * (1 - (measured.syncopation?.median ?? 0.5) * 0.5)),
    },
    drums: {
      ...afterhours2019.drums,
      hatDensity: clamp01((measured.onsetDensity?.median ?? 2.8) / 10),
      ghostDensity: clamp01(0.08 + rating("drums", 0.5) * 0.2),
      electroInfluence: clamp01(rating("electro", afterhours2019.drums.electroInfluence)),
    },
    bass: {
      ...afterhours2019.bass,
      density: clamp01(0.18 + rating("bass", 0.5) * 0.28 - (measured.silenceRatio?.median ?? 0.4) * 0.08),
      rests: clamp01(measured.silenceRatio?.median ?? afterhours2019.bass.rests),
      chromaticism: clamp01(0.2 + rating("weirdness", 0.5) * 0.4),
    },
    timbre: {
      ...afterhours2019.timbre,
      weirdness: clamp01(rating("weirdness", afterhours2019.timbre.weirdness)),
      brightness: clamp01(0.55 - rating("darkness", 0.5) * 0.3),
    },
    arrangement: {
      ...afterhours2019.arrangement,
      evolutionRate: clamp01(measured.longCycleVariation?.median ?? afterhours2019.arrangement.evolutionRate),
      subtraction: clamp01(rating("space", afterhours2019.arrangement.subtraction)),
    },
    mix: {
      ...afterhours2019.mix,
      brightness: clamp01(0.58 - rating("darkness", 0.5) * 0.35),
      space: clamp01(rating("space", afterhours2019.mix.space)),
    },
  };
}

export function distribution(values: number[]): Distribution | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return { count: sorted.length, min: sorted[0]!, max: sorted.at(-1)!, median, mean, standardDeviation: Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length) };
}
function meanVectors(vectors: number[][]) { const length = Math.max(0, ...vectors.map((v) => v.length)); return Array.from({ length }, (_, i) => vectors.reduce((sum, v) => sum + (v[i] ?? 0), 0) / Math.max(1, vectors.length)); }
