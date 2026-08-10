import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { clamp01, type StyleProfile } from "../music-brain/style-profile.js";

export const preferenceDimensions = ["groove", "drums", "bass", "melody", "sequence", "arrangement", "timbre", "space", "mix"] as const;
export type PreferenceDimension = (typeof preferenceDimensions)[number];

export interface GenerationRecord {
  generationId: string;
  createdAt: string;
  profileId: string;
  profileVersion: string;
  seed: number;
  parameters: Record<string, unknown>;
  generatedFeatures: Record<string, number | string>;
  styleProfile?: StyleProfile;
  styleComponents?: Array<{ id: string; weight: number }>;
  feedback: Array<{ createdAt: string; ratings: Record<string, number>; tags: string[]; note?: string }>;
}

export interface PreferenceComparison {
  comparisonId: string;
  createdAt: string;
  winnerGenerationId: string;
  loserGenerationId: string;
  dimensions: PreferenceDimension[];
  note?: string;
}

export class FeedbackStore {
  private readonly path: string;
  private readonly comparisonPath: string;
  constructor(dataDir: string) {
    this.path = join(dataDir, "feedback", "generations.json");
    this.comparisonPath = join(dataDir, "feedback", "comparisons.json");
  }

  async record(input: Omit<GenerationRecord, "generationId" | "createdAt" | "feedback">) {
    const records = await this.read();
    const record: GenerationRecord = { ...input, generationId: randomUUID(), createdAt: new Date().toISOString(), feedback: [] };
    records.push(record); await this.write(records); return record;
  }

  async addFeedback(generationId: string, ratings: Record<string, number>, tags: string[], note?: string) {
    const records = await this.read();
    const record = records.find((item) => item.generationId === generationId);
    if (!record) throw new Error("Generation not found");
    for (const [key, value] of Object.entries(ratings)) if (!Number.isFinite(value) || value < 0 || value > 10) throw new Error(`Feedback rating ${key} must be 0..10`);
    record.feedback.push({ createdAt: new Date().toISOString(), ratings, tags: [...new Set(tags)], ...(note ? { note } : {}) });
    await this.write(records); return record;
  }

  async compare(winnerGenerationId: string, loserGenerationId: string, dimensions: PreferenceDimension[], note?: string) {
    if (winnerGenerationId === loserGenerationId) throw new Error("Winner and loser generations must be different");
    const records = await this.read();
    if (!records.some((record) => record.generationId === winnerGenerationId)) throw new Error("Winner generation not found");
    if (!records.some((record) => record.generationId === loserGenerationId)) throw new Error("Loser generation not found");
    const comparison: PreferenceComparison = {
      comparisonId: randomUUID(), createdAt: new Date().toISOString(), winnerGenerationId, loserGenerationId,
      dimensions: [...new Set(dimensions)], ...(note?.trim() ? { note: note.trim() } : {}),
    };
    const comparisons = await this.readComparisons();
    comparisons.push(comparison);
    await this.writeComparisons(comparisons);
    return comparison;
  }

  async personalize(base: StyleProfile) {
    const [records, comparisons] = await Promise.all([this.read(), this.readComparisons()]);
    const profile = structuredClone(base);
    const byId = new Map(records.map((record) => [record.generationId, record]));
    const adjustments: string[] = [];
    let comparisonEvidence = 0;
    for (const comparison of comparisons) {
      const winner = byId.get(comparison.winnerGenerationId)?.styleProfile;
      const loser = byId.get(comparison.loserGenerationId)?.styleProfile;
      if (!winner || !loser) continue;
      applyComparison(profile, winner, loser, comparison.dimensions.length ? comparison.dimensions : [...preferenceDimensions]);
      comparisonEvidence += 1;
    }
    if (comparisonEvidence) adjustments.push(`Applied ${comparisonEvidence} pairwise A/B comparison${comparisonEvidence === 1 ? "" : "s"}.`);

    const tagFrequency = new Map<string, number>();
    for (const record of records) for (const feedback of record.feedback) for (const tag of feedback.tags) {
      const normalized = normalizeTag(tag);
      tagFrequency.set(normalized, (tagFrequency.get(normalized) ?? 0) + 1);
    }
    const tagEvidence = applyDirectionalTags(profile, tagFrequency, adjustments);
    const evidenceCount = comparisonEvidence + tagEvidence;
    if (evidenceCount) profile.version = `${base.version}+personal-${evidenceCount}`;
    return { profile, applied: evidenceCount > 0, evidenceCount, comparisonEvidence, tagEvidence, adjustments };
  }

