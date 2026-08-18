import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStylePack } from "./schema.js";
import type { RegisteredStylePack, StylePackDiagnostic, StylePackResolution, StylePackVariant } from "./types.js";

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

  resolve(prompt: string, explicitId?: string, explicitVariantId?: string): StylePackResolution {
    if (explicitId) {
      const pack = this.get(explicitId);
      if (!pack) throw new Error(`Unknown style pack '${explicitId}'. Available packs: ${[...this.packs.keys()].join(", ")}`);
      return this.withVariant(pack, normalize(prompt), [], `explicit packId '${explicitId}'`, explicitVariantId);
    }
    const text = normalize(prompt);
    const candidates = this.list().filter((pack) => pack.id !== "general").map((pack) => {
      const matches = [...pack.aliases, ...pack.genres, ...(pack.variants?.flatMap((variant) => variant.aliases) ?? [])]
        .filter((alias) => phraseMatches(text, normalize(alias)))
        .sort((a, b) => b.length - a.length);
      const score = matches.reduce((sum, match) => sum + Math.max(1, normalize(match).split(" ").length), 0) + (pack.priority ?? 0);
      return { pack, matches, score };
    }).filter((candidate) => candidate.matches.length > 0).sort((a, b) => b.score - a.score || a.pack.id.localeCompare(b.pack.id));
    const winner = candidates[0];
    if (winner) return this.withVariant(winner.pack, text, winner.matches, `prompt matched: ${winner.matches.join(", ")}`, explicitVariantId);
    if (explicitVariantId) throw new Error("variantId requires a matching or explicit packId");
    return { pack: this.get("general")!, matchedAliases: [], matchedVariantAliases: [], reason: "no pack-specific genre or alias matched; using neutral general pack" };
  }

  private withVariant(pack: RegisteredStylePack, text: string, matchedAliases: string[], reason: string, explicitVariantId?: string): StylePackResolution {
    if (!pack.variants?.length) {
      if (explicitVariantId) throw new Error(`Style pack '${pack.id}' has no variants`);
      return { pack, matchedAliases, matchedVariantAliases: [], reason };
    }
    let variant: StylePackVariant | undefined;
    let variantMatches: string[] = [];
    let variantReason: string;
    if (explicitVariantId) {
      variant = pack.variants.find((candidate) => candidate.id === explicitVariantId);
      if (!variant) throw new Error(`Unknown variant '${explicitVariantId}' for '${pack.id}'. Available variants: ${pack.variants.map((candidate) => candidate.id).join(", ")}`);
      variantReason = `explicit variantId '${explicitVariantId}'`;
    } else {
      const candidates = pack.variants.map((candidate) => {
        const matches = [candidate.id, candidate.name, ...candidate.aliases]
          .filter((alias) => phraseMatches(text, normalize(alias)))
          .sort((a, b) => b.length - a.length);
        const score = matches.reduce((sum, match) => sum + Math.max(1, normalize(match).split(" ").length), 0) + (candidate.priority ?? 0);
        return { candidate, matches, score };
      }).filter((candidate) => candidate.matches.length).sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
      variant = candidates[0]?.candidate ?? pack.variants.find((candidate) => candidate.id === pack.defaultVariantId);
      variantMatches = candidates[0]?.matches ?? [];
      variantReason = candidates[0]
        ? `prompt matched variant: ${variantMatches.join(", ")}`
        : `using default variant '${variant?.id}'`;
    }
    return { pack, variant: variant ? structuredClone(variant) : undefined, matchedAliases, matchedVariantAliases: variantMatches, reason, variantReason };
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
