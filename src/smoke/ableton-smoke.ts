import { PythonRemoteScriptAdapter } from "../ableton/python-remote-script-adapter.js";

const ableton = new PythonRemoteScriptAdapter();
try {
  const capabilities = await ableton.capabilities();
  const snapshot = await ableton.snapshot("compact");
  process.stdout.write(JSON.stringify({ ok: true, capabilities, snapshot: {
    tempo: snapshot.tempo, trackCount: snapshot.trackCount, returnCount: snapshot.returnCount,
  } }, null, 2) + "\n");
} finally {
  await ableton.close();
}
