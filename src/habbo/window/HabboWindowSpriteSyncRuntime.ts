import type { DirectorBitmapCompositeLayer, DirectorMemberManifest, DirectorSpriteChannelManifest, DirectorMemberRef } from "../../runtime";
import {
  capitalizeMenuLabel,
  directorFontFamily,
  directorFontStyle,
  directorFontWeight,
  labelForElement,
  normalizeCastName,
  normalizeMemberName,
  numberProperty,
  stringProperty,
  textAlignProperty,
  textAlignFromString
} from "../HabboSourceValueHelpers";
import type {
  HabboButtonElementAsset,
  HabboButtonBitmapAssetSet,
  HabboButtonElementStateAsset,
  HabboExternalCastWindowLayout,
  HabboExternalCastWindowLayoutSet,
  HabboWindowBitmapAsset,
  HabboWindowLayoutElement
} from "../boot/HabboBootResourceTypes";
import { catalogueImageElementKind, readCatalogueIndexEntries } from "../features/catalogue";
import { readRoomVisual } from "../room/HabboRoomData";
import { readSpriteManifestArray } from "../room/HabboRoomObjectSpritePlanning";
import {
  applyWindowElementGeometryOverride,
  applyWindowElementPropertyOverride,
  adjustWindowTextGeometry,
  allElementsShareNumber,
  applyWindowGroupBoundsOverride,
  estimateDirectorTextLineCount,
  estimateRuntimeButtonTextWidth,
  groupLayoutElementsById,
  isCommonButtonElement,
  isSourceTextFeedImageElement,
  isTextWindowElement,
  isUnfedWindowImagePlaceholder,
  isWindowElementFlippedH,
  isWindowElementFlippedV,
  layoutElementKey,
  resolveGroupedWindowElementGeometry,
  resolveLayoutBorder,
  resolveWindowContentTargetSize,
  resolveWindowElementGeometry,
  scrollbarElementPart,
  selectButtonAssetPath,
  zeroWindowBorder
} from "./HabboWindowLayoutHelpers";
import {
  createRuntimeButtonShapeMember,
  createRuntimeButtonTextMember,
  createRuntimeWindowFieldMember
} from "./HabboRuntimeWindowMembers";
import type { HabboWindowElementOverride, HabboWindowInteractiveElement, HabboWindowRecord } from "./HabboWindowTypes";
import { dedupeWindowInteractiveElements, isHabboWindowInteractiveElement } from "./HabboWindowRuntimeData";

interface HabboRuntimeButtonSprites {
  readonly members: readonly DirectorMemberManifest[];
  readonly sprites: readonly DirectorSpriteChannelManifest[];
  readonly buttonChannels: readonly number[];
  readonly nextMemberNumber: number;
}

interface HabboPreparedRuntimeButton {
  readonly buttonElement: HabboButtonElementAsset;
  readonly state: HabboButtonElementStateAsset;
  readonly stateName: string;
  readonly width: number;
  readonly height: number;
  readonly xOffset: number;
  readonly textWidth: number;
  readonly textX: number;
  readonly textY: number;
  readonly icon?: {
    readonly asset: HabboWindowBitmapAsset;
    readonly x: number;
    readonly y: number;
    readonly ink: number;
  };
}

interface HabboRuntimeWindowElementSprite {
  readonly member: DirectorMemberManifest;
  readonly sprite: DirectorSpriteChannelManifest;
  readonly channel: number;
  readonly nextMemberNumber: number;
}

interface HabboRuntimeBitmapGroupSprite extends HabboRuntimeWindowElementSprite {
  readonly sourceKind: "template" | "content";
}

interface HabboTextScrollState {
  readonly clientId: string;
  readonly offset: number;
  readonly maxOffset: number;
  readonly lineHeight: number;
  readonly clientHeight: number;
  readonly sourceHeight: number;
  readonly pageSize: number;
}

function readRawDirectorRoomControls(value: unknown): readonly HabboWindowInteractiveElement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboWindowInteractiveElement => {
    return isHabboWindowInteractiveElement(entry)
      && entry.windowId === "Room"
      && entry.kind !== "room"
      && entry.kind !== "room_user"
      && entry.kind !== "room_object";
  });
}

