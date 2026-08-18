import type { AbletonAdapter } from "./adapter.js";
import type {
  ArrangementClipSnapshot,
  ArrangementPlacementInput,
  BridgeCapabilities,
  BrowserItemSnapshot,
  BrowserSearchInput,
  ChangeSummary,
  ClipSnapshot,
  ClipTarget,
  CreateMidiClipInput,
  CreateTrackInput,
  DeviceParameterSnapshot,
  DeviceTarget,
  LiveDeviceSnapshot,
  LiveSetSnapshot,
  LiveTrackSnapshot,
  MasterMeterSnapshot,
  MidiNote,
  ParameterTarget,
  SongSettingsInput,
  SnapshotMode,
  TrackMixerInput,
  TransportAction,
} from "./types.js";

interface MockClip extends ClipSnapshot { notes: MidiNote[] }
interface MockTrack extends Omit<LiveTrackSnapshot, "clips"> { clips: MockClip[] }

export class MockAbletonAdapter implements AbletonAdapter {
  private readonly tracks: MockTrack[] = [];
  private readonly masterTrack: MockTrack = this.specialTrack(-1, "Master", "master");
  private readonly returnTracks: MockTrack[] = [
    this.specialTrack(200, "A-Reverb", "return"),
    this.specialTrack(201, "B-Delay", "return"),
  ];
  private readonly arrangement = new Map<number, ArrangementClipSnapshot[]>();
  private tempo = 130;
  private timeSignature = { numerator: 4, denominator: 4 };
  private isPlaying = false;
  private readonly browser: BrowserItemSnapshot[] = [
    { name: "Drum Rack", uri: "mock:drums/drum-rack", category: "drums", path: "Drums/Drum Rack", isLoadable: true, isFolder: false },
    { name: "Drift", uri: "mock:instruments/drift", category: "instruments", path: "Instruments/Drift", isLoadable: true, isFolder: false },
    { name: "Simpler", uri: "mock:instruments/simpler", category: "instruments", path: "Instruments/Simpler", isLoadable: true, isFolder: false },
    { name: "EQ Eight", uri: "mock:audio-effects/eq-eight", category: "audio_effects", path: "Audio Effects/EQ Eight", isLoadable: true, isFolder: false },
    { name: "Compressor", uri: "mock:audio-effects/compressor", category: "audio_effects", path: "Audio Effects/Compressor", isLoadable: true, isFolder: false },
    { name: "Hybrid Reverb", uri: "mock:audio-effects/hybrid-reverb", category: "audio_effects", path: "Audio Effects/Hybrid Reverb", isLoadable: true, isFolder: false },
    { name: "Reverb", uri: "mock:audio-effects/reverb", category: "audio_effects", path: "Audio Effects/Reverb", isLoadable: true, isFolder: false },
  ];

  async capabilities(): Promise<BridgeCapabilities> {
    return { protocolVersion: "1.0", bridgeVersion: "mock", methods: ["mock"], unsupported: [] };
  }

  async snapshot(mode: SnapshotMode = "compact"): Promise<LiveSetSnapshot> {
    const snapshot: LiveSetSnapshot = {
      mode,
      tempo: this.tempo,
      timeSignature: structuredClone(this.timeSignature),
      isPlaying: this.isPlaying,
      currentSongTime: 0,
      trackCount: this.tracks.length,
      returnCount: this.returnTracks.length,
      tracks: structuredClone(this.tracks).map(({ clips, ...track }) => ({
        ...track,
        clips: clips.map(({ notes, ...clip }) => ({
          ...clip,
          noteCount: notes.length,
          noteDensity: clip.length ? notes.length / clip.length : 0,
        })),
      })),
    };
    if (mode === "detailed") {
      snapshot.masterTrack = structuredClone(this.masterTrack);
      snapshot.returnTracks = structuredClone(this.returnTracks);
    }
    return snapshot;
  }

