import type { ReferenceProfile, Distribution } from "../reference/models.js";
import type { StyleProfile } from "../music-brain/style-profile.js";

export interface WeightedProfile<T> { profile: T; weight: number }

export function blendStyleProfiles(id: string, components: Array<WeightedProfile<StyleProfile>>): StyleProfile {
  const normalized = normalize(components);
  if (!normalized.length) throw new Error("At least one positive profile weight is required");
  const first = structuredClone(normalized[0]!.profile);
  const scalar = (read: (profile: StyleProfile) => number) => normalized.reduce((sum, item) => sum + read(item.profile) * item.weight, 0);
  const pair = (read: (profile: StyleProfile) => [number, number]): [number, number] => [Math.round(scalar((p) => read(p)[0])), Math.round(scalar((p) => read(p)[1]))];
  return {
    ...first, id, version: "blend-0.1", name: id.replaceAll("_", " "),
    tempo: { min: Math.round(scalar((p) => p.tempo.min)), max: Math.round(scalar((p) => p.tempo.max)), preferred: Math.round(scalar((p) => p.tempo.preferred)) },
    rhythm: mapScalars(first.rhythm, (key) => scalar((p) => p.rhythm[key])),
    drums: mapScalars(first.drums, (key) => scalar((p) => p.drums[key])),
    bass: { ...mapScalars(first.bass, (key) => key === "register" ? 0 : scalar((p) => p.bass[key] as number)), register: pair((p) => p.bass.register) },
    sequence: { ...mapScalars(first.sequence, (key) => key === "register" ? 0 : scalar((p) => p.sequence[key] as number)), cycleSteps: Math.round(scalar((p) => p.sequence.cycleSteps)), register: pair((p) => p.sequence.register) },
    timbre: mapScalars(first.timbre, (key) => scalar((p) => p.timbre[key])),
    arrangement: { ...mapScalars(first.arrangement, (key) => key === "cycleBars" ? 0 : scalar((p) => p.arrangement[key] as number)), cycleBars: [...new Set(normalized.flatMap((item) => item.profile.arrangement.cycleBars))].sort((a, b) => a - b) },
    mix: mapScalars(first.mix, (key) => scalar((p) => p.mix[key])),
    constraints: [...new Set(normalized.flatMap((item) => item.profile.constraints))],
    negativeTraits: [...new Set(normalized.flatMap((item) => item.profile.negativeTraits))],
  } as StyleProfile;
}

export function blendReferenceProfiles(id: string, components: Array<WeightedProfile<ReferenceProfile>>): ReferenceProfile {
  const normalized = normalize(components);
  const styleProfile = blendStyleProfiles(id, normalized.map((item) => ({ profile: item.profile.styleProfile, weight: item.weight })));
  const distributionKeys = ["bpm", "onsetDensity", "syncopation", "repetition", "microtimingStdMs", "silenceRatio", "longCycleVariation"] as const;
  const distributions = Object.fromEntries(distributionKeys.flatMap((key) => {
    const values = normalized.flatMap((item) => item.profile.measured[key] ? [{ profile: item.profile.measured[key]!, weight: item.weight }] : []);
    return values.length ? [[key, blendDistribution(values)]] : [];
  })) as Partial<Omit<ReferenceProfile["measured"], "accentPattern">>;
  const measured: ReferenceProfile["measured"] = {
    ...distributions,
    accentPattern: blendVectors(normalized.map((item) => ({ vector: item.profile.measured.accentPattern, weight: item.weight }))),
  };
  return {
    id, version: "blend-0.1", builtAt: new Date().toISOString(), group: id,
    referenceIds: [...new Set(normalized.flatMap((item) => item.profile.referenceIds))], measured,
    human: {}, contributions: {}, styleProfile,
  };
}

function blendDistribution(items: Array<WeightedProfile<Distribution>>): Distribution {
  const scalar = (read: (distribution: Distribution) => number) => items.reduce((sum, item) => sum + read(item.profile) * item.weight, 0);
  return { count: Math.round(scalar((d) => d.count)), min: scalar((d) => d.min), max: scalar((d) => d.max), median: scalar((d) => d.median), mean: scalar((d) => d.mean), weightedMean: scalar((d) => d.weightedMean ?? d.mean), standardDeviation: scalar((d) => d.standardDeviation), p25: scalar((d) => d.p25), p75: scalar((d) => d.p75) };
}
function normalize<T>(items: Array<WeightedProfile<T>>) { const positive = items.filter((item) => item.weight > 0); const total = positive.reduce((sum, item) => sum + item.weight, 0); return positive.map((item) => ({ ...item, weight: item.weight / total })); }
function mapScalars<T extends object>(source: T, value: (key: keyof T) => number) { return Object.fromEntries(Object.keys(source).map((key) => [key, value(key as keyof T)])) as { [K in keyof T]: number }; }
function blendVectors(items: Array<{ vector: number[]; weight: number }>) { const length = Math.max(0, ...items.map((item) => item.vector.length)); return Array.from({ length }, (_, index) => items.reduce((sum, item) => sum + (item.vector[index] ?? 0) * item.weight, 0)); }
