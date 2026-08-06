import type { AbletonAdapter } from "../ableton/adapter.js";
import type { HumanRatings, ProfileComparison, ReferenceMetadata, ReferenceProfile, ReferenceTrack } from "./models.js";
import { AnalyzerRegistry } from "./audio-analyzer.js";
import { buildReferenceProfile } from "./profile-builder.js";
import { ReferenceStore } from "./store.js";

export class ReferenceService {
  constructor(private readonly store: ReferenceStore, private readonly analyzers: AnalyzerRegistry) {}
  add(audioPath: string, metadata: Omit<ReferenceMetadata, "sourceFileName" | "tags" | "groups"> & { tags?: string[]; groups?: string[] }) { return this.store.add(audioPath, metadata); }
  get(id: string) { return this.store.get(id); }
  list(group?: string) { return this.store.list(group); }
  tag(id: string, tags: string[], groups: string[]) { return this.store.tag(id, tags, groups); }
  rate(id: string, ratings: HumanRatings, notes?: string) { return this.store.rate(id, ratings, notes); }
  getProfile(id: string) { return this.store.getProfile(id); }

  async analyze(id: string): Promise<ReferenceTrack> {
    const path = await this.store.audioPath(id);
    const measured = await this.analyzers.analyzerFor(path).analyze(path);
    return this.store.update(id, (reference) => ({ ...reference, measured }));
  }

  async buildProfile(group: string): Promise<ReferenceProfile> {
    const profile = buildReferenceProfile(group, await this.store.list(group));
    await this.store.saveProfile(profile);
    return profile;
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
