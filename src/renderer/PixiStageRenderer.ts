import { Application, Container, Graphics, Sprite, Text, Texture, type TextStyleFontWeight, type TextStyleOptions } from "pixi.js";
import type { DirectorFrame } from "../runtime/DirectorFrame";
import type { DirectorBitmapCompositeLayer, DirectorMember, DirectorTextSpan } from "../runtime/DirectorMember";
import type { DirectorMovie } from "../runtime/DirectorMovie";
import { DirectorSpriteChannel, type DirectorSpriteChannelManifest } from "../runtime/DirectorSpriteChannel";
import {
  applyDirectorInkToCanvas,
  directorInkRequiresCanvasProcessing,
  multiplyCanvasByColor,
  resolveDirectorBitmapAssetPath
} from "./InkProcessor";
import {
  DirectorAssetBroker,
  type DirectorAssetRequestCategory,
  type DirectorAssetRequestContext,
  type DirectorAssetRequestMode
} from "./DirectorAssetBroker";

const habboDefaultFontFamily = "\"Volter Goldfish\"";

export interface PixiStageRendererOptions {
  host: HTMLElement;
  movie: DirectorMovie;
}

export class PixiStageRenderer {
  private readonly app: Application;
  private readonly root = new Container();
  private readonly failedAssets = new Set<string>();
  private readonly bitmapTextureCache = new Map<string, Texture>();
  private readonly bitmapInkTextureCache = new Map<string, Texture>();
  private readonly textTextureCache = new Map<string, Texture>();
  private readonly compositeTextureCache = new Map<string, Texture>();
  private readonly assetBroker = new DirectorAssetBroker();
  private readonly pendingBitmapTextureLoads = new Map<string, Promise<void>>();
  private readonly pendingBitmapAssetWarmups = new Map<string, Promise<void>>();
  private readonly pendingBitmapInkTextureWarmups = new Map<string, Promise<void>>();
  private lastAssetBrokerSummaryPublishAt = 0;
  private lastAssetBrokerSummaryNetworkLoads = -1;
  private lastAssetBrokerSummaryFailures = -1;
  private readonly renderedSpriteContainers = new Map<number, Container>();
  private readonly renderedSpriteContentSignatures = new Map<number, string>();
  private textFontsReady = false;

  private constructor(app: Application) {
    this.app = app;
    this.app.stage.addChild(this.root);
  }

  static async create(options: PixiStageRendererOptions): Promise<PixiStageRenderer> {
    const app = new Application();
    await app.init({
      width: options.movie.stage.width,
      height: options.movie.stage.height,
      background: colorToNumber(options.movie.stage.backgroundColor),
      antialias: false,
      autoDensity: false,
      resolution: 1,
      roundPixels: true
    });

    options.host.appendChild(app.canvas);
    return new PixiStageRenderer(app);
  }

  async renderMovie(movie: DirectorMovie): Promise<void> {
    this.app.renderer.resize(movie.stage.width, movie.stage.height);
    await this.renderFrame(movie, movie.currentFrame);
  }

  async preloadCurrentFrameBitmapAssets(movie: DirectorMovie): Promise<void> {
    const sprites = [...movie.currentFrame.sprites, ...getDirectorOverlaySprites(movie)]
      .sort((left, right) => left.locZ - right.locZ || left.channel - right.channel);
    await this.ensureTextFontsReady(movie, sprites);
    await this.preloadBitmapAssets(movie, sprites, {
      forceBlocking: true,
      extraWarmupSprites: getDirectorBitmapPreloadSprites(movie)
    });
  }

  async renderFrame(movie: DirectorMovie, frame: DirectorFrame): Promise<void> {
    const sprites = [...frame.sprites, ...getDirectorOverlaySprites(movie)]
      .sort((left, right) => left.locZ - right.locZ || left.channel - right.channel);
    await this.ensureTextFontsReady(movie, sprites);
    await this.preloadBitmapAssets(movie, sprites);
    for (const child of this.root.removeChildren()) {
      child.destroy({ children: true });
    }
    this.renderedSpriteContainers.clear();
    this.renderedSpriteContentSignatures.clear();

    for (const sprite of sprites) {
      if (!sprite.visible) {
        continue;
      }

      const member = movie.cast.getMember(sprite.member);
      if (!member) {
        movie.unsupported.add({
          subsystem: "renderer",
          feature: "missing-member",
          detail: `Sprite channel ${sprite.channel} references ${sprite.member.castLib}:${sprite.member.member}`
        });
        continue;
      }

      const rendered = this.renderSprite(movie, sprite, member);
      this.root.addChild(rendered);
      this.rememberRenderedSprite(sprite, member, rendered);
    }
  }

  async updateOverlaySprites(movie: DirectorMovie): Promise<void> {
    if (this.renderedSpriteContainers.size === 0) {
      await this.renderMovie(movie);
      return;
    }

    const sprites = [...getDirectorOverlaySprites(movie)]
      .sort((left, right) => left.locZ - right.locZ || left.channel - right.channel);
    await this.ensureTextFontsReady(movie, sprites);
    await this.preloadBitmapAssets(movie, sprites);

    for (const sprite of sprites) {
      const existing = this.renderedSpriteContainers.get(sprite.channel);
      if (!existing) {
        await this.renderMovie(movie);
        return;
      }

      if (!sprite.visible) {
        existing.visible = false;
        continue;
      }

      const member = movie.cast.getMember(sprite.member);
      if (!member) {
        existing.visible = false;
        movie.unsupported.add({
          subsystem: "renderer",
          feature: "missing-member",
          detail: `Sprite channel ${sprite.channel} references ${sprite.member.castLib}:${sprite.member.member}`
        });
        continue;
      }

      existing.visible = true;
      const nextSignature = renderedSpriteContentSignature(sprite, member);
      if (this.renderedSpriteContentSignatures.get(sprite.channel) === nextSignature) {
        applyDirectorSpriteContainerPlacement(existing, sprite, member);
        continue;
      }

      const replacement = this.renderSprite(movie, sprite, member);
      const index = this.root.getChildIndex(existing);
      this.root.removeChild(existing);
      existing.destroy({ children: true });
      this.root.addChildAt(replacement, Math.min(index, this.root.children.length));
      this.rememberRenderedSprite(sprite, member, replacement);
    }
  }

  destroy(): void {
    this.app.destroy(true);
  }

  private rememberRenderedSprite(sprite: DirectorSpriteChannel, member: DirectorMember, container: Container): void {
    this.renderedSpriteContainers.set(sprite.channel, container);
    this.renderedSpriteContentSignatures.set(sprite.channel, renderedSpriteContentSignature(sprite, member));
  }

  private renderSprite(movie: DirectorMovie, sprite: DirectorSpriteChannel, member: DirectorMember): Container {
    const container = new Container();
    applyDirectorSpriteContainerPlacement(container, sprite, member);

    let content: Container | Graphics | Sprite;
    switch (member.type) {
      case "bitmap":
        content = this.renderBitmap(sprite, member);
        break;
      case "text":
      case "field":
        content = this.renderText(sprite, member);
        break;
      case "shape":
        content = this.renderShape(sprite, member);
        break;
      default:
        movie.unsupported.add({
          subsystem: "renderer",
          feature: `member-type:${member.type}`,
          detail: `Sprite channel ${sprite.channel} uses ${member.type}`
        });
        content = this.renderUnsupportedPlaceholder(sprite, member);
        break;
    }

    applyDirectorSpriteFlip(content, sprite, member);
    applyDirectorSpriteBlendMode(content, sprite);
    container.addChild(content);
    return container;
  }

  private renderBitmap(sprite: DirectorSpriteChannel, member: DirectorMember): Graphics | Sprite | Container {
    const width = sprite.width ?? member.width ?? 1;
    const height = sprite.height ?? member.height ?? 1;
    if (member.composite) {
      return this.renderBitmapComposite(sprite, member);
    }

    const assetPath = getBitmapAssetPath(sprite, member);
    if (assetPath) {
      const normalizedPath = normalizeAssetPath(assetPath);
      if (!this.failedAssets.has(normalizedPath)) {
        const texture = this.getBitmapTextureForSprite(normalizedPath, sprite);
        if (texture) {
          const bitmap = new Sprite(texture);
          bitmap.roundPixels = true;
          bitmap.texture.source.scaleMode = "nearest";
          bitmap.width = width;
          bitmap.height = height;
          return bitmap;
        }

        // A missing texture for a known asset path means the bitmap or its
        // Director ink-processed variant is still loading. Rendering nothing
        // for that frame is closer than showing a solid placeholder rectangle,
        // and it avoids the grey-block furniture flashes seen during animation.
        return new Container();
      }
    }

    const graphics = new Graphics();
    graphics.rect(0, 0, width, height).fill(colorToNumber(member.color ?? "#777777"));
    return graphics;
  }

  private renderBitmapComposite(sprite: DirectorSpriteChannel, member: DirectorMember): Sprite | Container {
    const texture = this.compositeTextureCache.get(compositeTextureKey(sprite, member));
    if (!texture) {
      return this.renderBitmapCompositeFallback(member);
    }

    const bitmap = new Sprite(texture);
    bitmap.roundPixels = true;
    bitmap.texture.source.scaleMode = "nearest";
    return bitmap;
  }

