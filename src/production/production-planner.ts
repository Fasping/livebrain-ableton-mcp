import type { MidiNote } from "../ableton/types.js";
import { generateBass } from "../music-brain/bass-generator.js";
import { generateDrumGroove } from "../music-brain/drum-generator.js";
import { generateHarmony } from "../music-brain/harmony-generator.js";
import { generateMelody } from "../music-brain/melody-generator.js";
import { mutateNotes } from "../music-brain/mutation-engine.js";
import { generateSequence } from "../music-brain/sequence-generator.js";
import type { StyleProfile } from "../music-brain/style-profile.js";
import { defaultStyleResolution, resolveCuratedStyleMix } from "../style/style-resolver.js";
import { compileVibe, type CompileVibeOptions } from "./vibe-compiler.js";
import type { ProductionClipPlan, ProductionPlan, ProductionTrackPlan, TrackRole } from "./types.js";

export function planProduction(prompt: string, options: CompileVibeOptions = {}): ProductionPlan {
  const automatic = options.styleProfile ? undefined : resolveCuratedStyleMix(prompt);
  const resolution = automatic ?? defaultStyleResolution();
  const styleProfile = options.styleProfile ?? resolution.profile;
  const components = options.styleComponents ?? (options.styleProfile ? [{
    id: styleProfile.id, name: styleProfile.name, source: options.styleSource ?? "reference-profile" as const,
    weight: 1, matchedAliases: [], needsAudioAnalysis: options.styleNeedsAudioAnalysis ?? false, weightReason: "explicit profile",
  }] : resolution.components);
  const brief = compileVibe(prompt, {
    ...options,
    styleProfile,
    styleSource: options.styleSource ?? (automatic?.source ?? resolution.source),
    styleNeedsAudioAnalysis: options.styleNeedsAudioAnalysis ?? (automatic?.needsAudioAnalysis ?? resolution.needsAudioAnalysis),
    styleComponents: components,
    styleExplanation: options.styleExplanation ?? (automatic?.explanation ?? resolution.explanation),
  });
  const clipBars = brief.clipBars;
  const drums = generateDrumGroove(styleProfile, { bars: clipBars, seed: brief.seed });
  const bass = generateBass(styleProfile, { bars: clipBars, seed: brief.seed + 11, rootMidi: 36 + brief.rootNote, motifLength: styleProfile.sequence.cycleSteps });
  const chords = generateHarmony({ bars: clipBars, seed: brief.seed + 21, rootMidi: 48 + brief.rootNote, mode: brief.mode, sparse: styleProfile.rhythm.silence > .52 });
  const lead = generateMelody({ bars: clipBars, seed: brief.seed + 31, rootMidi: 60 + brief.rootNote, mode: brief.mode, density: Math.max(.12, styleProfile.sequence.density), weirdness: brief.traits.weirdness });
  const texture = generateHarmony({ bars: clipBars, seed: brief.seed + 41, rootMidi: 36 + brief.rootNote, mode: brief.mode, sparse: false }).filter((_, index) => index % 3 === 0).map((note) => ({ ...note, duration: Math.max(4, note.duration), velocity: Math.max(38, note.velocity - 20) }));
  const fx = generateSequence(styleProfile, { bars: clipBars, seed: brief.seed + 51, kind: "oneShot", rootMidi: 72 + brief.rootNote }).filter((_, index) => index % 5 === 0);
  const notesByRole: Record<TrackRole, MidiNote[]> = {
    kick: drums.filter((note) => note.pitch === 36),
    hats: drums.filter((note) => note.pitch === 42 || note.pitch === 46),
    percussion: drums.filter((note) => ![36, 42, 46].includes(note.pitch)),
    bass, chords, lead, texture, fx,
  };
  const tracks = (Object.keys(notesByRole) as TrackRole[]).map((role, index) => trackPlan(role, notesByRole[role], brief, styleProfile, index));
  return {
    brief, styleProfile: structuredClone(styleProfile),
    tracks,
    limitations: [
      "EQ and compression chains are loaded as a role-aware starting point; adaptive frequency cleanup requires measured audio.",
      "Sidechain intent is included in the mix plan, but sidechain input routing is not consistently exposed by Live's Python API.",
      "Instrument selection uses the best matching device installed in the local Ableton browser and may use a fallback.",
    ],
  };
}

