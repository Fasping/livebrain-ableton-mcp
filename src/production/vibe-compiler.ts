import type { ProductionBrief, ProductionGenre, ProductionSection, TrackRole } from "./types.js";
import type { StyleProfile } from "../music-brain/style-profile.js";
import type { ResolvedStyleComponent } from "../style/style-resolver.js";
import type { StylePackResolution } from "../packs/types.js";
import { resolveVariantSections } from "../packs/variant.js";

const roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export interface CompileVibeOptions {
  bars?: number;
  seed?: number;
  bpm?: number;
  rootNote?: number;
  styleProfile?: StyleProfile;
  styleSource?: ProductionBrief["style"]["source"];
  styleNeedsAudioAnalysis?: boolean;
  styleComponents?: ResolvedStyleComponent[];
  styleExplanation?: string[];
  stylePersonalization?: ProductionBrief["style"]["personalization"];
  packId?: string;
  packResolution?: StylePackResolution;
}

export function compileVibe(prompt: string, options: CompileVibeOptions = {}): ProductionBrief {
  const text = prompt.toLowerCase();
  if (!options.packResolution) throw new Error("compileVibe requires a resolved style pack");
  const pack = options.packResolution.pack;
  const variant = options.packResolution.variant;
  const genre = detectGenre(text, pack.genres, pack.defaultGenre);
  const dark = has(text, "dark", "oscuro", "sinister", "amenaz", "teneb") || genre === "minimal" || genre === "techno";
  const dreamy = has(text, "dream", "soñ", "espacial", "atmos", "floating", "flotante");
  const energetic = has(text, "energy", "energ", "peak", "festival", "potente", "agresiv");
  const weird = has(text, "weird", "raro", "quirky", "alien", "extrañ") || has(text, "binh", "cabaret");
  const bars = normalizeBars(options.bars ?? pack.defaultBars);
  const style = options.styleProfile;
  const bpm = options.bpm ?? style?.tempo.preferred ?? pack.profile.tempo.preferred;
  const rootNote = options.rootNote ?? variant?.defaultRootNote ?? (dark ? 2 : dreamy ? 7 : pack.defaultRootNote);
  const mode = variant?.defaultMode ?? (dark ? (genre === "minimal" ? "Dorian" : genre === "techno" ? "Phrygian" : "Minor") : dreamy ? "Lydian" : pack.defaultMode);
  const traits = {
    darkness: dark ? .82 : genre === "lofi" ? .55 : .3,
    energy: energetic ? .85 : genre === "ambient" ? .2 : genre === "minimal" ? .58 : .65,
    weirdness: weird ? Math.max(.88, style?.timbre.weirdness ?? 0) : style?.timbre.weirdness ?? (genre === "pop" ? .18 : .45),
    space: dreamy || genre === "ambient" ? Math.max(.88, style?.mix.space ?? 0) : style?.mix.space ?? (genre === "minimal" ? .72 : .48),
    swing: style?.rhythm.swing ?? (genre === "lofi" ? .42 : genre === "minimal" ? .18 : genre === "house" ? .1 : .04),
  };
  return {
    title: titleFromPrompt(prompt), prompt, genre, bpm, rootNote, rootName: roots[rootNote]!, mode,
    bars, clipBars: variant?.clipBars ?? pack.clipBars, seed: options.seed ?? 1, traits,
    pack: {
      id: pack.id, name: pack.name, version: pack.version, source: pack.source,
      selectionReason: options.packResolution.reason, matchedAliases: options.packResolution.matchedAliases,
      variant: variant ? {
        id: variant.id, name: variant.name, description: variant.description,
        selectionReason: options.packResolution.variantReason ?? "selected pack variant",
        matchedAliases: options.packResolution.matchedVariantAliases,
        reviewVocabulary: [...variant.reviewVocabulary], productionPractices: [...variant.productionPractices],
      } : undefined,
    },
    style: {
      id: style?.id ?? "generic",
      name: style?.name ?? `Generic ${genre}`,
      source: options.styleSource ?? (style ? "curated" : "default"),
      needsAudioAnalysis: options.styleNeedsAudioAnalysis ?? Boolean(style),
      components: structuredClone(options.styleComponents ?? []),
      explanation: [...(options.styleExplanation ?? [])],
      personalization: options.stylePersonalization ?? { applied: false, evidenceCount: 0, adjustments: [] },
    },
    sections: sectionalize(bars, resolveVariantSections(options.packResolution).map((section) => [section.name, section.bars, section.activeRoles, section.energy])),
    mixTargets: structuredClone(pack.mixTargets),
  };
}

function detectGenre(text: string, genres: string[], fallback: string): ProductionGenre {
  return [...genres].sort((a, b) => b.length - a.length).find((genre) => has(text, genre.toLowerCase())) ?? fallback;
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