  private renderBitmapCompositeFallback(member: DirectorMember): Container {
    const container = new Container();
    const composite = member.composite;
    if (!composite) {
      return container;
    }

    for (const layer of composite.layers) {
      this.appendCompositeLayerFallback(container, layer);
    }

    return container;
  }

  private renderText(sprite: DirectorSpriteChannel, member: DirectorMember): Container {
    const width = sprite.width ?? member.width;
    const height = sprite.height ?? member.height;
    const container = new Container();
    const textColor = resolveDirectorTextColor(sprite, member);
    const textValue = directorRenderableText(member.text);

    if (member.backgroundColor && width !== undefined && height !== undefined) {
      container.addChild(new Graphics().rect(0, 0, width, height).fill(colorToNumber(member.backgroundColor)));
    }

    if (shouldRenderPixelText(member)) {
      container.addChild(this.renderPixelText(sprite, member, textValue));
      return container;
    }

    const style: TextStyleOptions = {
      align: member.textAlign ?? "left",
      fill: colorToNumber(textColor),
      fontFamily: resolveDirectorTextFontFamily(member.fontFamily),
      fontSize: member.fontSize ?? 12,
      fontStyle: member.fontStyle === "italic" ? "italic" : "normal",
      fontWeight: (member.fontWeight ?? "normal") as TextStyleFontWeight,
      wordWrap: member.wordWrap,
      ...(member.lineHeight !== undefined ? { lineHeight: member.lineHeight } : {}),
      ...(width !== undefined ? { wordWrapWidth: width } : {})
    };
    const text = new Text({
      text: textValue,
      style,
      textureStyle: {
        scaleMode: "nearest"
      }
    });
    text.roundPixels = true;
    if (member.textScrollY > 0) {
      text.y = -Math.round(member.textScrollY);
    }

    if (member.textAlign === "center" && width !== undefined) {
      text.anchor.x = 0.5;
      text.x = width / 2;
    } else if (member.textAlign === "right" && width !== undefined) {
      text.anchor.x = 1;
      text.x = width;
    }

    container.addChild(text);
    if (member.underline && width !== undefined && height !== undefined) {
      const textWidth = Math.min(width, text.width);
      const underlineX = member.textAlign === "center" ? Math.round((width - textWidth) / 2) : member.textAlign === "right" ? Math.round(width - textWidth) : 0;
      const underlineY = Math.min(height - 1, Math.round((member.fontSize ?? 12) + 1));
      container.addChild(new Graphics().rect(underlineX, underlineY, Math.max(1, Math.round(textWidth)), 1).fill(colorToNumber(textColor)));
    }
    if (width !== undefined && height !== undefined) {
      const mask = new Graphics().rect(0, 0, width, height).fill(0xffffff);
      container.addChild(mask);
      container.mask = mask;
    }
    return container;
  }

  private renderPixelText(sprite: DirectorSpriteChannel, member: DirectorMember, text: string): Sprite {
    const width = Math.max(1, Math.round(sprite.width ?? member.width ?? 1));
    const height = Math.max(1, Math.round(sprite.height ?? member.height ?? 1));
    const fontSize = Math.max(1, Math.round(member.fontSize ?? 12));
    const lineHeight = Math.max(1, Math.round(member.lineHeight ?? fontSize + 2));
    const canvasHeight = Math.max(height, lineHeight);
    const textColor = resolveDirectorTextColor(sprite, member);
    const key = JSON.stringify({
      text,
      width,
      height: canvasHeight,
      color: textColor,
      fontFamily: resolveDirectorTextFontFamily(member.fontFamily),
      fontSize,
      fontWeight: member.fontWeight ?? "400",
      fontStyle: member.fontStyle ?? "normal",
      align: member.textAlign ?? "left",
      lineHeight,
      wordWrap: member.wordWrap,
      underline: member.underline,
      textSpans: member.textSpans,
      scrollY: member.textScrollY
    });
    let texture = this.textTextureCache.get(key);
    if (!texture) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = canvasHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, width, canvasHeight);
        context.font = `${member.fontStyle === "italic" ? "italic " : ""}${member.fontWeight ?? "400"} ${fontSize}px ${resolveDirectorTextFontFamily(member.fontFamily)}`;
        context.textBaseline = "top";
        context.fillStyle = textColor;
        const lines = layoutTextLinesWithRanges(context, text, width, member.wordWrap);
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          if (!line) {
            continue;
          }
          const metrics = context.measureText(line.text);
          const textWidth = Math.ceil(metrics.width);
          const y = Math.round(lineIndex * lineHeight - member.textScrollY);
          if (y >= canvasHeight) {
            break;
          }
          if (y + lineHeight <= 0) {
            continue;
          }

