#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadRoot = path.join(root, "payload");

extractArchiveIfMissing({
  archivePath: path.join(payloadRoot, "source-runtime-data.tar.gz"),
  requiredPath: path.join(root, "generated", "runtime-data", "release1_roseau_dcr0910-projectorrays-manifest.json"),
  targetPath: path.join(root, "generated")
});

function extractArchiveIfMissing({ archivePath, requiredPath, targetPath }) {
  if (existsSync(requiredPath)) {
    return;
  }

  if (!existsSync(archivePath)) {
    throw new Error(`Missing source data archive: ${archivePath}`);
  }

  mkdirSync(targetPath, { recursive: true });
  console.log(`[slopwave-v1] Extracting ${path.relative(root, archivePath)}...`);
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
