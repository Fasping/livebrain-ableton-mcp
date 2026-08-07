import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extname } from "node:path";
import type { AudioAnalyzer } from "./audio-analyzer.js";
import { analyzeMonoPcm } from "./wav-audio-analyzer.js";

const execute = promisify(execFile);
const supported = new Set([".mp3", ".flac", ".m4a", ".ogg", ".aif", ".aiff"]);

export class FfmpegAudioAnalyzer implements AudioAnalyzer {
  readonly id = "ffmpeg-pcm";
  readonly version = "1.0.0";
  constructor(private readonly executable = process.env.LIVEBRAIN_FFMPEG_PATH ?? "ffmpeg") {}
  supports(path: string) { return supported.has(extname(path).toLowerCase()); }

  async analyze(path: string) {
    try {
      const { stdout } = await execute(this.executable, [
        "-v", "error", "-i", path, "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "1", "-ar", "22050", "pipe:1",
      ], { encoding: "buffer", maxBuffer: 1024 * 1024 * 1024 });
      const buffer = stdout as Buffer;
      const samples = new Float32Array(buffer.length / 4);
      for (let index = 0; index < samples.length; index += 1) samples[index] = buffer.readFloatLE(index * 4);
      return analyzeMonoPcm(samples, 22050, 1, this.id, this.version);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") throw new Error("ffmpeg is required for MP3/AIFF/FLAC/M4A/OGG analysis. Install it or set LIVEBRAIN_FFMPEG_PATH.");
      throw error;
    }
  }
}