  async createMidiTrack(input: CreateTrackInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    const index = input.index ?? this.tracks.length;
    if (!input.dryRun) {
      this.tracks.splice(index, 0, this.newTrack(input.name ?? `MIDI ${index + 1}`));
      this.tracks.forEach((track, trackIndex) => { track.index = trackIndex; });
    }
    return this.summary("track.create_midi", !input.dryRun, Boolean(input.dryRun), { trackIndex: index });
  }

  async deleteTrack(trackIndex: number, dryRun = false): Promise<ChangeSummary> {
    this.track(trackIndex);
    if (!dryRun) {
      this.tracks.splice(trackIndex, 1);
      this.tracks.forEach((track, index) => { track.index = index; });
      const nextArrangement = new Map<number, ArrangementClipSnapshot[]>();
      for (const [index, clips] of this.arrangement) {
        if (index === trackIndex) continue;
        nextArrangement.set(index > trackIndex ? index - 1 : index, clips);
      }
      this.arrangement.clear();
      for (const [index, clips] of nextArrangement) this.arrangement.set(index, clips);
    }
    return this.summary("track.delete", !dryRun, dryRun, { trackIndex });
  }

  async createMidiClip(input: CreateMidiClipInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    const track = this.track(input.trackIndex);
    if (!input.dryRun) track.clips.push({
      slotIndex: input.slotIndex, name: input.name ?? "LiveBrain Clip", isMidi: true,
      length: input.length, loopStart: 0, loopEnd: input.length, notes: [],
    });
    return this.summary("clip.create_midi", !input.dryRun, Boolean(input.dryRun), { trackIndex: input.trackIndex, slotIndex: input.slotIndex });
  }

  async getClipNotes(target: ClipTarget): Promise<MidiNote[]> {
    return structuredClone(this.clip(target).notes);
  }

  async replaceClipNotes(target: ClipTarget, notes: MidiNote[], dryRun = false): Promise<ChangeSummary> {
    if (!dryRun) this.clip(target).notes = structuredClone(notes);
    return this.summary("clip.replace_notes", !dryRun, dryRun, { trackIndex: target.trackIndex, slotIndex: target.slotIndex }, { noteCount: notes.length });
  }

  async addNotes(target: ClipTarget, notes: MidiNote[], dryRun = false): Promise<ChangeSummary> {
    if (!dryRun) this.clip(target).notes.push(...structuredClone(notes));
    return this.summary("clip.add_notes", !dryRun, dryRun, { trackIndex: target.trackIndex, slotIndex: target.slotIndex }, { noteCount: notes.length });
  }

  async duplicateClip(source: ClipTarget, destination: ClipTarget, dryRun = false): Promise<ChangeSummary> {
    const sourceClip = this.clip(source);
    const track = this.track(destination.trackIndex);
    if (track.clips.some((clip) => clip.slotIndex === destination.slotIndex)) throw new Error("Destination clip slot is occupied");
    if (!dryRun) track.clips.push({ ...structuredClone(sourceClip), slotIndex: destination.slotIndex, name: `${sourceClip.name} Copy` });
    return this.summary("clip.duplicate", !dryRun, dryRun, { trackIndex: destination.trackIndex, slotIndex: destination.slotIndex }, { sourceTrackIndex: source.trackIndex, sourceSlotIndex: source.slotIndex });
  }

  async setClipLoop(target: ClipTarget, loopStart: number, loopEnd: number, dryRun = false): Promise<ChangeSummary> {
    if (loopStart < 0 || loopEnd <= loopStart) throw new Error("Invalid loop range");
    const clip = this.clip(target);
    if (!dryRun) { clip.loopStart = loopStart; clip.loopEnd = loopEnd; clip.length = loopEnd - loopStart; }
    return this.summary("clip.set_loop", !dryRun, dryRun, { trackIndex: target.trackIndex, slotIndex: target.slotIndex }, { loopStart, loopEnd });
  }

  async getDevices(trackIndex: number): Promise<LiveDeviceSnapshot[]> {
    return structuredClone(this.resolveTrack(trackIndex).devices);
  }

  async getDeviceParameters(target: DeviceTarget): Promise<DeviceParameterSnapshot[]> {
    return structuredClone(this.device(target).parameters ?? []);
  }

