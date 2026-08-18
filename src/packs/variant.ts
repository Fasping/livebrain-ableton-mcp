import type { StyleProfile } from "../music-brain/style-profile.js";
import type { StylePackResolution, StylePackSection, StylePackTrack } from "./types.js";

export function applyVariantProfile(profile: StyleProfile, resolution: StylePackResolution): StyleProfile {
  const override = resolution.variant?.profileOverride;
  if (!override) return structuredClone(profile);
  return {
    ...structuredClone(profile),
    tempo: { ...profile.tempo, ...override.tempo },
    rhythm: { ...profile.rhythm, ...override.rhythm },
    drums: { ...profile.drums, ...override.drums },
    bass: { ...profile.bass, ...override.bass },
    sequence: { ...profile.sequence, ...override.sequence },
    timbre: { ...profile.timbre, ...override.timbre },
    arrangement: { ...profile.arrangement, ...override.arrangement },
    mix: { ...profile.mix, ...override.mix },
    constraints: unique([...profile.constraints, ...(override.constraints ?? [])]),
    negativeTraits: unique([...profile.negativeTraits, ...(override.negativeTraits ?? [])]),
  };
}

export function resolveVariantTracks(resolution: StylePackResolution): StylePackTrack[] {
  const overrides = new Map(resolution.variant?.trackOverrides?.map((override) => [override.role, override]) ?? []);
  return resolution.pack.tracks.map((track) => {
    const override = overrides.get(track.role);
    if (!override) return structuredClone(track);
    return {
      ...structuredClone(track), ...structuredClone(override),
      mixer: { ...track.mixer, ...override.mixer },
    };
  });
}

export function resolveVariantSections(resolution: StylePackResolution): StylePackSection[] {
  return structuredClone(resolution.variant?.sections ?? resolution.pack.sections);
}

function unique(values: string[]) { return [...new Set(values)]; }