          const x = directorTextLineX(member.textAlign, width, textWidth);
          drawDirectorPixelTextLine(context, line.text, x, y, width, member.textAlign);
          if (shouldUnderlineTextLine(member.underline, member.textSpans, line.start, line.end)) {
            const underlineY = Math.min(canvasHeight - 1, y + fontSize);
            const underline = resolveLineUnderlineRange(context, line, member.textSpans, member.underline);
            context.fillRect(Math.round(x + underline.offsetX), underlineY, Math.max(1, underline.width), 1);
          }
        }
        thresholdTextAlpha(context, width, canvasHeight, textColor);
      }

      texture = Texture.from(canvas, true);
      texture.source.scaleMode = "nearest";
      this.textTextureCache.set(key, texture);
    }

    const spriteText = new Sprite(texture);
    spriteText.roundPixels = true;
    return spriteText;
  }

  private renderShape(sprite: DirectorSpriteChannel, member: DirectorMember): Graphics {
    const width = Math.max(1, Math.round(sprite.width ?? member.width ?? 1));
    const height = Math.max(1, Math.round(sprite.height ?? member.height ?? 1));
    const borderWidth = Math.max(0, Math.round(member.borderWidth ?? 0));
    const graphics = new Graphics({ roundPixels: true });
    const radius = Math.max(0, Math.round(member.borderRadius ?? 0));
    if (member.shapeType === "oval") {
      graphics.ellipse(width / 2, height / 2, width / 2, height / 2);
    } else if (radius > 0) {
      graphics.roundRect(0, 0, width, height, radius);
    } else {
      graphics.rect(0, 0, width, height);
    }
    if (member.shapeFillType !== 0) {
      graphics.fill(colorToNumber(sprite.fgColor ?? member.color ?? member.backgroundColor ?? sprite.bgColor ?? "#777777"));
    }
    if (borderWidth > 0 && member.borderColor) {
      graphics.stroke({
        width: borderWidth,
        color: colorToNumber(member.borderColor)
      });
    }
    return graphics;
  }

  private renderUnsupportedPlaceholder(_sprite: DirectorSpriteChannel, _member: DirectorMember): Container {
    // Unknown source members are still logged as unsupported by renderSprite.
    // Rendering them transparent avoids leaking debug placeholders into the movie.
    return new Container();
  }

  private async preloadBitmapAssets(
    movie: DirectorMovie,
    sprites: readonly DirectorSpriteChannel[],
    options: {
      readonly forceBlocking?: boolean;
      readonly extraWarmupSprites?: readonly DirectorSpriteChannel[];
    } = {}
  ): Promise<void> {
    const requiredAssetPaths = new Set<string>();
    const warmupAssetPaths = new Set<string>();
    const assetContexts = new Map<string, DirectorAssetRequestContext>();
    const compositeSprites: { readonly sprite: DirectorSpriteChannel; readonly member: DirectorMember }[] = [];
    const requiredBitmapInkSprites = new Map<string, {
      readonly assetPath: string;
      readonly sprite: DirectorSpriteChannel;
    }>();
    const warmupBitmapInkSprites = new Map<string, {
      readonly assetPath: string;
      readonly sprite: DirectorSpriteChannel;
    }>();
    const blockExplicitPreloads = options.forceBlocking === true || shouldBlockExplicitBitmapPreloads(movie);
    const preloadContext = readBitmapPreloadContext(movie);
    for (const assetPath of readBitmapPreloadPaths(movie.getProperty("blockingPreloadBitmapAssetPaths"))) {
      const normalizedPath = normalizeAssetPath(assetPath);
      if (blockExplicitPreloads) {
        requiredAssetPaths.add(normalizedPath);
      } else {
        warmupAssetPaths.add(normalizedPath);
      }
      rememberAssetRequestContext(assetContexts, normalizedPath, createAssetRequestContext(movie, normalizedPath, {
        caller: preloadContext?.caller ?? "blockingPreloadBitmapAssetPaths",
        category: preloadContext?.category,
        mode: blockExplicitPreloads ? "blocking" : "warmup"
      }));
    }
    for (const assetPath of readBitmapPreloadPaths(movie.getProperty("preloadBitmapAssetPaths"))) {
      const normalizedPath = normalizeAssetPath(assetPath);
      warmupAssetPaths.add(normalizedPath);
      rememberAssetRequestContext(assetContexts, normalizedPath, createAssetRequestContext(movie, normalizedPath, {
        caller: preloadContext?.caller ?? "preloadBitmapAssetPaths",
        category: preloadContext?.category,
        mode: "warmup"
      }));
    }

    for (const sprite of sprites) {
      const member = movie.cast.getMember(sprite.member);
      if (!member || member.type !== "bitmap") {
        continue;
      }

      const blocksFramePaint = options.forceBlocking === true || shouldBlockSpriteBitmapPreload(movie, sprite);
      if (member.composite) {
        if (blocksFramePaint) {
          compositeSprites.push({ sprite, member });
        }
        for (const layer of member.composite.layers) {
          if (layer.assetPath) {
            const normalizedPath = normalizeAssetPath(layer.assetPath);
            if (blocksFramePaint) {
              requiredAssetPaths.add(normalizedPath);
            } else {
              warmupAssetPaths.add(normalizedPath);
            }
            rememberAssetRequestContext(assetContexts, normalizedPath, createAssetRequestContext(movie, normalizedPath, {
              caller: "sprite.composite.layer",
              mode: blocksFramePaint ? "blocking" : "warmup",
              sprite
            }));
          }
        }
        continue;
      }

      const assetPath = getBitmapAssetPath(sprite, member);
      if (assetPath) {
        const normalizedPath = normalizeAssetPath(assetPath);
        if (blocksFramePaint) {
          requiredAssetPaths.add(normalizedPath);
        } else {
          warmupAssetPaths.add(normalizedPath);
        }
        rememberAssetRequestContext(assetContexts, normalizedPath, createAssetRequestContext(movie, normalizedPath, {
          caller: "sprite.bitmap",
          mode: blocksFramePaint ? "blocking" : "warmup",
          sprite
        }));

        const inkKey = bitmapInkTextureKey(normalizedPath, sprite);
        if (inkKey) {
          const entry = { assetPath: normalizedPath, sprite };
          if (blocksFramePaint) {
            requiredBitmapInkSprites.set(inkKey, entry);
          } else if (!requiredBitmapInkSprites.has(inkKey)) {
            warmupBitmapInkSprites.set(inkKey, entry);
          }
        }
      }
    }

    for (const sprite of options.extraWarmupSprites ?? []) {
      const member = movie.cast.getMember(sprite.member);
      if (!member || member.type !== "bitmap") {
        continue;
      }

      const blocksFramePaint = options.forceBlocking === true;
      if (member.composite) {
        if (blocksFramePaint) {
          compositeSprites.push({ sprite, member });
        }
        for (const layer of member.composite.layers) {
          if (!layer.assetPath) {
            continue;
          }
          const normalizedPath = normalizeAssetPath(layer.assetPath);
          if (blocksFramePaint) {
            requiredAssetPaths.add(normalizedPath);
          } else {
            warmupAssetPaths.add(normalizedPath);
          }
          rememberAssetRequestContext(assetContexts, normalizedPath, createAssetRequestContext(movie, normalizedPath, {
            caller: "extraWarmup.composite.layer",
            mode: blocksFramePaint ? "blocking" : "warmup",
            sprite
          }));
        }
        continue;
      }

      const assetPath = getBitmapAssetPath(sprite, member);
      if (!assetPath) {
        continue;
      }

      const normalizedPath = normalizeAssetPath(assetPath);
      if (blocksFramePaint) {
        requiredAssetPaths.add(normalizedPath);
      } else {
        warmupAssetPaths.add(normalizedPath);
      }
      rememberAssetRequestContext(assetContexts, normalizedPath, createAssetRequestContext(movie, normalizedPath, {
        caller: "extraWarmup.bitmap",
        mode: blocksFramePaint ? "blocking" : "warmup",
        sprite
      }));

      const inkKey = bitmapInkTextureKey(normalizedPath, sprite);
      if (!inkKey) {
        continue;
      }

      const entry = { assetPath: normalizedPath, sprite };
      if (blocksFramePaint) {
        requiredBitmapInkSprites.set(inkKey, entry);
      } else if (!requiredBitmapInkSprites.has(inkKey)) {
        warmupBitmapInkSprites.set(inkKey, entry);
      }
    }

    this.warmBitmapAssetPaths(
      movie,
      [...warmupAssetPaths].filter((assetPath) => !requiredAssetPaths.has(assetPath)),
      assetContexts
    );

    await Promise.all([...requiredAssetPaths].map((assetPath) => (
      this.ensureBitmapTextureLoaded(movie, assetPath, assetContexts.get(assetPath) ?? createAssetRequestContext(movie, assetPath, {
        caller: "required.bitmap",
        mode: "blocking"
      }))
    )));

    if (typeof Image !== "undefined") {
      await Promise.all([...requiredAssetPaths].map(async (assetPath) => {
        if (this.failedAssets.has(assetPath)) {
          return;
        }

        try {
          await this.loadImageElement(movie, assetPath, assetContexts.get(assetPath) ?? createAssetRequestContext(movie, assetPath, {
            caller: "required.image",
            mode: "blocking"
          }));
        } catch (error) {
          this.failedAssets.add(assetPath);
          movie.unsupported.add({
            subsystem: "renderer",
            feature: "bitmap-asset-image-preload-failed",
            detail: `Failed to preload generated bitmap image ${assetPath}: ${String(error)}`
          });
        }
      }));
    }

    this.warmBitmapInkTextures(
      movie,
      [...warmupBitmapInkSprites.values()]
        .filter((entry) => !requiredBitmapInkSprites.has(bitmapInkTextureKey(entry.assetPath, entry.sprite) ?? ""))
    );

    await Promise.all([...requiredBitmapInkSprites.values()].map((entry) => (
      this.ensureBitmapInkTextureLoaded(movie, entry.assetPath, entry.sprite, assetContexts.get(entry.assetPath))
    )));

    await Promise.all(compositeSprites.map(async ({ sprite, member }) => {
      await this.preloadBitmapComposite(movie, sprite, member);
    }));
    this.publishAssetBrokerSummary(movie, options.forceBlocking === true);
  }

  private warmBitmapAssetPaths(movie: DirectorMovie, assetPaths: readonly string[], contexts: ReadonlyMap<string, DirectorAssetRequestContext>): void {
    for (const assetPath of assetPaths) {
      if (this.failedAssets.has(assetPath)
        || this.bitmapTextureCache.has(assetPath)
        || this.pendingBitmapAssetWarmups.has(assetPath)) {
        continue;
      }

      const promise = this.warmBitmapAssetPath(movie, assetPath, contexts.get(assetPath) ?? createAssetRequestContext(movie, assetPath, {
        caller: "warmup.bitmap",
        mode: "warmup"
      }))
        .finally(() => {
          this.pendingBitmapAssetWarmups.delete(assetPath);
        });
      this.pendingBitmapAssetWarmups.set(assetPath, promise);
      void promise;
    }
  }

  private async warmBitmapAssetPath(movie: DirectorMovie, assetPath: string, context: DirectorAssetRequestContext): Promise<void> {
    await this.ensureBitmapTextureLoaded(movie, assetPath, context);
    if (typeof Image !== "undefined" && !this.failedAssets.has(assetPath)) {
      try {
        await this.loadImageElement(movie, assetPath, context);
      } catch (error) {
        this.failedAssets.add(assetPath);
        movie.unsupported.add({
          subsystem: "renderer",
          feature: "bitmap-asset-image-preload-failed",
          detail: `Failed to preload generated bitmap image ${assetPath}: ${String(error)}`
        });
      }
    }
  }

  private warmBitmapInkTextures(
    movie: DirectorMovie,
    entries: readonly { readonly assetPath: string; readonly sprite: DirectorSpriteChannel }[]
  ): void {
    for (const entry of entries) {
      const key = bitmapInkTextureKey(entry.assetPath, entry.sprite);
      if (!key
        || this.failedAssets.has(entry.assetPath)
        || this.bitmapInkTextureCache.has(key)
        || this.pendingBitmapInkTextureWarmups.has(key)) {
        continue;
      }

      const promise = this.ensureBitmapInkTextureLoaded(movie, entry.assetPath, entry.sprite, createAssetRequestContext(movie, entry.assetPath, {
        caller: "warmup.ink",
        mode: "warmup",
        sprite: entry.sprite
      }))
        .finally(() => {
          this.pendingBitmapInkTextureWarmups.delete(key);
        });
      this.pendingBitmapInkTextureWarmups.set(key, promise);
      void promise;
    }
  }

  private async ensureBitmapTextureLoaded(movie: DirectorMovie, assetPath: string, context: DirectorAssetRequestContext): Promise<void> {
    if (this.failedAssets.has(assetPath)) {
      return;
    }

    if (this.bitmapTextureCache.has(assetPath)) {
      this.assetBroker.recordMemoryHit(context);
      return;
    }

    const pendingTexture = this.pendingBitmapTextureLoads.get(assetPath);
    if (pendingTexture) {
      this.assetBroker.recordPendingHit(context);
      await pendingTexture;
      return;
    }

    const pendingWarmup = this.pendingBitmapAssetWarmups.get(assetPath);
    if (pendingWarmup) {
      this.assetBroker.recordPendingHit(context);
      await pendingWarmup;
      return;
    }

    const load = this.loadBitmapTexture(movie, assetPath, context)
      .finally(() => {
        this.pendingBitmapTextureLoads.delete(assetPath);
      });
    this.pendingBitmapTextureLoads.set(assetPath, load);
    await load;
  }

  private getBitmapTextureForSprite(assetPath: string, sprite: DirectorSpriteChannel): Texture | undefined {
    const key = bitmapInkTextureKey(assetPath, sprite);
    if (!key) {
      return this.bitmapTextureCache.get(assetPath);
    }

    const cached = this.bitmapInkTextureCache.get(key);
    if (cached) {
      return cached;
    }

    if (this.failedAssets.has(assetPath)) {
      return undefined;
    }

    const image = this.assetBroker.getLoadedImage(assetPath);
    if (!image || typeof document === "undefined") {
      return undefined;
    }

    return this.createBitmapInkTexture(assetPath, sprite, image);
  }

  private async ensureBitmapInkTextureLoaded(
    movie: DirectorMovie,
    assetPath: string,
    sprite: DirectorSpriteChannel,
    context: DirectorAssetRequestContext | undefined
  ): Promise<void> {
    const key = bitmapInkTextureKey(assetPath, sprite);
    if (!key || this.bitmapInkTextureCache.has(key) || this.failedAssets.has(assetPath)) {
      return;
    }

    const pendingWarmup = this.pendingBitmapInkTextureWarmups.get(key);
    if (pendingWarmup) {
      await pendingWarmup;
      return;
    }

    try {
      const resolvedContext = context ?? createAssetRequestContext(movie, assetPath, {
        caller: "ink.bitmap",
        mode: "blocking",
        sprite
      });
      await this.ensureBitmapTextureLoaded(movie, assetPath, resolvedContext);
      if (this.failedAssets.has(assetPath) || typeof document === "undefined") {
        return;
      }

      const image = await this.loadImageElement(movie, assetPath, resolvedContext);
      this.createBitmapInkTexture(assetPath, sprite, image);
    } catch (error) {
      this.failedAssets.add(assetPath);
      movie.unsupported.add({
        subsystem: "renderer",
        feature: "bitmap-asset-ink-process-failed",
        detail: `Failed to apply Director ink ${sprite.ink} to generated bitmap asset ${assetPath}: ${String(error)}`
      });
    }
  }

  private createBitmapInkTexture(assetPath: string, sprite: DirectorSpriteChannel, image: HTMLImageElement): Texture | undefined {
    const key = bitmapInkTextureKey(assetPath, sprite);
    if (!key || this.bitmapInkTextureCache.has(key) || typeof document === "undefined") {
      return key ? this.bitmapInkTextureCache.get(key) : undefined;
    }

    const width = Math.max(1, Math.round(image.naturalWidth || image.width));
    const height = Math.max(1, Math.round(image.naturalHeight || image.height));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return undefined;
    }

    // Direct bitmap sprites and composite/window buffers must share Director
    // matte behavior. Pixi tint alone recolors white matte pixels and hides
    // room wall windows behind solid wall-part rectangles.
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    applyDirectorInkToCanvas(context, width, height, { ink: sprite.ink, bgColor: sprite.bgColor });

    const texture = Texture.from(canvas, true);
    texture.source.scaleMode = "nearest";
    this.bitmapInkTextureCache.set(key, texture);
    return texture;
  }

  private async preloadBitmapComposite(movie: DirectorMovie, sprite: DirectorSpriteChannel, member: DirectorMember): Promise<void> {
    const composite = member.composite;
    if (!composite || typeof document === "undefined") {
      return;
    }

    const key = compositeTextureKey(sprite, member);
    if (this.compositeTextureCache.has(key)) {
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(composite.width));
      canvas.height = Math.max(1, Math.round(composite.height));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return;
      }

      // Director window groups are one bitmap buffer per #id, then one sprite.
      // Baking here keeps matte and rounded-corner behavior out of Pixi child transforms.
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const layer of composite.layers) {
        context.globalAlpha = clampAlpha(layer.alpha ?? 1);
        const layerAssetPath = layer.assetPath ? normalizeAssetPath(layer.assetPath) : undefined;
        const image = layerAssetPath ? await this.loadImageElement(movie, layerAssetPath, createAssetRequestContext(movie, layerAssetPath, {
          caller: "composite.layer",
          mode: "blocking",
          sprite
        })) : undefined;
        drawCompositeLayer(context, image, layer);
      }
      context.globalAlpha = 1;

      applyDirectorInkToCanvas(context, canvas.width, canvas.height, { ink: sprite.ink, bgColor: sprite.bgColor });

      const texture = Texture.from(canvas, true);
      texture.source.scaleMode = "nearest";
      this.compositeTextureCache.set(key, texture);
    } catch (error) {
      movie.unsupported.add({
        subsystem: "renderer",
        feature: "bitmap-composite-bake-failed",
        detail: `Failed to bake grouped bitmap member ${member.name ?? member.key}: ${String(error)}`
      });
    }
  }

  private async loadBitmapTexture(movie: DirectorMovie, assetPath: string, context: DirectorAssetRequestContext): Promise<void> {
    try {
      const image = await this.loadImageElement(movie, assetPath, context);
      const texture = Texture.from(image);
      texture.source.scaleMode = "nearest";
      this.bitmapTextureCache.set(assetPath, texture);
      this.publishAssetBrokerSummary(movie, true);
    } catch (error) {
      this.failedAssets.add(assetPath);
      this.assetBroker.markFailed(context);
      this.publishAssetBrokerSummary(movie, true);
      movie.unsupported.add({
        subsystem: "renderer",
        feature: "bitmap-asset-load-failed",
        detail: `Failed to load generated bitmap asset ${assetPath}: ${String(error)}`
      });
    }
  }

  private loadImageElement(movie: DirectorMovie, assetPath: string, context: DirectorAssetRequestContext): Promise<HTMLImageElement> {
    const promise = this.assetBroker.loadImageElement(context);
    this.publishAssetBrokerSummary(movie);
    return promise;
  }

  private publishAssetBrokerSummary(movie: DirectorMovie, force = false): void {
    const now = Date.now();
    if (!force && now - this.lastAssetBrokerSummaryPublishAt < 1000) {
      return;
    }

    const summary = this.assetBroker.snapshot();
    const shouldPublish = force
      || summary.networkLoads !== this.lastAssetBrokerSummaryNetworkLoads
      || summary.failures !== this.lastAssetBrokerSummaryFailures
      || now - this.lastAssetBrokerSummaryPublishAt >= 1000;
    if (!shouldPublish) {
      return;
    }

    movie.setProperty("assetRequestSummary", summary);
    this.lastAssetBrokerSummaryPublishAt = now;
    this.lastAssetBrokerSummaryNetworkLoads = summary.networkLoads;
    this.lastAssetBrokerSummaryFailures = summary.failures;
  }

  private appendCompositeLayerFallback(container: Container, layer: DirectorBitmapCompositeLayer): void {
    const width = Math.max(1, Math.round(layer.width));
    const height = Math.max(1, Math.round(layer.height));
    const sourceWidth = Math.max(1, Math.round(layer.sourceWidth ?? width));
    const sourceHeight = Math.max(1, Math.round(layer.sourceHeight ?? height));
    const repeat = layer.repeat === true;
    const stepX = repeat ? sourceWidth : width;
    const stepY = repeat ? sourceHeight : height;
    if (layer.fillColor) {
      const graphics = new Graphics();
      graphics.rect(Math.round(layer.x), Math.round(layer.y), width, height).fill(colorToNumber(layer.fillColor));
      container.addChild(graphics);
    }
    if (!layer.assetPath) {
      return;
    }

    const texture = this.bitmapTextureCache.get(normalizeAssetPath(layer.assetPath));
    if (!texture) {
      return;
    }

    for (let tileY = 0; tileY < height; tileY += stepY) {
      for (let tileX = 0; tileX < width; tileX += stepX) {
        const bitmap = new Sprite(texture);
        bitmap.roundPixels = true;
        bitmap.texture.source.scaleMode = "nearest";
        bitmap.x = Math.round(layer.x + tileX);
        bitmap.y = Math.round(layer.y + tileY);
        bitmap.width = repeat ? Math.min(sourceWidth, width - tileX) : width;
        bitmap.height = repeat ? Math.min(sourceHeight, height - tileY) : height;
        bitmap.alpha = clampAlpha(layer.alpha ?? 1);
        if (layer.flipH === true) {
          bitmap.scale.x *= -1;
          bitmap.x += bitmap.width;
        }
        if (layer.flipV === true) {
          bitmap.scale.y *= -1;
          bitmap.y += bitmap.height;
        }
        if (layer.rotate !== undefined && layer.rotate !== 0) {
          bitmap.angle = normalizeQuarterTurns(layer.rotate) * 90;
        }
        if (layer.tint) {
          bitmap.tint = colorToNumber(layer.tint);
        }
        container.addChild(bitmap);

        if (!repeat) {
          return;
        }
      }
    }
  }

  private async ensureTextFontsReady(movie: DirectorMovie, sprites: readonly DirectorSpriteChannel[]): Promise<void> {
    if (this.textFontsReady || typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    const fontLoads = new Set<string>();
    for (const sprite of sprites) {
      const member = movie.cast.getMember(sprite.member);
      if (!member || !shouldRenderPixelText(member)) {
        continue;
      }

      const fontSize = Math.max(1, Math.round(member.fontSize ?? 12));
      const fontWeight = member.fontWeight ?? "400";
      fontLoads.add(`${fontWeight} ${fontSize}px ${resolveDirectorTextFontFamily(member.fontFamily)}`);
    }

    if (fontLoads.size === 0) {
      return;
    }

    await Promise.all([...fontLoads].map(async (font) => document.fonts.load(font)));
    await document.fonts.ready;
    this.textTextureCache.clear();
    this.textFontsReady = true;
  }
}

