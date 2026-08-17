import type { MidiNote } from "../ableton/types.js";
import { generateBass } from "../music-brain/bass-generator.js";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { generateHarmony } from "../music-brain/harmony-generator.js";
import { generateMelody } from "../music-brain/melody-generator.js";
import { mutateNotes } from "../music-brain/mutation-engine.js";
import { generateSequence } from "../music-brain/sequence-generator.js";
import type { StyleProfile } from "../music-brain/style-profile.js";
import { getDefaultStylePackRegistry } from "../packs/registry.js";
import type { StylePackTrack } from "../packs/types.js";
import { resolveCuratedStyleMix, type StyleResolution } from "../style/style-resolver.js";
import { compileVibe, type CompileVibeOptions } from "./vibe-compiler.js";
import type { ProductionClipPlan, ProductionPlan, ProductionTrackPlan } from "./types.js";

export function planProduction(prompt: string, options: CompileVibeOptions = {}): ProductionPlan {
  const packResolution = options.packResolution ?? getDefaultStylePackRegistry().resolve(prompt, options.packId);
  const automatic = options.styleProfile ? undefined : curatedResolutionForPack(prompt, packResolution.pack.profileIds);
  const resolution = automatic ?? packStyleResolution(packResolution.pack.profile);
  const styleProfile = options.styleProfile ?? resolution.profile;
  const components = options.styleComponents ?? (options.styleProfile ? [{
    id: styleProfile.id, name: styleProfile.name, source: options.styleSource ?? "reference-profile" as const,
    weight: 1, matchedAliases: [], needsAudioAnalysis: options.styleNeedsAudioAnalysis ?? false, weightReason: "explicit profile",
  }] : resolution.components);
  const brief = compileVibe(prompt, {
    ...options, packResolution, styleProfile,
    styleSource: options.styleSource ?? resolution.source,
    styleNeedsAudioAnalysis: options.styleNeedsAudioAnalysis ?? resolution.needsAudioAnalysis,
    styleComponents: components,
    styleExplanation: options.styleExplanation ?? resolution.explanation,
  });
  const drumNotes = generateDrumGroove(styleProfile, { bars: brief.clipBars, seed: brief.seed, pattern: packResolution.pack.drumPattern });
  const tracks = packResolution.pack.tracks.map((definition, index) => {
    const notes = generateTrackNotes(definition, index, drumNotes, brief, styleProfile);
    return trackPlan(definition, notes, brief, styleProfile, index);
  });
  return {
    brief, styleProfile: structuredClone(styleProfile), tracks,
    limitations: [
      "LiveBrain creates MIDI guide parts; realistic vocals, guitars and acoustic performances still require suitable installed instruments or recorded audio.",
      "EQ and compression chains are role-aware starting points; adaptive frequency cleanup requires measured audio.",
      "Sidechain intent is included in the mix plan, but sidechain input routing is not consistently exposed by Live's Python API.",
      "Instrument selection uses the best matching device installed in the local Ableton browser and may use a fallback.",
    ],
  };
}

function curatedResolutionForPack(prompt: string, allowedIds: string[] | undefined) {
  if (!allowedIds?.length) return undefined;
  const result = resolveCuratedStyleMix(prompt);
  return result?.components.every((component) => allowedIds.includes(component.id)) ? result : undefined;
}

function packStyleResolution(profile: StyleProfile): StyleResolution {
  return {
    profile: structuredClone(profile), source: "pack", needsAudioAnalysis: false,
    components: [{ id: profile.id, name: profile.name, source: "pack", weight: 1, matchedAliases: [], needsAudioAnalysis: false, weightReason: "selected style pack default" }],
    explanation: [`Using the '${profile.name}' profile supplied by the selected style pack.`],
  };
}