export interface HabboWindowSpriteSyncHost {
  [key: string]: any;
  readonly movie: {
    readonly stage: { readonly width: number; readonly height: number };
    readonly cast: {
      importOrCreateCastLib(cast: { readonly number: number; readonly name: string; readonly fileName: string; readonly members: readonly DirectorMemberManifest[] }): void;
    };
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly texts: Map<string, string>;
  readonly windowTextValues: Map<string, string>;
  readonly externalCastWindowLayoutSet?: HabboExternalCastWindowLayoutSet;
  readonly buttonBitmapAssetSet?: HabboButtonBitmapAssetSet;
  readonly resourceManager: {
    preIndexMembers(): void;
    readonly indexedMemberCount: number;
  };

  getRuntimeWindowCastSlot(): number;
  collectRoomObjectInteractiveElements(interactiveElements: HabboWindowInteractiveElement[]): void;
  collectRoomUserInteractiveElements(interactiveElements: HabboWindowInteractiveElement[]): void;
  collectRoomHandInteractiveElements(interactiveElements: HabboWindowInteractiveElement[]): void;
  getWindowElementOverride(window: HabboWindowRecord, elementId: string | undefined): HabboWindowElementOverride | undefined;
  createRuntimeBitmapGroupSprite(
    startMemberNumber: number,
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    groupId: string,
    groupElements: readonly HabboWindowLayoutElement[],
    bitmapElements: readonly HabboWindowLayoutElement[],
    geometryTarget: { readonly width: number; readonly height: number },
    originX: number,
    originY: number,
    channel: number,
    sourceKind: "template" | "content",
    release: string
  ): HabboRuntimeBitmapGroupSprite | undefined;
  prepareRuntimeButton(
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    label: string,
    options?: { readonly applyAlignmentOffset?: boolean; readonly stateName?: string }
  ): HabboPreparedRuntimeButton | undefined;
  resolveButtonElementAsset(element: HabboWindowLayoutElement): HabboButtonElementAsset | undefined;
  isWindowElementPressed(window: HabboWindowRecord, element: HabboWindowLayoutElement, sourceKind: "template" | "content"): boolean;
  collectInteractiveElement(
    interactiveElements: HabboWindowInteractiveElement[],
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    elementX: number,
    elementY: number,
    geometry: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
    geometryTarget: { readonly width: number; readonly height: number },
    originX: number,
    originY: number
  ): void;
  createRuntimeScrollbarSprite(
    startMemberNumber: number,
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    geometryTarget: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number
  ): HabboRuntimeBitmapGroupSprite | undefined;
  createRuntimeDropMenuSprite(
    startMemberNumber: number,
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    release: string
  ): HabboRuntimeBitmapGroupSprite | undefined;
  createRuntimeButtonSprites(
    startMemberNumber: number,
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    label: string,
    preparedButton?: HabboPreparedRuntimeButton
  ): HabboRuntimeButtonSprites | undefined;
  recordUnsupportedOnce(key: string, entry: unknown): void;
  createRuntimeFedWindowElementSprite(
    startMemberNumber: number,
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    release: string
  ): HabboRuntimeWindowElementSprite | undefined;
  createRuntimeStaticWindowBitmapElementSprite(
    startMemberNumber: number,
    window: HabboWindowRecord,
    preferredVersionId: string | undefined,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    release: string
  ): HabboRuntimeWindowElementSprite | undefined;
  resolveWindowBitmapElementRef(element: HabboWindowLayoutElement): DirectorMemberRef | undefined;
  recordUnsupportedWindowElement(release: string, layout: HabboExternalCastWindowLayout, element: HabboWindowLayoutElement): void;
  resolveWindowElementText(window: HabboWindowRecord, element: HabboWindowLayoutElement): string | undefined;
  getWindowTextScrollOffset(
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    text: string
  ): number;
  getEditableDisplayText(elementId: string): string | undefined;
  isOpenWindowElementEditable(window: HabboWindowRecord, element: HabboWindowLayoutElement): boolean;
  syncDirectorOverlaySprites(): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}
export function syncWindowSpriteChannelsRuntime(host: HabboWindowSpriteSyncHost, release: string): void {
    const sprites: DirectorSpriteChannelManifest[] = [];
    const visualWindows: Record<string, unknown>[] = [];
    const runtimeFieldMembers: DirectorMemberManifest[] = [];
    const interactiveElements: HabboWindowInteractiveElement[] = [];
    const runtimeFieldCastLib = host.getRuntimeWindowCastSlot();
    let nextRuntimeFieldMember = 1;
    let nextWindowLocZ = 0;
    if (host.movie.getProperty("roomActive") === true && readRoomVisual(host.movie.getProperty("currentRoomVisual"))) {
      interactiveElements.push({
        id: "room_canvas",
        windowId: "Room",
        kind: "room",
        x: 0,
        y: 0,
        width: host.movie.stage.width,
        height: host.movie.stage.height,
        label: "Room"
      });
      host.collectRoomObjectInteractiveElements(interactiveElements);
      host.collectRoomUserInteractiveElements(interactiveElements);
      host.collectRoomHandInteractiveElements(interactiveElements);
      for (const element of dedupeWindowInteractiveElements([
        ...readRawDirectorRoomControls(host.movie.getProperty("directorRoomInteractiveElements")),
        ...readRawDirectorRoomControls(host.movie.getProperty("windowInteractiveElements"))
      ])) {
        if (!interactiveElements.some((candidate) => candidate.id === element.id)) {
          interactiveElements.push(element);
        }
      }
    }

    for (const [windowIndex, window] of [...host.windows.values()].entries()) {
      if (window.x === undefined || window.y === undefined || !window.mergedLayout) {
        continue;
      }
      const windowX = window.x;
      const windowY = window.y;

      const layout = host.externalCastWindowLayoutSet?.windows.find((entry) => {
        return entry.memberName.toLowerCase() === window.mergedLayout?.memberName.toLowerCase();
      });
      if (!layout) {
        continue;
      }

      const templateLayout = window.template
        ? host.externalCastWindowLayoutSet?.windows.find((entry) => entry.memberName.toLowerCase() === window.template?.toLowerCase())
        : undefined;
      const contentSize = resolveWindowContentTargetSize(window, layout);
      const templateBorder = templateLayout ? resolveLayoutBorder(templateLayout) : zeroWindowBorder();
      const targetWidth = contentSize.width;
      const targetHeight = contentSize.height;
      const templateTargetWidth = templateLayout ? templateBorder.left + targetWidth + templateBorder.right : targetWidth;
      const templateTargetHeight = templateLayout ? templateBorder.top + targetHeight + templateBorder.bottom : targetHeight;
      const windowSprites: DirectorSpriteChannelManifest[] = [];
      const bitmapChannels: number[] = [];
      const fieldChannels: number[] = [];
      const buttonChannels: number[] = [];
      const templateChannels: number[] = [];
      const compositeChannels: number[] = [];
      const groupedBitmapKeys = new Set<string>();
      const appendGroupedBitmapSprites = (
        sourceLayout: HabboExternalCastWindowLayout,
        channelBase: number,
        geometryTarget: { readonly width: number; readonly height: number },
        sourceKind: "template" | "content"
      ): void => {
        const originX = sourceKind === "content" ? windowX + templateBorder.left : windowX;
        const originY = sourceKind === "content" ? windowY + templateBorder.top : windowY;
        // Director groups window elements by #id and renders one bitmap sprite per group.
        // The renderer later bakes these layers into a single image to preserve sprite ink.
        const groups = groupLayoutElementsById(sourceLayout.elements);
        for (const group of groups) {
          const visibleGroupElements = sourceKind === "content"
            ? group.elements.filter((element) => host.getWindowElementOverride(window, element.id)?.visible !== false)
            : group.elements;
          const bitmapElements = visibleGroupElements.filter((element) => element.media === "bitmap" && element.resolvedMember);
          if (bitmapElements.length < 2) {
            continue;
          }

          const firstBitmapElement = bitmapElements[0];
          if (!firstBitmapElement) {
            continue;
          }

          const groupSprite = host.createRuntimeBitmapGroupSprite(
            nextRuntimeFieldMember,
            window,
            sourceLayout,
            group.id,
            visibleGroupElements,
            bitmapElements,
            geometryTarget,
            originX,
            originY,
            channelBase + firstBitmapElement.index + 1,
            sourceKind,
            release
          );
          if (!groupSprite) {
            continue;
          }

          for (const element of bitmapElements) {
            groupedBitmapKeys.add(layoutElementKey(sourceLayout, element));
          }

          nextRuntimeFieldMember = groupSprite.nextMemberNumber;
          runtimeFieldMembers.push(groupSprite.member);
          windowSprites.push(groupSprite.sprite);
          bitmapChannels.push(groupSprite.channel);
          compositeChannels.push(groupSprite.channel);
          if (groupSprite.sourceKind === "template") {
            templateChannels.push(groupSprite.channel);
          }
        }
      };
      const appendLayoutElement = (
        sourceLayout: HabboExternalCastWindowLayout,
        element: HabboWindowLayoutElement,
        channelBase: number,
        geometryTarget: { readonly width: number; readonly height: number },
        sourceKind: "template" | "content"
      ): void => {
        if (element.locH === undefined || element.locV === undefined) {
          return;
        }

        const override = sourceKind === "content" ? host.getWindowElementOverride(window, element.id) : undefined;
        if (override?.visible === false) {
          return;
        }
        element = applyWindowElementPropertyOverride(element, override);

        const geometry = applyWindowElementGeometryOverride(
          resolveWindowElementGeometry(sourceLayout, element, geometryTarget.width, geometryTarget.height),
          override
        );
        const elementId = element.id ?? element.memberName ?? `${sourceLayout.memberName}:${element.index}`;
        const buttonLabel = labelForElement(host.texts, element);
        const preparedButton = isCommonButtonElement(element) && geometry.width > 0 && geometry.height > 0
          ? host.prepareRuntimeButton(element, geometry, buttonLabel, {
            applyAlignmentOffset: override?.locH === undefined,
            stateName: host.isWindowElementPressed(window, element, sourceKind) ? "down" : "up"
          })
          : undefined;
        const renderGeometry = preparedButton
          ? {
            ...geometry,
            x: geometry.x + preparedButton.xOffset,
            width: preparedButton.width,
            height: preparedButton.height
          }
          : geometry;
        const originX = sourceKind === "content" ? windowX + templateBorder.left : windowX;
        const originY = sourceKind === "content" ? windowY + templateBorder.top : windowY;
        const elementX = originX + renderGeometry.x;
        const elementY = originY + renderGeometry.y;
        const channel = channelBase + element.index + 1;
        host.collectInteractiveElement(
          interactiveElements,
          window,
          sourceLayout,
          element,
          elementX,
          elementY,
          renderGeometry,
          geometryTarget,
          originX,
          originY
        );

        if (element.type === "scrollbarv" && geometry.width > 0 && geometry.height > 0) {
          const scrollbarSprite = host.createRuntimeScrollbarSprite(
            nextRuntimeFieldMember,
            window,
            sourceLayout,
            element,
            geometry,
            geometryTarget,
            elementX,
            elementY,
            channel
          );
          if (scrollbarSprite) {
            nextRuntimeFieldMember = scrollbarSprite.nextMemberNumber;
            runtimeFieldMembers.push(scrollbarSprite.member);
            windowSprites.push(scrollbarSprite.sprite);
            bitmapChannels.push(scrollbarSprite.channel);
            compositeChannels.push(scrollbarSprite.channel);
            return;
          }
        }

        if (element.type === "dropmenu" && geometry.width > 0 && geometry.height > 0) {
          const dropMenuSprite = host.createRuntimeDropMenuSprite(
            nextRuntimeFieldMember,
            window,
            sourceLayout,
            element,
            geometry,
            elementX,
            elementY,
            channel,
            release
          );
          if (dropMenuSprite) {
            nextRuntimeFieldMember = dropMenuSprite.nextMemberNumber;
            runtimeFieldMembers.push(dropMenuSprite.member);
            windowSprites.push(dropMenuSprite.sprite);
            bitmapChannels.push(dropMenuSprite.channel);
            compositeChannels.push(dropMenuSprite.channel);
            return;
          }

          host.recordUnsupportedOnce(`dropmenu-rendering-assets-missing:${sourceLayout.memberName}:${elementId}`, {
            subsystem: "habbo",
            feature: "dropmenu-rendering-assets-missing",
            detail: `${release} ${sourceLayout.memberName} element ${element.index} (${elementId}) uses DropDown Class, but the dropdown bitmap part assets were not available for runtime composition`,
            source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 66 - DropDown Class.ls`
          });
          return;
        }

        if (isCommonButtonElement(element) && geometry.width > 0 && geometry.height > 0) {
          const buttonSprites = host.createRuntimeButtonSprites(
            nextRuntimeFieldMember,
            window,
            element,
            renderGeometry,
            elementX,
            elementY,
            channel,
            buttonLabel,
            preparedButton
          );
          if (buttonSprites) {
            nextRuntimeFieldMember = buttonSprites.nextMemberNumber;
            runtimeFieldMembers.push(...buttonSprites.members);
            windowSprites.push(...buttonSprites.sprites);
            buttonChannels.push(...buttonSprites.buttonChannels);
            return;
          }

          const shapeMember = createRuntimeButtonShapeMember(nextRuntimeFieldMember++, window, element, renderGeometry.width, renderGeometry.height);
          runtimeFieldMembers.push(shapeMember);
          const shapeSprite: DirectorSpriteChannelManifest = {
            channel,
            member: {
              castLib: runtimeFieldCastLib,
              member: shapeMember.number
            },
            loc: {
              x: elementX,
              y: elementY
            },
            width: renderGeometry.width,
            height: renderGeometry.height,
            ...(element.blend !== undefined ? { blend: element.blend } : {}),
            visible: true
          };
          windowSprites.push(shapeSprite);
          buttonChannels.push(shapeSprite.channel);

          const label = host.texts.get(element.key ?? "") ?? element.key ?? "";
          const textMember = createRuntimeButtonTextMember(nextRuntimeFieldMember++, window, element, label, renderGeometry.width);
          runtimeFieldMembers.push(textMember);
          const textHeight = textMember.height ?? 11;
          const textSprite: DirectorSpriteChannelManifest = {
            channel: channel + 50,
            member: {
              castLib: runtimeFieldCastLib,
              member: textMember.number
            },
            loc: {
              x: elementX,
              y: elementY + Math.max(0, Math.floor((renderGeometry.height - textHeight) / 2))
            },
            width: renderGeometry.width,
            height: textHeight,
            ...(element.blend !== undefined ? { blend: element.blend } : {}),
            visible: true
          };
          windowSprites.push(textSprite);
          buttonChannels.push(textSprite.channel);
          host.recordUnsupportedOnce("button-element-rendering-partial", {
            subsystem: "habbo",
            feature: "button-element-rendering-partial",
            detail: `${release} ${sourceLayout.memberName} element ${element.index} (${elementId}) uses Common Button Class; this slice records its source geometry and event target but renders a simplified runtime shape until button element bitmap composition is implemented`,
            source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 63 - Common Button Class.ls`
          });
          return;
        }

        const fedImageSprite = (sourceKind === "content" || element.id === "ctlg_pages")
          ? host.createRuntimeFedWindowElementSprite(nextRuntimeFieldMember, window, element, geometry, elementX, elementY, channel, release)
          : undefined;
        if (fedImageSprite) {
          nextRuntimeFieldMember = fedImageSprite.nextMemberNumber;
          runtimeFieldMembers.push(fedImageSprite.member);
          windowSprites.push(fedImageSprite.sprite);
          bitmapChannels.push(fedImageSprite.channel);
          compositeChannels.push(fedImageSprite.channel);
          return;
        }

        if (element.media === "bitmap") {
          if (groupedBitmapKeys.has(layoutElementKey(sourceLayout, element))) {
            return;
          }

          if (sourceKind === "content" && isUnfedWindowImagePlaceholder(element)) {
            host.recordUnsupportedOnce(`window-feedimage-unimplemented:${sourceLayout.memberName}:${elementId}`, {
              subsystem: "director",
              feature: "window-feedimage-unimplemented",
              detail: `${release} ${sourceLayout.memberName} element ${element.index} (${elementId}) is a Director feedImage buffer. It is left transparent until a source-backed feedImage producer is implemented.`,
              source: `generated/runtime-data/external-cast-window-layout-index.json`
            });
            return;
          }

          const staticBitmapSprite = host.createRuntimeStaticWindowBitmapElementSprite(
            nextRuntimeFieldMember,
            window,
            sourceLayout.versionId,
            element,
            geometry,
            elementX,
            elementY,
            channel,
            release
          );
          if (staticBitmapSprite) {
            nextRuntimeFieldMember = staticBitmapSprite.nextMemberNumber;
            runtimeFieldMembers.push(staticBitmapSprite.member);
            windowSprites.push(staticBitmapSprite.sprite);
            bitmapChannels.push(staticBitmapSprite.channel);
            compositeChannels.push(staticBitmapSprite.channel);
            if (sourceKind === "template") {
              templateChannels.push(staticBitmapSprite.channel);
            }
            return;
          }

          const renderMemberRef = host.resolveWindowBitmapElementRef(element);
          if (!renderMemberRef) {
            host.recordUnsupportedWindowElement(release, sourceLayout, element);
            return;
          }

          const sprite: DirectorSpriteChannelManifest = {
            channel,
            member: renderMemberRef,
            loc: {
              x: elementX,
              y: elementY
            },
            width: geometry.width,
            height: geometry.height,
            ...(element.ink !== undefined ? { ink: element.ink } : {}),
            ...(element.blend !== undefined ? { blend: element.blend } : {}),
            ...(isWindowElementFlippedH(element) ? { flipH: true } : {}),
            ...(isWindowElementFlippedV(element) ? { flipV: true } : {}),
            visible: true
          };
          windowSprites.push(sprite);
          bitmapChannels.push(sprite.channel);
          if (sourceKind === "template") {
            templateChannels.push(sprite.channel);
          }
          return;
        }

        if (!isTextWindowElement(element) || geometry.width <= 0 || geometry.height <= 0) {
          host.recordUnsupportedWindowElement(release, sourceLayout, element);
          return;
        }

        const fieldText = host.resolveWindowElementText(window, element);
        const resolvedText = fieldText ?? host.texts.get(element.key ?? "");
        const textScrollY = element.id
          ? host.getWindowTextScrollOffset(window, sourceLayout, element, geometryTarget, resolvedText ?? "")
          : 0;
        const fieldGeometry = adjustWindowTextGeometry(element, geometry, resolvedText ?? "");
        const fieldX = originX + fieldGeometry.x;
        const fieldY = originY + fieldGeometry.y;
        const editableText = element.id ? host.getEditableDisplayText(element.id) : undefined;
        const editable = host.isOpenWindowElementEditable(window, element);
        const member = createRuntimeWindowFieldMember(
          nextRuntimeFieldMember++,
          window,
          element,
          fieldGeometry,
          resolvedText,
          editableText,
          textScrollY,
          editable
        );
        runtimeFieldMembers.push(member);
        const sprite: DirectorSpriteChannelManifest = {
          channel,
          member: {
            castLib: runtimeFieldCastLib,
            member: member.number
          },
          loc: {
            x: fieldX,
            y: fieldY
          },
          width: fieldGeometry.width,
          height: fieldGeometry.height,
          ...(element.ink !== undefined ? { ink: element.ink } : {}),
          ...(element.blend !== undefined ? { blend: element.blend } : {}),
          visible: true
        };
        windowSprites.push(sprite);
        fieldChannels.push(sprite.channel);
      };

      if (templateLayout) {
        appendGroupedBitmapSprites(
          templateLayout,
          700 + windowIndex * 100,
          { width: templateTargetWidth, height: templateTargetHeight },
          "template"
        );
        for (const element of templateLayout.elements) {
          appendLayoutElement(
            templateLayout,
            element,
            700 + windowIndex * 100,
            { width: templateTargetWidth, height: templateTargetHeight },
            "template"
          );
        }
      }

      appendGroupedBitmapSprites(layout, 1000 + windowIndex * 100, { width: targetWidth, height: targetHeight }, "content");
      for (const element of layout.elements) {
        appendLayoutElement(layout, element, 1000 + windowIndex * 100, { width: targetWidth, height: targetHeight }, "content");
      }

      const windowLocZStart = typeof window.locZ === "number" && Number.isFinite(window.locZ)
        ? Math.trunc(window.locZ)
        : nextWindowLocZ;
      const stackedWindowSprites = windowSprites.map((sprite, spriteIndex) => ({
        ...sprite,
        locZ: windowLocZStart + spriteIndex
      }));
      nextWindowLocZ += stackedWindowSprites.length;
      sprites.push(...stackedWindowSprites);
      visualWindows.push({
        id: window.id.toString(),
        ...(templateLayout !== undefined ? { template: templateLayout.memberName } : {}),
        layout: layout.memberName,
        bitmapSpriteCount: bitmapChannels.length,
        fieldSpriteCount: fieldChannels.length,
        buttonSpriteCount: buttonChannels.length,
        templateSpriteCount: templateChannels.length,
        compositeSpriteCount: compositeChannels.length,
        channels: windowSprites.map((sprite) => sprite.channel),
        bitmapChannels,
        fieldChannels,
        buttonChannels,
        templateChannels,
        compositeChannels,
        locZStart: windowLocZStart,
        locZEnd: nextWindowLocZ - 1
      });
    }

    if (runtimeFieldMembers.length > 0) {
      host.movie.cast.importOrCreateCastLib({
        number: runtimeFieldCastLib,
        name: "runtime_window_fields",
        fileName: "runtime-window-fields",
        members: runtimeFieldMembers
      });
      host.resourceManager.preIndexMembers();
      host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
      host.movie.setProperty("runtimeWindowFieldCastLib", runtimeFieldCastLib);
    }

    const layeredSprites = sprites.map((sprite) => ({
      ...sprite,
      locZ: 20000000 + (sprite.locZ ?? 0)
    }));
    const dedupedInteractiveElements = dedupeWindowInteractiveElements(interactiveElements);
    host.movie.setProperty("windowOverlaySprites", layeredSprites);
    host.movie.setProperty("windowInteractiveElements", dedupedInteractiveElements);
    host.syncDirectorOverlaySprites();
    host.movie.setProperty("windowVisuals", {
      release,
      spriteCount: sprites.length,
      bitmapSpriteCount: visualWindows.reduce((count, entry) => count + Number(entry.bitmapSpriteCount ?? 0), 0),
      fieldSpriteCount: visualWindows.reduce((count, entry) => count + Number(entry.fieldSpriteCount ?? 0), 0),
      buttonSpriteCount: visualWindows.reduce((count, entry) => count + Number(entry.buttonSpriteCount ?? 0), 0),
      interactiveElementCount: dedupedInteractiveElements.length,
      windows: visualWindows
    });
    const windowInteractiveElementsForLog = dedupedInteractiveElements.filter((entry) => entry.windowId !== "Room");
    const logSignature = JSON.stringify({
      release,
      sprites: sprites.length,
      interactives: dedupedInteractiveElements.length,
      runtimeFields: runtimeFieldMembers.length,
      windows: visualWindows.map((entry) => ({
        id: entry.id,
        template: entry.template,
        layout: entry.layout,
        bitmap: entry.bitmapSpriteCount,
        fields: entry.fieldSpriteCount,
        buttons: entry.buttonSpriteCount,
        composites: entry.compositeSpriteCount
      })),
      interactiveIds: windowInteractiveElementsForLog.map((entry) => `${entry.kind}:${entry.id}:${entry.x},${entry.y},${entry.width},${entry.height}`)
    });
    if (host.movie.getProperty("windowSpriteChannelLogSignature") !== logSignature) {
      host.movie.setProperty("windowSpriteChannelLogSignature", logSignature);
      host.logDebug("windows", "info", `syncWindowSpriteChannels sprites=${sprites.length} interactives=${dedupedInteractiveElements.length} fields=${runtimeFieldMembers.length}`, {
        release,
        spriteCount: sprites.length,
        interactiveElementCount: dedupedInteractiveElements.length,
        runtimeFieldMemberCount: runtimeFieldMembers.length,
        windows: visualWindows,
        interactiveElements: windowInteractiveElementsForLog.map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          windowId: entry.windowId,
          x: entry.x,
          y: entry.y,
          width: entry.width,
          height: entry.height
        }))
      });
    }
  }