  async preferences() {
    const [records, comparisons] = await Promise.all([this.read(), this.readComparisons()]);
    const tags = new Map<string, number>();
    const ratingValues = new Map<string, number[]>();
    for (const record of records) for (const feedback of record.feedback) {
      for (const tag of feedback.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
      for (const [key, value] of Object.entries(feedback.ratings)) ratingValues.set(key, [...(ratingValues.get(key) ?? []), value]);
    }
    const wins = new Map<string, number>();
    for (const comparison of comparisons) {
      const profileId = records.find((record) => record.generationId === comparison.winnerGenerationId)?.profileId;
      if (profileId) wins.set(profileId, (wins.get(profileId) ?? 0) + 1);
    }
    return {
      generationCount: records.length,
      feedbackCount: records.reduce((sum, record) => sum + record.feedback.length, 0),
      comparisonCount: comparisons.length,
      tagFrequency: Object.fromEntries([...tags.entries()].sort((a, b) => b[1] - a[1])),
      meanRatings: Object.fromEntries([...ratingValues.entries()].map(([key, values]) => [key, values.reduce((a, b) => a + b, 0) / values.length])),
      profileWins: Object.fromEntries([...wins.entries()].sort((a, b) => b[1] - a[1])),
      claim: "Statistical preference summary; no neural-network training is performed.",
    };
  }

  private async read(): Promise<GenerationRecord[]> { try { return JSON.parse(await readFile(this.path, "utf8")) as GenerationRecord[]; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; } }
  private async write(records: GenerationRecord[]) { await mkdir(dirname(this.path), { recursive: true }); const temporary = `${this.path}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(records, null, 2) + "\n"); await rename(temporary, this.path); }
  private async readComparisons(): Promise<PreferenceComparison[]> { try { return JSON.parse(await readFile(this.comparisonPath, "utf8")) as PreferenceComparison[]; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; } }
  private async writeComparisons(records: PreferenceComparison[]) { await mkdir(dirname(this.comparisonPath), { recursive: true }); const temporary = `${this.comparisonPath}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(records, null, 2) + "\n"); await rename(temporary, this.comparisonPath); }
}

function applyComparison(target: StyleProfile, winner: StyleProfile, loser: StyleProfile, dimensions: PreferenceDimension[]) {
  const selected = new Set(dimensions);
  const rate = .12;
  if (selected.has("groove")) applyGroup(target.rhythm, winner.rhythm, loser.rhythm, rate);
  if (selected.has("drums")) applyGroup(target.drums, winner.drums, loser.drums, rate);
  if (selected.has("bass")) applyGroup(target.bass, winner.bass, loser.bass, rate, new Set(["register"]));
  if (selected.has("melody") || selected.has("sequence")) applyGroup(target.sequence, winner.sequence, loser.sequence, rate, new Set(["cycleSteps", "register"]));
  if (selected.has("arrangement")) applyGroup(target.arrangement, winner.arrangement, loser.arrangement, rate, new Set(["cycleBars"]));
  if (selected.has("timbre")) applyGroup(target.timbre, winner.timbre, loser.timbre, rate);
  if (selected.has("mix")) applyGroup(target.mix, winner.mix, loser.mix, rate);
  if (selected.has("space")) {
    target.mix.space = clamp01(target.mix.space + (winner.mix.space - loser.mix.space) * rate);
    target.rhythm.silence = clamp01(target.rhythm.silence + (winner.rhythm.silence - loser.rhythm.silence) * rate);
  }
}

function applyGroup<T extends object>(target: T, winner: T, loser: T, rate: number, excluded = new Set<string>()) {
  for (const key of Object.keys(target) as Array<keyof T>) {
    if (excluded.has(String(key))) continue;
    const current = target[key]; const winning = winner[key]; const losing = loser[key];
    if (typeof current !== "number" || typeof winning !== "number" || typeof losing !== "number") continue;
    target[key] = clamp01(current + (winning - losing) * rate) as T[keyof T];
  }
}

