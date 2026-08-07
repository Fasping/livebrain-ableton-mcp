import { afterhours2019, clamp01, type StyleProfile } from "../music-brain/style-profile.js";
import { influenceKeys, ratingKeys, type Distribution, type InfluenceKey, type RatingKey, type ReferenceProfile, type ReferenceTrack } from "./models.js";

export function buildReferenceProfile(group: string, references: ReferenceTrack[]): ReferenceProfile {
  const selected = references.filter((reference) => reference.metadata.groups.includes(group));
  if (!selected.length) throw new Error(`No references found in group ${group}`);
  const analyzed = selected.filter((reference) => reference.measured);
  const measuredValue = (selector: (reference: ReferenceTrack) => number | null | undefined) =>
    analyzed.map((reference) => ({ value: selector(reference), weight: influence(reference, "groove") }))
      .filter((entry): entry is { value: number; weight: number } => entry.value !== null && entry.value !== undefined && Number.isFinite(entry.value));
  const measured: ReferenceProfile["measured"] = {
    bpm: weightedDistribution(measuredValue((r) => r.measured?.rhythm.estimatedBpm)),
    onsetDensity: weightedDistribution(measuredValue((r) => r.measured?.rhythm.onsetDensity)),
    syncopation: weightedDistribution(measuredValue((r) => r.measured?.rhythm.syncopationProxy)),
    repetition: weightedDistribution(measuredValue((r) => r.measured?.rhythm.repetition)),
    microtimingStdMs: weightedDistribution(measuredValue((r) => r.measured?.rhythm.microtimingStdMs)),
    silenceRatio: weightedDistribution(measuredValue((r) => r.measured?.rhythm.silenceRatio)),
    longCycleVariation: weightedDistribution(measuredValue((r) => r.measured?.rhythm.longCycleVariation)),
    accentPattern: weightedMeanVectors(analyzed.map((r) => ({ vector: r.measured!.rhythm.accentPattern, weight: influence(r, "groove") }))),
  };
  const human = Object.fromEntries(ratingKeys.flatMap((key) => {
    const entries = selected.flatMap((reference) => {
      const value = reference.human.ratings[key];
      return value === undefined ? [] : [{ value, weight: influence(reference, ratingInfluenceDimension(key)) }];
    });
    const result = weightedDistribution(entries);
    return result ? [[key, result]] : [];
  })) as ReferenceProfile["human"];
  const contributions = Object.fromEntries(influenceKeys.map((dimension) => [dimension, contributionFor(selected, dimension)])) as ReferenceProfile["contributions"];
  return {
    id: group, version: "0.2", builtAt: new Date().toISOString(), group,
    referenceIds: selected.map((reference) => reference.id), measured, human, contributions,
    styleProfile: deriveStyleProfile(group, measured, human),
  };
}

function deriveStyleProfile(id: string, measured: ReferenceProfile["measured"], human: ReferenceProfile["human"]): StyleProfile {
  const bpm = measured.bpm?.weightedMean ?? measured.bpm?.median ?? afterhours2019.tempo.preferred;
  const rating01 = (key: RatingKey, fallback: number) => clamp01((human[key]?.weightedMean ?? human[key]?.median ?? fallback * 10) / 10);
  return {
    ...structuredClone(afterhours2019), id, version: "reference-0.2", name: id.replaceAll("_", " "),
    tempo: { min: Math.round(measured.bpm?.p25 ?? bpm - 4), max: Math.round(measured.bpm?.p75 ?? bpm + 4), preferred: Math.round(bpm) },
    rhythm: {
      ...afterhours2019.rhythm,
      density: clamp01((measured.onsetDensity?.weightedMean ?? 2.8) / 8),
      syncopation: clamp01(measured.syncopation?.weightedMean ?? afterhours2019.rhythm.syncopation),
      microtiming: clamp01((measured.microtimingStdMs?.weightedMean ?? 10) / 45),
      repetition: clamp01(measured.repetition?.weightedMean ?? afterhours2019.rhythm.repetition),
      mutationRate: clamp01(measured.longCycleVariation?.weightedMean ?? afterhours2019.rhythm.mutationRate),
      silence: clamp01(measured.silenceRatio?.weightedMean ?? rating01("space", afterhours2019.rhythm.silence)),
      predictability: rating01("predictability", afterhours2019.rhythm.predictability),
    },
    drums: {
      ...afterhours2019.drums,
      hatDensity: clamp01((measured.onsetDensity?.weightedMean ?? 2.8) / 10),
      ghostDensity: clamp01(0.06 + rating01("drums", 0.5) * 0.22),
      electroInfluence: rating01("electro", afterhours2019.drums.electroInfluence),
    },
    bass: {
      ...afterhours2019.bass,
      density: clamp01(0.12 + rating01("bass", 0.5) * 0.32 - rating01("space", 0.5) * 0.08),
      rests: clamp01(measured.silenceRatio?.weightedMean ?? rating01("space", afterhours2019.bass.rests)),
      chromaticism: clamp01(0.15 + rating01("weirdness", 0.5) * 0.45),
      tonalStability: clamp01(0.72 - rating01("weirdness", 0.5) * 0.42),
    },
    sequence: {
      ...afterhours2019.sequence,
      density: clamp01(.12 + rating01("synth", .5) * .22 - rating01("space", .5) * .08),
      cycleSteps: rating01("weirdness", .5) > .75 ? 11 : rating01("predictability", .5) < .35 ? 7 : 8,
      chromaticism: clamp01(.2 + rating01("weirdness", .5) * .55),
      chordProbability: clamp01(.04 + rating01("progressive", .5) * .16),
      rareEventProbability: clamp01(.03 + rating01("weirdness", .5) * .1),
    },
    timbre: {
      ...afterhours2019.timbre,
      weirdness: rating01("weirdness", afterhours2019.timbre.weirdness),
      brightness: clamp01(0.62 - rating01("darkness", 0.5) * 0.42),
      rawness: rating01("rawness", afterhours2019.timbre.rawness),
      digital: clamp01(0.25 + rating01("electro", 0.5) * 0.5),
    },
    arrangement: {
      ...afterhours2019.arrangement,
      evolutionRate: clamp01(measured.longCycleVariation?.weightedMean ?? (1 - rating01("predictability", 0.5)) * 0.35),
      subtraction: rating01("space", afterhours2019.arrangement.subtraction),
    },
    mix: {
      ...afterhours2019.mix,
      brightness: clamp01(0.6 - rating01("darkness", 0.5) * 0.4),
      space: rating01("space", afterhours2019.mix.space),
      loudness: clamp01(0.62 - rating01("subtlety", 0.5) * 0.25),
    },
  };
}