  async setDeviceParameter(target: ParameterTarget, normalizedValue: number, dryRun = false): Promise<ChangeSummary> {
    const parameter = (this.device(target).parameters ?? [])[target.parameterIndex];
    if (!parameter) throw new Error("Parameter not found");
    if (!dryRun) {
      parameter.normalizedValue = normalizedValue;
      parameter.value = parameter.min + normalizedValue * (parameter.max - parameter.min);
    }
    return this.summary("device.set_parameter", !dryRun, dryRun, {
      trackIndex: target.trackIndex, deviceIndex: target.deviceIndex, parameterIndex: target.parameterIndex,
    }, { normalizedValue });
  }

  async setSongSettings(input: SongSettingsInput, dryRun = false): Promise<ChangeSummary> {
    if (!dryRun) {
      if (input.tempo !== undefined) this.tempo = input.tempo;
      if (input.timeSignature) this.timeSignature = structuredClone(input.timeSignature);
    }
    return this.summary("song.settings", !dryRun, dryRun, { song: "live_set" }, structuredClone(input) as Record<string, unknown>);
  }

  async setTrackMixer(trackIndex: number, input: TrackMixerInput, dryRun = false): Promise<ChangeSummary> {
    const track = this.resolveTrack(trackIndex);
    if ((track.kind === "master" || track.kind === "return") && input.arm !== undefined) {
      throw new Error("arm is not applicable to master/return tracks");
    }
    if (track.kind === "master" && input.mute !== undefined) throw new Error("mute is not applicable to master tracks");
    if (track.kind === "master" && input.solo !== undefined) throw new Error("solo is not applicable to master tracks");
    if (track.kind === "master" && input.sends?.length) throw new Error("sends are not applicable to master tracks");
    if (!dryRun) {
      if (input.volume !== undefined) track.mixer.volume = input.volume;
      if (input.pan !== undefined) track.mixer.pan = input.pan;
      if (input.mute !== undefined) track.mixer.mute = input.mute;
      if (input.solo !== undefined) track.mixer.solo = input.solo;
      if (input.arm !== undefined) track.mixer.arm = input.arm;
      for (const send of input.sends ?? []) track.mixer.sends[send.sendIndex] = send.value;
    }
    return this.summary("track.mixer", !dryRun, dryRun, { trackIndex }, structuredClone(input) as Record<string, unknown>);
  }

  async getMasterMeter(): Promise<MasterMeterSnapshot> {
    return { leftLinear: 0, rightLinear: 0, leftDbfs: null, rightDbfs: null, peakDbfs: null };
  }

  async setTransport(action: TransportAction, dryRun = false): Promise<ChangeSummary> {
    if (!dryRun) this.isPlaying = action === "start";
    return this.summary("transport.set", !dryRun, dryRun, { action }, { isPlaying: action === "start" });
  }

  async searchBrowser(input: BrowserSearchInput): Promise<BrowserItemSnapshot[]> {
    const query = input.query.toLowerCase();
    const categories = new Set<string>(input.categories ?? ["instruments", "sounds", "drums", "audio_effects", "midi_effects"]);
    return structuredClone(this.browser.filter((item) => categories.has(item.category) && item.name.toLowerCase().includes(query)).slice(0, input.maxResults ?? 12));
  }

  async loadBrowserItem(trackIndex: number, uri: string, dryRun = false): Promise<ChangeSummary> {
    const item = this.browser.find((candidate) => candidate.uri === uri);
    if (!item) throw new Error("Browser item not found");
    const track = this.track(trackIndex);
    if (!dryRun) track.devices.push({ index: track.devices.length, name: item.name, className: item.category, parameters: this.mockParameters(item.name) });
    return this.summary("browser.load", !dryRun, dryRun, { trackIndex, uri }, { name: item.name });
  }

  async duplicateToArrangement(target: ClipTarget, destinationTime: number, dryRun = false): Promise<ChangeSummary> {
    const clip = this.clip(target);
    if (!dryRun) {
      const clips = this.arrangement.get(target.trackIndex) ?? [];
      clips.push({ index: clips.length, name: clip.name, startTime: destinationTime, endTime: destinationTime + clip.length, length: clip.length, isMidi: clip.isMidi, isAudio: !clip.isMidi });
      this.arrangement.set(target.trackIndex, clips);
    }
    return this.summary("arrangement.duplicate", !dryRun, dryRun, { trackIndex: target.trackIndex, slotIndex: target.slotIndex }, { destinationTime });
  }

