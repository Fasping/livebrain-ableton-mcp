import type { AbletonAdapter } from "./adapter.js";
import type {
  BridgeCapabilities,
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
  MidiNote,
  ParameterTarget,
  SnapshotMode,
} from "./types.js";

interface MockClip extends ClipSnapshot { notes: MidiNote[] }
interface MockTrack extends Omit<LiveTrackSnapshot, "clips"> { clips: MockClip[] }

export class MockAbletonAdapter implements AbletonAdapter {
  private readonly tracks: MockTrack[] = [];

  async capabilities(): Promise<BridgeCapabilities> {
    return { protocolVersion: "1.0", bridgeVersion: "mock", methods: ["mock"], unsupported: [] };
  }

  async snapshot(mode: SnapshotMode = "compact"): Promise<LiveSetSnapshot> {
    return {
      mode,
      tempo: 130,
      timeSignature: { numerator: 4, denominator: 4 },
      isPlaying: false,
      currentSongTime: 0,
      trackCount: this.tracks.length,
      returnCount: 0,
      tracks: structuredClone(this.tracks).map(({ clips, ...track }) => ({
        ...track,
        clips: clips.map(({ notes, ...clip }) => ({
          ...clip,
          noteCount: notes.length,
          noteDensity: clip.length ? notes.length / clip.length : 0,
        })),
      })),
    };
  }

  async createMidiTrack(input: CreateTrackInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    const index = input.index ?? this.tracks.length;
    if (!input.dryRun) this.tracks.splice(index, 0, this.newTrack(input.name ?? `MIDI ${index + 1}`));
    return this.summary("track.create_midi", !input.dryRun, Boolean(input.dryRun), { trackIndex: index });
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

  async getDevices(trackIndex: number): Promise<LiveDeviceSnapshot[]> {
    return structuredClone(this.track(trackIndex).devices);
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

  async close(): Promise<void> {}

  private newTrack(name: string): MockTrack {
    return { index: this.tracks.length, name, kind: "midi", mixer: {
      volume: 0.85, pan: 0, mute: false, solo: false, arm: false, sends: [],
    }, devices: [], clips: [] };
  }
  private track(index: number) { const value = this.tracks[index]; if (!value) throw new Error("Track not found"); return value; }
  private clip(target: ClipTarget) { const value = this.track(target.trackIndex).clips.find((c) => c.slotIndex === target.slotIndex); if (!value) throw new Error("Clip not found"); return value; }
  private device(target: DeviceTarget) { const value = this.track(target.trackIndex).devices[target.deviceIndex]; if (!value) throw new Error("Device not found"); return value; }
  private summary(operation: string, changed: boolean, dryRun: boolean, target: Record<string, number | string>, details?: Record<string, unknown>): ChangeSummary {
    return { operation, changed, dryRun, target, details };
  }
}