export function weightedDistribution(entries: Array<{ value: number; weight: number }>): Distribution | undefined {
  const usable = entries.filter((entry) => Number.isFinite(entry.value) && entry.weight > 0);
  if (!usable.length) return undefined;
  const sorted = [...usable].sort((a, b) => a.value - b.value);
  const values = sorted.map((entry) => entry.value);
  const totalWeight = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedMean = sorted.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    count: values.length, min: values[0]!, max: values.at(-1)!, mean, weightedMean,
    median: quantile(values, 0.5), p25: quantile(values, 0.25), p75: quantile(values, 0.75),
    standardDeviation: Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length),
  };
}

export function explainProfile(profile: ReferenceProfile) {
  return Object.fromEntries(Object.entries(profile.contributions).map(([dimension, entries]) => [
    `${dimension}DNA`, entries.map((entry) => ({ referenceId: entry.referenceId, title: entry.title, percentage: Math.round(entry.percentage * 10000) / 100 })),
  ]));
}

function contributionFor(references: ReferenceTrack[], dimension: InfluenceKey) {
  const entries = references.map((reference) => ({ referenceId: reference.id, title: reference.metadata.title, weight: influence(reference, dimension) })).filter((entry) => entry.weight > 0);
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  return entries.map((entry) => ({ ...entry, percentage: total ? entry.weight / total : 0 })).sort((a, b) => b.percentage - a.percentage);
}
function influence(reference: ReferenceTrack, dimension: InfluenceKey) { return reference.influence[dimension] ?? 0; }
function ratingInfluenceDimension(key: RatingKey): InfluenceKey {
  if (["groove", "hypnosis", "predictability"].includes(key)) return "groove";
  if (key === "drums") return "drums";
  if (key === "bass") return "bass";
  if (key === "synth") return "synth";
  if (key === "arrangement") return "arrangement";
  if (["space"].includes(key)) return "space";
  if (["rawness"].includes(key)) return "rawness";
  if (["weirdness", "cheese", "darkness", "subtlety"].includes(key)) return "timbre";
  if (key === "electro") return "electro";
  if (key === "progressive") return "progressive";
  return "timbre";
}
function quantile(sorted: number[], q: number) { const index = (sorted.length - 1) * q; const low = Math.floor(index); const high = Math.ceil(index); return low === high ? sorted[low]! : sorted[low]! * (high - index) + sorted[high]! * (index - low); }
function weightedMeanVectors(entries: Array<{ vector: number[]; weight: number }>) { const usable = entries.filter((entry) => entry.weight > 0); const length = Math.max(0, ...usable.map((entry) => entry.vector.length)); const total = usable.reduce((sum, entry) => sum + entry.weight, 0); return Array.from({ length }, (_, i) => usable.reduce((sum, entry) => sum + (entry.vector[i] ?? 0) * entry.weight, 0) / Math.max(total, 1)); }
