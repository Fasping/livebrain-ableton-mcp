import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export interface GenerationRecord {
  generationId: string;
  createdAt: string;
  profileId: string;
  profileVersion: string;
  seed: number;
  parameters: Record<string, unknown>;
  generatedFeatures: Record<string, number | string>;
  feedback: Array<{ createdAt: string; ratings: Record<string, number>; tags: string[]; note?: string }>;
}

export class FeedbackStore {
  private readonly path: string;
  constructor(dataDir: string) { this.path = join(dataDir, "feedback", "generations.json"); }

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

  async preferences() {
    const records = await this.read();
    const tags = new Map<string, number>();
    const ratingValues = new Map<string, number[]>();
    for (const record of records) for (const feedback of record.feedback) {
      for (const tag of feedback.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
      for (const [key, value] of Object.entries(feedback.ratings)) ratingValues.set(key, [...(ratingValues.get(key) ?? []), value]);
    }
    return {
      generationCount: records.length,
      feedbackCount: records.reduce((sum, record) => sum + record.feedback.length, 0),
      tagFrequency: Object.fromEntries([...tags.entries()].sort((a, b) => b[1] - a[1])),
      meanRatings: Object.fromEntries([...ratingValues.entries()].map(([key, values]) => [key, values.reduce((a, b) => a + b, 0) / values.length])),
      claim: "Statistical preference summary; no neural-network training is performed.",
    };
  }

  private async read(): Promise<GenerationRecord[]> { try { return JSON.parse(await readFile(this.path, "utf8")) as GenerationRecord[]; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; } }
  private async write(records: GenerationRecord[]) { await mkdir(dirname(this.path), { recursive: true }); const temporary = `${this.path}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(records, null, 2) + "\n"); await rename(temporary, this.path); }
}