function trackPlan(role: TrackRole, notes: MidiNote[], brief: ReturnType<typeof compileVibe>, style: StyleProfile, roleIndex: number): ProductionTrackPlan {
  const settings: Record<TrackRole, Omit<ProductionTrackPlan, "role" | "notes" | "arrangementPositions" | "clips">> = {
    kick: { name: "LB Kick", color: 0xff6b35, instrumentQueries: ["909 Core Kit", "Kick", "Kit", "Drum Rack"], effectQueries: ["EQ Eight", "Compressor"], mixer: { volume: .72, pan: 0 } },
    hats: { name: "LB Hats", color: 0xffb347, instrumentQueries: ["909 Core Kit", "Hihat", "Kit", "Drum Rack"], effectQueries: ["EQ Eight"], mixer: { volume: .5, pan: .14, sends: [{ sendIndex: 0, value: .08 }] } },
    percussion: { name: "LB Percussion", color: 0xffd166, instrumentQueries: ["909 Core Kit", "Percussion", "Kit", "Drum Rack"], effectQueries: ["EQ Eight"], mixer: { volume: .54, pan: -.12, sends: [{ sendIndex: 0, value: .12 }] } },
    bass: { name: "LB Bass", color: 0x7bd389, instrumentQueries: ["Drift", "Operator", "Analog", "Simpler"], effectQueries: ["EQ Eight", "Compressor"], mixer: { volume: .66, pan: 0 } },
    chords: { name: "LB Chords", color: 0x5dade2, instrumentQueries: ["Drift", "Electric", "Instrument Rack"], effectQueries: ["EQ Eight", "Compressor"], mixer: { volume: .48, pan: -.08, sends: [{ sendIndex: 0, value: .2 }, { sendIndex: 1, value: .12 }] } },
    lead: { name: "LB Lead", color: 0x9b59b6, instrumentQueries: ["Drift", "Wavetable", "Instrument Rack"], effectQueries: ["EQ Eight", "Compressor"], mixer: { volume: .5, pan: .08, sends: [{ sendIndex: 0, value: .24 }, { sendIndex: 1, value: .18 }] } },
    texture: { name: "LB Texture", color: 0x6c5ce7, instrumentQueries: ["Atmosphere", "Texture", "Drift", "Instrument Rack", "Simpler"], effectQueries: ["EQ Eight", "Reverb"], mixer: { volume: .4, pan: -.2, sends: [{ sendIndex: 0, value: .32 }, { sendIndex: 1, value: .2 }] } },
    fx: { name: "LB FX", color: 0xa29bfe, instrumentQueries: ["FX", "Noise", "Drift", "Instrument Rack", "Simpler"], effectQueries: ["EQ Eight", "Reverb"], mixer: { volume: .38, pan: .22, sends: [{ sendIndex: 0, value: .38 }, { sendIndex: 1, value: .25 }] } },
  };
  const arrangementPositions: number[] = [];
  const clips: ProductionClipPlan[] = [];
  for (const [sectionIndex, section] of brief.sections.entries()) {
    if (!section.activeRoles.includes(role)) continue;
    const positions: number[] = [];
    for (let bar = section.startBar; bar < section.startBar + section.bars; bar += brief.clipBars) {
      positions.push(bar * 4);
      arrangementPositions.push(bar * 4);
    }
    const amount = Math.min(.9, style.arrangement.evolutionRate + (1 - section.energy) * style.arrangement.subtraction * .35 + sectionIndex * .035);
    const mutated = mutateNotes(notes, {
      amount,
      seed: brief.seed + 101 + sectionIndex * 97 + roleIndex * 997,
      preservePitches: role === "kick" ? [36] : [],
    });
    clips.push({
      slotIndex: sectionIndex,
      name: `${settings[role].name} · ${section.name}`,
      sectionName: section.name,
      notes: mutated.length ? mutated : notes.map((note) => ({ ...note })),
      arrangementPositions: positions,
    });
  }
  return { role, notes, arrangementPositions, clips, ...settings[role] };
}
