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

type ProfileSection = "tempo" | "rhythm" | "drums" | "bass" | "sequence" | "timbre" | "arrangement" | "mix";

type CuratedProfileChanges = Partial<Omit<StyleProfile, "id" | "name" | ProfileSection>> & {
  [Section in ProfileSection]?: Partial<StyleProfile[Section]>;
};

function profile(id: string, name: string, changes: CuratedProfileChanges): StyleProfile {
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
  {
    id: "my_own_jupiter", name: "My Own Jupiter / Nicolas Lutz", kind: "label",
    aliases: ["my own jupiter", "nicolas lutz", "michelle", "sentimental stab"], location: "Germany / Uruguay",
    artists: ["Nicolas Lutz", "Michelle", "Z@p", "Binh", "Tunik"],
    summary: "Cosmic, tense and playful machine music linking Uruguayan acid/electro with obscure European club records.",
    sourceUrls: ["https://ra.co/labels/12868", "https://ra.co/news/41352"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("my_own_jupiter", "My Own Jupiter / Nicolas Lutz", {
      tempo: { min: 125, max: 135, preferred: 130 },
      rhythm: { density: .36, syncopation: .86, swing: .11, mutationRate: .3, silence: .58, predictability: .18 },
      drums: { kickWeight: .42, hatDensity: .32, ghostDensity: .27, electroInfluence: .77 },
      bass: { density: .34, chromaticism: .63, tonalStability: .25, rests: .55 },
      sequence: { density: .26, cycleSteps: 7, chromaticism: .76, rareEventProbability: .15 },
      timbre: { weirdness: .9, brightness: .38, rawness: .73, digital: .74 },
      arrangement: { evolutionRate: .26, subtraction: .72 }, mix: { loudness: .47, lowEnd: .67, brightness: .34, space: .73 },
    }),
  },
  {
    id: "yoyaku_ecosystem", name: "Yoyaku Ecosystem", kind: "label",
    aliases: ["yoyaku", "yoy", "joule imprint", "yyk no label"], location: "Paris, France",
    artists: ["Varhat", "Janeret", "Cabanne", "Zendid"],
    summary: "Broad Paris vinyl ecosystem spanning deep hypnotic house, minimal, dub and raw futuristic electro.",
    sourceUrls: ["https://www.yoyaku.fr/label.html", "https://yoyaku.io/label/yoyaku/"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("yoyaku_ecosystem", "Yoyaku Ecosystem", {
      tempo: { min: 124, max: 134, preferred: 129 },
      rhythm: { density: .4, syncopation: .73, swing: .18, repetition: .8, mutationRate: .22, silence: .49 },
      drums: { kickWeight: .46, hatDensity: .39, ghostDensity: .23, electroInfluence: .5 },
      bass: { density: .37, chromaticism: .38, tonalStability: .47, rests: .48 },
      sequence: { density: .28, cycleSteps: 8, chromaticism: .48, chordProbability: .17 },
      timbre: { weirdness: .67, brightness: .45, rawness: .56, digital: .54 },
      arrangement: { evolutionRate: .21, subtraction: .61 }, mix: { loudness: .52, lowEnd: .65, brightness: .43, space: .64 },
    }),
  },
  {
    id: "slow_life_berlin", name: "Slow Life Berlin", kind: "label",
    aliases: ["slow life", "slowlife", "s. moreira", "s moreira"], location: "Berlin, Germany",
    artists: ["S. Moreira", "Laurine", "Primary Perception", "Ethereal Logic"],
    summary: "Deep astral grooves combining broken beats, pads, acid bass, ambient passages and Detroit/electro color.",
    sourceUrls: ["https://slowlife.bandcamp.com/", "https://www.decks.de/label/slow-life"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("slow_life_berlin", "Slow Life Berlin", {
      tempo: { min: 122, max: 132, preferred: 127 },
      rhythm: { density: .38, syncopation: .8, swing: .2, microtiming: .25, repetition: .78, mutationRate: .27, silence: .52 },
      drums: { kickWeight: .38, hatDensity: .36, ghostDensity: .3, electroInfluence: .69 },
      bass: { density: .34, chromaticism: .45, tonalStability: .42, rests: .53 },
      sequence: { density: .3, cycleSteps: 8, chromaticism: .55, chordProbability: .2 },
      timbre: { weirdness: .7, brightness: .43, rawness: .52, digital: .55 },
      arrangement: { evolutionRate: .28, subtraction: .58 }, mix: { loudness: .44, lowEnd: .62, brightness: .39, space: .79 },
    }),
  },
  {
    id: "melliflow", name: "Melliflow / Vera & Alexandra", kind: "label",
    aliases: ["melliflow", "vera", "alexandra", "spacetravel"], location: "Berlin, Germany",
    artists: ["Vera", "Alexandra", "Spacetravel"],
    summary: "Spacey, swung and subtle house/techno with elastic microtiming, low-density detail and psychedelic restraint.",
    sourceUrls: ["https://ra.co/news/33727"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("melliflow", "Melliflow / Vera & Alexandra", {
      tempo: { min: 125, max: 133, preferred: 129 },
      rhythm: { density: .32, syncopation: .79, swing: .24, microtiming: .31, repetition: .84, mutationRate: .19, silence: .65 },
      drums: { kickWeight: .37, hatDensity: .29, ghostDensity: .21, electroInfluence: .42 },
      bass: { density: .27, chromaticism: .44, tonalStability: .4, rests: .64 },
      sequence: { density: .2, cycleSteps: 7, chromaticism: .57, chordProbability: .1 },
      timbre: { weirdness: .78, brightness: .4, rawness: .48, digital: .59 },
      arrangement: { evolutionRate: .16, subtraction: .82 }, mix: { loudness: .39, lowEnd: .58, brightness: .35, space: .84 },
    }),
  },
  {
    id: "pressure_traxx", name: "Pressure Traxx", kind: "label",
    aliases: ["pressure traxx", "pressuretraxx", "ptx", "frost and arno"], location: "Offenbach, Germany",
    artists: ["Frost", "Arno", "Christian AB", "Transparent Sound"],
    summary: "Direct acid, house and techno roots with solid low-end pressure, machine funk and an unpolished club focus.",
    sourceUrls: ["https://pressuretraxx.bandcamp.com/"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("pressure_traxx", "Pressure Traxx", {
      tempo: { min: 126, max: 136, preferred: 131 },
      rhythm: { density: .43, syncopation: .76, swing: .12, repetition: .76, mutationRate: .25, silence: .46 },
      drums: { kickWeight: .56, hatDensity: .41, ghostDensity: .26, electroInfluence: .62 },
      bass: { density: .4, chromaticism: .5, tonalStability: .35, rests: .45 },
      sequence: { density: .3, cycleSteps: 8, chromaticism: .62, rareEventProbability: .11 },
      timbre: { weirdness: .7, brightness: .39, rawness: .8, digital: .63 },
      arrangement: { evolutionRate: .22, subtraction: .57 }, mix: { loudness: .58, lowEnd: .76, brightness: .36, space: .57 },
    }),
  },
  {
    id: "perlon", name: "Perlon", kind: "label",
    aliases: ["perlon", "get perlonized", "zip", "dimbiman", "markus nikolai"], location: "Berlin, Germany",
    artists: ["Zip", "Ricardo Villalobos", "Baby Ford", "Akufen", "Thomas Melchior"],
    summary: "Funky, stripped-back and off-kilter minimal house/techno built around rhythm, soul, silence and playful detail.",
    sourceUrls: ["https://www.nts.live/shows/the-nts-guide-to/episodes/the-nts-guide-to-perlon-2nd-october-2025", "https://www.roughtrade.com/label/perlon"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("perlon", "Perlon", {
      tempo: { min: 124, max: 133, preferred: 128 },
      rhythm: { density: .33, syncopation: .75, swing: .22, microtiming: .29, repetition: .87, mutationRate: .17, silence: .67 },
      drums: { kickWeight: .39, hatDensity: .3, ghostDensity: .2, electroInfluence: .3 },
      bass: { density: .29, chromaticism: .34, tonalStability: .48, rests: .62 },
      sequence: { density: .2, cycleSteps: 7, chromaticism: .45, chordProbability: .12 },
      timbre: { weirdness: .73, brightness: .38, rawness: .55, digital: .43 },
      arrangement: { evolutionRate: .15, subtraction: .83 }, mix: { loudness: .41, lowEnd: .6, brightness: .34, space: .81 },
    }),
  },
  {
    id: "seekers_barcelona", name: "Seekers", kind: "label",
    aliases: ["seekers", "seekers records"], location: "Barcelona, Spain",
    artists: ["Binh"],
    summary: "Digging-led minimal and electro context favoring hypnotic repetition, obscure details and patient dancefloor development.",
    sourceUrls: ["https://seekers.bandcamp.com/", "https://seekers.net/artist/binh/"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("seekers_barcelona", "Seekers", {
      tempo: { min: 126, max: 134, preferred: 130 },
      rhythm: { density: .34, syncopation: .81, swing: .15, repetition: .86, mutationRate: .2, silence: .62 },
      drums: { kickWeight: .4, hatDensity: .3, ghostDensity: .22, electroInfluence: .5 },
      bass: { density: .29, chromaticism: .49, tonalStability: .34, rests: .6 },
      sequence: { density: .21, cycleSteps: 7, chromaticism: .65, rareEventProbability: .11 },
      timbre: { weirdness: .84, brightness: .36, rawness: .61, digital: .59 },
      arrangement: { evolutionRate: .18, subtraction: .79 }, mix: { loudness: .43, lowEnd: .63, brightness: .32, space: .78 },
    }),
  },
  {
    id: "cartulis_london", name: "Cartulis Music", kind: "label",
    aliases: ["cartulis", "cartulis music"], location: "London, UK",
    artists: [],
    summary: "London underground context joining minimal house, electro, breaks and psychedelic machine-led club music.",
    sourceUrls: ["https://cartulismusic.bandcamp.com/artists"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("cartulis_london", "Cartulis Music", {
      tempo: { min: 126, max: 135, preferred: 130 },
      rhythm: { density: .4, syncopation: .83, swing: .14, mutationRate: .29, silence: .5, predictability: .2 },
      drums: { kickWeight: .45, hatDensity: .37, ghostDensity: .29, electroInfluence: .7 },
      bass: { density: .37, chromaticism: .56, tonalStability: .3, rests: .49 },
      sequence: { density: .3, cycleSteps: 7, chromaticism: .7, rareEventProbability: .14 },
      timbre: { weirdness: .82, brightness: .4, rawness: .71, digital: .7 },
      arrangement: { evolutionRate: .27, subtraction: .65 }, mix: { loudness: .52, lowEnd: .7, brightness: .37, space: .66 },
    }),
  },
  {
    id: "limousine_dream", name: "Limousine Dream / Gene On Earth", kind: "label",
    aliases: ["limousine dream", "gene on earth", "gene on earth records"], location: "Berlin, Germany",
    artists: ["Gene On Earth"],
    summary: "Warm, playful and rolling modern club music with human swing, memorable motifs and polished but unforced low end.",
    sourceUrls: ["https://www.limousinedream.com/pages/about", "https://ra.co/labels/15624"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("limousine_dream", "Limousine Dream / Gene On Earth", {
      tempo: { min: 125, max: 132, preferred: 128 },
      rhythm: { density: .43, syncopation: .7, swing: .23, repetition: .79, mutationRate: .2, silence: .45 },
      drums: { kickWeight: .45, hatDensity: .43, ghostDensity: .28, electroInfluence: .38 },
      bass: { density: .41, chromaticism: .31, tonalStability: .55, rests: .42 },
      sequence: { density: .31, cycleSteps: 8, chromaticism: .38, chordProbability: .2 },
      timbre: { weirdness: .58, brightness: .5, rawness: .45, digital: .42 },
      arrangement: { evolutionRate: .23, subtraction: .55 }, mix: { loudness: .54, lowEnd: .7, brightness: .47, space: .58 },
    }),
  },
  {
    id: "half_baked_london", name: "Half Baked London", kind: "label",
    aliases: ["half baked", "half baked records"], location: "London, UK",
    artists: [],
    summary: "Long-running London minimal-house context with warm rolling grooves, understated funk and afterhours pacing.",
    sourceUrls: ["https://halfbakedrecords.bandcamp.com/"],
    confidence: "curation-only", needsAudioAnalysis: true,
    profile: profile("half_baked_london", "Half Baked London", {
      tempo: { min: 124, max: 132, preferred: 128 },
      rhythm: { density: .38, syncopation: .69, swing: .21, repetition: .84, mutationRate: .17, silence: .54 },
      drums: { kickWeight: .44, hatDensity: .37, ghostDensity: .23, electroInfluence: .28 },
      bass: { density: .37, chromaticism: .3, tonalStability: .55, rests: .5 },
      sequence: { density: .25, cycleSteps: 8, chromaticism: .38, chordProbability: .16 },
      timbre: { weirdness: .57, brightness: .43, rawness: .5, digital: .4 },
      arrangement: { evolutionRate: .17, subtraction: .67 }, mix: { loudness: .49, lowEnd: .67, brightness: .4, space: .67 },
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
  return matchCuratedStyleContexts(text)[0]?.context;
}

export interface CuratedStyleMatch {
  context: CuratedStyleContext;
  matchedAliases: string[];
  score: number;
  weightModifier: number;
}

export function matchCuratedStyleContexts(text: string): CuratedStyleMatch[] {
  const normalized = text.toLowerCase();
  return curatedStyleContexts.flatMap((context) => {
    const matchedAliases = context.aliases.filter((alias) => includesAlias(normalized, alias.toLowerCase()));
    if (!matchedAliases.length) return [];
    const modifier = weightModifier(normalized, matchedAliases);
    return [{ context: structuredClone(context), matchedAliases, score: (1 + (matchedAliases.length - 1) * .2) * modifier, weightModifier: modifier }];
  }).sort((a, b) => b.score - a.score || a.context.id.localeCompare(b.context.id));
}

function includesAlias(text: string, alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const left = /^[a-z0-9]/.test(alias) ? "(?:^|[^a-z0-9])" : "";
  const right = /[a-z0-9]$/.test(alias) ? "(?:$|[^a-z0-9])" : "";
  return new RegExp(`${left}${escaped}${right}`).test(text);
}

function weightModifier(text: string, aliases: string[]) {
  let modifier = 1;
  for (const alias of aliases) {
    const index = text.indexOf(alias);
    if (index < 0) continue;
    const before = text.slice(Math.max(0, index - 32), index);
    if (/(?:sobre todo|principalmente|mostly|mainly)\s+(?:de\s+)?$/.test(before)) modifier = Math.max(modifier, 1.75);
    else if (/(?:más|mas|more)\s+(?:de\s+)?$/.test(before)) modifier = Math.max(modifier, 1.5);
    if (/(?:un toque de|toque de|a touch of|a little|un poco de)\s+$/.test(before)) modifier = Math.min(modifier, .5);
  }
  return modifier;
}