function generateTrackNotes(definition: StylePackTrack, index: number, drums: MidiNote[], brief: ReturnType<typeof compileVibe>, style: StyleProfile): MidiNote[] {
  const legacyRole = ["kick", "hats", "percussion", "bass", "chords", "lead", "texture", "fx"].includes(definition.role);
  const seed = brief.seed + (legacyRole ? 0 : roleSeed(definition.role, index));
  let notes: MidiNote[];
  switch (definition.generator) {
    case "kick": notes = drums.filter((note) => note.pitch === 36); break;
    case "hats": notes = drums.filter((note) => note.pitch === 42 || note.pitch === 46); break;
    case "percussion": notes = drums.filter((note) => ![36, 42, 46].includes(note.pitch)); break;
    case "drums": notes = drums; break;
    case "bass": notes = generateBass(style, { bars: brief.clipBars, seed: seed + 11, rootMidi: 36 + brief.rootNote, motifLength: style.sequence.cycleSteps }); break;
    case "harmony": notes = generateHarmony({ bars: brief.clipBars, seed: seed + 21, rootMidi: 48 + brief.rootNote, mode: brief.mode, sparse: style.rhythm.silence > .52 }); break;
    case "melody": notes = generateMelody({ bars: brief.clipBars, seed: seed + 31, rootMidi: 60 + brief.rootNote, mode: brief.mode, density: Math.max(.12, style.sequence.density), weirdness: brief.traits.weirdness }); break;
    case "sequence": notes = generateSequence(style, { bars: brief.clipBars, seed: seed + 41, rootMidi: 60 + brief.rootNote }); break;
    case "texture": notes = generateHarmony({ bars: brief.clipBars, seed: seed + 41, rootMidi: 36 + brief.rootNote, mode: brief.mode, sparse: false }).filter((_, noteIndex) => noteIndex % 3 === 0).map((note) => ({ ...note, duration: Math.max(4, note.duration), velocity: Math.max(38, note.velocity - 20) })); break;
    case "fx": notes = generateSequence(style, { bars: brief.clipBars, seed: seed + 51, kind: "oneShot", rootMidi: 72 + brief.rootNote }).filter((_, noteIndex) => noteIndex % 5 === 0); break;
  }
  if (!notes.length) {
    const pitch = definition.generator === "bass" ? 36 + brief.rootNote : definition.generator === "kick" || definition.generator === "drums" ? 36 : 60 + brief.rootNote;
    notes = [{ pitch, start: 0, duration: definition.generator === "texture" || definition.generator === "harmony" ? 4 : .5, velocity: 72 }];
  }
  if (!definition.pitchOffset) return notes;
  return notes.map((note) => ({ ...note, pitch: Math.max(0, Math.min(127, note.pitch + definition.pitchOffset!)) }));
}

function roleSeed(role: string, index: number) {
  return [...role].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, index + 1);
}

function trackPlan(definition: StylePackTrack, notes: MidiNote[], brief: ReturnType<typeof compileVibe>, style: StyleProfile, roleIndex: number): ProductionTrackPlan {
  const arrangementPositions: number[] = [];
  const clips: ProductionClipPlan[] = [];
  for (const [sectionIndex, section] of brief.sections.entries()) {
    if (!section.activeRoles.includes(definition.role)) continue;
    const positions: number[] = [];
    for (let bar = section.startBar; bar < section.startBar + section.bars; bar += brief.clipBars) {
      positions.push(bar * 4);
      arrangementPositions.push(bar * 4);
    }
    const amount = Math.min(.9, style.arrangement.evolutionRate + (1 - section.energy) * style.arrangement.subtraction * .35 + sectionIndex * .035);
    const mutated = mutateNotes(notes, {
      amount, seed: brief.seed + 101 + sectionIndex * 97 + roleIndex * 997,
      preservePitches: definition.generator === "kick" ? [36] : [],
    });
    clips.push({
      slotIndex: sectionIndex, name: `${definition.name} · ${section.name}`, sectionName: section.name,
      notes: mutated.length ? mutated : notes.map((note) => ({ ...note })), arrangementPositions: positions,
    });
  }
  return { ...structuredClone(definition), notes, arrangementPositions, clips };
}
