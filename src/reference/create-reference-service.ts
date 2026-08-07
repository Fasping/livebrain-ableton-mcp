import { AnalyzerRegistry } from "./audio-analyzer.js";
import { FfmpegAudioAnalyzer } from "./ffmpeg-audio-analyzer.js";
import { ReferenceService } from "./reference-service.js";
import { ReferenceStore } from "./store.js";
import { WavAudioAnalyzer } from "./wav-audio-analyzer.js";

export function createReferenceService(dataDir: string) {
  return new ReferenceService(
    new ReferenceStore(dataDir),
    new AnalyzerRegistry([new WavAudioAnalyzer(), new FfmpegAudioAnalyzer()]),
  );
}