  async duplicateManyToArrangement(placements: ArrangementPlacementInput[], dryRun = false): Promise<ChangeSummary> {
    for (const placement of placements) this.clip(placement);
    if (!dryRun) {
      for (const placement of placements) {
        const clip = this.clip(placement);
        const clips = this.arrangement.get(placement.trackIndex) ?? [];
        clips.push({ index: clips.length, name: clip.name, startTime: placement.destinationTime, endTime: placement.destinationTime + clip.length, length: clip.length, isMidi: clip.isMidi, isAudio: !clip.isMidi });
        this.arrangement.set(placement.trackIndex, clips);
      }
    }
    return this.summary("arrangement.duplicate_many", !dryRun, dryRun, { arrangement: "live_set" }, { placementCount: placements.length });
  }

  async getArrangementClips(trackIndex: number): Promise<ArrangementClipSnapshot[]> {
    this.track(trackIndex);
    return structuredClone(this.arrangement.get(trackIndex) ?? []);
  }

  async showArrangement(dryRun = false): Promise<ChangeSummary> {
    return this.summary("view.arrangement", !dryRun, dryRun, { view: "arrangement" });
  }

  async close(): Promise<void> {}

  private newTrack(name: string): MockTrack {
    return { index: this.tracks.length, name, kind: "midi", mixer: {
      volume: 0.85, pan: 0, mute: false, solo: false, arm: false, sends: [],
    }, devices: [], clips: [] };
  }
  private specialTrack(index: number, name: string, kind: "master" | "return"): MockTrack {
    return { index, name, kind, mixer: {
      volume: 0.85, pan: 0, ...(kind === "return" ? { mute: false, solo: false } : {}), sends: [],
    }, devices: [], clips: [] };
  }
  private track(index: number) { const value = this.tracks[index]; if (!value) throw new Error("Track not found"); return value; }
  private resolveTrack(index: number) {
    if (index === -1) return this.masterTrack;
    if (index >= 200) {
      const value = this.returnTracks[index - 200];
      if (!value) throw new Error("Return track not found");
      return value;
    }
    return this.track(index);
  }
  private clip(target: ClipTarget) { const value = this.track(target.trackIndex).clips.find((c) => c.slotIndex === target.slotIndex); if (!value) throw new Error("Clip not found"); return value; }
  private device(target: DeviceTarget) { const value = this.resolveTrack(target.trackIndex).devices[target.deviceIndex]; if (!value) throw new Error("Device not found"); return value; }
  private mockParameters(name: string): DeviceParameterSnapshot[] {
    const parameter = (index: number, parameterName: string, normalizedValue = .5, valueItems?: string[]): DeviceParameterSnapshot => ({
      index, name: parameterName, value: normalizedValue, normalizedValue, min: 0, max: 1,
      isQuantized: Boolean(valueItems), enabled: true, valueItems,
    });
    if (name === "Compressor") return [parameter(0, "Threshold"), parameter(1, "Ratio"), parameter(2, "Attack"), parameter(3, "Release"), parameter(4, "Dry/Wet", 1)];
    if (name === "EQ Eight") return [
      parameter(0, "1 Filter On A", 0), parameter(1, "1 Filter Type A", 0, ["Low Cut 48", "Low Cut 12", "Bell", "High Shelf"]), parameter(2, "1 Frequency A"),
    ];
    if (name === "Drift") return [
      parameter(0, "Filter Freq"), parameter(1, "Resonance"), parameter(2, "Attack"), parameter(3, "Decay"), parameter(4, "LFO Amount"),
    ];
    return [];
  }
  private summary(operation: string, changed: boolean, dryRun: boolean, target: Record<string, number | string>, details?: Record<string, unknown>): ChangeSummary {
    return { operation, changed, dryRun, target, details };
  }
}
