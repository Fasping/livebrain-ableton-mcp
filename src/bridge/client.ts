import { createConnection, type Socket } from "node:net";
import { randomUUID } from "node:crypto";

const PROTOCOL_VERSION = "1.0";
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

interface BridgeResponse<T> {
  id: string;
  protocolVersion: string;
  ok: boolean;
  result?: T;
  error?: { code: string; message: string; details?: unknown };
}

export class BridgeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

export class AbletonBridgeClient {
  constructor(
    private readonly host = process.env.LIVEBRAIN_BRIDGE_HOST ?? "127.0.0.1",
    private readonly port = Number(process.env.LIVEBRAIN_BRIDGE_PORT ?? 9877),
    private readonly timeoutMs = 5000,
  ) {}

  request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = randomUUID();

    return new Promise<T>((resolve, reject) => {
      let socket: Socket;
      let buffer = "";
      const timer = setTimeout(() => {
        socket?.destroy();
        reject(new Error(`Ableton bridge timeout for ${method}`));
      }, this.timeoutMs);

      socket = createConnection({ host: this.host, port: this.port }, () => {
        socket.write(JSON.stringify({ id, protocolVersion: PROTOCOL_VERSION, method, params }) + "\n");
      });
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => {
        buffer += chunk;
        if (Buffer.byteLength(buffer, "utf8") > MAX_RESPONSE_BYTES) {
          clearTimeout(timer);
          socket.destroy();
          reject(new BridgeError("RESPONSE_TOO_LARGE", "Ableton bridge response exceeded 4 MiB"));
          return;
        }
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        clearTimeout(timer);
        socket.end();
        const response = JSON.parse(buffer.slice(0, newline)) as BridgeResponse<T>;
        if (response.id !== id) {
          reject(new BridgeError("INVALID_RESPONSE", "Bridge response ID does not match request"));
          return;
        }
        if (response.protocolVersion !== PROTOCOL_VERSION) {
          reject(new BridgeError("PROTOCOL_MISMATCH", `Unsupported bridge protocol ${response.protocolVersion}`));
          return;
        }
        response.ok
          ? resolve(response.result as T)
          : reject(new BridgeError(
              response.error?.code ?? "UNKNOWN",
              response.error?.message ?? "Unknown bridge error",
              response.error?.details,
            ));
      });
      socket.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}
