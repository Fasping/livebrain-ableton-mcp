import type { AbletonAdapter } from "./adapter.js";
import type {
  ArrangementClipSnapshot,
  ArrangementPlacementInput,
  BridgeCapabilities,
  BrowserItemSnapshot,
  BrowserSearchInput,
  ChangeSummary,
  ClipTarget,
  CreateMidiClipInput,
  CreateTrackInput,
  DeviceParameterSnapshot,
  DeviceTarget,
  LiveDeviceSnapshot,
  LiveSetSnapshot,
  MasterMeterSnapshot,
  MidiNote,
  ParameterTarget,
  SongSettingsInput,
  SnapshotMode,
  TrackMixerInput,
  TransportAction,
} from "./types.js";
import { AbletonBridgeClient } from "../bridge/client.js";

export class PythonRemoteScriptAdapter implements AbletonAdapter {
  constructor(private readonly bridge = new AbletonBridgeClient()) {}

  capabilities(): Promise<BridgeCapabilities> {
    return this.bridge.request("system.capabilities");
  }

  snapshot(mode: SnapshotMode = "compact"): Promise<LiveSetSnapshot> {
    return this.bridge.request("live_set.snapshot", { mode });
  }

  createMidiTrack(input: CreateTrackInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    return this.bridge.request("track.create_midi", input);
  }

  deleteTrack(trackIndex: number, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("track.delete", { trackIndex, dryRun });
  }

  createMidiClip(input: CreateMidiClipInput & { dryRun?: boolean }): Promise<ChangeSummary> {
    return this.bridge.request("clip.create_midi", input);
  }

  getClipNotes(target: ClipTarget): Promise<MidiNote[]> {
    return this.bridge.request("clip.get_notes", target);
  }

  replaceClipNotes(target: ClipTarget, notes: MidiNote[], dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.replace_notes", { ...target, notes, dryRun });
  }

  addNotes(target: ClipTarget, notes: MidiNote[], dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.add_notes", { ...target, notes, dryRun });
  }

  duplicateClip(source: ClipTarget, destination: ClipTarget, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.duplicate", { source, destination, dryRun });
  }

  setClipLoop(target: ClipTarget, loopStart: number, loopEnd: number, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("clip.set_loop", { ...target, loopStart, loopEnd, dryRun });
  }

  getDevices(trackIndex: number): Promise<LiveDeviceSnapshot[]> {
    return this.bridge.request("device.list", { trackIndex });
  }

  getDeviceParameters(target: DeviceTarget): Promise<DeviceParameterSnapshot[]> {
    return this.bridge.request("device.parameters", target);
  }

  setDeviceParameter(target: ParameterTarget, normalizedValue: number, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("device.set_parameter", { ...target, normalizedValue, dryRun });
  }

  setSongSettings(input: SongSettingsInput, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("song.settings", { ...input, dryRun });
  }

  setTrackMixer(trackIndex: number, input: TrackMixerInput, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("track.mixer", { trackIndex, ...input, dryRun });
  }

  getMasterMeter(): Promise<MasterMeterSnapshot> {
    return this.bridge.request("master.meter");
  }

  setTransport(action: TransportAction, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("transport.set", { action, dryRun });
  }

  searchBrowser(input: BrowserSearchInput): Promise<BrowserItemSnapshot[]> {
    return this.bridge.request("browser.search", input);
  }

  loadBrowserItem(trackIndex: number, uri: string, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("browser.load", { trackIndex, uri, dryRun });
  }

  duplicateToArrangement(target: ClipTarget, destinationTime: number, dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("arrangement.duplicate", { ...target, destinationTime, dryRun });
  }

  duplicateManyToArrangement(placements: ArrangementPlacementInput[], dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("arrangement.duplicate_many", { placements, dryRun });
  }

  getArrangementClips(trackIndex: number): Promise<ArrangementClipSnapshot[]> {
    return this.bridge.request("arrangement.clips", { trackIndex });
  }

  showArrangement(dryRun = false): Promise<ChangeSummary> {
    return this.bridge.request("view.arrangement", { dryRun });
  }

  async close(): Promise<void> {
    // Connections are request-scoped.
  }
}