export function createRuntimeFedWindowElementSpriteRuntime(
  host: HabboWindowSpriteSyncHost,
  startMemberNumber: number,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  geometry: { readonly width: number; readonly height: number },
  x: number,
  y: number,
  channel: number,
  release: string
): HabboRuntimeWindowElementSprite | undefined {
  const member = createRuntimeFedWindowElementMemberRuntime(host, startMemberNumber, window, element, geometry, release);
  if (!member) {
    return undefined;
  }

  return {
    member,
    sprite: {
      channel,
      member: {
        castLib: host.getRuntimeWindowCastSlot(),
        member: startMemberNumber
      },
      loc: { x, y },
      width: member.width ?? geometry.width,
      height: member.height ?? geometry.height,
      // feedImage replaces the element member image, not the element sprite props.
      // Preserve the source window element ink so dynamic image buffers matte and
      // blend like their Director window definitions.
      ink: element.ink ?? 0,
      blend: element.blend ?? 100,
      visible: true
    },
    channel,
    nextMemberNumber: startMemberNumber + 1
  };
}

export function createRuntimeFedWindowElementMemberRuntime(
  host: HabboWindowSpriteSyncHost,
  number: number,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  geometry: { readonly width: number; readonly height: number },
  release: string
): DirectorMemberManifest | undefined {
  const elementId = element.id ?? "";
  if ((elementId === "alert_title" || elementId === "alert_text") && isUnfedWindowImagePlaceholder(element)) {
    return createAlertFeedImageTextMemberRuntime(host, number, window, elementId, geometry);
  }

  if (elementId === "human.preview.img") {
    return host.createFigurePreviewMember(number, window, elementId, geometry, release);
  }

  if (elementId === "login_preview") {
    return host.createLoginPreviewMember(number, window, elementId, geometry, release);
  }

  if (elementId === "ownhabbo_icon_image") {
    return host.createHumanFeedPreviewMember(number, window, elementId, geometry, ["hd", "fc", "ey", "hr"], host.getActiveUserFigureProps(release), 3, release);
  }

  if (elementId === "console_myhead_image") {
    return host.createHumanFeedPreviewMember(number, window, elementId, geometry, ["hd", "fc", "ey", "hr"], host.getActiveUserFigureProps(release), 3, release);
  }

  if (elementId === "console_search_habboface_image") {
    const figure = host.getMessengerSearchFigureProps(release);
    return figure
      ? host.createHumanFeedPreviewMember(number, window, elementId, geometry, ["hd", "fc", "ey", "hr"], figure, 3, release)
      : undefined;
  }

  if (elementId === "console_getmessage_face_image") {
    const figure = host.getMessengerCurrentMessageFigureProps(release);
    return figure
      ? host.createHumanFeedPreviewMember(number, window, elementId, geometry, ["hd", "fc", "ey", "hr"], figure, 3, release)
      : undefined;
  }

  if (elementId === "console_friends_friendlist") {
    return host.createMessengerFriendListMember(number, window, elementId, geometry);
  }

  if (elementId === "console_getmessage_field") {
    return host.createMessengerMessageTextMember(number, window, elementId, geometry);
  }

  if (elementId === "info_image") {
    return host.movie.getProperty("selectedRoomObjectType") === "user"
      ? host.createInfoStandUserImageMember(number, window, elementId, geometry, release)
      : host.createInfoStandObjectImageMember(number, window, elementId, geometry);
  }

  if (elementId === "info_badge") {
    return host.createInfoStandBadgeMember(number, window, elementId, geometry);
  }

  if (elementId === "badge_preview") {
    return host.createBadgePreviewMember(number, window, elementId, geometry);
  }

  if (elementId === "badge.visible.radio" || elementId === "badge.hidden.radio") {
    return host.createBadgeVisibilityRadioMember(number, window, elementId, geometry);
  }

  if (elementId === "gen_loaderbar") {
    return host.createRoomLoaderBarMember(number, window, elementId, geometry);
  }

  if (elementId === "nav_roomlist") {
    return host.createNavigatorRoomListMember(number, window, elementId, geometry, release);
  }

  if (elementId === "nav_roomlistBackLinks") {
    return host.createNavigatorHistoryLinksMember(number, window, elementId, geometry);
  }

  if (elementId === "nav_roomlist_hd" || elementId === "nav_roomnfo_hd" || elementId === "nav_roomnfo") {
    return host.createNavigatorTextFeedMember(number, window, elementId, geometry);
  }

  if (elementId === "nav_roomnfo_icon") {
    return host.createNavigatorInfoIconMember(number, window, elementId, geometry);
  }

  if (elementId === "ctlg_pages") {
    return host.createCataloguePageListMember(number, window, elementId, geometry);
  }

  if (catalogueImageElementKind(elementId)) {
    return host.createCatalogueImageMember(number, window, elementId, geometry);
  }

  const fedText = host.windowTextValues.get(elementId);
  if (fedText !== undefined && isSourceTextFeedImageElement(elementId, element)) {
    return createWindowTextFeedImageMemberRuntime(host, number, window, element, geometry, fedText);
  }

  const partColor = /^part\.color\.([a-z]+)\.preview$/i.exec(elementId)?.[1];
  if (partColor) {
    const figure = host.ensureRegistrationFigureProps();
    const color = figure[partColor]?.color ?? "#ffffff";
    return {
      number,
      name: `runtime.${window.id.name}.${elementId}.feedImage`,
      type: "shape",
      width: geometry.width,
      height: geometry.height,
      backgroundColor: color,
      borderColor: "#000000",
      borderWidth: 1
    };
  }

  const partPreview = /^part\.([a-z]+)\.preview$/i.exec(elementId)?.[1];
  if (partPreview) {
    return host.createFigurePartPreviewMember(number, window, elementId, geometry, partPreview, release);
  }

  return undefined;
}

