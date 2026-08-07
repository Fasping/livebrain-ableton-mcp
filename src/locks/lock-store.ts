import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface LockScope { generationId?: string; trackIndex?: number; slotIndex?: number }
export interface DimensionLock { scope: LockScope; preserve: string[]; mutate: string[]; updatedAt: string }

const allowedPrefixes = ["drums.", "bass.", "sequence.", "groove", "arrangement.", "automation."];

export class LockStore {
  private readonly path: string;
  constructor(dataDir: string) { this.path = join(dataDir, "locks", "locks.json"); }

  async set(scope: LockScope, preserve: string[], mutate: string[]): Promise<DimensionLock> {
    if (!scope.generationId && scope.trackIndex === undefined) throw new Error("Lock scope requires generationId or trackIndex");
    for (const path of [...preserve, ...mutate]) if (!allowedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix))) throw new Error(`Unsupported lock dimension ${path}`);
    const records = await this.read();
    const record: DimensionLock = { scope, preserve: unique(preserve), mutate: unique(mutate).filter((path) => !preserve.includes(path)), updatedAt: new Date().toISOString() };
    const index = records.findIndex((item) => sameScope(item.scope, scope));
    if (index >= 0) records[index] = record; else records.push(record);
    await this.write(records); return record;
  }

  async get(scope: LockScope): Promise<DimensionLock> {
    const matches = (await this.read()).filter((item) => scopeMatches(item.scope, scope));
    return { scope, preserve: unique(matches.flatMap((item) => item.preserve)), mutate: unique(matches.flatMap((item) => item.mutate)), updatedAt: matches.at(-1)?.updatedAt ?? new Date(0).toISOString() };
  }

  private async read(): Promise<DimensionLock[]> { try { return JSON.parse(await readFile(this.path, "utf8")) as DimensionLock[]; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; } }
  private async write(records: DimensionLock[]) { await mkdir(dirname(this.path), { recursive: true }); const temporary = `${this.path}.${process.pid}.tmp`; await writeFile(temporary, JSON.stringify(records, null, 2) + "\n"); await rename(temporary, this.path); }
}

export function isPreserved(lock: DimensionLock, path: string) { return lock.preserve.some((entry) => entry === path || path.startsWith(`${entry}.`) || entry.startsWith(`${path}.`)); }
function unique(values: string[]) { return [...new Set(values)]; }
function sameScope(a: LockScope, b: LockScope) { return a.generationId === b.generationId && a.trackIndex === b.trackIndex && a.slotIndex === b.slotIndex; }
function scopeMatches(stored: LockScope, requested: LockScope) { return Boolean((stored.generationId && stored.generationId === requested.generationId) || (stored.trackIndex === requested.trackIndex && (stored.slotIndex === undefined || stored.slotIndex === requested.slotIndex))); }
