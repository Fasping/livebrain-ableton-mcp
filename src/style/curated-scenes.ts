import { afterhours2019, type StyleProfile } from "../music-brain/style-profile.js";

export interface CuratedStyleContext {
  id: string;
  name: string;
  kind: "label" | "venue" | "scene";
  aliases: string[];
  location?: string;
  artists: string[];
  summary: string;
  sourceUrls: string[];
  confidence: "curation-only";
  needsAudioAnalysis: true;
  profile: StyleProfile;
}

function profile(id: string, name: string, changes: Partial<Omit<StyleProfile, "id" | "name">> & {
  rhythm?: Partial<StyleProfile["rhythm"]>;
  drums?: Partial<StyleProfile["drums"]>;
  bass?: Partial<StyleProfile["bass"]>;
  sequence?: Partial<StyleProfile["sequence"]>;
  timbre?: Partial<StyleProfile["timbre"]>;
  arrangement?: Partial<StyleProfile["arrangement"]>;
  mix?: Partial<StyleProfile["mix"]>;
}): StyleProfile {
  return {
    ...structuredClone(afterhours2019), ...changes, id, name,
    tempo: { ...afterhours2019.tempo, ...changes.tempo },
    rhythm: { ...afterhours2019.rhythm, ...changes.rhythm },
    drums: { ...afterhours2019.drums, ...changes.drums },
    bass: { ...afterhours2019.bass, ...changes.bass },
    sequence: { ...afterhours2019.sequence, ...changes.sequence },
    timbre: { ...afterhours2019.timbre, ...changes.timbre },
    arrangement: { ...afterhours2019.arrangement, ...changes.arrangement },
    mix: { ...afterhours2019.mix, ...changes.mix },
  };
}

