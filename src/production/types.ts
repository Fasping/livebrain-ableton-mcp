import type { MidiNote, TrackMixerInput } from "../ableton/types.js";

export type ProductionGenre = "minimal" | "house" | "techno" | "trap" | "lofi" | "pop" | "ambient";
export type TrackRole = "kick" | "hats" | "percussion" | "bass" | "chords" | "lead" | "texture" | "fx";

export interface ProductionSection {
  name: string;
  startBar: number;
  bars: number;
  activeRoles: TrackRole[];
  energy: number;
}

export interface ProductionBrief {
  title: string;
  prompt: string;
  genre: ProductionGenre;
  bpm: number;
  rootNote: number;
  rootName: string;
  mode: "Major" | "Minor" | "Dorian" | "Phrygian" | "Lydian" | "Mixolydian";
  bars: number;
  clipBars: number;
  seed: number;
  traits: {
    darkness: number;
    energy: number;
    weirdness: number;
    space: number;
    swing: number;
  };
  sections: ProductionSection[];
  mixTargets: {
    headroomDb: number;
    sidechainRequested: boolean;
    spectralAnalysisRequired: boolean;
  };
}

export interface ProductionTrackPlan {
  role: TrackRole;
  name: string;
  color: number;
  notes: MidiNote[];
  instrumentQueries: string[];
  effectQueries: string[];
  mixer: TrackMixerInput;
  arrangementPositions: number[];
}

export interface ProductionPlan {
  brief: ProductionBrief;
  tracks: ProductionTrackPlan[];
  limitations: string[];
}

export interface ProductionExecutionResult {
  plan: ProductionPlan;
  dryRun: boolean;
  trackIndices: Partial<Record<TrackRole, number>>;
  changes: unknown[];
  loadedDevices: Array<{ trackIndex: number; role: TrackRole; query: string; item?: string }>;
  warnings: string[];
}