function applyDirectionalTags(profile: StyleProfile, tags: Map<string, number>, adjustments: string[]) {
  let evidence = 0;
  const count = (...aliases: string[]) => Math.min(3, aliases.reduce((sum, alias) => sum + (tags.get(alias) ?? 0), 0));
  const apply = (amount: number, description: string, change: (strength: number) => void) => {
    if (!amount) return; evidence += amount; change(amount); adjustments.push(`${description} (${amount} feedback signal${amount === 1 ? "" : "s"}).`);
  };
  apply(count("more-space", "mas-espacio", "menos-cargado", "too-busy", "demasiado-cargado"), "Increased space and subtraction", (n) => {
    profile.rhythm.silence = clamp01(profile.rhythm.silence + .035 * n); profile.rhythm.density = clamp01(profile.rhythm.density - .025 * n);
    profile.sequence.density = clamp01(profile.sequence.density - .025 * n); profile.mix.space = clamp01(profile.mix.space + .035 * n);
  });
  apply(count("less-space", "menos-espacio", "too-empty", "demasiado-vacio"), "Increased musical density", (n) => {
    profile.rhythm.silence = clamp01(profile.rhythm.silence - .03 * n); profile.rhythm.density = clamp01(profile.rhythm.density + .025 * n);
    profile.sequence.density = clamp01(profile.sequence.density + .02 * n);
  });
  apply(count("bass-too-obvious", "bajo-muy-obvio", "menos-bajo-rolling"), "Made bass behavior less obvious", (n) => {
    profile.bass.density = clamp01(profile.bass.density - .02 * n); profile.bass.rests = clamp01(profile.bass.rests + .035 * n);
    profile.bass.chromaticism = clamp01(profile.bass.chromaticism + .025 * n); profile.bass.tonalStability = clamp01(profile.bass.tonalStability - .02 * n);
  });
  apply(count("less-melody", "menos-melodia", "melody-too-present", "melodia-muy-presente"), "Reduced melodic presence", (n) => {
    profile.sequence.density = clamp01(profile.sequence.density - .035 * n); profile.sequence.chordProbability = clamp01(profile.sequence.chordProbability - .02 * n);
  });
  apply(count("more-melody", "mas-melodia"), "Increased melodic presence", (n) => {
    profile.sequence.density = clamp01(profile.sequence.density + .03 * n); profile.sequence.chordProbability = clamp01(profile.sequence.chordProbability + .02 * n);
  });
  apply(count("more-weird", "mas-raro", "mas-extrano"), "Increased weirdness", (n) => {
    profile.timbre.weirdness = clamp01(profile.timbre.weirdness + .035 * n); profile.sequence.chromaticism = clamp01(profile.sequence.chromaticism + .025 * n);
  });
  apply(count("less-weird", "menos-raro", "menos-extrano"), "Reduced weirdness", (n) => {
    profile.timbre.weirdness = clamp01(profile.timbre.weirdness - .035 * n); profile.sequence.chromaticism = clamp01(profile.sequence.chromaticism - .025 * n);
  });
  apply(count("more-swing", "mas-swing"), "Increased swing", (n) => { profile.rhythm.swing = clamp01(profile.rhythm.swing + .025 * n); });
  apply(count("less-swing", "menos-swing"), "Reduced swing", (n) => { profile.rhythm.swing = clamp01(profile.rhythm.swing - .025 * n); });
  apply(count("too-bright", "muy-brillante", "mas-oscuro"), "Reduced brightness", (n) => {
    profile.timbre.brightness = clamp01(profile.timbre.brightness - .035 * n); profile.mix.brightness = clamp01(profile.mix.brightness - .035 * n);
  });
  apply(count("too-dark", "muy-oscuro", "mas-brillante"), "Increased brightness", (n) => {
    profile.timbre.brightness = clamp01(profile.timbre.brightness + .035 * n); profile.mix.brightness = clamp01(profile.mix.brightness + .035 * n);
  });
  apply(count("more-raw", "mas-crudo"), "Increased rawness", (n) => { profile.timbre.rawness = clamp01(profile.timbre.rawness + .035 * n); });
  apply(count("less-raw", "menos-crudo"), "Reduced rawness", (n) => { profile.timbre.rawness = clamp01(profile.timbre.rawness - .035 * n); });
  return evidence;
}

function normalizeTag(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
