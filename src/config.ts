export interface LiveBrainConfig {
  host: string;
  port: number;
  referenceDir?: string;
  dataDir: string;
  adapter: "remote-script" | "mock";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LiveBrainConfig {
  const port = Number(env.LIVEBRAIN_PORT ?? 9877);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("LIVEBRAIN_PORT is invalid");
  return {
    host: env.LIVEBRAIN_HOST ?? "127.0.0.1",
    port,
    referenceDir: env.LIVEBRAIN_REFERENCE_DIR,
    dataDir: env.LIVEBRAIN_DATA_DIR ?? "data",
    adapter: env.LIVEBRAIN_ADAPTER === "mock" ? "mock" : "remote-script",
  };
}
