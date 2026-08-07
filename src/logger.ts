export function log(level: "debug" | "info" | "warn" | "error", message: string, context: Record<string, unknown> = {}) {
  process.stderr.write(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }) + "\n");
}
