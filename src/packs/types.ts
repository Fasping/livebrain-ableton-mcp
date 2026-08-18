import type { TrackMixerInput } from "../ableton/types.js";
import type { StyleProfile } from "../music-brain/style-profile.js";

export type PackGeneratorKind = "kick" | "hats" | "percussion" | "drums" | "bass" | "harmony" | "melody" | "sequence" | "texture" | "fx";
export type MusicalMode = "Major" | "Minor" | "Dorian" | "Phrygian" | "Lydian" | "Mixolydian";
export type DrumPattern = "four-on-floor" | "broken" | "backbeat" | "half-time";

export interface StylePackTrack {
  role: string;
  name: string;
  color: number;
  generator: PackGeneratorKind;
  instrumentQueries: string[];
  effectQueries: string[];
  mixer: TrackMixerInput;
  pitchOffset?: number;
  synthesis?: TrackSynthesisRecipe;
}

export interface TrackParameterHint {
  namePatterns: string[];
  normalizedValue: number;
  purpose: string;
}

export interface TrackSynthesisRecipe {
  architecture: string;
  oscillator: string;
  filter: string;
  modulation: string[];
  processing: string[];
  parameterHints?: TrackParameterHint[];
}

export interface StylePackSection {
  name: string;
  bars: number;
  activeRoles: string[];
  energy: number;
}

export type StyleProfileOverride = {
  tempo?: Partial<StyleProfile["tempo"]>;
  rhythm?: Partial<StyleProfile["rhythm"]>;
  drums?: Partial<StyleProfile["drums"]>;
  bass?: Partial<StyleProfile["bass"]>;
  sequence?: Partial<StyleProfile["sequence"]>;
  timbre?: Partial<StyleProfile["timbre"]>;
  arrangement?: Partial<StyleProfile["arrangement"]>;
  mix?: Partial<StyleProfile["mix"]>;
  constraints?: string[];
  negativeTraits?: string[];
};

export interface StylePackTrackOverride {
  role: string;
  name?: string;
  instrumentQueries?: string[];
  effectQueries?: string[];
  mixer?: TrackMixerInput;
  pitchOffset?: number;
  synthesis?: TrackSynthesisRecipe;
}

export interface StylePackVariant {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  priority?: number;
  defaultRootNote?: number;
  defaultMode?: MusicalMode;
  clipBars?: number;
  drumPattern?: DrumPattern;
  profileOverride?: StyleProfileOverride;
  trackOverrides?: StylePackTrackOverride[];
  sections?: StylePackSection[];
  reviewVocabulary: string[];
  productionPractices: string[];
}

export interface StylePack {
  schemaVersion: 1;
  id: string;
  version: string;
  name: string;
  description: string;
  aliases: string[];
  genres: string[];
  priority?: number;
  defaultGenre: string;
  defaultBars: number;
  clipBars: number;
  defaultRootNote: number;
  defaultMode: MusicalMode;
  drumPattern?: DrumPattern;
  defaultVariantId?: string;
  variants?: StylePackVariant[];
  profileIds?: string[];
  profile: StyleProfile;
  tracks: StylePackTrack[];
  sections: StylePackSection[];
  mixTargets: {
    headroomDb: number;
    sidechainRequested: boolean;
    spectralAnalysisRequired: boolean;
  };
}

export interface RegisteredStylePack extends StylePack {
  source: "built-in" | "user";
  sourcePath: string;
}

export interface StylePackResolution {
  pack: RegisteredStylePack;
  variant?: StylePackVariant;
  matchedAliases: string[];
  matchedVariantAliases: string[];
  reason: string;
  variantReason?: string;
}

export interface StylePackDiagnostic {
  path: string;
  message: string;
}