function clampAlpha(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function applyDirectorSpriteContainerPlacement(container: Container, sprite: DirectorSpriteChannel, member: DirectorMember): void {
  const placement = resolveDirectorSpritePlacement(sprite, member);
  container.x = placement.x;
  container.y = placement.y;
  container.alpha = Math.max(0, Math.min(100, sprite.blend)) / 100;
}

function renderedSpriteContentSignature(sprite: DirectorSpriteChannel, member: DirectorMember): string {
  return [
    member.type,
    sprite.member.castLib,
    sprite.member.member,
    directorRenderableText(member.text),
    member.shapeType ?? "",
    member.shapeFillType ?? "",
    member.shapeLineThickness ?? "",
    member.fontFamily ?? "",
    member.fontSize ?? "",
    member.fontWeight ?? "",
    member.fontStyle ?? "",
    member.lineHeight ?? "",
    member.textAlign ?? "",
    member.wordWrap === true ? "wrap" : "",
    member.underline === true ? "underline" : "",
    member.textScrollY ?? "",
    JSON.stringify(member.textSpans ?? []),
    sprite.width ?? "",
    sprite.height ?? "",
    sprite.ink ?? "",
    sprite.blend ?? "",
    sprite.bgColor ?? "",
    sprite.fgColor ?? "",
    sprite.flipH === true ? "h" : "",
    sprite.flipV === true ? "v" : ""
  ].join("|");
}

function directorRenderableText(text: string | undefined): string {
  if (!text) {
    return "";
  }

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return looksLikeDirectorStyledFieldPayload(normalized) ? "" : normalized;
}

function looksLikeDirectorStyledFieldPayload(text: string): boolean {
  if (!text.includes("\u0000") && !text.startsWith("\u0006")) {
    return false;
  }

  let controlCount = 0;
  let printableCount = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code < 127) {
      printableCount += 1;
    } else if (char !== "\n" && char !== "\t") {
      controlCount += 1;
    }
  }

  return text.startsWith("\u0006") || controlCount > printableCount / 2;
}

