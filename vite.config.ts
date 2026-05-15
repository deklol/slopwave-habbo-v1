import { createReadStream, existsSync, mkdirSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [generatedAssetsPlugin()],
  publicDir: "public",
  build: {
    outDir: "app/dist",
    emptyOutDir: false
  },
  server: {
    port: 5173,
    strictPort: false
  }
});

function generatedAssetsPlugin(): Plugin {
  const sourceRoots = [
    path.resolve(projectRoot, "generated", "assets"),
    path.resolve(projectRoot, "app", "dist", "generated", "assets")
  ];

  return {
    name: "slopwave-v1-generated-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = decodeURIComponent((request.url ?? "").split("?")[0] ?? "").replaceAll("\\", "/");
        if (!requestPath.startsWith("/generated/assets/")) {
          next();
          return;
        }

        const relativePath = requestPath.replace(/^\/generated\/assets\//, "");
        const filePath = resolveGeneratedAsset(relativePath);
        if (!filePath) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", contentTypeFor(filePath));
        createReadStream(filePath).pipe(response);
      });
    },
    writeBundle(options) {
      const sourceRoot = sourceRoots.find((candidate) => existsSync(candidate));
      if (!sourceRoot) {
        return;
      }

      const outputDir = path.resolve(projectRoot, options.dir ?? "app/dist");
      const targetRoot = path.join(outputDir, "generated", "assets");
      mkdirSync(path.dirname(targetRoot), { recursive: true });
      cpSync(sourceRoot, targetRoot, { recursive: true });
    }
  };

  function resolveGeneratedAsset(relativePath: string): string | undefined {
    for (const root of sourceRoots) {
      const filePath = path.resolve(root, relativePath);
      if (isInsidePath(root, filePath) && existsSync(filePath)) {
        return filePath;
      }
    }
    return undefined;
  }
}

function isInsidePath(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
