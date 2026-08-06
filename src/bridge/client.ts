import { createConnection, type Socket } from "node:net";
import { randomUUID } from "node:crypto";

interface BridgeResponse<T> {
  id: string;
  ok: boolean;
  result?: T;
  error?: string;
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
        socket.write(JSON.stringify({ id, method, params }) + "\n");
      });
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => {
        buffer += chunk;
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        clearTimeout(timer);
        socket.end();
        const response = JSON.parse(buffer.slice(0, newline)) as BridgeResponse<T>;
        response.ok
          ? resolve(response.result as T)
          : reject(new Error(response.error ?? "Unknown bridge error"));
      });
      socket.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}
