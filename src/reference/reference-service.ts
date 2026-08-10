import type { AbletonAdapter } from "../ableton/adapter.js";
import { readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { HumanRatings, ProfileComparison, ReferenceInfluence, ReferenceMetadata, ReferenceProfile, ReferenceTrack } from "./models.js";
import { AnalyzerRegistry } from "./audio-analyzer.js";
import { buildReferenceProfile } from "./profile-builder.js";
import { explainProfile } from "./profile-builder.js";
import { curatedSeedPriors } from "./seed-priors.js";
import { blendReferenceProfiles } from "../style/profile-blender.js";
import { AUDIO_EXTENSIONS, ReferenceStore } from "./store.js";

export interface ImportDirectoryOptions {
  directoryPath: string;
  group: string;
  artist?: string;
  label?: string;
  tags?: string[];
  analyze?: boolean;
  buildProfile?: boolean;
  influence?: ReferenceInfluence;
}

export class ReferenceService {
  constructor(private readonly store: ReferenceStore, private readonly analyzers: AnalyzerRegistry) {}
  add(audioPath: string, metadata: Omit<ReferenceMetadata, "sourceFileName" | "tags" | "groups"> & { tags?: string[]; groups?: string[] }) { return this.store.add(audioPath, metadata); }
  get(id: string) { return this.store.get(id); }
  list(group?: string) { return this.store.list(group); }
  tag(id: string, tags: string[], groups: string[]) { return this.store.tag(id, tags, groups); }
  rate(id: string, ratings: HumanRatings, notes?: string) { return this.store.rate(id, ratings, notes); }
  setInfluence(id: string, influence: import("./models.js").ReferenceInfluence) { return this.store.setInfluence(id, influence); }
  getProfile(id: string) { return this.store.getProfile(id); }

  async seedCuratedPriors() {
    return Promise.all(curatedSeedPriors.map((reference) => this.store.upsertSeed(reference)));
  }

  async analyze(id: string): Promise<ReferenceTrack> {
    const path = await this.store.audioPath(id);
    const measured = await this.analyzers.analyzerFor(path).analyze(path);
    return this.store.update(id, (reference) => ({ ...reference, measured }));
  }

  async importDirectory(options: ImportDirectoryOptions) {
    const directoryPath = resolve(options.directoryPath);
    const files = await audioFilesIn(directoryPath);
    const influence: ReferenceInfluence = options.influence ?? {
      groove: 1, drums: .75, bass: .75, synth: .6, sequence: .7, arrangement: .75,
      timbre: .75, harmony: .5, space: .7, rawness: .7, weirdness: .7, hypnosis: .75, electro: .6,
    };
    const imported: ReferenceTrack[] = [];
    const skipped: Array<{ path: string; id: string; reason: string }> = [];
    const failed: Array<{ path: string; error: string }> = [];
    for (const path of files) {
      try {
        const existingId = await this.store.idForAudioPath(path);
        if (existingId) {
          let existing = await this.tag(existingId, options.tags ?? [], [options.group]);
          existing = await this.setInfluence(existingId, influence);
          if (options.analyze !== false && !existing.measured) await this.analyze(existingId);
          skipped.push({ path, id: existingId, reason: "already imported on this machine" });
          continue;
        }
        const title = basename(path, extname(path)).replace(/[_-]+/g, " ").trim();
        let reference = await this.add(path, {
          title, artist: options.artist, label: options.label,
          groups: [options.group], tags: options.tags ?? [],
        });
        reference = await this.setInfluence(reference.id, influence);
        if (options.analyze !== false) reference = await this.analyze(reference.id);
        imported.push(reference);
      } catch (error) {
        failed.push({ path, error: error instanceof Error ? error.message : String(error) });
      }
    }
    const profile = options.buildProfile === false || (!imported.length && !skipped.length)
      ? undefined
      : await this.buildProfile(options.group);
    return { directoryPath, group: options.group, discovered: files.length, imported, skipped, failed, profile };
  }

  async buildProfile(group: string): Promise<ReferenceProfile> {
    const profile = buildReferenceProfile(group, await this.store.list(group));
    await this.store.saveProfile(profile);
    return profile;
  }

  async explainProfile(id: string) { return explainProfile(await this.getProfile(id)); }

  async blendProfiles(id: string, components: Array<{ profileId: string; weight: number }>) {
    const loaded = await Promise.all(components.map(async (component) => ({ profile: await this.getProfile(component.profileId), weight: component.weight })));
    const blended = blendReferenceProfiles(id, loaded);
    await this.store.saveProfile(blended);
    return blended;
  }

  async compareLiveSet(profileId: string, ableton: AbletonAdapter): Promise<ProfileComparison> {
    const [profile, snapshot] = await Promise.all([this.getProfile(profileId), ableton.snapshot("compact")]);
    const midiClips = snapshot.tracks.flatMap((track) => track.clips.filter((clip) => clip.isMidi));
    const clipDensity = midiClips.length ? midiClips.reduce((sum, clip) => sum + (clip.noteDensity ?? 0), 0) / midiClips.length : 0;
    const facts: ProfileComparison["measuredFacts"] = [
      { metric: "tempo", value: snapshot.tempo, profileRange: profile.measured.bpm ? [profile.measured.bpm.min, profile.measured.bpm.max] : undefined },
      { metric: "midiClipMeanNoteDensityPerBeat", value: clipDensity },
      { metric: "trackCount", value: snapshot.trackCount },
    ];
    const heuristics: ProfileComparison["heuristics"] = [];
    if (profile.measured.bpm && (snapshot.tempo < profile.measured.bpm.min || snapshot.tempo > profile.measured.bpm.max)) heuristics.push({ area: "tempo", observation: "Project tempo is outside the curated reference range.", confidence: 0.95 });
    const targetDensity = profile.styleProfile.rhythm.density * 4;
    if (midiClips.length && clipDensity > targetDensity * 1.35) heuristics.push({ area: "groove", observation: "MIDI clips appear denser than this profile; consider subtraction before adding material.", confidence: 0.65 });
    if (!midiClips.length) heuristics.push({ area: "groove", observation: "No MIDI clip density is available; audio groove cannot be inferred from the Live Set snapshot.", confidence: 1 });
    return {
      profileId, measuredFacts: facts, heuristics,
      subjectiveHumanLabels: Object.entries(profile.human).map(([label, value]) => ({ label, median: value.median, referenceCount: value.count })),
      unavailable: ["audio spectral balance of current Live Set", "audio onset microtiming", "subjective coolness or artistic quality"],
    };
  }
}

async function audioFilesIn(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directoryPath, entry.name);
    if (entry.isDirectory()) return audioFilesIn(path);
    return entry.isFile() && AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase()) ? [path] : [];
  }));
  return nested.flat().sort();
}
