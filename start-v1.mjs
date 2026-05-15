#!/usr/bin/env node
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, "app", "dist");
const payloadRoot = path.join(root, "payload");
const roseauRoot = path.join(root, "server", "Roseau-master");
const tmpRoot = path.join(root, "tmp");
const roseauTcpPort = parsePort(process.env.ROSEAU_TCP_PORT, 37120);
const roseauWsPort = parsePort(process.env.ROSEAU_WS_PORT, 12320);
const appPort = parsePort(process.env.VITE_PORT, 5173);
const children = new Set();

mkdirSync(tmpRoot, { recursive: true });
preparePayloadArchives();

if (!(await isPortOpen("127.0.0.1", roseauTcpPort))) {
  startRoseau();
  await waitForPort("127.0.0.1", roseauTcpPort, 30000);
  log(`Roseau is listening on port ${roseauTcpPort}.`);
} else {
  log(`Using existing Roseau server on port ${roseauTcpPort}.`);
}

if (!(await isPortOpen("127.0.0.1", roseauWsPort))) {
  startBridge();
  await waitForPort("127.0.0.1", roseauWsPort, 10000);
  log(`Roseau WebSocket bridge is listening on port ${roseauWsPort}.`);
} else {
  log(`Using existing Roseau WebSocket bridge on port ${roseauWsPort}.`);
}

if (!(await isPortOpen("127.0.0.1", appPort))) {
  const server = startStaticServer();
  children.add({ kill: () => server.close() });
  log(`Static runtime server is listening on port ${appPort}.`);
} else {
  log(`Using existing HTTP server on port ${appPort}.`);
}

log(`Open http://127.0.0.1:${appPort}/`);
log("Press Ctrl+C to stop processes started by this launcher.");

process.on("SIGINT", stopChildrenAndExit);
process.on("SIGTERM", stopChildrenAndExit);
process.stdin.resume();

function startRoseau() {
  const classes = path.join(root, "server", "roseau-classes");
  const jar = path.join(roseauRoot, "tools", "roseau.jar");
  const libs = path.join(roseauRoot, "tools", "roseau_lib", "*");
  const classPath = `${classes}${path.delimiter}${jar}${path.delimiter}${libs}`;
  const child = spawn("java", ["-cp", classPath, "org.alexdev.roseau.Roseau"], {
    cwd: roseauRoot,
    env: process.env,
    shell: false,
    windowsHide: true
  });
  attachChild("roseau", child, "roseau.stdout.log", "roseau.stderr.log");
}

function preparePayloadArchives() {
  extractArchiveIfMissing({
    archivePath: path.join(payloadRoot, "browser-assets.tar.gz"),
    requiredPath: path.join(distRoot, "assets"),
    targetPath: distRoot
  });

  extractArchiveIfMissing({
    archivePath: path.join(payloadRoot, "generated-assets.tar.gz"),
    requiredPath: path.join(distRoot, "generated", "assets"),
    targetPath: path.join(distRoot, "generated")
  });
}

function extractArchiveIfMissing({ archivePath, requiredPath, targetPath }) {
  if (existsSync(requiredPath) || !existsSync(archivePath)) {
    return;
  }

  mkdirSync(targetPath, { recursive: true });
  log(`Extracting ${path.relative(root, archivePath)}...`);
  const result = spawnSync("tar", ["-xzf", archivePath, "-C", targetPath], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(`Failed to extract ${archivePath}. Install a tar-compatible extraction tool or extract it manually into ${targetPath}.`);
  }
}

function startBridge() {
  const child = spawn(process.execPath, [path.join(root, "tools", "roseau-ws-bridge.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      ROSEAU_TCP_PORT: String(roseauTcpPort),
      ROSEAU_WS_PORT: String(roseauWsPort)
    },
    shell: false,
    windowsHide: true
  });
  attachChild("roseau-ws", child, "roseau-ws.stdout.log", "roseau-ws.stderr.log");
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url ?? "/").split("?")[0] ?? "").replaceAll("\\", "/");
    const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const filePath = path.resolve(distRoot, relativePath);
    if (!isInsidePath(distRoot, filePath) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      serveFile(path.join(distRoot, "index.html"), response);
      return;
    }
    serveFile(filePath, response);
  });
  server.listen(appPort, "127.0.0.1");
  return server;
}

function serveFile(filePath, response) {
  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypeFor(filePath));
  createReadStream(filePath).pipe(response);
}

function attachChild(name, child, stdoutName, stderrName) {
  children.add(child);
  const stdout = createWriteStream(path.join(tmpRoot, stdoutName), { flags: "a" });
  const stderr = createWriteStream(path.join(tmpRoot, stderrName), { flags: "a" });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  child.stdout.on("data", (chunk) => process.stdout.write(prefixLines(name, chunk)));
  child.stderr.on("data", (chunk) => process.stderr.write(prefixLines(name, chunk)));
  child.on("exit", (code, signal) => {
    children.delete(child);
    log(`${name} exited with code=${code ?? "null"} signal=${signal ?? "null"}.`);
  });
}

function prefixLines(name, chunk) {
  return String(chunk)
    .split(/(\r?\n)/)
    .map((part) => part.match(/^\r?\n$/) || part.length === 0 ? part : `[${name}] ${part}`)
    .join("");
}

async function stopChildrenAndExit() {
  for (const child of children) {
    child.kill();
  }
  process.exit(0);
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${host}:${port}`);
}

function parsePort(value, fallback) {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return parsed;
}

function isInsidePath(root, candidate) {
  const relativePath = path.relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    default:
      return "application/octet-stream";
  }
}

function log(message) {
  console.log(`[portable-v1] ${message}`);
}