function createAlertFeedImageTextMemberRuntime(
  host: HabboWindowSpriteSyncHost,
  number: number,
  window: HabboWindowRecord,
  elementId: "alert_title" | "alert_text",
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest | undefined {
  const text = host.windowTextValues.get(elementId);
  if (text === undefined) {
    return undefined;
  }

  const isTitle = elementId === "alert_title";
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "text",
    width: geometry.width,
    height: geometry.height,
    text,
    color: "#000000",
    fontSize: 9,
    fontFamily: directorFontFamily(isTitle ? "VB" : "V"),
    fontWeight: isTitle ? "700" : "400",
    lineHeight: 14,
    wordWrap: !isTitle,
    textAlign: isTitle ? "center" : "left"
  };
}

function createWindowTextFeedImageMemberRuntime(
  _host: HabboWindowSpriteSyncHost,
  number: number,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  geometry: { readonly width: number; readonly height: number },
  text: string
): DirectorMemberManifest {
  const elementId = element.id ?? element.memberName ?? `element-${element.index}`;
  const backgroundColor = stringProperty(element.properties, "bgColor");
  const fontSize = Math.max(1, Math.round(numberProperty(element.properties, "fontSize") ?? (elementId === "purse_amount" ? 18 : 9)));
  const lineHeight = Math.max(1, Math.round(numberProperty(element.properties, "lineHeight") ?? (elementId === "link_list" ? 14 : fontSize + 2)));
  const font = stringProperty(element.properties, "font") ?? (elementId === "purse_amount" ? "VB" : "V");
  const fontStyle = stringProperty(element.properties, "fontStyle") ?? (elementId === "link_list" ? "underline" : "plain");
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "text",
    width: geometry.width,
    height: geometry.height,
    text,
    color: elementId === "link_list" ? "#000066" : "#000000",
    ...(backgroundColor !== undefined ? { backgroundColor } : {}),
    fontSize,
    fontFamily: directorFontFamily(font),
    fontWeight: fontStyle.toLowerCase().includes("bold") ? "700" : "400",
    lineHeight,
    wordWrap: elementId !== "purse_amount",
    textAlign: elementId === "purse_amount" ? "center" : textAlignProperty(element.properties) ?? "left"
  };
}

