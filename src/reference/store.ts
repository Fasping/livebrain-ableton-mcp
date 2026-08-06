import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { ratingKeys, type HumanRatings, type ReferenceMetadata, type ReferenceProfile, type ReferenceTrack } from "./models.js";

const AUDIO_EXTENSIONS = new Set([".wav", ".wave", ".aif", ".aiff", ".mp3", ".flac", ".m4a", ".ogg"]);

interface LocalIndex { paths: Record<string, string> }

export class ReferenceStore {
  private readonly referencesDir: string;
  private readonly profilesDir: string;
  private readonly localIndexPath: string;

  constructor(private readonly dataDir: string) {
    this.referencesDir = join(dataDir, "references");
    this.profilesDir = join(dataDir, "profiles");
    this.localIndexPath = join(this.referencesDir, ".local-index.json");
  }

  async initialize() {
    await Promise.all([mkdir(this.referencesDir, { recursive: true }), mkdir(this.profilesDir, { recursive: true })]);
  }

  async add(audioPath: string, metadata: Omit<ReferenceMetadata, "sourceFileName" | "tags" | "groups"> & { tags?: string[]; groups?: string[] }): Promise<ReferenceTrack> {
    await this.initialize();
    const absolutePath = resolve(audioPath);
    const info = await stat(absolutePath);
    if (!info.isFile()) throw new Error("Reference audio path is not a file");
    if (!AUDIO_EXTENSIONS.has(extname(absolutePath).toLowerCase())) throw new Error("Unsupported reference audio extension");
    if (!metadata.title.trim()) throw new Error("Reference title is required");
    if (metadata.year !== undefined && (!Number.isInteger(metadata.year) || metadata.year < 1900 || metadata.year > 2200)) throw new Error("Reference year is invalid");
    const now = new Date().toISOString();
    const reference: ReferenceTrack = {
      id: randomUUID(), version: 1, createdAt: now, updatedAt: now,
      metadata: { ...metadata, groups: unique(metadata.groups ?? []), tags: unique(metadata.tags ?? []), sourceFileName: basename(absolutePath) },
      human: { ratings: {} },
    };
    const index = await this.readLocalIndex();
    index.paths[reference.id] = absolutePath;
    await Promise.all([this.save(reference), this.atomicWrite(this.localIndexPath, index)]);
    return reference;
  }

  async get(id: string): Promise<ReferenceTrack> {
    return JSON.parse(await readFile(this.recordPath(id), "utf8")) as ReferenceTrack;
  }

  async list(group?: string): Promise<ReferenceTrack[]> {
    await this.initialize();
    const files = (await readdir(this.referencesDir)).filter((name) => name.endsWith(".json") && !name.startsWith("."));
    const records = await Promise.all(files.map((name) => readFile(join(this.referencesDir, name), "utf8").then((value) => JSON.parse(value) as ReferenceTrack)));
    return records.filter((record) => !group || record.metadata.groups.includes(group)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async audioPath(id: string): Promise<string> {
    const path = (await this.readLocalIndex()).paths[id];
    if (!path) throw new Error("Local audio path is missing. Re-add the reference on this machine.");
    await stat(path);
    return path;
  }

  async update(id: string, update: (reference: ReferenceTrack) => ReferenceTrack): Promise<ReferenceTrack> {
    const current = await this.get(id);
    const next = update(structuredClone(current));
    next.updatedAt = new Date().toISOString();
    await this.save(next);
    return next;
  }

  async tag(id: string, tags: string[], groups: string[]): Promise<ReferenceTrack> {
    return this.update(id, (reference) => {
      reference.metadata.tags = unique([...reference.metadata.tags, ...tags]);
      reference.metadata.groups = unique([...reference.metadata.groups, ...groups]);
      return reference;
    });
  }

  async rate(id: string, ratings: HumanRatings, notes?: string): Promise<ReferenceTrack> {
    for (const [key, value] of Object.entries(ratings)) {
      if (!ratingKeys.includes(key as (typeof ratingKeys)[number])) throw new Error(`Unknown rating ${key}`);
      if (value === undefined || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Rating ${key} must be between 0 and 1`);
    }
    return this.update(id, (reference) => {
      reference.human.ratings = { ...reference.human.ratings, ...ratings };
      if (notes !== undefined) reference.human.notes = notes;
      return reference;
    });
  }

  async save(reference: ReferenceTrack) { await this.atomicWrite(this.recordPath(reference.id), reference); }
  async saveProfile(profile: ReferenceProfile) { await this.atomicWrite(join(this.profilesDir, `${safeId(profile.id)}.json`), profile); }
  async getProfile(id: string): Promise<ReferenceProfile> { return JSON.parse(await readFile(join(this.profilesDir, `${safeId(id)}.json`), "utf8")) as ReferenceProfile; }

  private recordPath(id: string) { return join(this.referencesDir, `${safeId(id)}.json`); }
  private async readLocalIndex(): Promise<LocalIndex> {
    try { return JSON.parse(await readFile(this.localIndexPath, "utf8")) as LocalIndex; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { paths: {} }; throw error; }
  }
  private async atomicWrite(path: string, value: unknown) {
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
    await rename(temporary, path);
  }
}

function safeId(value: string) { if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error("Invalid identifier"); return value; }
function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
