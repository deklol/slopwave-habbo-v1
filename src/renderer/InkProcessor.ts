import type { Sprite } from "pixi.js";

export interface DirectorInkOptions {
  readonly ink?: number;
  readonly bgColor?: string | undefined;
}

export interface DirectorColorKeyOptions {
  readonly opaqueNonKey?: boolean;
}

export function directorInkRequiresCanvasProcessing(ink: number | undefined): boolean {
  return ink === 8 || ink === 33 || ink === 36 || ink === 41;
}

export function resolveDirectorBitmapAssetPath(
  ink: number | undefined,
  assetPath: string | undefined,
  inkAssetPaths: Readonly<Record<string, string>>
): string | undefined {
  if (ink === 41) {
    return inkAssetPaths["8"] ?? assetPath ?? inkAssetPaths["41"] ?? inkAssetPaths["36"];
  }

  if (directorInkRequiresCanvasProcessing(ink)) {
    return assetPath ?? inkAssetPaths[String(ink)] ?? inkAssetPaths["36"] ?? inkAssetPaths["8"];
  }

  return inkAssetPaths[String(ink)] ?? assetPath;
}

export function applyDirectorBitmapSpriteInk(sprite: Sprite, options: DirectorInkOptions): void {
  if (options.ink === 41 && options.bgColor) {
    sprite.tint = directorColorToNumber(options.bgColor);
  }
}

export function applyDirectorInkToCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: DirectorInkOptions
): void {
  if (options.ink === 33 || options.ink === 36) {
    applyColorKeyTransparency(context, width, height, options.bgColor ?? "#ffffff", {
      opaqueNonKey: options.ink === 33
    });
    return;
  }

  if (options.ink === 8 || options.ink === 41) {
    applyEdgeMatte(context, width, height, "#ffffff");
  }

  if (options.ink === 41 && options.bgColor) {
    multiplyCanvasByColor(context, 0, 0, width, height, options.bgColor);
  }
}

export function multiplyCanvasByColor(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(context.canvas.width, x + width);
  const bottom = Math.min(context.canvas.height, y + height);
  const tintWidth = Math.max(0, right - left);
  const tintHeight = Math.max(0, bottom - top);
  if (tintWidth === 0 || tintHeight === 0) {
    return;
  }

  const { red, green, blue } = parseDirectorColor(color);
  const image = context.getImageData(left, top, tintWidth, tintHeight);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }

    image.data[offset] = Math.round(((image.data[offset] ?? 0) * red) / 255);
    image.data[offset + 1] = Math.round(((image.data[offset + 1] ?? 0) * green) / 255);
    image.data[offset + 2] = Math.round(((image.data[offset + 2] ?? 0) * blue) / 255);
  }
  context.putImageData(image, left, top);
}

function applyColorKeyTransparency(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  options: DirectorColorKeyOptions = {}
): void {
  const image = context.getImageData(0, 0, width, height);
  applyDirectorColorKeyTransparencyToPixels(image.data, color, options);
  context.putImageData(image, 0, 0);
}

export function applyDirectorColorKeyTransparencyToPixels(
  data: Uint8ClampedArray,
  color: string,
  options: DirectorColorKeyOptions = {}
): void {
  const { red, green, blue } = parseDirectorColor(color);
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }

    const matchesColor = (data[offset] ?? 0) === red
      && (data[offset + 1] ?? 0) === green
      && (data[offset + 2] ?? 0) === blue;
    if (matchesColor) {
      data[offset + 3] = 0;
    } else if (options.opaqueNonKey === true) {
      data[offset + 3] = 255;
    }
  }
}

function applyEdgeMatte(context: CanvasRenderingContext2D, width: number, height: number, color: string): void {
  const image = context.getImageData(0, 0, width, height);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const { red, green, blue } = parseDirectorColor(color);

  const enqueueIfMatte = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const index = y * width + x;
    if (visited[index] === 1) {
      return;
    }

    const offset = index * 4;
    const alpha = image.data[offset + 3] ?? 0;
    const pixelRed = image.data[offset] ?? 0;
    const pixelGreen = image.data[offset + 1] ?? 0;
    const pixelBlue = image.data[offset + 2] ?? 0;
    if (alpha === 0 || (pixelRed === red && pixelGreen === green && pixelBlue === blue)) {
      visited[index] = 1;
      queue.push(index);
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueIfMatte(x, 0);
    enqueueIfMatte(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueueIfMatte(0, y);
    enqueueIfMatte(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor] ?? 0;
    const x = index % width;
    const y = Math.floor(index / width);
    const offset = index * 4;
    image.data[offset + 3] = 0;
    enqueueIfMatte(x + 1, y);
    enqueueIfMatte(x - 1, y);
    enqueueIfMatte(x, y + 1);
    enqueueIfMatte(x, y - 1);
  }

  context.putImageData(image, 0, 0);
}

function directorColorToNumber(color: string): number {
  if (color.startsWith("#")) {
    return Number.parseInt(color.slice(1), 16);
  }

  return Number.parseInt(color, 16);
}

function parseDirectorColor(color: string): { readonly red: number; readonly green: number; readonly blue: number } {
  const numeric = directorColorToNumber(color);
  return {
    red: (numeric >> 16) & 0xff,
    green: (numeric >> 8) & 0xff,
    blue: numeric & 0xff
  };
}