function applyDirectorSpriteFlip(
  content: Container | Graphics | Sprite,
  sprite: DirectorSpriteChannel,
  member: DirectorMember
): void {
  if (!sprite.flipH && !sprite.flipV) {
    return;
  }

  const { width, height } = resolveDirectorSpriteSize(sprite, member);
  if (sprite.flipH) {
    content.x += width;
    content.scale.x *= -1;
  }

  if (sprite.flipV) {
    content.y += height;
    content.scale.y *= -1;
  }
}

function applyDirectorSpriteBlendMode(content: Container | Graphics | Sprite, sprite: DirectorSpriteChannel): void {
  // Director ink 33 is Add Pin. Furniture effects use it through source
  // object props, so this belongs in the renderer's ink compatibility layer.
  if (sprite.ink === 33) {
    content.blendMode = "add";
  }
}

export function resolveDirectorTextColor(
  sprite: Pick<DirectorSpriteChannel, "fgColor" | "ink"> & { readonly textColorSource?: "member" | "sprite" | undefined },
  member: Pick<DirectorMember, "color">
): string {
  if (sprite.textColorSource === "sprite" && sprite.fgColor) {
    return sprite.fgColor;
  }

  if (member.color) {
    return member.color;
  }

  if (sprite.fgColor) {
    return sprite.fgColor;
  }

  return "#000000";
}

export interface DirectorSpritePlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly effectiveRegPoint: {
    readonly x: number;
    readonly y: number;
  };
}

export function resolveDirectorSpritePlacement(
  sprite: Pick<DirectorSpriteChannel, "loc" | "width" | "height" | "flipH" | "flipV"> & {
    readonly placementOffset?: { readonly x: number; readonly y: number } | undefined;
  },
  member: Pick<DirectorMember, "width" | "height" | "regPoint" | "composite">
): DirectorSpritePlacement {
  const { width, height } = resolveDirectorSpriteSize(sprite, member);
  const sourceWidth = Math.max(1, Math.round(member.composite?.width ?? member.width ?? width));
  const sourceHeight = Math.max(1, Math.round(member.composite?.height ?? member.height ?? height));
  const scaledRegX = directorInteger((member.regPoint.x * width) / sourceWidth);
  const scaledRegY = directorInteger((member.regPoint.y * height) / sourceHeight);
  const effectiveRegX = sprite.flipH ? width - scaledRegX : scaledRegX;
  const effectiveRegY = sprite.flipV ? height - scaledRegY : scaledRegY;

  return {
    x: sprite.loc.x - effectiveRegX + (sprite.placementOffset?.x ?? 0),
    y: sprite.loc.y - effectiveRegY + (sprite.placementOffset?.y ?? 0),
    width,
    height,
    effectiveRegPoint: {
      x: effectiveRegX,
      y: effectiveRegY
    }
  };
}

function resolveDirectorSpriteSize(
  sprite: Pick<DirectorSpriteChannel, "width" | "height">,
  member: Pick<DirectorMember, "width" | "height" | "composite">
): { readonly width: number; readonly height: number } {
  return {
    width: Math.max(1, Math.round(sprite.width ?? member.composite?.width ?? member.width ?? 1)),
    height: Math.max(1, Math.round(sprite.height ?? member.composite?.height ?? member.height ?? 1))
  };
}

function directorInteger(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function readBitmapPreloadPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function readBitmapPreloadContext(movie: Pick<DirectorMovie, "getProperty">): { readonly category: DirectorAssetRequestCategory | undefined; readonly caller: string | undefined } | undefined {
  const value = movie.getProperty("preloadBitmapAssetContext");
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return {
    category: isAssetRequestCategory(record.category) ? record.category : undefined,
    caller: typeof record.caller === "string" && record.caller.length > 0 ? record.caller : undefined
  };
}

function createAssetRequestContext(
  movie: DirectorMovie,
  assetPath: string,
  options: {
    readonly category?: DirectorAssetRequestCategory | undefined;
    readonly caller: string;
    readonly mode: DirectorAssetRequestMode;
    readonly sprite?: DirectorSpriteChannel | undefined;
  }
): DirectorAssetRequestContext {
  return {
    category: options.category ?? classifyAssetRequest(assetPath, options.caller, options.sprite),
    logicalId: assetPath,
    resolvedPath: assetPath,
    release: releaseFromAssetPath(assetPath) ?? releaseFromMovie(movie),
    caller: options.caller,
    mode: options.mode
  };
}

function rememberAssetRequestContext(
  contexts: Map<string, DirectorAssetRequestContext>,
  assetPath: string,
  context: DirectorAssetRequestContext
): void {
  const existing = contexts.get(assetPath);
  if (!existing) {
    contexts.set(assetPath, context);
    return;
  }

  if (existing.mode === "warmup" && context.mode === "blocking") {
    contexts.set(assetPath, context);
    return;
  }

  if ((existing.category === "unknown" || existing.category === "preload/warmup") && context.category !== "unknown") {
    contexts.set(assetPath, {
      ...context,
      mode: existing.mode === "blocking" ? "blocking" : context.mode
    });
  }
}

function classifyAssetRequest(
  assetPath: string,
  caller: string,
  sprite: Pick<DirectorSpriteChannel, "channel"> | undefined
): DirectorAssetRequestCategory {
  const path = assetPath.toLowerCase();
  const source = caller.toLowerCase();
  if (source.includes("figure")) {
    return "figure-editor";
  }
  if (source.includes("preload") || source.includes("warmup")) {
    if (path.includes("/people/") || path.includes("/hh_people")) {
      return "avatar";
    }
    return "preload/warmup";
  }
  if (path.includes("habbo_entry") || path.includes("/hh_entry") || path.includes("/cast-11-habbo-entry-gfx/")) {
    return "entry";
  }
  if (path.includes("/people/") || path.includes("/hh_people")) {
    return sprite && sprite.channel >= 650 ? "room-user" : "avatar";
  }
  if (path.includes("/navigation/") || path.includes("navigator") || path.includes("/window-bitmaps/")) {
    return "navigator/window";
  }
  if (path.includes("catalog") || path.includes("ctlg") || path.includes("catalogue")) {
    return "catalogue";
  }
  if (path.includes("furni") || path.includes("/items/") || path.includes("_furniture")) {
    return "room-object";
  }
  return "unknown";
}

function releaseFromAssetPath(assetPath: string): string | undefined {
  const match = /\/(?:generated\/assets\/)?(?:external-bitmaps|window-bitmaps|button-bitmaps|visual-bitmaps|internal-bitmaps)\/([^/]+)/i.exec(assetPath);
  return match?.[1];
}

function releaseFromMovie(movie: Pick<DirectorMovie, "id">): string | undefined {
  const match = /^(release\d+(?:_[^/-]+)?)/i.exec(movie.id);
  return match?.[1];
}

function isAssetRequestCategory(value: unknown): value is DirectorAssetRequestCategory {
  return value === "entry"
    || value === "figure-editor"
    || value === "avatar"
    || value === "room-user"
    || value === "room-object"
    || value === "catalogue"
    || value === "navigator/window"
    || value === "preload/warmup"
    || value === "unknown";
}

export function shouldBlockExplicitBitmapPreloads(movie: Pick<DirectorMovie, "getProperty">): boolean {
  if (movie.getProperty("roomLoaderVisible") !== true || movie.getProperty("roomActive") === true) {
    return true;
  }

  return false;
}

export function shouldBlockSpriteBitmapPreload(
  movie: Pick<DirectorMovie, "getProperty">,
  sprite: Pick<DirectorSpriteChannel, "channel">
): boolean {
  if (movie.getProperty("roomLoaderVisible") !== true || movie.getProperty("roomActive") === true) {
    return true;
  }

  return !isRoomBootstrapSprite(movie, sprite.channel);
}

function isRoomBootstrapSprite(movie: Pick<DirectorMovie, "getProperty">, channel: number): boolean {
  return [
    "roomVisualOverlaySprites",
    "roomObjectOverlaySprites",
    "roomHiliterOverlaySprites",
    "roomUserOverlaySprites",
    "roomChatOverlaySprites"
  ].some((propertyName) => spriteArrayContainsChannel(movie.getProperty(propertyName), channel));
}

function spriteArrayContainsChannel(value: unknown, channel: number): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((entry) => {
    if (typeof entry !== "object" || entry === null || !("channel" in entry)) {
      return false;
    }

    return (entry as { readonly channel?: unknown }).channel === channel;
  });
}