export function createRuntimeBitmapGroupSpriteRuntime(host: HabboWindowSpriteSyncHost, 
    startMemberNumber: number,
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    groupId: string,
    groupElements: readonly HabboWindowLayoutElement[],
    bitmapElements: readonly HabboWindowLayoutElement[],
    geometryTarget: { readonly width: number; readonly height: number },
    originX: number,
    originY: number,
    channel: number,
    sourceKind: "template" | "content",
    release: string
  ): HabboRuntimeBitmapGroupSprite | undefined {
    const groupOverride = sourceKind === "content" ? host.getWindowElementOverride(window, groupId) : undefined;
    const bitmapGeometries = bitmapElements
      .filter((element) => element.locH !== undefined && element.locV !== undefined)
      .map((element) => ({
        element,
        geometry: resolveWindowElementGeometry(sourceLayout, element, geometryTarget.width, geometryTarget.height)
      }));
    if (bitmapGeometries.length === 0) {
      return undefined;
    }

    const bounds = bitmapGeometries.reduce(
      (rect, entry) => {
        const { geometry } = entry;
        return {
          left: Math.min(rect.left, geometry.x),
          top: Math.min(rect.top, geometry.y),
          right: Math.max(rect.right, geometry.x + geometry.width),
          bottom: Math.max(rect.bottom, geometry.y + geometry.height)
        };
      },
      { left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY }
    );
    const baseWidth = Math.max(1, Math.round(bounds.right - bounds.left));
    const baseHeight = Math.max(1, Math.round(bounds.bottom - bounds.top));
    const groupBounds = applyWindowGroupBoundsOverride(bounds, groupOverride);
    const width = Math.max(1, Math.round(groupBounds.right - groupBounds.left));
    const height = Math.max(1, Math.round(groupBounds.bottom - groupBounds.top));
    const isBlendShared = allElementsShareNumber(bitmapElements, "blend");
    const isInkShared = allElementsShareNumber(bitmapElements, "ink");
    const firstBlend = bitmapElements[0]?.blend;
    const firstInk = bitmapElements[0]?.ink;
    const layers = [];

    for (const element of bitmapElements) {
      if (!element.resolvedMember) {
        return undefined;
      }

      const asset = host.getBitmapAsset(element.resolvedMember.castName, element.resolvedMember.member, element.palette, sourceLayout.versionId);
      if (!asset) {
        host.recordUnsupportedOnce(`window-bitmap-group-layer-missing:${sourceLayout.memberName}:${groupId}:${element.index}`, {
          subsystem: "habbo",
          feature: "window-bitmap-group-layer-missing",
          detail: `${release} ${sourceLayout.memberName} grouped window element ${groupId} layer ${element.index} references ${element.resolvedMember.memberName}, but no decoded bitmap asset is available. The runtime renders the remaining source-backed layers instead of dropping the whole grouped sprite.`,
          source: element.resolvedMember.memberChunkPath ?? "generated/runtime-data/external-cast-window-layout-index.json"
        });
        continue;
      }

      const geometry = resolveGroupedWindowElementGeometry(
        resolveWindowElementGeometry(sourceLayout, element, geometryTarget.width, geometryTarget.height),
        bounds,
        { width: baseWidth, height: baseHeight },
        { width, height },
        element
      );
      const fillColor = stringProperty(element.properties, "color");
      if (fillColor && asset.width === 1 && asset.height === 1) {
        layers.push({
          fillColor,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          ...(!isBlendShared && element.blend !== undefined ? { alpha: Math.max(0, Math.min(100, element.blend)) / 100 } : {})
        });
        continue;
      }

      const assetPath = asset.inkAssetPaths?.[String(element.ink)] ?? asset.pngPath;
      layers.push({
        assetPath,
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        ...(element.type?.toLowerCase() === "pattern" ? { repeat: true } : {}),
        ...(isWindowElementFlippedH(element) ? { flipH: true } : {}),
        ...(isWindowElementFlippedV(element) ? { flipV: true } : {}),
        ...(!isBlendShared && element.blend !== undefined ? { alpha: Math.max(0, Math.min(100, element.blend)) / 100 } : {})
      });
    }

    if (layers.length === 0) {
      return undefined;
    }

    const member: DirectorMemberManifest = {
      number: startMemberNumber,
      name: `runtime.${window.id.name}.${sourceLayout.windowName}.${groupId}.bitmapGroup`,
      type: "bitmap",
      width,
      height,
      composite: {
        width,
        height,
        layers
      }
    };
    const sprite: DirectorSpriteChannelManifest = {
      channel,
      member: {
        castLib: host.getRuntimeWindowCastSlot(),
      member: startMemberNumber
      },
      loc: {
        x: originX + groupBounds.left,
        y: originY + groupBounds.top
      },
      width,
      height,
      ink: isInkShared && firstInk !== undefined ? firstInk : 8,
      blend: isBlendShared && firstBlend !== undefined ? firstBlend : 100,
      visible: true
    };

    return {
      member,
      sprite,
      channel,
      sourceKind,
      nextMemberNumber: startMemberNumber + 1
    };
  }


export function createRuntimeStaticWindowBitmapElementSpriteRuntime(host: HabboWindowSpriteSyncHost, 
    startMemberNumber: number,
    window: HabboWindowRecord,
    preferredVersionId: string | undefined,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    release: string
  ): HabboRuntimeWindowElementSprite | undefined {
    if (!element.resolvedMember) {
      return undefined;
    }

    const statefulMemberName = host.resolveStatefulControlMemberName(element);
    const statefulAsset = statefulMemberName
      ? host.getAnyBitmapAssetByMemberName(statefulMemberName, [element.resolvedMember.castName, "hh_interface", "hh_kiosk_room"])
      : undefined;
    const asset = statefulAsset ?? host.getBitmapAsset(element.resolvedMember.castName, element.resolvedMember.member, element.palette, preferredVersionId);
    if (!asset) {
      return undefined;
    }

    const requestedInk = element.ink !== undefined ? String(element.ink) : undefined;
    const assetPath = requestedInk ? asset.inkAssetPaths?.[requestedInk] ?? asset.pngPath : asset.pngPath;
    const member: DirectorMemberManifest = {
      number: startMemberNumber,
      name: `runtime.${window.id.name}.${element.id ?? element.memberName ?? element.index}.bitmap`,
      type: "bitmap",
      width: asset.width,
      height: asset.height,
      assetPath,
      ...(asset.inkAssetPaths !== undefined ? { inkAssetPaths: asset.inkAssetPaths } : {})
    };
    const sprite: DirectorSpriteChannelManifest = {
      channel,
      member: {
        castLib: host.getRuntimeWindowCastSlot(),
        member: startMemberNumber
      },
      loc: {
        x,
        y
      },
      width: geometry.width,
      height: geometry.height,
      ...(element.ink !== undefined ? { ink: element.ink } : {}),
      ...(element.blend !== undefined ? { blend: element.blend } : {}),
      ...(isWindowElementFlippedH(element) ? { flipH: true } : {}),
      ...(isWindowElementFlippedV(element) ? { flipV: true } : {}),
      visible: true
    };

    return {
      member,
      sprite,
      channel,
      nextMemberNumber: startMemberNumber + 1
    };
  }


