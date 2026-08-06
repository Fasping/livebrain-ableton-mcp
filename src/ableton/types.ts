export interface LiveDeviceSnapshot {
  index: number;
  name: string;
  className: string;
}

export interface LiveTrackSnapshot {
  index: number;
  name: string;
  mute: boolean;
  solo: boolean;
  devices: LiveDeviceSnapshot[];
}

export interface LiveSetSnapshot {
  tempo: number;
  isPlaying: boolean;
  tracks: LiveTrackSnapshot[];
}

export interface BridgeCapabilities {
  protocolVersion: string;
  bridgeVersion: string;
  methods: string[];
}
