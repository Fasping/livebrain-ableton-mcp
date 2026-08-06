import type { StyleProfile } from "../music-brain/style-profile.js";

export const ratingKeys = [
  "groove", "drums", "bass", "arrangement", "weirdness", "hypnosis",
  "darkness", "electro", "progressive", "space", "cheese", "overallReferenceValue",
] as const;

export type RatingKey = (typeof ratingKeys)[number];
export type HumanRatings = Partial<Record<RatingKey, number>>;

export interface ReferenceMetadata {
  title: string;
  artist?: string;
  release?: string;
  label?: string;
  year?: number;
  groups: string[];
  tags: string[];
  sourceFileName: string;
}

export interface RhythmFeatures {
  onsetCount: number;
  onsetDensity: number;
  estimatedBpm: number | null;
  beatRelativeOnsetHistogram: number[];
  syncopationProxy: number;
  repetition: number;
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
  version: 1;
  createdAt: string;
  updatedAt: string;
  metadata: ReferenceMetadata;
  measured?: MeasuredAudioFeatures;
  human: { ratings: HumanRatings; notes?: string };
}

export interface Distribution {
  count: number;
  min: number;
  max: number;
  median: number;
  mean: number;
  standardDeviation: number;
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
  styleProfile: StyleProfile;
}

export interface ProfileComparison {
  profileId: string;
  measuredFacts: Array<{ metric: string; value: number | string; profileRange?: [number, number] }>;
  heuristics: Array<{ area: string; observation: string; confidence: number }>;
  subjectiveHumanLabels: Array<{ label: string; median: number; referenceCount: number }>;
  unavailable: string[];
}