export function prepareRuntimeButtonRuntime(host: HabboWindowSpriteSyncHost, 
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    label: string,
    options: { readonly applyAlignmentOffset?: boolean; readonly stateName?: string } = {}
  ): HabboPreparedRuntimeButton | undefined {
    const buttonElement = host.resolveButtonElementAsset(element);
    const requestedState = options.stateName ?? "up";
    const state = buttonElement?.states.find((entry) => entry.state.toLowerCase() === requestedState.toLowerCase())
      ?? buttonElement?.states.find((entry) => entry.state.toLowerCase() === "up");
    const left = state?.parts.left;
    const right = state?.parts.right;
    if (!buttonElement || !state || !left || !right) {
      return undefined;
    }

    const icon = host.resolveRuntimeButtonIcon(element, buttonElement);
    const textSpec = state.text;
    const marginH = Math.max(0, Math.round(textSpec.marginH));
    const marginV = Math.max(0, Math.round(textSpec.marginV));
    const maxWidth = numberProperty(element.properties, "maxwidth") ?? 300;
    const fixedSize = numberProperty(element.properties, "fixedsize") === 1;
    const iconWidth = icon ? icon.asset.width + icon.marginH : 0;
    const baseTextWidth = Math.max(1, estimateRuntimeButtonTextWidth(label, textSpec));
    let textWidth: number;
    let renderWidth: number;
    if (fixedSize) {
      renderWidth = geometry.width;
      textWidth = Math.max(1, renderWidth - (marginH * 2) - iconWidth);
    } else {
      textWidth = baseTextWidth + (textSpec.fontSize * (icon ? 2 : 1));
      if ((textWidth + (marginH * 2)) > maxWidth) {
        textWidth = Math.max(1, maxWidth - (marginH * 2) + iconWidth);
      }
      renderWidth = Math.max(left.width + right.width + 1, Math.round(textWidth + (marginH * 2) + iconWidth));
      if (!icon && renderWidth > geometry.width && renderWidth - geometry.width <= 4) {
        renderWidth = geometry.width;
        textWidth = Math.max(1, renderWidth - (marginH * 2));
      }
    }

    const renderHeight = Math.max(1, left.height, right.height, geometry.height);
    const alignment = stringProperty(element.properties, "alignment")?.toLowerCase();
    const xOffset = options.applyAlignmentOffset === false
      ? 0
      : alignment === "center"
        ? Math.round((geometry.width - renderWidth) / 2)
        : alignment === "right"
          ? geometry.width - renderWidth
          : 0;

    let iconRender: HabboPreparedRuntimeButton["icon"] | undefined;
    if (icon) {
      const iconY = icon.marginV + Math.round((renderHeight - icon.asset.height) / 2);
      const iconX = icon.alignment === "right"
        ? Math.max(0, renderWidth - icon.marginH - icon.asset.width)
        : icon.alignment === "center"
          ? Math.max(0, Math.round((renderWidth - icon.asset.width) / 2))
          : icon.marginH;
      iconRender = {
        asset: icon.asset,
        x: iconX,
        y: iconY,
        ink: icon.ink
      };
    }

    const textAlignment = textSpec.alignment.toLowerCase();
    const textX = textAlignment === "left"
      ? left.width + 1
      : textAlignment === "center"
        ? Math.round((renderWidth - textWidth) / 2) + 1
        : Math.max(0, renderWidth - textWidth - right.width + 1);

    return {
      buttonElement,
      state,
      stateName: state.state,
      width: renderWidth,
      height: renderHeight,
      xOffset,
      textWidth,
      textX,
      textY: marginV,
      ...(iconRender ? { icon: iconRender } : {})
    };
  }


export function resolveRuntimeButtonIconRuntime(host: HabboWindowSpriteSyncHost, 
    element: HabboWindowLayoutElement,
    buttonElement: HabboButtonElementAsset
  ): {
    readonly asset: HabboWindowBitmapAsset;
    readonly alignment: "left" | "center" | "right";
    readonly marginH: number;
    readonly marginV: number;
    readonly ink: number;
  } | undefined {
    const iconName = stringProperty(element.properties, "icon");
    if (!iconName) {
      return undefined;
    }

    const asset = host.getBitmapAssetByMemberName(iconName, ["hh_interface"]);
    if (!asset) {
      return undefined;
    }

    // button5.element stores the Icon Button Class side/margin data in the
    // source STXT record. The generated asset index keeps the bitmap states,
    // so this preserves the missing source props until extraction captures them.
    if (normalizeMemberName(buttonElement.memberName) === normalizeMemberName("button5.element")) {
      return {
        asset,
        alignment: "left",
        marginH: 5,
        marginV: 0,
        ink: 36
      };
    }

    return {
      asset,
      alignment: "left",
      marginH: 0,
      marginV: 0,
      ink: 36
    };
  }


export function createRuntimeButtonSpritesRuntime(host: HabboWindowSpriteSyncHost, 
    startMemberNumber: number,
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    label: string,
    preparedButton?: HabboPreparedRuntimeButton
  ): HabboRuntimeButtonSprites | undefined {
    const prepared = preparedButton ?? host.prepareRuntimeButton(element, geometry, label);
    const buttonElement = prepared?.buttonElement;
    const state = prepared?.state;
    const left = state?.parts.left;
    const middle = state?.parts.middle;
    const right = state?.parts.right;
    if (!buttonElement || !state || !left || !middle || !right) {
      return undefined;
    }

    const leftAsset = host.getButtonBitmapAsset(left);
    const middleAsset = host.getButtonBitmapAsset(middle);
    const rightAsset = host.getButtonBitmapAsset(right);
    if (!leftAsset || !middleAsset || !rightAsset) {
      return undefined;
    }

    const renderWidth = prepared.width;
    const renderHeight = prepared.height;
    const leftWidth = Math.max(0, Math.min(renderWidth, left.width));
    const rightWidth = Math.max(0, Math.min(renderWidth - leftWidth, right.width));
    const middleWidth = Math.max(1, renderWidth - leftWidth - rightWidth);
    const rightFlipH = right.flipH ?? (
      right.member === left.member
      && normalizeMemberName(right.memberName) === normalizeMemberName(left.memberName)
    );
    const layers: NonNullable<DirectorMemberManifest["composite"]>["layers"] = [
      {
        assetPath: selectButtonAssetPath(leftAsset, element.ink),
        x: 0,
        y: 0,
        width: leftWidth,
        height: renderHeight,
        sourceWidth: leftAsset.width,
        sourceHeight: leftAsset.height,
        ...(left.flipH ? { flipH: true } : {})
      },
      {
        assetPath: selectButtonAssetPath(middleAsset, element.ink),
        x: leftWidth,
        y: 0,
        width: middleWidth,
        height: renderHeight,
        sourceWidth: middleAsset.width,
        sourceHeight: middleAsset.height,
        repeat: true
      },
      {
        assetPath: selectButtonAssetPath(rightAsset, element.ink),
        x: renderWidth - rightWidth,
        y: 0,
        width: rightWidth,
        height: renderHeight,
        sourceWidth: rightAsset.width,
        sourceHeight: rightAsset.height,
        ...(rightFlipH ? { flipH: true } : {})
      }
    ];
    if (prepared.icon) {
      layers.push({
        assetPath: selectButtonAssetPath(prepared.icon.asset, prepared.icon.ink),
        x: prepared.icon.x,
        y: prepared.icon.y,
        width: prepared.icon.asset.width,
        height: prepared.icon.asset.height,
        sourceWidth: prepared.icon.asset.width,
        sourceHeight: prepared.icon.asset.height
      });
    }

    const buttonMember: DirectorMemberManifest = {
      number: startMemberNumber,
      name: `runtime.${window.id.name}.${element.id ?? startMemberNumber}.button.bitmap`,
      type: "bitmap",
      width: renderWidth,
      height: renderHeight,
      composite: {
        width: renderWidth,
        height: renderHeight,
        layers
      }
    };
    const sprites: DirectorSpriteChannelManifest[] = [
      {
        channel,
        member: { castLib: host.getRuntimeWindowCastSlot(), member: buttonMember.number },
        loc: { x, y },
        width: renderWidth,
        height: renderHeight,
        // Button parts are already resolved to the Director ink-specific PNGs.
        // Keep the baked button sprite opaque so the renderer does not matte it twice.
        ink: 0,
        blend: element.blend ?? 100,
        visible: true
      }
    ];

    const usesPreparedTextRect = normalizeMemberName(buttonElement.memberName) === normalizeMemberName("button5.element");
    const textSpriteWidth = usesPreparedTextRect ? prepared.textWidth : renderWidth;
    const textSpriteX = usesPreparedTextRect ? prepared.textX : 0;
    const textMember = createRuntimeButtonTextMember(startMemberNumber + 1, window, element, label, textSpriteWidth, state.text);
    const textHeight = textMember.height ?? 11;
    sprites.push({
      channel: channel + 50,
      member: {
        castLib: host.getRuntimeWindowCastSlot(),
        member: textMember.number
      },
      loc: {
        x: x + textSpriteX,
        y: y + Math.min(Math.max(0, renderHeight - textHeight), prepared.textY)
      },
      width: textSpriteWidth,
      height: textHeight,
      ...(element.blend !== undefined ? { blend: element.blend } : {}),
      visible: true
    });

    return {
      members: [buttonMember, textMember],
      sprites,
      buttonChannels: sprites.map((sprite) => sprite.channel),
      nextMemberNumber: startMemberNumber + 2
    };
  }


