#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

const listenHost = process.env.ROSEAU_WS_HOST ?? "127.0.0.1";
const listenPort = parsePort(process.env.ROSEAU_WS_PORT, 12320);
const upstreamHost = process.env.ROSEAU_TCP_HOST ?? "127.0.0.1";
const upstreamPort = parsePort(process.env.ROSEAU_TCP_PORT, 37120);

let connectionCounter = 0;

const server = net.createServer((socket) => {
  const id = ++connectionCounter;
  let handshakeBuffer = Buffer.alloc(0);
  let upgraded = false;
  let upstream;
  let frameBuffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    if (upgraded) {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);
      frameBuffer = drainWebSocketFrames(frameBuffer, {
        data(payload) {
          upstream?.write(payload);
          log(id, `browser -> roseau ${payload.length} bytes`);
        },
        close() {
          upstream?.end();
          socket.end();
        },
        pong(payload) {
          socket.write(encodeWebSocketFrame(payload, 0x0a));
        }
      });
      return;
    }

    handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
    const headerEnd = handshakeBuffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) {
      return;
    }

    const headerText = handshakeBuffer.subarray(0, headerEnd).toString("latin1");
    const headers = parseHttpHeaders(headerText);
    const key = headers["sec-websocket-key"];
    if (!key) {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      return;
    }

    upstream = net.connect({ host: upstreamHost, port: upstreamPort });
    upstream.on("connect", () => {
      const accept = crypto
        .createHash("sha1")
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest("base64");

      socket.write([
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "\r\n"
      ].join("\r\n"));

      upgraded = true;
      log(id, `connected browser ws -> ${upstreamHost}:${upstreamPort}`);

      const leftover = handshakeBuffer.subarray(headerEnd + 4);
      if (leftover.length > 0) {
        socket.emit("data", leftover);
      }
    });

    upstream.on("data", (payload) => {
      socket.write(encodeWebSocketFrame(payload, 0x02));
      log(id, `roseau -> browser ${payload.length} bytes`);
    });
    upstream.on("close", () => {
      log(id, "roseau closed");
      socket.end();
    });
    upstream.on("error", (error) => {
      log(id, `roseau error ${error.message}`);
      socket.end();
    });
  });

  socket.on("close", () => {
    if (upstream && !upstream.destroyed) {
      upstream.end();
      setTimeout(() => {
        if (!upstream.destroyed) {
          upstream.destroy();
        }
      }, 250).unref();
    }
    log(id, "browser closed");
  });
  socket.on("error", (error) => {
    upstream?.destroy();
    log(id, `browser error ${error.message}`);
  });
});

server.listen(listenPort, listenHost, () => {
  console.log(`[roseau-ws] listening ws://${listenHost}:${listenPort} -> ${upstreamHost}:${upstreamPort}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  server.close(() => process.exit(0));
}

function parsePort(value, fallback) {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return parsed;
}

function parseHttpHeaders(text) {
  const headers = {};
  const lines = text.split(/\r\n/).slice(1);
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  return headers;
}

function drainWebSocketFrames(buffer, handlers) {
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    if (first === undefined || second === undefined) {
      break;
    }

    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (buffer.length - offset < 4) {
        break;
      }
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) {
        break;
      }
      const high = buffer.readUInt32BE(offset + 2);
      const low = buffer.readUInt32BE(offset + 6);
      if (high !== 0) {
        throw new Error("WebSocket frame is too large for this development bridge");
      }
      length = low;
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + length;
    if (buffer.length - offset < frameLength) {
      break;
    }

    const maskOffset = offset + headerLength;
    const payloadOffset = maskOffset + maskLength;
    const payload = Buffer.from(buffer.subarray(payloadOffset, payloadOffset + length));
    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4);
      for (let index = 0; index < payload.length; index++) {
        payload[index] = payload[index] ^ mask[index % 4];
      }
    }

    if (opcode === 0x08) {
      handlers.close();
      offset += frameLength;
      continue;
    }
    if (opcode === 0x09) {
      handlers.pong(payload);
      offset += frameLength;
      continue;
    }
    if (opcode === 0x01 || opcode === 0x02) {
      handlers.data(payload);
    }

    offset += frameLength;
  }

  return buffer.subarray(offset);
}

function encodeWebSocketFrame(payload, opcode) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;
  if (data.length <= 125) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(data.length, 6);
  }
  return Buffer.concat([header, data]);
}

function log(id, message) {
  console.log(`[roseau-ws #${id}] ${message}`);
}
