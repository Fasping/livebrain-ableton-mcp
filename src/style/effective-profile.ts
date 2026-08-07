import { clamp01, type StyleProfile } from "../music-brain/style-profile.js";

export interface GenerationTraitOverrides {
  groove?: number;
  electro?: number;
  progressive?: number;
  weirdness?: number;
  space?: number;
}

export interface EffectiveProfileRequest {
  bpm?: number;
  traits?: GenerationTraitOverrides;
}

/** Returns a deep clone; the stored/base profile is never mutated. */
export function createEffectiveStyleProfile(base: StyleProfile, request: EffectiveProfileRequest): StyleProfile {
  const profile = structuredClone(base);
  const traits = request.traits ?? {};
  if (request.bpm !== undefined) profile.tempo = { ...profile.tempo, preferred: request.bpm };
  if (traits.groove !== undefined) {
    const value = clamp01(traits.groove);
    profile.rhythm.syncopation = clamp01(profile.rhythm.syncopation * .55 + value * .45);
    profile.rhythm.repetition = clamp01(profile.rhythm.repetition * .65 + value * .35);
  }
  if (traits.electro !== undefined) {
    profile.drums.electroInfluence = clamp01(traits.electro);
    profile.timbre.digital = clamp01(profile.timbre.digital * .5 + traits.electro * .5);
  }
  if (traits.progressive !== undefined) {
    profile.arrangement.evolutionRate = clamp01(profile.arrangement.evolutionRate * .7 + traits.progressive * .3);
    profile.bass.tonalStability = clamp01(profile.bass.tonalStability * .65 + traits.progressive * .25);
  }
  if (traits.weirdness !== undefined) {
    profile.timbre.weirdness = clamp01(traits.weirdness);
    profile.bass.chromaticism = clamp01(profile.bass.chromaticism * .45 + traits.weirdness * .55);
    profile.rhythm.predictability = clamp01(profile.rhythm.predictability * (1 - traits.weirdness * .45));
    profile.sequence.chromaticism = clamp01(profile.sequence.chromaticism * .4 + traits.weirdness * .6);
    profile.sequence.rareEventProbability = clamp01(.02 + traits.weirdness * .14);
    profile.sequence.cycleSteps = traits.weirdness > .75 ? 11 : traits.weirdness > .45 ? 7 : 8;
  }
  if (traits.space !== undefined) {
    const value = clamp01(traits.space);
    profile.rhythm.silence = value;
    profile.bass.rests = clamp01(profile.bass.rests * .4 + value * .6);
    profile.arrangement.subtraction = value;
    profile.mix.space = value;
    profile.rhythm.density = clamp01(profile.rhythm.density * (1 - value * .38));
    profile.bass.density = clamp01(profile.bass.density * (1 - value * .42));
    profile.sequence.density = clamp01(profile.sequence.density * (1 - value * .45));
  }
  profile.version = `${base.version}+effective`;
  return profile;
}
