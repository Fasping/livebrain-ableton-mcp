import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStylePack } from "./schema.js";
import type { RegisteredStylePack, StylePackDiagnostic, StylePackResolution } from "./types.js";

export interface StylePackRegistryOptions {
  builtinDirs?: string[];
  userDirs?: string[];
}

export class StylePackRegistry {
  readonly diagnostics: StylePackDiagnostic[] = [];
  private readonly packs = new Map<string, RegisteredStylePack>();

  constructor(options: StylePackRegistryOptions = {}) {
    const builtinDirs = options.builtinDirs ?? [fileURLToPath(new URL("../../packs", import.meta.url))];
    const userDirs = options.userDirs ?? [join(homedir(), ".livebrain", "packs")];
    builtinDirs.forEach((directory) => this.loadDirectory(directory, "built-in"));
    userDirs.forEach((directory) => this.loadDirectory(directory, "user"));
    if (!this.packs.has("general")) throw new Error("The built-in 'general' style pack is required");
  }

  list(): RegisteredStylePack[] {
    return [...this.packs.values()].sort((a, b) => a.name.localeCompare(b.name)).map((pack) => structuredClone(pack));
  }

  get(id: string): RegisteredStylePack | undefined {
    const pack = this.packs.get(id);
    return pack ? structuredClone(pack) : undefined;
  }

  resolve(prompt: string, explicitId?: string): StylePackResolution {
    if (explicitId) {
      const pack = this.get(explicitId);
      if (!pack) throw new Error(`Unknown style pack '${explicitId}'. Available packs: ${[...this.packs.keys()].join(", ")}`);
      return { pack, matchedAliases: [], reason: `explicit packId '${explicitId}'` };
    }
    const text = normalize(prompt);
    const candidates = this.list().filter((pack) => pack.id !== "general").map((pack) => {
      const matches = [...pack.aliases, ...pack.genres]
        .filter((alias) => phraseMatches(text, normalize(alias)))
        .sort((a, b) => b.length - a.length);
      const score = matches.reduce((sum, match) => sum + Math.max(1, normalize(match).split(" ").length), 0) + (pack.priority ?? 0);
      return { pack, matches, score };
    }).filter((candidate) => candidate.matches.length > 0).sort((a, b) => b.score - a.score || a.pack.id.localeCompare(b.pack.id));
    const winner = candidates[0];
    if (winner) return { pack: winner.pack, matchedAliases: winner.matches, reason: `prompt matched: ${winner.matches.join(", ")}` };
    return { pack: this.get("general")!, matchedAliases: [], reason: "no pack-specific genre or alias matched; using neutral general pack" };
  }

  private loadDirectory(directory: string, source: RegisteredStylePack["source"]) {
    if (!existsSync(directory)) return;
    for (const name of readdirSync(directory).filter((item) => item.endsWith(".json")).sort()) {
      const sourcePath = join(directory, name);
      try {
        const pack = parseStylePack(JSON.parse(readFileSync(sourcePath, "utf8")));
        this.packs.set(pack.id, { ...pack, source, sourcePath });
      } catch (error) {
        this.diagnostics.push({ path: sourcePath, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}

let defaultRegistry: StylePackRegistry | undefined;
export function getDefaultStylePackRegistry() {
  return defaultRegistry ??= new StylePackRegistry();
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9@]+/g, " ").trim();
}
function phraseMatches(text: string, phrase: string) {
  return phrase.length > 0 && (` ${text} `).includes(` ${phrase} `);
}
