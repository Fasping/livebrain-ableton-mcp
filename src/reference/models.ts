import type { StyleProfile } from "../music-brain/style-profile.js";

export const ratingKeys = [
  "groove", "drums", "bass", "synth", "arrangement", "weirdness", "hypnosis",
  "darkness", "electro", "progressive", "space", "rawness", "subtlety",
  "predictability", "cheese", "overallReferenceValue",
] as const;

export type RatingKey = (typeof ratingKeys)[number];
export type HumanRatings = Partial<Record<RatingKey, number>>;

export const influenceKeys = [
  "groove", "drums", "bass", "synth", "sequence", "arrangement", "timbre",
  "harmony", "space", "rawness", "weirdness", "hypnosis", "electro", "progressive",
] as const;
export type InfluenceKey = (typeof influenceKeys)[number];
export type ReferenceInfluence = Partial<Record<InfluenceKey, number>>;

export interface ReferenceMetadata {
  title: string;
  artist?: string;
  release?: string;
  label?: string;
  catalog?: string;
  year?: number;
  groups: string[];
  tags: string[];
  sourceFileName: string;
}

export interface RhythmFeatures {
  onsetCount: number;
  onsetDensity: number;
  estimatedBpm: number | null;
  bpmConfidence: number;
  beatRelativeOnsetHistogram: number[];
  syncopationProxy: number;
  repetition: number;
  onsetRegularity: number;
  predictabilityProxy: number;
  microtimingMeanMs: number | null;
  microtimingStdMs: number | null;
  silenceRatio: number;
  accentPattern: number[];
  longCycleVariation: number;
}

export interface MeasuredAudioFeatures {
  analyzer: string;
  analyzerVersion: string;
  analyzedAt: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  rhythm: RhythmFeatures;
  dynamics: { rms: number; peak: number; crestFactor: number };
}

export interface ReferenceTrack {
  id: string;
  version: 2;
  createdAt: string;
  updatedAt: string;
  metadata: ReferenceMetadata;
  measured?: MeasuredAudioFeatures;
  human: { ratings: HumanRatings; notes: string[] };
  influence: ReferenceInfluence;
  sourceConfidence?: "low" | "medium" | "medium-high" | "high";
  needsHumanReview?: boolean;
  needsAudioAnalysis?: boolean;
}

export interface Distribution {
  count: number;
  min: number;
  max: number;
  median: number;
  mean: number;
  standardDeviation: number;
  p25: number;
  p75: number;
  weightedMean?: number;
}

export interface ReferenceProfile {
  id: string;
  version: string;
  builtAt: string;
  group: string;
  referenceIds: string[];
  measured: {
    bpm?: Distribution;
    onsetDensity?: Distribution;
    syncopation?: Distribution;
    repetition?: Distribution;
    microtimingStdMs?: Distribution;
    silenceRatio?: Distribution;
    longCycleVariation?: Distribution;
    accentPattern: number[];
  };
  human: Partial<Record<RatingKey, Distribution>>;
  contributions: Partial<Record<InfluenceKey, Array<{ referenceId: string; title: string; weight: number; percentage: number }>>>;
  styleProfile: StyleProfile;
}

export interface ProfileComparison {
  profileId: string;
  measuredFacts: Array<{ metric: string; value: number | string; profileRange?: [number, number] }>;
  heuristics: Array<{ area: string; observation: string; confidence: number }>;
  subjectiveHumanLabels: Array<{ label: string; median: number; referenceCount: number }>;
  unavailable: string[];
}