function numberFromMovieProperty(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function compositeTextureKey(sprite: DirectorSpriteChannel, member: DirectorMember): string {
  const composite = member.composite;
  const compositeSignature = composite
    ? `${composite.width}x${composite.height}:${
        composite.layers.map((layer) => [
          layer.assetPath ?? "",
          layer.fillColor ?? "",
          layer.text ?? "",
          layer.color ?? "",
          layer.fontFamily ?? "",
          layer.fontSize ?? "",
          layer.fontWeight ?? "",
          layer.fontStyle ?? "",
          layer.lineHeight ?? "",
          layer.underline === true ? "underline" : "",
          layer.textAlign ?? "",
          layer.x,
          layer.y,
          layer.width,
          layer.height,
          layer.sourceX ?? "",
          layer.sourceY ?? "",
          layer.sourceWidth ?? "",
          layer.sourceHeight ?? "",
          layer.trimWhitespace === true ? "trimWhitespace" : "",
          layer.alignX ?? "",
          layer.alignY ?? "",
          layer.alpha ?? "",
          layer.flipH === true ? "flipH" : "",
          layer.flipV === true ? "flipV" : "",
          layer.rotate ?? "",
          layer.tint ?? "",
          layer.copyPixelsColor === true ? "copyPixelsColor" : "",
          layer.ink ?? "",
          layer.repeat === true ? "repeat" : "stretch"
        ].join(",")).join("|")
      }`
    : "";
  return `${member.key}:ink=${sprite.ink ?? 0}:blend=${sprite.blend}:bg=${sprite.bgColor ?? ""}:composite=${compositeSignature}`;
}

function drawCompositeLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  layer: DirectorBitmapCompositeLayer
): void {
  const x = Math.round(layer.x);
  const y = Math.round(layer.y);
  const width = Math.max(1, Math.round(layer.width));
  const height = Math.max(1, Math.round(layer.height));

  if (layer.fillColor) {
    context.fillStyle = layer.fillColor;
    context.fillRect(x, y, width, height);
  }

  if (image === undefined) {
    if (layer.text !== undefined) {
      drawCompositeTextLayer(context, layer, x, y, width, height);
    }
    return;
  }

  const rotatedImage = layer.rotate !== undefined && layer.rotate !== 0
    ? createRotatedImage(context, image, layer.rotate, layer.flipH === true, layer.flipV === true)
    : undefined;
  const sourceImage = rotatedImage ?? image;
  const flipH = rotatedImage ? false : layer.flipH === true;
  const flipV = rotatedImage ? false : layer.flipV === true;
  const sourceRect = resolveCompositeLayerSourceRect(context, sourceImage, layer);
  const inkProcessedSource = createCompositeLayerInkSource(context, sourceImage, sourceRect, layer.ink);
  const drawableSourceImage = inkProcessedSource?.image ?? sourceImage;
  const drawableSourceRect = inkProcessedSource?.sourceRect ?? sourceRect;

  if (layer.repeat !== true) {
    const drawPlan = resolveCompositeLayerDrawPlan(layer, x, y, width, height, drawableSourceRect);
    if (layer.tint) {
      if (layer.copyPixelsColor === true) {
        drawCopyPixelsColorCompositeLayer(context, drawableSourceImage, drawPlan.x, drawPlan.y, drawPlan.width, drawPlan.height, layer.tint, flipH, flipV, drawPlan.sourceRect);
      } else {
        drawTintedCompositeLayer(context, drawableSourceImage, drawPlan.x, drawPlan.y, drawPlan.width, drawPlan.height, layer.tint, flipH, flipV, drawPlan.sourceRect);
      }
      return;
    }
    drawImageLayer(context, drawableSourceImage, drawPlan.x, drawPlan.y, drawPlan.width, drawPlan.height, flipH, flipV, drawPlan.sourceRect);
    return;
  }

  const sourceWidth = Math.max(1, Math.round(drawableSourceRect.width));
  const sourceHeight = Math.max(1, Math.round(drawableSourceRect.height));
  for (let tileY = 0; tileY < height; tileY += sourceHeight) {
    for (let tileX = 0; tileX < width; tileX += sourceWidth) {
      const drawWidth = Math.min(sourceWidth, width - tileX);
      const drawHeight = Math.min(sourceHeight, height - tileY);
      context.drawImage(
        drawableSourceImage,
        drawableSourceRect.x,
        drawableSourceRect.y,
        drawWidth,
        drawHeight,
        x + tileX,
        y + tileY,
        drawWidth,
        drawHeight
      );
    }
  }

  if (layer.text !== undefined) {
    drawCompositeTextLayer(context, layer, x, y, width, height);
  }
}

function createCompositeLayerInkSource(
  context: CanvasRenderingContext2D,
  sourceImage: CanvasImageSource,
  sourceRect: CompositeSourceRect,
  ink: number | undefined
): { readonly image: HTMLCanvasElement; readonly sourceRect: CompositeSourceRect } | undefined {
  if (!directorInkRequiresCanvasProcessing(ink)) {
    return undefined;
  }

  const resolvedInk = ink ?? 0;
  const canvas = context.canvas.ownerDocument?.createElement("canvas") ?? document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceRect.width));
  canvas.height = Math.max(1, Math.round(sourceRect.height));
  const inkContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!inkContext) {
    return undefined;
  }

  inkContext.imageSmoothingEnabled = false;
  inkContext.drawImage(
    sourceImage,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  applyDirectorInkToCanvas(inkContext, canvas.width, canvas.height, { ink: resolvedInk });
  return {
    image: canvas,
    sourceRect: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
    }
  };
}

interface CompositeSourceRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface CompositeLayerDrawPlan {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly sourceRect: CompositeSourceRect;
}

function resolveCompositeLayerSourceRect(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  layer: DirectorBitmapCompositeLayer
): CompositeSourceRect {
  const dimensions = imageSourceDimensions(image);
  const sourceX = clampInt(layer.sourceX ?? 0, 0, Math.max(0, dimensions.width - 1));
  const sourceY = clampInt(layer.sourceY ?? 0, 0, Math.max(0, dimensions.height - 1));
  const availableWidth = Math.max(1, dimensions.width - sourceX);
  const availableHeight = Math.max(1, dimensions.height - sourceY);
  const sourceWidth = clampInt(layer.sourceWidth ?? availableWidth, 1, availableWidth);
  const sourceHeight = clampInt(layer.sourceHeight ?? availableHeight, 1, availableHeight);
  const sourceRect = { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight };

  if (layer.trimWhitespace !== true) {
    return sourceRect;
  }

  return trimWhitespaceSourceRect(context, image, sourceRect);
}

function resolveCompositeLayerDrawPlan(
  layer: DirectorBitmapCompositeLayer,
  x: number,
  y: number,
  width: number,
  height: number,
  sourceRect: CompositeSourceRect
): CompositeLayerDrawPlan {
  if (layer.trimWhitespace !== true) {
    return { x, y, width, height, sourceRect };
  }

  const drawWidth = Math.max(1, Math.round(sourceRect.width));
  const drawHeight = Math.max(1, Math.round(sourceRect.height));
  return {
    x: x + alignedCompositeOffset(width, drawWidth, layer.alignX ?? "center"),
    y: y + alignedCompositeOffset(height, drawHeight, layer.alignY ?? "center"),
    width: drawWidth,
    height: drawHeight,
    sourceRect
  };
}

