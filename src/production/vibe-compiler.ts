import type { ProductionBrief, ProductionGenre, ProductionSection, TrackRole } from "./types.js";
import type { StyleProfile } from "../music-brain/style-profile.js";

const roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const allRoles: TrackRole[] = ["kick", "hats", "percussion", "bass", "chords", "lead", "texture", "fx"];

export interface CompileVibeOptions {
  bars?: number;
  seed?: number;
  bpm?: number;
  rootNote?: number;
  styleProfile?: StyleProfile;
  styleSource?: ProductionBrief["style"]["source"];
  styleNeedsAudioAnalysis?: boolean;
}

export function compileVibe(prompt: string, options: CompileVibeOptions = {}): ProductionBrief {
  const text = prompt.toLowerCase();
  const genre = detectGenre(text);
  const dark = has(text, "dark", "oscuro", "sinister", "amenaz", "teneb") || genre === "minimal" || genre === "techno";
  const dreamy = has(text, "dream", "soñ", "espacial", "atmos", "floating", "flotante");
  const energetic = has(text, "energy", "energ", "peak", "festival", "potente", "agresiv");
  const weird = has(text, "weird", "raro", "quirky", "alien", "extrañ") || has(text, "binh", "cabaret");
  const bars = normalizeBars(options.bars ?? (genre === "pop" ? 112 : genre === "ambient" ? 96 : 128));
  const defaults = genreDefaults(genre);
  const style = options.styleProfile;
  const bpm = options.bpm ?? style?.tempo.preferred ?? defaults.bpm;
  const rootNote = options.rootNote ?? (dark ? 2 : dreamy ? 7 : defaults.rootNote);
  const mode = dark ? (genre === "minimal" ? "Dorian" : genre === "techno" ? "Phrygian" : "Minor") : dreamy ? "Lydian" : defaults.mode;
  const traits = {
    darkness: dark ? .82 : genre === "lofi" ? .55 : .3,
    energy: energetic ? .85 : genre === "ambient" ? .2 : genre === "minimal" ? .58 : .65,
    weirdness: weird ? Math.max(.88, style?.timbre.weirdness ?? 0) : style?.timbre.weirdness ?? (genre === "pop" ? .18 : .45),
    space: dreamy || genre === "ambient" ? Math.max(.88, style?.mix.space ?? 0) : style?.mix.space ?? (genre === "minimal" ? .72 : .48),
    swing: style?.rhythm.swing ?? (genre === "lofi" ? .42 : genre === "minimal" ? .18 : genre === "house" ? .1 : .04),
  };
  return {
    title: titleFromPrompt(prompt), prompt, genre, bpm, rootNote, rootName: roots[rootNote]!, mode,
    bars, clipBars: 16, seed: options.seed ?? 1, traits,
    style: {
      id: style?.id ?? "generic",
      name: style?.name ?? `Generic ${genre}`,
      source: options.styleSource ?? (style ? "curated" : "default"),
      needsAudioAnalysis: options.styleNeedsAudioAnalysis ?? Boolean(style),
    },
    sections: buildSections(bars, genre),
    mixTargets: { headroomDb: -6, sidechainRequested: ["minimal", "house", "techno"].includes(genre), spectralAnalysisRequired: true },
  };
}

function detectGenre(text: string): ProductionGenre {
  if (has(text, "binh", "cabaret", "microhouse", "rominimal", "minimal")) return "minimal";
  if (has(text, "trap", "808", "drill")) return "trap";
  if (has(text, "lo-fi", "lofi", "chillhop", "boom bap")) return "lofi";
  if (has(text, "ambient", "cinematic", "cinemat", "soundscape")) return "ambient";
  if (has(text, "techno")) return "techno";
  if (has(text, "pop", "coro", "chorus")) return "pop";
  return "house";
}

function genreDefaults(genre: ProductionGenre) {
  switch (genre) {
    case "minimal": return { bpm: 130, rootNote: 2, mode: "Dorian" as const };
    case "house": return { bpm: 125, rootNote: 9, mode: "Dorian" as const };
    case "techno": return { bpm: 132, rootNote: 2, mode: "Phrygian" as const };
    case "trap": return { bpm: 144, rootNote: 0, mode: "Minor" as const };
    case "lofi": return { bpm: 82, rootNote: 9, mode: "Minor" as const };
    case "pop": return { bpm: 116, rootNote: 0, mode: "Major" as const };
    case "ambient": return { bpm: 76, rootNote: 7, mode: "Lydian" as const };
  }
}

function buildSections(totalBars: number, genre: ProductionGenre): ProductionSection[] {
  if (genre === "ambient") {
    return sectionalize(totalBars, [
      ["Emergence", 16, ["texture", "chords", "fx"], .2],
      ["Expansion", 24, ["texture", "chords", "lead", "fx"], .45],
      ["Pulse", 24, ["kick", "hats", "bass", "chords", "lead", "texture"], .65],
      ["Dissolve", 16, ["chords", "texture", "fx"], .25],
    ]);
  }
  return sectionalize(totalBars, [
    ["Intro", 16, ["hats", "percussion", "texture", "fx"], .25],
    ["Groove", 16, ["kick", "hats", "percussion", "bass", "chords"], .55],
    ["Main A", 32, allRoles, .78],
    ["Break", 16, ["chords", "lead", "texture", "fx"], .35],
    ["Main B", 32, allRoles, .9],
    ["Outro", 16, ["kick", "hats", "percussion", "bass", "texture"], .35],
  ]);
}

function sectionalize(totalBars: number, template: Array<[string, number, TrackRole[], number]>): ProductionSection[] {
  const templateBars = template.reduce((sum, [, bars]) => sum + bars, 0);
  let startBar = 0;
  return template.map(([name, nominalBars, activeRoles, energy], index) => {
    const end = index === template.length - 1 ? totalBars : Math.round((startBar + nominalBars * totalBars / templateBars) / 8) * 8;
    const bars = Math.max(8, end - startBar);
    const section = { name, startBar, bars, activeRoles, energy };
    startBar += bars;
    return section;
  });
}

function normalizeBars(value: number) { return Math.max(64, Math.min(512, Math.round(value / 8) * 8)); }
function has(text: string, ...needles: string[]) { return needles.some((needle) => text.includes(needle)); }
function titleFromPrompt(prompt: string) { const value = prompt.trim().replace(/\s+/g, " "); return value.length > 56 ? `${value.slice(0, 53)}...` : value || "LiveBrain Production"; }
