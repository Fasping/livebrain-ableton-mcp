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
}

export interface StylePackSection {
  name: string;
  bars: number;
  activeRoles: string[];
  energy: number;
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
  matchedAliases: string[];
  reason: string;
}

export interface StylePackDiagnostic {
  path: string;
  message: string;
}
