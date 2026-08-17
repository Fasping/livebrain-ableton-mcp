import { generalStyleProfile, type StyleProfile } from "../music-brain/style-profile.js";
import { blendStyleProfiles } from "./profile-blender.js";
import { matchCuratedStyleContexts } from "./curated-scenes.js";

export type StyleComponentSource = "default" | "pack" | "curated" | "reference-profile";

export interface ResolvedStyleComponent {
  id: string;
  name: string;
  source: StyleComponentSource;
  weight: number;
  matchedAliases: string[];
  needsAudioAnalysis: boolean;
  weightReason: string;
}

export interface StyleResolution {
  profile: StyleProfile;
  source: StyleComponentSource;
  components: ResolvedStyleComponent[];
  needsAudioAnalysis: boolean;
  explanation: string[];
}

export function resolveCuratedStyleMix(text: string): StyleResolution | undefined {
  const matches = matchCuratedStyleContexts(text);
  if (!matches.length) return undefined;
  const total = matches.reduce((sum, match) => sum + match.score, 0);
  const components = matches.map((match) => ({
    id: match.context.id,
    name: match.context.name,
    source: "curated" as const,
    weight: match.score / total,
    matchedAliases: match.matchedAliases,
    needsAudioAnalysis: match.context.needsAudioAnalysis,
    weightReason: match.weightModifier > 1 ? "prompt emphasis" : match.weightModifier < 1 ? "prompt requested only a touch" : "matched prompt context",
  }));
  const profile = matches.length === 1
    ? structuredClone(matches[0]!.context.profile)
    : blendStyleProfiles(`mix_${matches.map((match) => match.context.id).sort().join("__")}`, matches.map((match) => ({
      profile: match.context.profile,
      weight: match.score,
    })));
  return {
    profile, source: "curated", components, needsAudioAnalysis: true,
    explanation: components.map((component) => `${component.name}: ${percentage(component.weight)} — ${component.weightReason}; aliases: ${component.matchedAliases.join(", ")}`),
  };
}

export function defaultStyleResolution(): StyleResolution {
  return {
    profile: structuredClone(generalStyleProfile), source: "default", needsAudioAnalysis: false,
    components: [{ id: generalStyleProfile.id, name: generalStyleProfile.name, source: "default", weight: 1, matchedAliases: [], needsAudioAnalysis: false, weightReason: "neutral fallback default" }],
    explanation: ["No named style context was detected; using the neutral General Songwriting default."],
  };
}

export function blendResolvedStyles(id: string, items: Array<{ profile: StyleProfile; component: Omit<ResolvedStyleComponent, "weight">; weight: number }>): StyleResolution {
  const positive = items.filter((item) => item.weight > 0);
  if (!positive.length) throw new Error("At least one positive style weight is required");
  const total = positive.reduce((sum, item) => sum + item.weight, 0);
  const components = positive.map((item) => ({ ...item.component, weight: item.weight / total }));
  const profile = positive.length === 1
    ? structuredClone(positive[0]!.profile)
    : blendStyleProfiles(id, positive.map((item) => ({ profile: item.profile, weight: item.weight })));
  const sources = new Set(components.map((component) => component.source));
  return {
    profile,
    source: sources.size === 1 ? components[0]!.source : "reference-profile",
    components,
    needsAudioAnalysis: components.some((component) => component.needsAudioAnalysis),
    explanation: components.map((component) => `${component.name}: ${percentage(component.weight)} — ${component.weightReason}`),
  };
}

function percentage(value: number) { return `${Math.round(value * 1000) / 10}%`; }