export function createRuntimeDropMenuSpriteRuntime(host: HabboWindowSpriteSyncHost, 
    startMemberNumber: number,
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    release: string
  ): HabboRuntimeBitmapGroupSprite | undefined {
    const topLeftAsset = host.getBitmapAssetByMemberName("dropdown.top.left", ["hh_interface"]);
    const middleLeftAsset = host.getBitmapAssetByMemberName("dropdown.middle.left", ["hh_interface"]);
    const middleMiddleAsset = host.getBitmapAssetByMemberName("dropdown.middle.middle", ["hh_interface"]);
    const arrowAsset = host.getBitmapAssetByMemberName("dropdown.arrowImage", ["hh_interface"]);
    if (!topLeftAsset || !middleLeftAsset || !middleMiddleAsset || !arrowAsset) {
      return undefined;
    }

    const model = numberProperty(element.properties, "model") ?? 1;
    const dropMenuElement = host.buttonBitmapAssetSet?.elements.find((candidate) => {
      return normalizeMemberName(candidate.memberName) === normalizeMemberName(`dropmenu${model}.element`);
    });
    const state = dropMenuElement?.states.find((entry) => entry.state.toLowerCase() === "up");
    const textSpec = state?.text;
    const keyList = host.getDropMenuKeyList(element);
    const selectedKey = host.getDropMenuSelectedKey(element);
    const open = host.isDropMenuOpen(element);
    const renderGeometry = host.resolveDropMenuSpriteGeometry(element, geometry, x, y);
    const allLabels = host.getDropMenuLabels(element, keyList);
    const selectedLabel = allLabels[Math.max(0, keyList.indexOf(selectedKey))] ?? host.texts.get(selectedKey) ?? capitalizeMenuLabel(selectedKey);
    const labels = open && keyList.length > 0 ? allLabels : [selectedLabel];
    const label = labels.join("\n");
    const width = Math.max(1, Math.round(renderGeometry.width));
    const height = Math.max(1, Math.round(renderGeometry.height));
    const cornerWidth = Math.min(width, topLeftAsset.width);
    const cornerHeight = Math.min(height, topLeftAsset.height);
    const centerWidth = Math.max(1, width - (cornerWidth * 2));
    const centerHeight = Math.max(1, height - (cornerHeight * 2));
    const ink = element.ink ?? 36;
    const topLeftPath = selectButtonAssetPath(topLeftAsset, ink);
    const middleLeftPath = selectButtonAssetPath(middleLeftAsset, ink);
    const middleMiddlePath = selectButtonAssetPath(middleMiddleAsset, ink);
    const arrowPath = selectButtonAssetPath(arrowAsset, 36);

    const layers: DirectorBitmapCompositeLayer[] = [
      {
        assetPath: topLeftPath,
        x: 0,
        y: 0,
        width: cornerWidth,
        height: cornerHeight,
        sourceWidth: topLeftAsset.width,
        sourceHeight: topLeftAsset.height
      },
      {
        assetPath: middleLeftPath,
        x: cornerWidth,
        y: 0,
        width: centerWidth,
        height: cornerHeight,
        sourceWidth: middleLeftAsset.height,
        sourceHeight: middleLeftAsset.width,
        repeat: true,
        rotate: 1
      },
      {
        assetPath: topLeftPath,
        x: width - cornerWidth,
        y: 0,
        width: cornerWidth,
        height: cornerHeight,
        sourceWidth: topLeftAsset.width,
        sourceHeight: topLeftAsset.height,
        flipH: true
      },
      {
        assetPath: middleLeftPath,
        x: 0,
        y: cornerHeight,
        width: cornerWidth,
        height: centerHeight,
        sourceWidth: middleLeftAsset.width,
        sourceHeight: middleLeftAsset.height,
        repeat: true
      },
      {
        assetPath: middleMiddlePath,
        x: cornerWidth,
        y: cornerHeight,
        width: centerWidth,
        height: centerHeight,
        sourceWidth: middleMiddleAsset.width,
        sourceHeight: middleMiddleAsset.height,
        repeat: true
      },
      {
        assetPath: middleLeftPath,
        x: width - cornerWidth,
        y: cornerHeight,
        width: cornerWidth,
        height: centerHeight,
        sourceWidth: middleLeftAsset.width,
        sourceHeight: middleLeftAsset.height,
        repeat: true,
        flipH: true
      },
      {
        assetPath: topLeftPath,
        x: 0,
        y: height - cornerHeight,
        width: cornerWidth,
        height: cornerHeight,
        sourceWidth: topLeftAsset.width,
        sourceHeight: topLeftAsset.height,
        flipV: true
      },
      {
        assetPath: middleLeftPath,
        x: cornerWidth,
        y: height - cornerHeight,
        width: centerWidth,
        height: cornerHeight,
        sourceWidth: middleLeftAsset.height,
        sourceHeight: middleLeftAsset.width,
        repeat: true,
        flipV: true,
        rotate: -1
      },
      {
        assetPath: topLeftPath,
        x: width - cornerWidth,
        y: height - cornerHeight,
        width: cornerWidth,
        height: cornerHeight,
        sourceWidth: topLeftAsset.width,
        sourceHeight: topLeftAsset.height,
        flipH: true,
        flipV: true
      }
    ];

    const arrowMarginH = 5;
    const arrowX = open ? width - cornerWidth : Math.max(cornerWidth, width - arrowAsset.width - arrowMarginH);
    const arrowY = Math.max(0, Math.floor((height - arrowAsset.height) / 2));
    if (!open) {
      layers.push({
        assetPath: arrowPath,
        x: arrowX,
        y: arrowY,
        width: arrowAsset.width,
        height: arrowAsset.height,
        sourceWidth: arrowAsset.width,
        sourceHeight: arrowAsset.height,
        ink: 36
      });
    }

    const textMarginH = Math.round(textSpec?.marginH ?? 8);
    const textHeight = 11;
    const lineHeight = host.getDropMenuLineHeight(element, geometry);
    if (open && labels.length > 1) {
      for (let index = 1; index < labels.length; index++) {
        layers.push({
          fillColor: "#000000",
          x: 1,
          y: (index * lineHeight) - 1,
          width: Math.max(1, width - 2),
          height: 1
        });
      }
    }
    layers.push({
      text: label,
      x: textMarginH,
      y: open ? Math.max(0, Math.round(textSpec?.marginV ?? 2)) : Math.max(0, Math.floor((height - textHeight) / 2)),
      width: Math.max(1, arrowX - textMarginH - 1),
      height: open ? height : textHeight,
      color: textSpec?.color ?? "#000000",
      fontFamily: directorFontFamily(textSpec?.font ?? "v"),
      fontSize: textSpec?.fontSize ?? 9,
      fontWeight: directorFontWeight(textSpec?.font ?? "v", textSpec?.fontStyle ?? "plain"),
      fontStyle: directorFontStyle(textSpec?.fontStyle ?? "plain"),
      lineHeight: open ? lineHeight : textHeight,
      textAlign: textSpec?.alignment ? textAlignFromString(textSpec.alignment) : "left"
    });

    const member: DirectorMemberManifest = {
      number: startMemberNumber,
      name: `runtime.${window.id.name}.${element.id ?? sourceLayout.memberName}.dropmenu`,
      type: "bitmap",
      width,
      height,
      composite: {
        width,
        height,
        layers
      }
    };

    return {
      member,
      sprite: {
        channel,
        member: {
          castLib: host.getRuntimeWindowCastSlot(),
          member: startMemberNumber
        },
        loc: { x: renderGeometry.x, y: renderGeometry.y },
        width,
        height,
        ink: 0,
        blend: element.blend ?? 100,
        visible: true
      },
      channel,
      sourceKind: "content",
      nextMemberNumber: startMemberNumber + 1
    };
  }


