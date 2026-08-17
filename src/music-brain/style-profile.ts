export interface StyleProfile {
  id: string;
  version: string;
  name: string;
  tempo: { min: number; max: number; preferred: number };
  rhythm: {
    density: number;
    syncopation: number;
    swing: number;
    microtiming: number;
    repetition: number;
    mutationRate: number;
    silence: number;
    predictability: number;
  };
  drums: { kickWeight: number; hatDensity: number; ghostDensity: number; electroInfluence: number };
  bass: { density: number; chromaticism: number; tonalStability: number; rests: number; register: [number, number] };
  sequence: { density: number; cycleSteps: number; chromaticism: number; chordProbability: number; rareEventProbability: number; register: [number, number] };
  timbre: { weirdness: number; brightness: number; rawness: number; digital: number };
  arrangement: { evolutionRate: number; subtraction: number; cycleBars: number[] };
  mix: { loudness: number; lowEnd: number; brightness: number; space: number };
  constraints: string[];
  negativeTraits: string[];
}

export const generalStyleProfile: StyleProfile = {
  id: "general_songwriting", version: "1.0", name: "General Songwriting",
  tempo: { min: 70, max: 150, preferred: 110 },
  rhythm: { density: .48, syncopation: .4, swing: .08, microtiming: .08, repetition: .65, mutationRate: .2, silence: .35, predictability: .55 },
  drums: { kickWeight: .55, hatDensity: .48, ghostDensity: .18, electroInfluence: .15 },
  bass: { density: .4, chromaticism: .18, tonalStability: .72, rests: .38, register: [28, 48] },
  sequence: { density: .4, cycleSteps: 8, chromaticism: .18, chordProbability: .45, rareEventProbability: .08, register: [48, 79] },
  timbre: { weirdness: .3, brightness: .5, rawness: .35, digital: .4 },
  arrangement: { evolutionRate: .35, subtraction: .45, cycleBars: [4, 8, 16, 32] },
  mix: { loudness: .55, lowEnd: .55, brightness: .5, space: .45 },
  constraints: ["serve-the-prompt", "leave-headroom"], negativeTraits: ["genre-assumptions", "over-arrangement"],
};

export const afterhours2019: StyleProfile = {
  id: "afterhours_2019",
  version: "0.1",
  name: "Afterhours 2019",
  tempo: { min: 126, max: 134, preferred: 130 },
  rhythm: {
    density: 0.36, syncopation: 0.78, swing: 0.12, microtiming: 0.22,
    repetition: 0.82, mutationRate: 0.24, silence: 0.58, predictability: 0.28,
  },
  drums: { kickWeight: 0.42, hatDensity: 0.33, ghostDensity: 0.18, electroInfluence: 0.35 },
  bass: { density: 0.31, chromaticism: 0.42, tonalStability: 0.38, rests: 0.55, register: [28, 48] },
  sequence: { density: 0.24, cycleSteps: 7, chromaticism: 0.58, chordProbability: 0.12, rareEventProbability: 0.08, register: [48, 78] },
  timbre: { weirdness: 0.85, brightness: 0.38, rawness: 0.62, digital: 0.58 },
  arrangement: { evolutionRate: 0.2, subtraction: 0.72, cycleBars: [2, 4, 8, 16, 32, 64] },
  mix: { loudness: 0.48, lowEnd: 0.62, brightness: 0.35, space: 0.72 },
  constraints: ["prefer-space", "mutation-over-novelty", "avoid-eight-bar-obligation"],
  negativeTraits: [
    "generic-tech-house", "constant-rolling-bass", "edm-risers", "festival-rolls",
    "supersaws", "obvious-drops", "perfect-quantization", "overfilled-percussion",
  ],
};

export const defaultStyleProfile = generalStyleProfile;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
