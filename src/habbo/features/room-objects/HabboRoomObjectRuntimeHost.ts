import type { DirectorMember, DirectorMemberRef, DirectorSpriteChannelManifest, UnsupportedFeature } from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import type { HabboExternalCastTextFieldEntry } from "../../boot/HabboBootResourceTypes";
import type { HabboPrivateRoomPatterns, HabboRoomRequest } from "../../room/HabboRoomData";
import type { HabboRoomObjectRecord } from "../../room/HabboRoomObjectData";
import type { HabboRoomObjectClassProps } from "../../room/HabboRoomObjectProps";
import type { HabboRoomObjectSpritePlan } from "../../room/HabboRoomObjectSpritePlanning";
import type { HabboRoomObjectRotateOptions } from "./HabboRoomObjectRuntime";

export interface HabboRoomObjectRuntimeHost {
  [key: string]: any;
  readonly movie: {
    readonly tempo: number;
    readonly cast: {
      getMember(ref: DirectorMemberRef): DirectorMember | undefined;
    };
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly resourceManager: {
    getMemberRef(memberName: string): DirectorMemberRef | undefined;
  };
  readonly loadedCastSlots: Map<string, number>;
  readonly roomObjectPropsCache: Map<string, HabboRoomObjectClassProps>;

  getVariable(name: string): unknown;
  resolveMemberAlias(memberName: string): string | undefined;
  findExternalCastTextField(fieldName: string): HabboExternalCastTextFieldEntry | undefined;
  getRoomObjectSourceClassValue(className: string): string | undefined;
  getRoomObjectAnimationFrame(): number;
  resolveRoomObjectPartFrame(object: HabboRoomObjectRecord, part: string, sourceClassValue: string | undefined): number;
  resolveRoomObjectPartMemberName(
    className: string,
    part: string,
    dimensions: readonly [number, number] | undefined,
    direction: number,
    frame: number
  ): string | undefined;
  createRoomObjectSpritePlans(
    object: HabboRoomObjectRecord,
    roomData: Readonly<Record<string, string | number>>,
    rectLeft: number,
    rectTop: number,
    release: string,
    privateRoomPatterns?: HabboPrivateRoomPatterns
  ): HabboRoomObjectSpritePlan[];
  getPrivateRoomPatterns(): HabboPrivateRoomPatterns;
  resolveInteractiveSpriteBounds(sprite: DirectorSpriteChannelManifest, member: DirectorMember | undefined): {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  resolveRoomItemMemberName(className: string, direction: "leftwall" | "rightwall", itemType: string): string | undefined;
  resolveRoomObjectMemberRef(memberName: string): DirectorMemberRef | undefined;
  resolveRotatedActiveObjectDirection(
    object: HabboRoomObjectRecord,
    release: string,
    options?: HabboRoomObjectRotateOptions
  ): number | undefined;
  resolveExternalBitmapMemberRefByName(memberName: string, preferredCasts: readonly string[]): DirectorMemberRef | undefined;
  refreshAnimatedRoomObjectSprites(objects: readonly HabboRoomObjectRecord[], release: string): void;
  renderRoomObjects(release: string): void;
  clearRoomObjectSelection(release: string): void;
  getOwnRoomUser(): { readonly x?: number; readonly y?: number } | undefined;
  queueRoomRequest(request: Omit<HabboRoomRequest, "id" | "status">, release: string): void;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  syncDirectorOverlaySprites(): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}
