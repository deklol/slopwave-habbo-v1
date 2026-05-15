import { decodeHabboBase64 } from "./Base64Encoding";
import { bytesFrom, fromLatin1Bytes, type ByteInput } from "./latin1";
import { decodeV1TextClientPacket, decodeV1TextServerPacket } from "./V1TextPacketCodec";
import {
  getHabboBridgePacketNameRegistry,
  resolveBridgeClientPacketName,
  resolveBridgeServerPacketName,
  type HabboBridgePacketNameRegistry
} from "./HabboBridgePacketNames";

export interface HabboBridgePacket {
  readonly header: string;
  readonly headerId: number;
  readonly name: string;
  readonly body: string;
}

export interface HabboBridgeEvent {
  readonly direction: "connect" | "disconnect" | "send" | "receive" | "error";
  readonly text: string;
  readonly packet?: HabboBridgePacket;
  readonly timestamp: number;
}

export class HabboWebSocketBridge {
  private socket: WebSocket | undefined;
  private receiveBuffer = "";
  private readonly listeners = new Set<(event: HabboBridgeEvent) => void>();
  private readonly events: HabboBridgeEvent[] = [];

  constructor(readonly url: string, private readonly packetNames: HabboBridgePacketNameRegistry = getHabboBridgePacketNameRegistry("release7")) {}

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get snapshot(): readonly HabboBridgeEvent[] {
    return [...this.events];
  }

  onEvent(listener: (event: HabboBridgeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect(): Promise<void> {
    if (this.connected) {
      return Promise.resolve();
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return new Promise((resolve, reject) => {
        const handleOpen = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error(`Failed to connect Habbo bridge ${this.url}`));
        };
        const cleanup = () => {
          this.socket?.removeEventListener("open", handleOpen);
          this.socket?.removeEventListener("error", handleError);
        };
        this.socket?.addEventListener("open", handleOpen, { once: true });
        this.socket?.addEventListener("error", handleError, { once: true });
      });
    }

    this.socket = new WebSocket(this.url);
    this.socket.binaryType = "arraybuffer";
    this.socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });
    this.socket.addEventListener("close", () => {
      this.record("disconnect", `closed ${this.url}`);
    });
    this.socket.addEventListener("error", () => {
      this.record("error", `socket error ${this.url}`);
    });

    return new Promise((resolve, reject) => {
      const handleOpen = () => {
        cleanup();
        this.record("connect", `connected ${this.url}`);
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to connect Habbo bridge ${this.url}`));
      };
      const cleanup = () => {
        this.socket?.removeEventListener("open", handleOpen);
        this.socket?.removeEventListener("error", handleError);
      };
      this.socket?.addEventListener("open", handleOpen, { once: true });
      this.socket?.addEventListener("error", handleError, { once: true });
    });
  }

  send(payload: ByteInput): void {
    if (!this.connected || !this.socket) {
      throw new Error(`Habbo bridge is not connected: ${this.url}`);
    }

    const bytes = bytesFrom(payload);
    if (this.packetNames.framing === "v1-text-hash") {
      const packet = decodeV1TextClientPacket(bytes);
      const name = resolveBridgeClientPacketName(this.packetNames, packet.header, -1);
      this.socket.send(bytes);
      this.record("send", `${name} ${packet.header} bytes=${bytes.length}`, {
        header: packet.header,
        headerId: -1,
        name,
        body: packet.body
      });
      return;
    }

    const header = bytes.length >= 5 ? fromLatin1Bytes(bytes.slice(3, 5)) : "??";
    const headerId = safeDecodeHeader(header);
    const name = resolveBridgeClientPacketName(this.packetNames, header, headerId);
    this.socket.send(bytes);
    this.record("send", `${name} ${header} bytes=${bytes.length}`, {
      header,
      headerId,
      name,
      body: bytes.length >= 5 ? fromLatin1Bytes(bytes.slice(5)) : ""
    });
  }

  close(): void {
    this.socket?.close();
    this.socket = undefined;
    this.receiveBuffer = "";
  }

  private async handleMessage(data: string | ArrayBuffer | Blob): Promise<void> {
    const text = await readSocketDataAsLatin1(data);
    this.receiveBuffer += text;
    if (this.packetNames.framing === "v1-text-hash") {
      this.drainV1TextHashFrames();
      return;
    }

    while (true) {
      const terminatorIndex = this.receiveBuffer.indexOf("\u0001");
      if (terminatorIndex < 0) {
        break;
      }

      const frame = this.receiveBuffer.slice(0, terminatorIndex);
      this.receiveBuffer = this.receiveBuffer.slice(terminatorIndex + 1);
      if (frame.length < 2) {
        continue;
      }

      const header = frame.slice(0, 2);
      const headerId = safeDecodeHeader(header);
      const name = resolveBridgeServerPacketName(this.packetNames, header, headerId);
      const packet = {
        header,
        headerId,
        name,
        body: frame.slice(2)
      };
      this.record("receive", `${packet.name} ${packet.header}${packet.body ? ` body=${packet.body.slice(0, 80)}` : ""}`, packet);
    }
  }

  private drainV1TextHashFrames(): void {
    while (true) {
      const startIndex = this.receiveBuffer.indexOf("#");
      if (startIndex < 0) {
        this.receiveBuffer = "";
        return;
      }

      if (startIndex > 0) {
        this.receiveBuffer = this.receiveBuffer.slice(startIndex);
      }

      const terminatorIndex = this.receiveBuffer.indexOf("##", 1);
      if (terminatorIndex < 0) {
        return;
      }

      const frame = this.receiveBuffer.slice(1, terminatorIndex);
      this.receiveBuffer = this.receiveBuffer.slice(terminatorIndex + 2);
      if (frame.length === 0) {
        continue;
      }

      const decoded = decodeV1TextServerPacket(frame);
      const name = resolveBridgeServerPacketName(this.packetNames, decoded.header, -1);
      const packet = {
        header: decoded.header,
        headerId: -1,
        name,
        body: decoded.body
      };
      this.record("receive", `${packet.name} ${packet.header}${packet.body ? ` body=${packet.body.slice(0, 80)}` : ""}`, packet);
    }
  }

  private record(direction: HabboBridgeEvent["direction"], text: string, packet?: HabboBridgePacket): void {
    const event: HabboBridgeEvent = {
      direction,
      text,
      timestamp: Date.now(),
      ...(packet !== undefined ? { packet } : {})
    };
    this.events.unshift(event);
    if (this.events.length > 80) {
      this.events.length = 80;
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

async function readSocketDataAsLatin1(data: string | ArrayBuffer | Blob): Promise<string> {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Blob) {
    return fromLatin1Bytes(new Uint8Array(await data.arrayBuffer()));
  }

  return fromLatin1Bytes(new Uint8Array(data));
}

function safeDecodeHeader(header: string): number {
  try {
    return decodeHabboBase64(header);
  } catch {
    return -1;
  }
}