export const curatedStyleContexts: CuratedStyleContext[] = [
  {
    id: "afterhours_2019", name: "Afterhours 2019", kind: "scene",
    aliases: ["afterhours", "cabaret", "time passages", "binh", "onur ozer", "onur özer"],
    artists: ["Binh", "Onur Özer"],
    summary: "Sparse, odd-cycle and mutation-led minimal/electro context with long-form afterhours pacing.",
    sourceUrls: ["https://ra.co/podcast/454", "https://seekers.net/artist/binh/"],
    confidence: "curation-only", needsAudioAnalysis: true, profile: structuredClone(afterhours2019),
  },
  {
    id: "timeless_del_garda", name: "Timeless / Francesco Del Garda", kind: "label",
    aliases: ["timeless", "francesco del garda", "del garda"], location: "Italy",
    artists: ["Francesco Del Garda"],
    summary: "Record-led, off-kilter house with spacey electro and forgotten UK-garage inflections; restrained and DJ-functional.",
    sourceUrls: [
      "https://www.fabriclondon.com/posts/audio-francesco-del-garda-gives-a-glimpse-into-his-sweeping-record-collection",
      "https://triangleagency.com/francesco-del-garda/",
    ],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("timeless_del_garda", "Timeless / Francesco Del Garda", {
      tempo: { min: 126, max: 133, preferred: 129 },
      rhythm: { density: .34, syncopation: .82, swing: .17, microtiming: .25, mutationRate: .28, silence: .61, predictability: .24 },
      drums: { kickWeight: .38, hatDensity: .3, ghostDensity: .24, electroInfluence: .48 },
      bass: { density: .27, chromaticism: .5, tonalStability: .34, rests: .62 },
      sequence: { density: .21, cycleSteps: 7, chromaticism: .64, rareEventProbability: .1 },
      timbre: { weirdness: .8, brightness: .42, rawness: .52, digital: .58 },
      arrangement: { evolutionRate: .18, subtraction: .78 }, mix: { loudness: .44, lowEnd: .58, brightness: .39, space: .76 },
    }),
  },
  {
    id: "partout_city_series", name: "Partout City Series", kind: "label",
    aliases: ["partout", "partout records", "partout city series"], location: "France",
    artists: [],
    summary: "Minimal house/electro dancefloor context with regional variation, crisp syncopation and compact hooks.",
    sourceUrls: ["https://ra.co/labels/16924", "https://www.decks.de/label/partout"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("partout_city_series", "Partout City Series", {
      tempo: { min: 127, max: 134, preferred: 130 },
      rhythm: { density: .41, syncopation: .74, swing: .14, repetition: .77, mutationRate: .27, silence: .5 },
      drums: { kickWeight: .47, hatDensity: .4, ghostDensity: .2, electroInfluence: .53 },
      bass: { density: .36, chromaticism: .4, tonalStability: .44, rests: .5 },
      sequence: { density: .29, cycleSteps: 8, chromaticism: .52, chordProbability: .14 },
      timbre: { weirdness: .67, brightness: .48, rawness: .55, digital: .64 },
      arrangement: { evolutionRate: .25, subtraction: .62 }, mix: { loudness: .53, lowEnd: .65, brightness: .46, space: .61 },
    }),
  },
  {
    id: "wicked_bass_noizar", name: "Wicked Bass / Noizar", kind: "label",
    aliases: ["wicked bass", "wickedbass", "noizar", "noisar"], location: "Kyiv, Ukraine",
    artists: ["Noizar"],
    summary: "Raw Kyiv club context: weighty low end, broken/electro pressure, dark negative space and less polished percussion.",
    sourceUrls: ["https://ra.co/labels/7705"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("wicked_bass_noizar", "Wicked Bass / Noizar", {
      tempo: { min: 126, max: 136, preferred: 131 },
      rhythm: { density: .39, syncopation: .84, swing: .08, microtiming: .2, mutationRate: .3, silence: .53, predictability: .2 },
      drums: { kickWeight: .55, hatDensity: .32, ghostDensity: .28, electroInfluence: .72 },
      bass: { density: .38, chromaticism: .56, tonalStability: .28, rests: .49 },
      sequence: { density: .25, cycleSteps: 7, chromaticism: .68, rareEventProbability: .12 },
      timbre: { weirdness: .78, brightness: .32, rawness: .82, digital: .62 },
      arrangement: { evolutionRate: .23, subtraction: .7 }, mix: { loudness: .55, lowEnd: .78, brightness: .28, space: .66 },
    }),
  },
  {
    id: "phonotheque_montevideo", name: "Phonotheque / Montevideo", kind: "scene",
    aliases: ["phonotheque", "montevideo", "z@p", "zap"], location: "Montevideo, Uruguay",
    artists: ["Z@p", "DJ Koolt"],
    summary: "Long-set Montevideo context joining hypnotic house with acid, breaks, electro bass and post-apocalyptic melodic color.",
    sourceUrls: [
      "https://ra.co/news/42365",
      "https://daily.bandcamp.com/scene-report/scene-report-techno-in-montevideo-uruguay",
      "https://trommelmusic.com/featured/dj-koolt-a-moment-in-time/",
    ],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("phonotheque_montevideo", "Phonotheque / Montevideo", {
      tempo: { min: 126, max: 134, preferred: 130 },
      rhythm: { density: .37, syncopation: .8, swing: .13, repetition: .86, mutationRate: .21, silence: .55, predictability: .23 },
      drums: { kickWeight: .46, hatDensity: .34, ghostDensity: .22, electroInfluence: .66 },
      bass: { density: .33, chromaticism: .49, tonalStability: .35, rests: .53 },
      sequence: { density: .26, cycleSteps: 7, chromaticism: .66, chordProbability: .1, rareEventProbability: .13 },
      timbre: { weirdness: .84, brightness: .34, rawness: .7, digital: .68 },
      arrangement: { evolutionRate: .17, subtraction: .74 }, mix: { loudness: .47, lowEnd: .69, brightness: .31, space: .75 },
    }),
  },
  {
    id: "cdv_hoppetosse", name: "Club der Visionaere / Hoppetosse", kind: "venue",
    aliases: ["club der visionaere", "club der visionäre", "cdv", "hoppetosse"], location: "Berlin, Germany",
    artists: ["Zip", "Binh", "Ricardo Villalobos"],
    summary: "Venue-context profile for subtle minimal house/techno, long blends, patient dynamics and selective low-density evolution.",
    sourceUrls: ["https://ra.co/news/43951", "https://www.visitberlin.de/en/ms-hoppetosse"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("cdv_hoppetosse", "Club der Visionaere / Hoppetosse", {
      tempo: { min: 125, max: 133, preferred: 129 },
      rhythm: { density: .32, syncopation: .72, swing: .16, microtiming: .28, repetition: .88, mutationRate: .18, silence: .66, predictability: .3 },
      drums: { kickWeight: .4, hatDensity: .29, ghostDensity: .17, electroInfluence: .31 },
      bass: { density: .28, chromaticism: .37, tonalStability: .43, rests: .62 },
      sequence: { density: .19, cycleSteps: 7, chromaticism: .48, chordProbability: .09, rareEventProbability: .08 },
      timbre: { weirdness: .7, brightness: .34, rawness: .57, digital: .48 },
      arrangement: { evolutionRate: .14, subtraction: .84 }, mix: { loudness: .4, lowEnd: .61, brightness: .3, space: .82 },
    }),
  },
];

export function listCuratedStyleContexts(): CuratedStyleContext[] {
  return structuredClone(curatedStyleContexts);
}

export function getCuratedStyleContext(id: string): CuratedStyleContext | undefined {
  const context = curatedStyleContexts.find((candidate) => candidate.id === id);
  return context ? structuredClone(context) : undefined;
}

export function resolveCuratedStyleContext(text: string): CuratedStyleContext | undefined {
  const normalized = text.toLowerCase();
  const candidates = curatedStyleContexts
    .flatMap((context) => context.aliases.map((alias) => ({ context, alias: alias.toLowerCase() })))
    .filter(({ alias }) => normalized.includes(alias))
    .sort((a, b) => b.alias.length - a.alias.length);
  return candidates[0] ? structuredClone(candidates[0].context) : undefined;
}