function imageSourceDimensions(image: CanvasImageSource): { readonly width: number; readonly height: number } {
  if ("naturalWidth" in image && typeof image.naturalWidth === "number" && image.naturalWidth > 0) {
    return {
      width: Math.max(1, Math.round(image.naturalWidth)),
      height: Math.max(1, Math.round(image.naturalHeight))
    };
  }

  const sizedSource = image as { readonly width?: unknown; readonly height?: unknown; readonly displayWidth?: unknown; readonly displayHeight?: unknown };
  const width = typeof sizedSource.width === "number"
    ? sizedSource.width
    : typeof sizedSource.displayWidth === "number"
      ? sizedSource.displayWidth
      : 1;
  const height = typeof sizedSource.height === "number"
    ? sizedSource.height
    : typeof sizedSource.displayHeight === "number"
      ? sizedSource.displayHeight
      : 1;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

function trimWhitespaceSourceRect(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceRect: CompositeSourceRect
): CompositeSourceRect {
  const canvas = context.canvas.ownerDocument.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceRect.width));
  canvas.height = Math.max(1, Math.round(sourceRect.height));
  const trimContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!trimContext) {
    return sourceRect;
  }

  trimContext.imageSmoothingEnabled = false;
  trimContext.clearRect(0, 0, canvas.width, canvas.height);
  trimContext.drawImage(
    image,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    0,
    0,
    sourceRect.width,
    sourceRect.height
  );
  const imageData = trimContext.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width;
  let top = canvas.height;
  let right = -1;
  let bottom = -1;
  for (let pixelY = 0; pixelY < canvas.height; pixelY++) {
    for (let pixelX = 0; pixelX < canvas.width; pixelX++) {
      const offset = (pixelY * canvas.width + pixelX) * 4;
      const alpha = imageData.data[offset + 3] ?? 0;
      if (alpha === 0) {
        continue;
      }

      const red = imageData.data[offset] ?? 0;
      const green = imageData.data[offset + 1] ?? 0;
      const blue = imageData.data[offset + 2] ?? 0;
      if (red >= 250 && green >= 250 && blue >= 250) {
        continue;
      }

      left = Math.min(left, pixelX);
      top = Math.min(top, pixelY);
      right = Math.max(right, pixelX);
      bottom = Math.max(bottom, pixelY);
    }
  }

  if (right < left || bottom < top) {
    return sourceRect;
  }

  return {
    x: sourceRect.x + left,
    y: sourceRect.y + top,
    width: right - left + 1,
    height: bottom - top + 1
  };
}

function alignedCompositeOffset(containerSize: number, drawSize: number, align: "left" | "center" | "right" | "top" | "bottom"): number {
  if (align === "right" || align === "bottom") {
    return Math.round(containerSize - drawSize);
  }
  if (align === "center") {
    return Math.round((containerSize - drawSize) / 2);
  }
  return 0;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function createRotatedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rotate: number,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth || image.width));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight || image.height));
  const baseCanvas = context.canvas.ownerDocument.createElement("canvas");
  baseCanvas.width = sourceWidth;
  baseCanvas.height = sourceHeight;
  const baseContext = baseCanvas.getContext("2d");
  if (!baseContext) {
    return baseCanvas;
  }

  baseContext.imageSmoothingEnabled = false;
  baseContext.translate(flipH ? sourceWidth : 0, flipV ? sourceHeight : 0);
  baseContext.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  baseContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  const quarterTurns = normalizeQuarterTurns(rotate);
  if (quarterTurns === 0) {
    return baseCanvas;
  }

  const rotatedCanvas = context.canvas.ownerDocument.createElement("canvas");
  rotatedCanvas.width = quarterTurns % 2 === 0 ? sourceWidth : sourceHeight;
  rotatedCanvas.height = quarterTurns % 2 === 0 ? sourceHeight : sourceWidth;
  const rotatedContext = rotatedCanvas.getContext("2d");
  if (!rotatedContext) {
    return rotatedCanvas;
  }

  rotatedContext.imageSmoothingEnabled = false;
  if (quarterTurns === 1) {
    rotatedContext.translate(rotatedCanvas.width, 0);
    rotatedContext.rotate(Math.PI / 2);
  } else if (quarterTurns === 2) {
    rotatedContext.translate(rotatedCanvas.width, rotatedCanvas.height);
    rotatedContext.rotate(Math.PI);
  } else {
    rotatedContext.translate(0, rotatedCanvas.height);
    rotatedContext.rotate(-Math.PI / 2);
  }
  rotatedContext.drawImage(baseCanvas, 0, 0);
  return rotatedCanvas;
}

function normalizeQuarterTurns(rotate: number): number {
  return ((Math.round(rotate) % 4) + 4) % 4;
}

function drawTintedCompositeLayer(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  flipH: boolean,
  flipV: boolean,
  sourceRect?: CompositeSourceRect
): void {
  const layerCanvas = context.canvas.ownerDocument.createElement("canvas");
  layerCanvas.width = width;
  layerCanvas.height = height;
  const layerContext = layerCanvas.getContext("2d", { willReadFrequently: true });
  if (!layerContext) {
    drawImageLayer(context, image, x, y, width, height, flipH, flipV, sourceRect);
    return;
  }

  // Director feedImage parts are colored before they are copied into the parent buffer.
  // Keeping tint on a temporary canvas avoids recoloring already-drawn body parts.
  layerContext.imageSmoothingEnabled = false;
  drawImageLayer(layerContext, image, 0, 0, width, height, false, false, sourceRect);
  multiplyCanvasByColor(layerContext, 0, 0, width, height, color);
  drawImageLayer(context, layerCanvas, x, y, width, height, flipH, flipV);
}

function drawCopyPixelsColorCompositeLayer(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  flipH: boolean,
  flipV: boolean,
  sourceRect?: CompositeSourceRect
): void {
  const layerCanvas = context.canvas.ownerDocument.createElement("canvas");
  layerCanvas.width = width;
  layerCanvas.height = height;
  const layerContext = layerCanvas.getContext("2d", { willReadFrequently: true });
  if (!layerContext) {
    drawImageLayer(context, image, x, y, width, height, flipH, flipV, sourceRect);
    return;
  }

  // Director copyPixels with [#color] colors the source foreground mask as it
  // lands in the destination image. v7 chat balloons create a white 8-bit
  // destination first, then color only the white mask pixels from the balloon
  // strips. Black pixels leave the destination untouched; the final ink 8
  // sprite mattes away edge-connected white but keeps the enclosed white body.
  layerContext.imageSmoothingEnabled = false;
  drawImageLayer(layerContext, image, 0, 0, width, height, false, false, sourceRect);
  const imageData = layerContext.getImageData(0, 0, width, height);
  const numeric = colorToNumber(color);
  const red = (numeric >> 16) & 0xff;
  const green = (numeric >> 8) & 0xff;
  const blue = numeric & 0xff;
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const alpha = imageData.data[offset + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }

    const sourceRed = imageData.data[offset] ?? 0;
    const sourceGreen = imageData.data[offset + 1] ?? 0;
    const sourceBlue = imageData.data[offset + 2] ?? 0;
    if (sourceRed <= 15 && sourceGreen <= 15 && sourceBlue <= 15) {
      imageData.data[offset + 3] = 0;
      continue;
    }

    if (sourceRed >= 240 && sourceGreen >= 240 && sourceBlue >= 240) {
      imageData.data[offset] = red;
      imageData.data[offset + 1] = green;
      imageData.data[offset + 2] = blue;
      imageData.data[offset + 3] = 255;
    } else {
      imageData.data[offset + 3] = 0;
    }
  }
  layerContext.putImageData(imageData, 0, 0);
  drawImageLayer(context, layerCanvas, x, y, width, height, flipH, flipV);
}

function drawCompositeTextLayer(
  context: CanvasRenderingContext2D,
  layer: DirectorBitmapCompositeLayer,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const fontSize = Math.max(1, Math.round(layer.fontSize ?? 9));
  const lineHeight = Math.max(1, Math.round(layer.lineHeight ?? fontSize + 2));
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.font = `${layer.fontStyle === "italic" ? "italic " : ""}${layer.fontWeight ?? "400"} ${fontSize}px ${resolveDirectorTextFontFamily(layer.fontFamily)}`;
  context.textBaseline = "top";
  context.fillStyle = layer.color ?? "#000000";
  const lines = (layer.text ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? "";
    const textWidth = Math.ceil(context.measureText(line).width);
    const lineY = y + lineIndex * lineHeight;
    if (lineY >= y + height) {
      break;
    }

    let lineX = x;
    if (layer.textAlign === "center") {
      lineX = x + Math.floor((width - textWidth) / 2);
    } else if (layer.textAlign === "right") {
      lineX = x + width - textWidth;
    }

    context.fillText(line, lineX, lineY);
    if (layer.underline === true && line.length > 0) {
      context.fillRect(Math.round(lineX), Math.min(y + height - 1, lineY + fontSize), Math.max(1, textWidth), 1);
    }
  }
  context.restore();
}

