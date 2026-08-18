import type { MidiNote, TrackMixerInput } from "../ableton/types.js";
import type { StyleProfile } from "../music-brain/style-profile.js";
import type { ResolvedStyleComponent, StyleComponentSource } from "../style/style-resolver.js";
import type { PackGeneratorKind, TrackSynthesisRecipe } from "../packs/types.js";

export type ProductionGenre = string;
export type TrackRole = string;

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
  pack: {
    id: string;
    name: string;
    version: string;
    source: "built-in" | "user";
    selectionReason: string;
    matchedAliases: string[];
    variant?: {
      id: string;
      name: string;
      description: string;
      selectionReason: string;
      matchedAliases: string[];
      reviewVocabulary: string[];
      productionPractices: string[];
    };
  };
  style: {
    id: string;
    name: string;
    source: StyleComponentSource;
    needsAudioAnalysis: boolean;
    components: ResolvedStyleComponent[];
    explanation: string[];
    personalization: { applied: boolean; evidenceCount: number; adjustments: string[] };
  };
  sections: ProductionSection[];
  mixTargets: {
    headroomDb: number;
    sidechainRequested: boolean;
    spectralAnalysisRequired: boolean;
  };
}

export interface ProductionClipPlan {
  slotIndex: number;
  name: string;
  sectionName: string;
  notes: MidiNote[];
  arrangementPositions: number[];
}

export interface ProductionTrackPlan {
  role: TrackRole;
  generator: PackGeneratorKind;
  name: string;
  color: number;
  notes: MidiNote[];
  instrumentQueries: string[];
  effectQueries: string[];
  synthesis?: TrackSynthesisRecipe;
  mixer: TrackMixerInput;
  arrangementPositions: number[];
  clips: ProductionClipPlan[];
}

export interface ProductionPlan {
  brief: ProductionBrief;
  styleProfile: StyleProfile;
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
