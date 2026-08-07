import type { HumanRatings, ReferenceInfluence, ReferenceTrack } from "./models.js";

const createdAt = "2026-08-07T00:00:00.000Z";

function seed(
  id: string,
  title: string,
  release: string,
  label: string,
  year: number,
  ratings: HumanRatings,
  influence: ReferenceInfluence,
  tags: string[],
  notes: string[] = [],
): ReferenceTrack {
  const collaborators: Record<string, string> = {
    "prior-waescherei": "Binh + Evan Baggs", "prior-rice-in": "Binh + DJ Masda", "prior-goods": "Binh + Sven Roehrig",
    "prior-everyday-good-day": "Binh + Evan Baggs", "prior-lounge-that": "Binh + Evan Baggs",
  };
  const artist = collaborators[id] ?? (release === "Akmar" ? "Onur Özer" : "Binh");
  return {
    id, version: 2, createdAt, updatedAt: createdAt,
    metadata: { title, artist, release, label, year, groups: ["afterhours_2019"], tags, sourceFileName: "" },
    human: { ratings, notes }, influence, sourceConfidence: "high",
    needsHumanReview: false, needsAudioAnalysis: true,
  };
}

export const curatedSeedPriors: ReferenceTrack[] = [
  seed("prior-eastern-bloc", "Eastern Bloc", "Eastern Bloc", "Cabaret Recordings", 2018,
    { groove: 9, drums: 8.5, bass: 8.7, synth: 8.7, arrangement: 8.2, weirdness: 7, hypnosis: 8.2, space: 7, rawness: 6, subtlety: 7.8, predictability: 3.2, cheese: 0.5, overallReferenceValue: 8.8 },
    { groove: .9, drums: .8, bass: .85, synth: .8, arrangement: .7 }, ["springy-bass", "warm-minimal", "rolling-groove"]),
  seed("prior-revdone", "Revdone", "Eastern Bloc", "Cabaret Recordings", 2018,
    { groove: 8.8, drums: 8.2, bass: 8.3, synth: 8.8, arrangement: 8, weirdness: 6.8, hypnosis: 8, darkness: 4, electro: 3, progressive: 7, space: 7.2, rawness: 5.8, subtlety: 8, predictability: 3.4, cheese: .5, overallReferenceValue: 8.5 },
    { groove: .8, bass: .75, synth: .85, arrangement: .7 }, ["shiny-melody", "warm-minimal", "progressive-color"]),
  seed("prior-mandarine", "Mandarine", "Mandarine", "Cabaret Recordings", 2020,
    { groove: 9.3, drums: 8.7, bass: 7.8, synth: 9.5, arrangement: 9.3, weirdness: 9, hypnosis: 9.4, darkness: 7, electro: 5, space: 8.2, rawness: 7, subtlety: 8.7, predictability: 2, cheese: .3, overallReferenceValue: 9.6 },
    { groove: .9, drums: .75, bass: .6, synth: 1, arrangement: 1, timbre: 1 }, ["alien-synth", "long-form-thinking", "rotating-leads"]),
  seed("prior-rolli-glitzer-kurz", "Rolli Glitzer Kurz", "Mandarine", "Cabaret Recordings", 2020,
    { groove: 8.9, drums: 8.5, bass: 7.5, synth: 9.3, arrangement: 8.8, weirdness: 9.5, hypnosis: 9.3, darkness: 9, electro: 4.5, progressive: 6, space: 8.3, rawness: 7.5, subtlety: 8.5, predictability: 1.8, cheese: 0, overallReferenceValue: 9.4 },
    { groove: .8, drums: .7, synth: 1, arrangement: .85, timbre: 1 }, ["spooky", "plucked-synth", "uneasy"]),
  seed("prior-beeboo", "Beeboo", "Mandarine", "Cabaret Recordings", 2020,
    { groove: 8.6, drums: 8.9, bass: 6.8, synth: 8.5, arrangement: 8.5, weirdness: 8.2, hypnosis: 8.8, space: 9.2, rawness: 6.5, subtlety: 9.2, predictability: 2.4, cheese: .3, overallReferenceValue: 8.9 },
    { groove: .75, drums: .9, bass: .35, synth: .8, arrangement: .8, space: 1 }, ["negative-space", "reverb-percussion", "subtle"]),
  seed("prior-thisthat", "ThisThat", "ThisThat", "Time Passages", 2017,
    { groove: 9.5, drums: 8.8, bass: 9.2, synth: 7.5, arrangement: 9.6, weirdness: 7.5, hypnosis: 10, darkness: 7.5, space: 9, rawness: 6.5, subtlety: 9.5, predictability: 2.2, cheese: 0, overallReferenceValue: 9.6 },
    { groove: 1, drums: .8, bass: .9, arrangement: 1, hypnosis: 1 }, ["deep-hypnosis", "phrase-memory", "sparse"]),
  seed("prior-chalzedon", "Chalzedon", "ThisThat", "Time Passages", 2017,
    { groove: 10, drums: 9.7, bass: 10, synth: 8.5, arrangement: 9.2, weirdness: 8.5, hypnosis: 9.7, electro: 6.5, space: 8.7, rawness: 7, subtlety: 8.6, predictability: 1.8, cheese: 0, overallReferenceValue: 10 },
    { groove: 1, drums: 1, bass: 1, synth: .75, arrangement: .85 }, ["reference-groove", "skippy-drums", "wiggling-bass"]),
  seed("prior-ramen", "Ramen", "ThisThat", "Time Passages", 2017,
    { groove: 9.1, drums: 9.2, bass: 8.8, arrangement: 8.4, hypnosis: 9, darkness: 7.3, space: 8.2, rawness: 7, subtlety: 8.5, predictability: 3, cheese: 0, overallReferenceValue: 8.9 },
    { groove: .9, drums: .95, bass: .85, arrangement: .7 }, ["slinky-drums", "sub-rumble", "sparse"]),
  seed("prior-waescherei", "Waescherei", "Lost N Rex", "Time Passages", 2019,
    { groove: 9.7, drums: 9, bass: 9.7, synth: 9.2, arrangement: 9.2, weirdness: 8.7, hypnosis: 9.5, darkness: 8.5, electro: 6, space: 9.7, rawness: 7, subtlety: 9.2, predictability: 2.2, cheese: 0, overallReferenceValue: 9.8 },
    { groove: 1, drums: .9, bass: 1, synth: .9, arrangement: .95, space: 1 }, ["counter-rhythm", "negative-space", "reference-groove"]),
  seed("prior-rice-in", "Rice In", "Lost N Rex", "Time Passages", 2019,
    { groove: 9.1, drums: 8.6, bass: 10, synth: 7.5, arrangement: 8, weirdness: 6.5, hypnosis: 8.2, darkness: 7.5, electro: 5, progressive: 4.5, space: 7.5, rawness: 8.2, subtlety: 6.5, predictability: 3.8, cheese: 0, overallReferenceValue: 8.8 },
    { groove: .85, drums: .7, bass: 1, synth: .4, arrangement: .6 }, ["bass-reference", "huge-sub", "direct"]),
  seed("prior-goods", "Goods", "Lost N Rex", "Time Passages", 2019,
    { groove: 8.6, drums: 8, bass: 8, synth: 9.6, arrangement: 8.1, weirdness: 9.6, hypnosis: 8.7, darkness: 9, electro: 6.5, progressive: 6, space: 7.5, rawness: 8, subtlety: 7, predictability: 2, cheese: 0, overallReferenceValue: 9 },
    { groove: .65, drums: .5, bass: .6, synth: 1, arrangement: .65, weirdness: 1 }, ["angular-synth", "alien", "weird-sequence"]),
  seed("prior-lost-n-rex", "Lost N Rex", "Lost N Rex", "Time Passages", 2019,
    { groove: 9, drums: 8, bass: 8.2, synth: 9, arrangement: 9.2, weirdness: 9.1, hypnosis: 10, darkness: 9.2, electro: 5, progressive: 6, space: 9.7, rawness: 7, subtlety: 9.6, predictability: 1.5, cheese: 0, overallReferenceValue: 9.7 },
    { groove: .9, drums: .65, bass: .7, synth: .9, arrangement: 1, hypnosis: 1, space: 1 }, ["deep-hypnosis", "negative-space", "less-busy"]),
  seed("prior-everyday-good-day", "Everyday Is A Good Day", "Lost N Rex", "Time Passages", 2019,
    { groove: 8.5, drums: 8, bass: 7.5, synth: 7.5, arrangement: 7.8, weirdness: 5.5, hypnosis: 7.8, darkness: 3.5, electro: 3, progressive: 4.5, space: 8.2, rawness: 5.5, subtlety: 8.2, predictability: 4.2, cheese: .8, overallReferenceValue: 7.8 },
    { groove: .55, drums: .5, bass: .4, arrangement: .45 }, ["warm", "daytime", "spacious"]),
  seed("prior-lounge-that", "Lounge That", "Lost N Rex", "Time Passages", 2019,
    { groove: 8.3, drums: 7.8, bass: 7.4, synth: 7.7, arrangement: 7.8, weirdness: 5.8, hypnosis: 7.8, darkness: 4, electro: 3, progressive: 4.8, space: 8.3, rawness: 5.5, subtlety: 8.3, predictability: 4, cheese: .7, overallReferenceValue: 7.9 },
    { groove: .55, bass: .4, synth: .5, arrangement: .45 }, ["warm", "deep", "subtle"]),
  seed("prior-daydream", "Daydream", "Akmar", "Denial", 2018,
    { groove: 9, drums: 8.5, bass: 9.1, synth: 7.5, arrangement: 8, weirdness: 7.5, hypnosis: 8.6, darkness: 9, electro: 4.5, progressive: 5, space: 6.5, rawness: 8.7, subtlety: 6, predictability: 3.5, cheese: 0, overallReferenceValue: 8.8 },
    { groove: .85, drums: .75, bass: .9, arrangement: .65, rawness: .9 }, ["dark", "bassy", "raw", "machine"]),
  seed("prior-winter-track", "Winter Track", "Akmar", "Denial", 2018,
    { groove: 9, drums: 8.5, bass: 9.2, synth: 7.2, arrangement: 8, weirdness: 7.3, hypnosis: 8.8, darkness: 9.2, electro: 4, progressive: 5, space: 6.5, rawness: 8.7, subtlety: 6, predictability: 3.4, cheese: 0, overallReferenceValue: 8.8 },
    { groove: .85, drums: .75, bass: .9, arrangement: .65 }, ["dark", "bassy", "hypnotic"]),
  seed("prior-jumping-lesson", "Jumping Lesson", "Akmar", "Denial", 2018,
    { groove: 9.8, drums: 9.4, bass: 8.4, synth: 8.2, arrangement: 9.1, weirdness: 8, hypnosis: 9.8, darkness: 8.5, electro: 5, space: 7.2, rawness: 8.2, subtlety: 7.5, predictability: 2.3, cheese: 0, overallReferenceValue: 9.7 },
    { groove: 1, drums: 1, bass: .75, synth: .7, arrangement: .9, hypnosis: 1 }, ["machine-funk", "hypnotic", "energetic"]),
  seed("prior-happy-verse", "Happy Verse", "Akmar", "Denial", 2018,
    { groove: 9, drums: 9, bass: 9.8, synth: 8.8, arrangement: 8, weirdness: 9.6, hypnosis: 7.5, darkness: 7.5, electro: 6.5, progressive: 7.5, space: 3.5, rawness: 10, subtlety: 3, predictability: 2.5, cheese: 1.5, overallReferenceValue: 8.6 },
    { groove: .65, drums: .65, bass: .85, synth: .65, arrangement: .4, rawness: 1, weirdness: .9 }, ["chaotic", "fizzing-bass", "raw"], ["Use selectively; edge/chaos DNA must not raise global density."]),
  seed("prior-hugging-pain", "Hugging Pain", "Akmar", "Denial", 2018,
    { groove: 9, drums: 8.5, bass: 8.3, synth: 9.6, arrangement: 8.9, weirdness: 8.6, hypnosis: 8.9, darkness: 7.5, electro: 10, space: 8, rawness: 7, subtlety: 8.7, predictability: 2.3, cheese: 0, overallReferenceValue: 9.6 },
    { groove: .8, drums: .7, bass: .7, synth: 1, arrangement: .85, electro: 1 }, ["electro", "machine", "alien"]),
  reviewSeed("prior-run", "Run", 130),
  reviewSeed("prior-hiding-behind-swans", "Hiding Behind Swans", 133),
  reviewSeed("prior-anxbuster", "Anxbuster", 135),
];

function reviewSeed(id: string, title: string, bpm: number): ReferenceTrack {
  return {
    id, version: 2, createdAt, updatedAt: createdAt,
    metadata: { title, artist: "Onur Özer", release: "Akmar", label: "Denial", year: 2018, groups: ["afterhours_2019"], tags: [`published-bpm-${bpm}`], sourceFileName: "" },
    human: { ratings: {}, notes: ["No confident human ratings seeded; requires direct review."] }, influence: {},
    sourceConfidence: "high", needsHumanReview: true, needsAudioAnalysis: true,
  };
}