function drawImageLayer(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  flipH: boolean,
  flipV: boolean,
  sourceRect?: CompositeSourceRect
): void {
  const source = sourceRect ?? {
    x: 0,
    y: 0,
    ...imageSourceDimensions(image)
  };
  context.save();
  context.translate(flipH ? x + width : x, flipV ? y + height : y);
  context.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, width, height);
  context.restore();
}

function shouldRenderPixelText(member: DirectorMember): boolean {
  return member.type === "text" || member.type === "field";
}

export function resolveDirectorTextFontFamily(_fontFamily: string | undefined): string {
  return habboDefaultFontFamily;
}

interface LaidOutTextLine {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

function layoutTextLines(context: CanvasRenderingContext2D, text: string, width: number, wordWrap: boolean): string[] {
  return layoutTextLinesWithRanges(context, text, width, wordWrap).map((line) => line.text);
}

function layoutTextLinesWithRanges(context: CanvasRenderingContext2D, text: string, width: number, wordWrap: boolean): LaidOutTextLine[] {
  const normalizedText = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const rawLines = normalizedText.split("\n");
  if (!wordWrap) {
    let offset = 0;
    return rawLines.map((line) => {
      const start = offset;
      const end = start + line.length;
      offset = end + 1;
      return { text: line, start, end };
    });
  }

  const lines: LaidOutTextLine[] = [];
  let rawLineOffset = 0;
  for (const rawLine of rawLines) {
    const words = [...rawLine.matchAll(/\S+/g)].map((match) => ({
      text: match[0],
      start: rawLineOffset + (match.index ?? 0),
      end: rawLineOffset + (match.index ?? 0) + match[0].length
    }));
    if (rawLine.includes("\t")) {
      lines.push({ text: rawLine, start: rawLineOffset, end: rawLineOffset + rawLine.length });
      rawLineOffset += rawLine.length + 1;
      continue;
    }
    if (words.length === 0) {
      lines.push({ text: "", start: rawLineOffset, end: rawLineOffset });
      rawLineOffset += rawLine.length + 1;
      continue;
    }

    let current = "";
    let currentStart = words[0]?.start ?? rawLineOffset;
    let currentEnd = currentStart;
    for (const word of words) {
      const candidate = current ? `${current} ${word.text}` : word.text;
      if (current && context.measureText(candidate).width > width) {
        lines.push({ text: current, start: currentStart, end: currentEnd });
        const wordChunks = splitTextToWidth(context, word.text, width);
        let chunkStart = word.start;
        for (const chunk of wordChunks.slice(0, -1)) {
          const chunkEnd = chunkStart + chunk.length;
          lines.push({ text: chunk, start: chunkStart, end: chunkEnd });
          chunkStart = chunkEnd;
        }
        current = wordChunks.at(-1) ?? "";
        currentStart = chunkStart;
        currentEnd = word.end;
      } else if (!current && context.measureText(candidate).width > width) {
        const wordChunks = splitTextToWidth(context, word.text, width);
        let chunkStart = word.start;
        for (const chunk of wordChunks.slice(0, -1)) {
          const chunkEnd = chunkStart + chunk.length;
          lines.push({ text: chunk, start: chunkStart, end: chunkEnd });
          chunkStart = chunkEnd;
        }
        current = wordChunks.at(-1) ?? "";
        currentStart = chunkStart;
        currentEnd = word.end;
      } else {
        current = candidate;
        currentEnd = word.end;
      }
    }
    if (current || words.length > 0) {
      lines.push({ text: current, start: currentStart, end: currentEnd });
    }
    rawLineOffset += rawLine.length + 1;
  }

  return lines;
}

function splitTextToWidth(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const char of text) {
    const candidate = `${current}${char}`;
    if (current && context.measureText(candidate).width > width) {
      chunks.push(current);
      current = char;
      continue;
    }

    current = candidate;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [text];
}

function directorTextLineX(textAlign: "left" | "center" | "right" | undefined, width: number, textWidth: number): number {
  if (textAlign === "center") {
    return Math.floor((width - textWidth) / 2);
  }
  if (textAlign === "right") {
    return width - textWidth;
  }
  return 0;
}

function drawDirectorPixelTextLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  textAlign: "left" | "center" | "right" | undefined
): void {
  if (!text.includes("\t")) {
    context.fillText(text, x, y);
    return;
  }

  const cells = text.split("\t");
  const cellWidth = width / Math.max(1, cells.length);
  for (let index = 0; index < cells.length; index++) {
    const cellText = (cells[index] ?? "").trim();
    if (!cellText) {
      continue;
    }
    const measured = Math.ceil(context.measureText(cellText).width);
    const cellLeft = Math.round(index * cellWidth);
    const cellX = directorTextLineX(textAlign, Math.round(cellWidth), measured);
    context.fillText(cellText, cellLeft + cellX, y);
  }
}

function shouldUnderlineTextLine(memberUnderline: boolean, textSpans: readonly DirectorTextSpan[], lineStart: number, lineEnd: number): boolean {
  if (memberUnderline && lineEnd > lineStart) {
    return true;
  }

  return textSpans.some((span) => span.underline === true && rangesOverlap(lineStart, lineEnd, span.start, span.end));
}

function resolveLineUnderlineRange(
  context: CanvasRenderingContext2D,
  line: LaidOutTextLine,
  textSpans: readonly DirectorTextSpan[],
  memberUnderline: boolean
): { readonly offsetX: number; readonly width: number } {
  if (memberUnderline) {
    return {
      offsetX: 0,
      width: Math.ceil(context.measureText(line.text).width)
    };
  }

  const span = textSpans.find((candidate) => candidate.underline === true && rangesOverlap(line.start, line.end, candidate.start, candidate.end));
  if (!span) {
    return { offsetX: 0, width: 1 };
  }

  const underlineStart = Math.max(line.start, span.start);
  const underlineEnd = Math.min(line.end, span.end);
  const prefix = line.text.slice(0, Math.max(0, underlineStart - line.start));
  const underlined = line.text.slice(Math.max(0, underlineStart - line.start), Math.max(0, underlineEnd - line.start));
  return {
    offsetX: Math.ceil(context.measureText(prefix).width),
    width: Math.ceil(context.measureText(underlined).width)
  };
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function thresholdTextAlpha(context: CanvasRenderingContext2D, width: number, height: number, color: string): void {
  const image = context.getImageData(0, 0, width, height);
  const numeric = colorToNumber(color);
  const red = (numeric >> 16) & 0xff;
  const green = (numeric >> 8) & 0xff;
  const blue = numeric & 0xff;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3] ?? 0;
    if (alpha > 96) {
      image.data[offset] = red;
      image.data[offset + 1] = green;
      image.data[offset + 2] = blue;
      image.data[offset + 3] = 255;
    } else {
      image.data[offset + 3] = 0;
    }
  }
  context.putImageData(image, 0, 0);
}

function colorToNumber(color: string): number {
  if (color.startsWith("#")) {
    return Number.parseInt(color.slice(1), 16);
  }

  return Number.parseInt(color, 16);
}

function getDirectorOverlaySprites(movie: DirectorMovie): readonly DirectorSpriteChannel[] {
  const value = movie.getProperty("directorOverlaySprites");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((sprite) => new DirectorSpriteChannel(sprite as DirectorSpriteChannelManifest));
}

function getDirectorBitmapPreloadSprites(movie: DirectorMovie): readonly DirectorSpriteChannel[] {
  const values = [
    movie.getProperty("preloadBitmapSpriteManifests"),
    movie.getProperty("roomObjectAnimationPreloadSprites"),
    ...getHiddenRoomPreRevealSpriteManifests(movie)
  ];
  return values.flatMap((value) => (
    Array.isArray(value)
      ? value.map((sprite) => new DirectorSpriteChannel(sprite as DirectorSpriteChannelManifest))
      : []
  ));
}

function getHiddenRoomPreRevealSpriteManifests(movie: DirectorMovie): readonly unknown[] {
  if (movie.getProperty("roomActive") === true || movie.getProperty("roomEntryState") !== "ready-to-activate") {
    return [];
  }

  return [
    movie.getProperty("roomVisualOverlaySprites"),
    movie.getProperty("roomObjectOverlaySprites"),
    movie.getProperty("roomObjectMoverOverlaySprites"),
    movie.getProperty("roomHiliterOverlaySprites"),
    movie.getProperty("roomUserOverlaySprites"),
    movie.getProperty("roomChatOverlaySprites"),
    movie.getProperty("roomHandOverlaySprites")
  ];
}

function getBitmapAssetPath(sprite: DirectorSpriteChannel, member: DirectorMember): string | undefined {
  return resolveDirectorBitmapAssetPath(sprite.ink, member.assetPath, member.inkAssetPaths);
}

function bitmapInkTextureKey(assetPath: string, sprite: DirectorSpriteChannel): string | undefined {
  if (!directorInkRequiresCanvasProcessing(sprite.ink)) {
    return undefined;
  }

  return `${assetPath}:ink=${sprite.ink}:bg=${sprite.bgColor ?? ""}`;
}

function normalizeAssetPath(assetPath: string): string {
  if (assetPath.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(assetPath)) {
    return assetPath;
  }

  return `/${assetPath}`;
}
