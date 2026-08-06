export interface StyleProfile {
  id: string;
  name: string;
  tempo: { min: number; max: number; preferred: number };
  swing: number;
  density: number;
  velocity: { min: number; max: number };
  pitchClasses: number[];
  register: { minMidi: number; maxMidi: number };
  traits: string[];
}

export const defaultStyleProfile: StyleProfile = {
  id: "livebrain-default",
  name: "LiveBrain Default",
  tempo: { min: 124, max: 136, preferred: 130 },
  swing: 0.08,
  density: 0.58,
  velocity: { min: 72, max: 116 },
  pitchClasses: [0, 2, 3, 5, 7, 10],
  register: { minMidi: 24, maxMidi: 60 },
  traits: ["hypnotic", "raw", "evolving", "restrained"],
};