export function createRuntimeScrollbarSpriteRuntime(host: HabboWindowSpriteSyncHost, 
    startMemberNumber: number,
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    geometryTarget: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number
  ): HabboRuntimeBitmapGroupSprite | undefined {
    const model = numberProperty(element.properties, "model") ?? 1;
    const scrollbarElement = host.buttonBitmapAssetSet?.elements.find((candidate) => {
      return normalizeCastName(candidate.memberName) === normalizeCastName(`scrollbarv${model}.element`);
    });
    const state = scrollbarElement?.states.find((entry) => entry.state.toLowerCase() === "up");
    if (!scrollbarElement || !state) {
      return undefined;
    }

    const scrollState = host.getScrollbarClientScrollState(window, sourceLayout, element, geometryTarget);
    const topState = !scrollState || scrollState.maxOffset <= 0 || scrollState.offset <= 0 ? "passive" : "up";
    const bottomState = !scrollState || scrollState.maxOffset <= 0 || scrollState.offset >= scrollState.maxOffset ? "passive" : "up";
    const liftState = !scrollState || scrollState.maxOffset <= 0 ? "passive" : "up";
    const top = scrollbarElementPart(scrollbarElement, topState, "top");
    const bar = scrollbarElementPart(scrollbarElement, "up", "bar");
    const lift = scrollbarElementPart(scrollbarElement, liftState, "lift");
    const bottom = scrollbarElementPart(scrollbarElement, bottomState, "bottom");
    if (!top || !bar || !lift || !bottom) {
      return undefined;
    }

    const topAsset = host.getButtonBitmapAsset(top);
    const barAsset = host.getButtonBitmapAsset(bar);
    const liftAsset = host.getButtonBitmapAsset(lift);
    const bottomAsset = host.getButtonBitmapAsset(bottom);
    if (!topAsset || !barAsset || !liftAsset || !bottomAsset) {
      return undefined;
    }

    const topHeight = Math.min(geometry.height, top.height);
    const bottomHeight = Math.min(Math.max(0, geometry.height - topHeight), bottom.height);
    const barY = topHeight;
    const barHeight = Math.max(1, geometry.height - topHeight - bottomHeight);
    const liftTravel = Math.max(0, barHeight - lift.height);
    const liftY = scrollState && scrollState.maxOffset > 0
      ? topHeight + Math.round((scrollState.offset / scrollState.maxOffset) * liftTravel)
      : Math.max(topHeight, Math.min(geometry.height - bottomHeight - lift.height, numberProperty(element.properties, "offset") ?? topHeight));
    const partWidth = Math.max(top.width, bar.width, lift.width, bottom.width);
    const partX = Math.max(0, Math.round((geometry.width - partWidth) / 2));

    const member: DirectorMemberManifest = {
      number: startMemberNumber,
      name: `runtime.${window.id.name}.${element.id ?? startMemberNumber}.scrollbarv`,
      type: "bitmap",
      width: geometry.width,
      height: geometry.height,
      composite: {
        width: geometry.width,
        height: geometry.height,
        layers: [
          {
            assetPath: selectButtonAssetPath(topAsset, element.ink),
            x: partX + Math.round((partWidth - top.width) / 2),
            y: 0,
            width: top.width,
            height: topHeight,
            sourceWidth: topAsset.width,
            sourceHeight: topAsset.height,
            ...(top.flipH === true ? { flipH: true } : {}),
            ...(top.flipV === true ? { flipV: true } : {})
          },
          {
            assetPath: selectButtonAssetPath(barAsset, element.ink),
            x: partX + Math.round((partWidth - bar.width) / 2),
            y: barY,
            width: bar.width,
            height: barHeight,
            sourceWidth: barAsset.width,
            sourceHeight: barAsset.height,
            repeat: true,
            ...(bar.flipH === true ? { flipH: true } : {}),
            ...(bar.flipV === true ? { flipV: true } : {})
          },
          {
            assetPath: selectButtonAssetPath(liftAsset, element.ink),
            x: partX + Math.round((partWidth - lift.width) / 2),
            y: liftY,
            width: lift.width,
            height: lift.height,
            sourceWidth: liftAsset.width,
            sourceHeight: liftAsset.height,
            ...(lift.flipH === true ? { flipH: true } : {}),
            ...(lift.flipV === true ? { flipV: true } : {})
          },
          {
            assetPath: selectButtonAssetPath(bottomAsset, element.ink),
            x: partX + Math.round((partWidth - bottom.width) / 2),
            y: geometry.height - bottomHeight,
            width: bottom.width,
            height: bottomHeight,
            sourceWidth: bottomAsset.width,
            sourceHeight: bottomAsset.height,
            ...(bottom.flipH === true ? { flipH: true } : {}),
            ...(bottom.flipV === true ? { flipV: true } : {})
          }
        ]
      }
    };

    return {
      member,
      sprite: {
        channel,
        member: {
          castLib: host.getRuntimeWindowCastSlot(),
          member: startMemberNumber
        },
        loc: { x, y },
        width: geometry.width,
        height: geometry.height,
        // Scrollbar rendering replaces the shadow.pixel member image, but the
        // sprite still inherits the source window element ink.
        ink: element.ink ?? 0,
        blend: element.blend ?? 100,
        visible: true
      },
      channel,
      sourceKind: "content",
      nextMemberNumber: startMemberNumber + 1
    };
  }


export function getScrollbarClientScrollStateRuntime(host: HabboWindowSpriteSyncHost, 
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    scrollbarElement: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number }
  ): HabboTextScrollState | undefined {
    const clientId = stringProperty(scrollbarElement.properties, "client");
    if (!clientId) {
      return undefined;
    }

    const clientElement = sourceLayout.elements.find((element) => element.id === clientId);
    if (!clientElement) {
      return undefined;
    }

    if (isTextWindowElement(clientElement)) {
      const text = host.resolveWindowElementText(window, clientElement) ?? host.texts.get(clientElement.key ?? "") ?? "";
      return host.getTextScrollState(window, sourceLayout, clientElement, geometryTarget, text, scrollbarElement);
    }

    return host.getImageScrollState(window, sourceLayout, clientElement, geometryTarget, scrollbarElement);
  }


export function getWindowTextScrollOffsetRuntime(host: HabboWindowSpriteSyncHost, 
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    text: string
  ): number {
    return host.getTextScrollState(window, sourceLayout, element, geometryTarget, text).offset;
  }


export function getTextScrollStateRuntime(host: HabboWindowSpriteSyncHost, 
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    text: string,
    scrollbarElement?: HabboWindowLayoutElement
  ): HabboTextScrollState {
    const geometry = applyWindowElementGeometryOverride(
      resolveWindowElementGeometry(sourceLayout, element, geometryTarget.width, geometryTarget.height),
      host.getWindowElementOverride(window, element.id)
    );
    const lineHeight = Math.max(1, Math.round(numberProperty(element.properties, "lineHeight") ?? 10));
    const scrollStepFromScrollbar = scrollbarElement ? numberProperty(scrollbarElement.properties, "offset") : undefined;
    const scrollStep = Math.max(1, Math.round(scrollStepFromScrollbar ?? lineHeight));
    const lineCount = estimateDirectorTextLineCount(text, element, geometry.width);
    const imageHeight = Math.max(geometry.height, lineCount * lineHeight);
    const maxOffset = Math.max(0, imageHeight - geometry.height);
    const offset = Math.max(0, Math.min(maxOffset, host.getWindowScrollOffset(window, element.id ?? "")));
    if (offset !== host.getWindowScrollOffset(window, element.id ?? "")) {
      host.setWindowScrollOffset(window, element.id ?? "", offset);
    }

    return {
      clientId: element.id ?? "",
      offset,
      maxOffset,
      lineHeight: scrollStep,
      clientHeight: geometry.height,
      sourceHeight: imageHeight,
      pageSize: Math.max(scrollStep, geometry.height)
    };
  }


export function getImageScrollStateRuntime(host: HabboWindowSpriteSyncHost, 
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    scrollbarElement: HabboWindowLayoutElement
  ): HabboTextScrollState | undefined {
    if (!element.id) {
      return undefined;
    }

    const geometry = applyWindowElementGeometryOverride(
      resolveWindowElementGeometry(sourceLayout, element, geometryTarget.width, geometryTarget.height),
      host.getWindowElementOverride(window, element.id)
    );
    const sourceSize = host.resolveWindowImageScrollSourceSize(window, element, geometry);
    if (!sourceSize) {
      return undefined;
    }

    const scrollStep = Math.max(1, Math.round(numberProperty(scrollbarElement.properties, "offset") ?? sourceSize.lineHeight));
    const sourceHeight = Math.max(geometry.height, sourceSize.height);
    const maxOffset = Math.max(0, sourceHeight - geometry.height);
    const offset = Math.max(0, Math.min(maxOffset, host.getWindowScrollOffset(window, element.id)));
    if (offset !== host.getWindowScrollOffset(window, element.id)) {
      host.setWindowScrollOffset(window, element.id, offset);
    }

    return {
      clientId: element.id,
      offset,
      maxOffset,
      lineHeight: scrollStep,
      clientHeight: geometry.height,
      sourceHeight,
      pageSize: Math.max(scrollStep, geometry.height)
    };
  }


export function resolveWindowImageScrollSourceSizeRuntime(host: HabboWindowSpriteSyncHost, 
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number }
  ): { readonly width: number; readonly height: number; readonly lineHeight: number } | undefined {
    if (element.id === "nav_roomlist") {
      const view = host.getNavigatorView();
      const categoryId = String(host.getNavigatorProperty("categoryId", view) ?? "");
      const children = host.getNavigatorNodeChildren(categoryId);
      const rowHeight = 18;
      return {
        width: geometry.width,
        height: children.length > 0 ? children.length * rowHeight : geometry.height,
        lineHeight: rowHeight
      };
    }

    if (element.id === "console_friends_friendlist") {
      const rowHeight = 40;
      const rows = host.getMessengerBuddyList().render.length;
      return {
        width: geometry.width,
        height: rows > 0 ? rows * rowHeight : geometry.height,
        lineHeight: rowHeight
      };
    }

    if (element.id === "ctlg_pages") {
      const rowHeight = 21;
      const rows = readCatalogueIndexEntries(host.movie.getProperty("catalogueIndexEntries")).length;
      return {
        width: geometry.width,
        height: rows > 0 ? (rows * rowHeight) + 1 : geometry.height,
        lineHeight: rowHeight
      };
    }

    return undefined;
  }

