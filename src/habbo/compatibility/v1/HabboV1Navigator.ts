import type {
  DirectorBitmapCompositeLayer,
  DirectorCastLibManifest,
  DirectorMemberManifest,
  DirectorMovie,
  DirectorSpriteChannelManifest
} from "../../../runtime";
import type { DirectorBitmapComposite } from "../../../runtime/DirectorMember";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import {
  allUnitsSourcePath,
  busyFlatsSourcePath,
  connectionWaitEntryFlatSourcePath,
  connectionWaitUnitsSourcePath,
  doorStatusGlyph,
  flatResultDescriptionFallback,
  flatResultDescriptionKey,
  flatLoaderSourcePath,
  flatResultsSourcePath,
  goFlatSourcePath,
  goToFlatWithNaviSourcePath,
  isRelease1FlatResult,
  navigatorContextButtonSourcePath,
  navigatorImageHandlersSourcePath,
  navigatorOpenSourcePath,
  navigatorWindowSourcePath,
  openFlatInfoSourcePath,
  parseRecordedNavigatorFrame as parseRecordedNavigatorFrameSource,
  parseRelease1AllUnits,
  parseRelease1FlatResults,
  popupContextSourcePath,
  popularFlatQuerySourcePath,
  privateDropSourcePath,
  privateRoomGoLinksSourcePath,
  readRecord,
  release1FieldText,
  release1TextFieldValue,
  sanitizeElementId,
  stringBehaviorProperty,
  unitMembersSourcePath,
  type RecordedSprite,
  type Release1FlatResult,
  type Release1NavigatorInteractiveAction,
  type Release1NavigatorTextRequest,
  type Release1PublicUnit
} from "./HabboV1NavigatorSource";
import {
  boundsForRecordedSprite,
  isRelease1EntryMovie,
  memberManifestFromMember,
  navigationCast,
  navigatorCastName,
  navigatorContextBoundsForRecordedSprite,
  readFirstVisiblePlace,
  readInteractiveElements,
  readRelease1PublicUnits,
  readSpriteManifests,
  setMemberTextByName
} from "./HabboV1NavigatorRuntime";

const entryNavigatorPlace = { x: 234, y: -5 } as const;
const entryNavigatorStartChannel = 600;
const entryNavigatorEndChannel = 650;
const privateNavigatorStartChannel = 660;
const privateNavigatorEndChannel = 710;
const entryNavigatorLocZ = 2_100_000_000;
const naviWindowMemberName = "VisibleNaviWindow";
const naviWindowWidth = 251;
const naviWindowHeight = 182;
const naviRowHeight = 14;
const naviVisibleRows = 12;
const naviBackgroundColor = "#efefef";

export function openRelease1EntryNavigator(movie: DirectorMovie, source = navigatorOpenSourcePath): boolean {
  const currentState = readRecord(movie.getProperty("release1EntryNavigatorState"));
  if (currentState?.open === true) {
    return closeRelease1EntryNavigator(movie);
  }

  const currentPlace = readNavigatorPlace(currentState) ?? entryNavigatorPlace;
  const state = {
    open: true,
    frame: "public",
    place: currentPlace,
    source
  };
  movie.setProperty("release1EntryNavigatorState", state);
  syncRelease1EntryNavigator(movie);
  movie.debugLog.add("navigator", "info", "release1 openNavigator displayFrame=public");
  return true;
}

export function moveRelease1EntryNavigatorBy(movie: DirectorMovie, offsetX: number, offsetY: number): boolean {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  if (state?.open !== true) {
    return false;
  }

  const deltaX = Math.round(offsetX);
  const deltaY = Math.round(offsetY);
  if (deltaX === 0 && deltaY === 0) {
    return true;
  }

  const place = readNavigatorPlace(state) ?? entryNavigatorPlace;
  const nextPlace = {
    x: place.x + deltaX,
    y: place.y + deltaY
  };
  movie.setProperty("release1EntryNavigatorState", {
    ...state,
    place: nextPlace,
    source: [
      "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 122 - Move Navigator.ls",
      navigatorOpenSourcePath
    ]
  });
  syncRelease1EntryNavigator(movie);
  movie.debugLog.add("navigator", "info", `release1 moveNavigator x=${nextPlace.x} y=${nextPlace.y}`);
  return true;
}

export function closeRelease1EntryNavigator(movie: DirectorMovie): boolean {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  if (state?.open !== true) {
    return false;
  }

  movie.setProperty("release1EntryNavigatorState", {
    ...state,
    open: false,
    source: "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/MovieScript 121 - closeNavigator.ls"
  });
  setNavigatorOverlaySprites(movie, []);
  syncRelease1EntryNavigatorInteractions(movie);
  movie.debugLog.add("navigator", "info", "release1 closeNavigator");
  return true;
}

export function completeRelease1EntryNavigatorRoomLoad(movie: DirectorMovie): boolean {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  const frame = typeof state?.frame === "string" ? state.frame : "";
  if (state?.open !== true || !isRelease1NavigatorRoomLoadFrame(frame)) {
    return false;
  }

  movie.setProperty("release1EntryNavigatorState", {
    ...state,
    open: false,
    status: "room-active",
    source: [
      flatLoaderSourcePath,
      "extracted/projectorrays/release1_roseau_dcr0910/gf_private/casts/Internal/ParentScript 1 - LoaderParent.ls"
    ]
  });
  setNavigatorOverlaySprites(movie, []);
  syncRelease1EntryNavigatorInteractions(movie);
  movie.debugLog.add("navigator", "ok", "release1 room loader completed");
  return true;
}

export function activateRelease1EntryNavigatorElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  if (elementId === "release1_navigator_close") {
    return closeRelease1EntryNavigator(movie);
  }

  const action = readNavigatorInteractiveActions(movie).find((candidate) => candidate.id === elementId);
  if (action) {
    if (activation?.event !== undefined && activation.event !== action.event) {
      return false;
    }

    if (action.kind === "flatInfo") {
      const selection = privateFlatSelectionFromActivation(movie, activation, "flat_results.names");
      if (selection) {
        openRelease1FlatInfo(movie, selection.flat, selection.index, false, action.source);
      }
      return true;
    }

    if (action.kind === "flatGo") {
      const selection = privateFlatSelectionFromActivation(movie, activation, "flats_go");
      if (selection) {
        openRelease1FlatInfo(movie, selection.flat, selection.index, true, action.source);
        goToRelease1FlatWithNavigator(movie, selection.flat, action.source);
      }
      return true;
    }

    if (action.kind === "selectedFlatGo") {
      const selected = readSelectedFlat(movie);
      if (selected) {
        goToRelease1FlatWithNavigator(movie, selected, action.source);
      }
      return true;
    }

    activateRelease1NavigatorContextAction(movie, action);
    movie.debugLog.add("navigator", "info", `release1 Navigator context action=${elementId}`);
    return true;
  }

  if (elementId === "release1_navigator_hotel_view_go" && activation?.event !== "mouseDown") {
    return queueRelease1NavigatorHotelViewGoAway(movie);
  }

  if (elementId !== "release1_navigator_public_list" || activation?.event === "mouseDown") {
    return false;
  }

  if (shouldLeaveRoomForHotelViewRow(movie, activation)) {
    return queueRelease1NavigatorHotelViewGoAway(movie);
  }

  const selection = publicUnitSelectionFromActivation(movie, activation);
  if (!selection) {
    return true;
  }

  const state = readRecord(movie.getProperty("release1EntryNavigatorState")) ?? {};
  setPublicRoomInfoFields(movie, selection.unit);
  movie.setProperty("release1EntryNavigatorState", {
    ...state,
    open: true,
    frame: "public_room_info",
    selectedPublicUnitName: selection.unit.name,
    selectedPublicUnitIndex: selection.index,
    selectedPublicUnitDoor: 0,
    source: navigatorWindowSourcePath
  });
  movie.setProperty("release1EntryNavigatorUnitUsersRequest", {
    command: "GETUNITUSERS",
    body: `/${selection.unit.name}`,
    unitName: selection.unit.name,
    status: "pending",
    source: navigatorWindowSourcePath
  });
  syncRelease1EntryNavigator(movie);
  movie.debugLog.add("navigator", "info", `release1 public room info unit=${selection.unit.name}`);
  return true;
}

export function completeRelease1EntryFlatResults(movie: DirectorMovie, header: string, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const flats = parseRelease1FlatResults(body);
  const normalizedHeader = header.toUpperCase();
  const resultType = normalizedHeader.includes("FAVORITE")
    ? "favorite"
    : normalizedHeader.includes("BUSY")
      ? "busy"
      : "search";
  setMemberTextByName(movie, "flat_results.description", release1FieldText(movie, flatResultDescriptionKey(resultType), flatResultDescriptionFallback(resultType)));
  setMemberTextByName(movie, "flat_results.doorstatus", flats.map((flat) => doorStatusGlyph(flat.doorMode)).join("\r"));
  setMemberTextByName(movie, "flat_results.names", flats.map((flat) => flat.name).join("\r"));
  setMemberTextByName(movie, "flat_results.load", flats.map((flat) => String(flat.usersNow)).join("\r"));
  setMemberTextByName(movie, "flats_go", flats.map(() => "Go >>").join("\r"));
  movie.setProperty("release1EntryNavigatorFlatResults", {
    resultType,
    flats,
    source: flatResultsSourcePath
  });
  movie.debugLog.add("navigator", "ok", `release1 FLAT_RESULTS parsed flats=${flats.length} type=${resultType}`);
  return true;
}

export function completeRelease1EntryFlatLetIn(movie: DirectorMovie): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const selected = readSelectedFlat(movie);
  if (!selected) {
    return false;
  }

  setMemberTextByName(movie, "flat_load.status", release1FieldText(movie, "DoorOpenLoading", "Loading room"));
  setMemberTextByName(movie, "loading_txt", release1FieldText(movie, "LoadingRoom", "Loading Habbo Hotel"));
  setMemberTextByName(movie, "room.info", `${release1FieldText(movie, "Room", "Room:")} ${selected.name}\r${release1FieldText(movie, "Owner", "Owner:")} ${selected.owner}`);
  movie.setProperty("release1EntryNavigatorRoomEntry", {
    roomId: selected.id,
    roomName: selected.name,
    owner: selected.owner,
    doorMode: selected.doorMode,
    status: "flat-let-in",
    source: [flatResultsSourcePath, flatLoaderSourcePath]
  });
  queueRelease1NavigatorTextRequests(movie, [
    createNavigatorTextRequest(movie, "GOTOFLAT", `/${selected.id}`, connectionWaitUnitsSourcePath)
  ]);
  setRelease1NavigatorFrame(movie, "FLAT_LOADING", [flatResultsSourcePath, flatLoaderSourcePath]);
  movie.debugLog.add("navigator", "ok", `release1 FLAT_LETIN room=${selected.id}`);
  return true;
}

export function completeRelease1EntryUnitsFromAllUnits(movie: DirectorMovie, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const units = parseRelease1AllUnits(body);
  movie.setProperty("release1EntryPublicUnits", {
    units,
    source: allUnitsSourcePath
  });
  setMemberTextByName(movie, "public_place.hierarchy", units.map((unit) => `${unit.name}:${unit.otherRooms.length + 1}`).join("\r"));
  syncRelease1EntryNavigatorAfterUnits(movie);
  movie.debugLog.add("navigator", "ok", `release1 ALLUNITS parsed units=${units.length}`);
  return true;
}

export function completeRelease1EntryUnitMembers(movie: DirectorMovie, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const names = body.replace(/^\r?\n/, "").split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  setMemberTextByName(movie, "publicroom_peoplelist", names.join("\r"));
  movie.setProperty("release1EntryNavigatorUnitMembers", {
    names,
    source: unitMembersSourcePath
  });
  movie.debugLog.add("navigator", "ok", `release1 UNITMEMBERS users=${names.length}`);
  return true;
}

export function syncRelease1EntryNavigator(movie: DirectorMovie): boolean {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  if (state?.open !== true) {
    setNavigatorOverlaySprites(movie, []);
    return false;
  }

  const frame = typeof state.frame === "string" ? state.frame : "public";
  const recordedSprites = parseRecordedNavigatorFrame(movie, `${frame}.recorded`);
  if (recordedSprites.length === 0) {
    movie.unsupported.add({
      subsystem: "habbo",
      feature: "release1-navigator-recorded-frame-missing",
      detail: `release1 Navigator frame ${frame}.recorded was not available from the navigation cast`
    });
    return false;
  }

  applyRelease1NavigatorDynamicMembers(movie);
  const frameSprites = applyRelease1NavigatorFrameBeginSpriteEffects(movie, frame, recordedSprites);
  setNavigatorOverlaySprites(movie, frameSprites.map((sprite) => stripRecordedBehaviorInfo(movie, sprite)));
  syncRelease1EntryNavigatorInteractions(movie, frameSprites);
  movie.setProperty("release1EntryNavigatorVisualState", {
    frame,
    spriteCount: recordedSprites.length,
    dynamicMember: naviWindowMemberName,
    source: [
      popupContextSourcePath,
      navigatorOpenSourcePath,
      navigatorWindowSourcePath,
      navigatorImageHandlersSourcePath
    ]
  });
  return true;
}

export function syncRelease1EntryNavigatorRoomLoadProgress(movie: DirectorMovie): boolean {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  const frame = typeof state?.frame === "string" ? state.frame : "";
  if (state?.open !== true || !isRelease1NavigatorRoomLoadFrame(frame)) {
    return false;
  }

  return syncRelease1EntryNavigator(movie);
}

export function syncRelease1EntryNavigatorAfterUnits(movie: DirectorMovie): void {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  if (state?.open === true) {
    syncRelease1EntryNavigator(movie);
  }
}

export function syncRelease1EntryNavigatorInteractions(
  movie: DirectorMovie,
  recordedSprites?: readonly RecordedSprite[]
): void {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  const hotelElements = readInteractiveElements(movie)
    .filter((element) => !element.id.startsWith("release1_navigator_"));
  if (state?.open !== true) {
    movie.setProperty("windowInteractiveElements", hotelElements);
    movie.setProperty("release1EntryNavigatorInteractiveActions", []);
    return;
  }

  const frame = typeof state.frame === "string" ? state.frame : "public";
  const sourceSprites = recordedSprites ?? parseRecordedNavigatorFrame(movie, `${frame}.recorded`);
  const navigatorElements: HabboWindowInteractiveElement[] = [];
  const actions: Release1NavigatorInteractiveAction[] = [];
  for (const sprite of sourceSprites) {
    const bounds = boundsForRecordedSprite(movie, sprite);
    if (sprite.behaviorNames.includes("closeNavigator")) {
      navigatorElements.push({
        id: "release1_navigator_close",
        windowId: "#release1_navigator",
        kind: "link",
        ...bounds,
        label: "Close Navigator",
        cursor: "cursor.finger",
        clientId: "closeNavigator"
      });
      continue;
    }

    if (sprite.behaviorNames.includes("Move Navigator")) {
      navigatorElements.push({
        id: "release1_navigator_drag",
        windowId: "#release1_navigator",
        kind: "drag",
        ...bounds,
        label: "Move Navigator",
        cursor: "cursor.finger",
        clientId: "Move Navigator"
      });
      continue;
    }

    if (sprite.behaviorNames.includes("NavigatorWindow_behavior")) {
      navigatorElements.push({
        id: "release1_navigator_public_list",
        windowId: "#release1_navigator",
        kind: "link",
        ...bounds,
        label: "Public room list",
        cursor: "cursor.finger",
        clientId: "NavigatorWindow_behavior"
      });
      if (movie.getProperty("release1PrivateRoomMovieActive") === true) {
        navigatorElements.push({
          id: "release1_navigator_hotel_view_go",
          windowId: "#release1_navigator",
          kind: "link",
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: naviRowHeight,
          label: "Hotel view",
          cursor: "cursor.finger",
          clientId: "NavigatorWindow_behavior"
        });
      }
    }

    if (sprite.behaviorNames.includes("Open Flat Info")) {
      navigatorElements.push({
        id: "release1_navigator_flat_results_names",
        windowId: "#release1_navigator",
        kind: "link",
        ...bounds,
        label: "Private room info",
        cursor: "cursor.finger",
        clientId: "Open Flat Info"
      });
      actions.push({
        id: "release1_navigator_flat_results_names",
        event: "mouseDown",
        kind: "flatInfo",
        requests: [],
        source: [openFlatInfoSourcePath, flatResultsSourcePath]
      });
    }

    if (sprite.behaviorNames.includes("PrivateRoomGoLinks")) {
      navigatorElements.push({
        id: "release1_navigator_flat_results_go",
        windowId: "#release1_navigator",
        kind: "link",
        ...bounds,
        label: "Go to private room",
        cursor: "cursor.finger",
        clientId: "PrivateRoomGoLinks"
      });
      actions.push({
        id: "release1_navigator_flat_results_go",
        event: "mouseUp",
        kind: "flatGo",
        requests: [],
        source: [privateRoomGoLinksSourcePath, openFlatInfoSourcePath, goToFlatWithNaviSourcePath]
      });
    }

    if (sprite.behaviorNames.includes("GoFlat")) {
      navigatorElements.push({
        id: "release1_navigator_goflat",
        windowId: "#release1_navigator",
        kind: "button",
        ...bounds,
        label: "Go",
        cursor: "cursor.finger",
        clientId: "GoFlat"
      });
      actions.push({
        id: "release1_navigator_goflat",
        event: "mouseUp",
        kind: "selectedFlatGo",
        requests: [],
        source: [goFlatSourcePath, goToFlatWithNaviSourcePath]
      });
    }

    const contextFrame = stringBehaviorProperty(sprite, "Go To Frame Context Sensitive", "sFrame");
    if (contextFrame) {
      const id = `release1_navigator_context_${sanitizeElementId(contextFrame)}_${sprite.channel}`;
      const requests = navigatorTextRequestsForSprite(movie, sprite);
      const contextBounds = navigatorContextBoundsForRecordedSprite(movie, sprite, sourceSprites) ?? bounds;
      navigatorElements.push({
        id,
        windowId: "#release1_navigator",
        kind: "link",
        ...contextBounds,
        label: contextFrame,
        cursor: "cursor.finger",
        clientId: "Go To Frame Context Sensitive"
      });
      actions.push({
        id,
        event: "mouseUp",
        kind: "context",
        targetFrame: contextFrame,
        requests,
        source: [navigatorContextButtonSourcePath, ...requests.map((request) => request.source)]
      });
    }
  }

  movie.setProperty("windowInteractiveElements", [
    ...hotelElements,
    ...navigatorElements
  ]);
  movie.setProperty("release1EntryNavigatorInteractiveActions", actions);
}

function activateRelease1NavigatorContextAction(movie: DirectorMovie, action: Release1NavigatorInteractiveAction): void {
  if (action.targetFrame) {
    setRelease1NavigatorFrame(movie, action.targetFrame, action.source);
  } else {
    syncRelease1EntryNavigator(movie);
  }
  queueRelease1NavigatorTextRequests(movie, action.requests);
}

function openRelease1FlatInfo(
  movie: DirectorMovie,
  flat: Release1FlatResult,
  index: number,
  gogo: boolean,
  source: readonly string[]
): void {
  const ownerName = flat.owner === "-" ? "not shown" : flat.owner;
  setMemberTextByName(movie, "flatinfo.doormode", doorInfoForPrivateFlat(movie, flat));
  setMemberTextByName(movie, "privateroom_infotext", flat.description);
  setMemberTextByName(movie, "flatinfo.head", `${flat.name} (${flat.usersNow}/25)\r${release1FieldText(movie, "Owner", "Owner")} ${ownerName}`);
  setMemberTextByName(movie, "goingto_roomname", flat.name);
  setMemberTextByName(movie, "BobbaFilter.privateroom", flat.filterFlag === "1" ? release1FieldText(movie, "NoBobbaFilter", "No Bobba Filter") : " ");
  setMemberTextByName(movie, "doortxt_buttonin", doorButtonTextForPrivateFlat(movie, flat, ownerName));
  movie.setProperty("release1EntryNavigatorSelectedFlat", {
    index,
    flat,
    gFloorHost: flat.host,
    gFloorPort: flat.port,
    gChosenFlatId: flat.id,
    gChosenFlatOwner: ownerName,
    gChosenFlatDoorMode: flat.doorMode,
    source: [flatResultsSourcePath, ...source]
  });
  if (!gogo) {
    setRelease1NavigatorFrame(movie, "private_place.info", [openFlatInfoSourcePath, ...source]);
  }
  movie.debugLog.add("navigator", "info", `release1 openFlatInfo row=${index} room=${flat.id}`);
}

function goToRelease1FlatWithNavigator(
  movie: DirectorMovie,
  flat: Release1FlatResult,
  source: readonly string[]
): void {
  setMemberTextByName(movie, "flat_load.status", release1FieldText(movie, "WaitingWhenCanGoIntoRoom", "Waiting when can go into room"));
  const frame = flat.doorMode === "password"
    ? "flat_load_password"
    : flat.doorMode === "closed"
      ? "flat_load_locked"
      : "flat_load";
  movie.setProperty("release1EntryNavigatorRoomEntry", {
    roomId: flat.id,
    roomName: flat.name,
    owner: flat.owner === "-" ? "not shown" : flat.owner,
    doorMode: flat.doorMode,
    status: flat.doorMode === "password" ? "password-required" : "tryflat-pending",
    source: [goToFlatWithNaviSourcePath, connectionWaitEntryFlatSourcePath, ...source]
  });
  if (flat.doorMode !== "password") {
    queueRelease1NavigatorTextRequests(movie, [
      createNavigatorTextRequest(movie, "TRYFLAT", `/${flat.id}/`, connectionWaitEntryFlatSourcePath)
    ]);
  }
  setRelease1NavigatorFrame(movie, frame, [goToFlatWithNaviSourcePath, ...source]);
  movie.debugLog.add("navigator", "info", `release1 GoToFlatWithNavi room=${flat.id} frame=${frame}`);
}

function setRelease1NavigatorFrame(movie: DirectorMovie, frame: string, source: readonly string[]): void {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState")) ?? {};
  movie.setProperty("release1EntryNavigatorState", {
    ...state,
    open: true,
    frame,
    source
  });
  syncRelease1EntryNavigator(movie);
}

function privateFlatSelectionFromActivation(
  movie: DirectorMovie,
  activation: HabboWindowElementActivation | undefined,
  memberName: string
): { readonly flat: Release1FlatResult; readonly index: number } | undefined {
  const localY = typeof activation?.localY === "number" ? activation.localY : undefined;
  if (localY === undefined) {
    return undefined;
  }

  const memberScrollTop = readFlatResultsTextScrollTop(movie, memberName);
  const index = Math.floor(Math.max(0, localY + memberScrollTop) / naviRowHeight) + 1;
  const flat = readFlatResults(movie)[index - 1];
  return flat ? { flat, index } : undefined;
}

function readFlatResultsTextScrollTop(movie: DirectorMovie, memberName: string): number {
  const member = movie.cast.getMemberByName(memberName, navigationCast(movie)?.number);
  return Math.max(0, member?.textScrollY ?? 0);
}

function readFlatResults(movie: DirectorMovie): readonly Release1FlatResult[] {
  const state = readRecord(movie.getProperty("release1EntryNavigatorFlatResults"));
  if (!Array.isArray(state?.flats)) {
    return [];
  }
  return state.flats.filter(isRelease1FlatResult);
}

function readSelectedFlat(movie: DirectorMovie): Release1FlatResult | undefined {
  const state = readRecord(movie.getProperty("release1EntryNavigatorSelectedFlat"));
  return isRelease1FlatResult(state?.flat) ? state.flat : undefined;
}

function doorInfoForPrivateFlat(movie: DirectorMovie, flat: Release1FlatResult): string {
  if (flat.doorMode === "open") {
    return release1FieldText(movie, "DoorOpen", "Door is open");
  }
  if (flat.doorMode === "closed") {
    return release1FieldText(movie, "DoorClosed", "Door is closed");
  }
  if (flat.doorMode === "password") {
    return release1FieldText(movie, "DoorPassword", "Password required");
  }
  return flat.doorMode;
}

function doorButtonTextForPrivateFlat(movie: DirectorMovie, flat: Release1FlatResult, ownerName: string): string {
  const myName = currentRelease1UserName(movie);
  if (flat.doorMode === "open" || (myName.length > 0 && myName === ownerName)) {
    return release1FieldText(movie, "GoInside", "Go inside");
  }
  if (flat.doorMode === "closed") {
    return release1FieldText(movie, "RingDoorBell", "Ring doorbell");
  }
  return release1FieldText(movie, "InsidePassword", "Password");
}

function currentRelease1UserName(movie: DirectorMovie): string {
  const userObject = readRecord(movie.getProperty("release1EntryUserObject"));
  return typeof userObject?.name === "string" ? userObject.name : "";
}

function parseRecordedNavigatorFrame(movie: DirectorMovie, memberName: string): readonly RecordedSprite[] {
  const range = navigatorChannelRange(movie);
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  return parseRecordedNavigatorFrameSource(movie, memberName, {
    castName: navigatorCastName,
    startChannel: range.start,
    locZ: entryNavigatorLocZ,
    place: readNavigatorPlace(state) ?? entryNavigatorPlace
  });
}

function applyRelease1NavigatorDynamicMembers(movie: DirectorMovie): void {
  const navigation = navigationCast(movie);
  if (!navigation) {
    return;
  }

  const members = navigation.members.map((member) => {
    if (member.name === naviWindowMemberName) {
      return {
        ...memberManifestFromMember(member),
        type: "bitmap",
        width: naviWindowWidth,
        height: naviWindowHeight,
        composite: createVisibleNaviWindowComposite(movie)
      } satisfies DirectorMemberManifest;
    }
    return memberManifestFromMember(member);
  });

  movie.cast.importCastLib({
    number: navigation.number,
    ...(navigation.name ? { name: navigation.name } : {}),
    ...(navigation.fileName ? { fileName: navigation.fileName } : {}),
    ...(navigation.preloadMode !== undefined ? { preloadMode: navigation.preloadMode } : {}),
    members
  } satisfies DirectorCastLibManifest);

  movie.setProperty("release1NavigatorDynamicMemberState", {
    member: naviWindowMemberName,
    source: [navigatorWindowSourcePath, navigatorImageHandlersSourcePath]
  });
}

function createVisibleNaviWindowComposite(movie: DirectorMovie): DirectorBitmapComposite {
  const layers: DirectorBitmapCompositeLayer[] = [
    {
      x: 0,
      y: 0,
      width: naviWindowWidth,
      height: naviWindowHeight,
      fillColor: naviBackgroundColor
    }
  ];

  addNavigatorHeaderLayers(movie, layers);
  const firstVisiblePlace = readFirstVisiblePlace(movie);
  const units = readRelease1PublicUnits(movie);
  for (let index = 0; index < units.length && index < naviVisibleRows; index++) {
    const unit = units[index + firstVisiblePlace - 1];
    if (!unit) {
      break;
    }
    addNavigatorUnitRowLayers(movie, layers, unit, index + 1);
  }

  return {
    width: naviWindowWidth,
    height: naviWindowHeight,
    layers
  };
}

function publicUnitSelectionFromActivation(
  movie: DirectorMovie,
  activation: HabboWindowElementActivation | undefined
): { readonly unit: Release1PublicUnit; readonly index: number } | undefined {
  const localY = typeof activation?.localY === "number" ? activation.localY : undefined;
  if (localY === undefined) {
    return undefined;
  }

  const rowNumber = Math.floor(localY / naviRowHeight);
  if (rowNumber < 1) {
    return undefined;
  }

  const index = readFirstVisiblePlace(movie) + rowNumber - 1;
  const unit = readRelease1PublicUnits(movie)[index - 1];
  return unit ? { unit, index } : undefined;
}

function shouldLeaveRoomForHotelViewRow(movie: DirectorMovie, activation: HabboWindowElementActivation | undefined): boolean {
  if (movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return false;
  }

  const localY = typeof activation?.localY === "number" ? activation.localY : undefined;
  if (localY === undefined || Math.floor(localY / naviRowHeight) !== 0) {
    return false;
  }

  return true;
}

function queueRelease1NavigatorHotelViewGoAway(movie: DirectorMovie): boolean {
  if (movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return false;
  }

  const state = readRecord(movie.getProperty("release1EntryNavigatorState")) ?? {};
  movie.setProperty("release1NavigatorGoAwayRequest", {
    command: "GOAWAY",
    status: "pending",
    source: navigatorWindowSourcePath
  });
  movie.setProperty("release1NavigatorSuppressUnitUsersOnce", true);
  movie.setProperty("release1EntryNavigatorState", {
    ...state,
    open: false,
    source: navigatorWindowSourcePath
  });
  setNavigatorOverlaySprites(movie, []);
  syncRelease1EntryNavigatorInteractions(movie);
  movie.debugLog.add("navigator", "info", "release1 Hotel view row queued GOAWAY");
  return true;
}

function setPublicRoomInfoFields(movie: DirectorMovie, unit: Release1PublicUnit): void {
  setMemberTextByName(movie, "room_name_n_load", `${unit.name} (${unit.activeUsers}/${unit.maxUsers})`);
  setMemberTextByName(movie, "room_infotext", release1TextFieldValue(movie, "unit infotexts", unit.name) ?? unit.description);
  setMemberTextByName(movie, "publicroom_peoplelist", "");
}

function addNavigatorHeaderLayers(movie: DirectorMovie, layers: DirectorBitmapCompositeLayer[]): void {
  const header = movie.cast.getMemberByName("Hotel.view", navigationCast(movie)?.number);
  const goLink = movie.cast.getMemberByName("golink.graph", navigationCast(movie)?.number);
  layers.push({
    x: 5,
    y: 0,
    width: 80,
    height: naviRowHeight,
    text: header?.text ?? "Hotel view",
    color: header?.color ?? "#000000",
    fontSize: header?.fontSize ?? 9,
    textAlign: "left",
    ...(header?.fontFamily ? { fontFamily: header.fontFamily } : {}),
    ...(header?.fontWeight ? { fontWeight: header.fontWeight } : {})
  });
  addAssetLayer(movie, layers, "dottedline", 80, 9, 140, 1, true);
  if (goLink?.assetPath) {
    addAssetLayer(movie, layers, "golink.graph", 225, 1, goLink.width ?? 25, goLink.height ?? 11);
  } else {
    layers.push({
      x: 225,
      y: 1,
      width: 24,
      height: 11,
      text: "Go",
      color: "#000000",
      fontSize: 9,
      textAlign: "left"
    });
  }
}

function addNavigatorUnitRowLayers(
  movie: DirectorMovie,
  layers: DirectorBitmapCompositeLayer[],
  unit: Release1PublicUnit,
  visibleRow: number
): void {
  const y = visibleRow * naviRowHeight;
  const hierarchyX = unit.otherRooms.length > 0 ? 44 : 89;
  addAssetLayer(movie, layers, "colored_room_icon", hierarchyX - 24, y, 10, 10);
  layers.push({
    x: hierarchyX,
    y,
    width: 132,
    height: naviRowHeight,
    text: unit.name,
    color: "#000000",
    fontSize: 9,
    textAlign: "left"
  });
  layers.push({
    x: 178,
    y: y + 2,
    width: 26,
    height: naviRowHeight - 2,
    text: String(unit.activeUsers),
    color: "#000000",
    fontSize: 9,
    textAlign: "left"
  });
  addAssetLayer(movie, layers, "dottedline", 196, y + 9, 29, 1, true);
  addAssetLayer(movie, layers, "golink.graph", 225, y + 1, 25, 11);
}

function addAssetLayer(
  movie: DirectorMovie,
  layers: DirectorBitmapCompositeLayer[],
  memberName: string,
  x: number,
  y: number,
  fallbackWidth: number,
  fallbackHeight: number,
  repeat = false
): void {
  const member = movie.cast.getMemberByName(memberName, navigationCast(movie)?.number);
  if (!member?.assetPath) {
    return;
  }

  layers.push({
    x,
    y,
    width: member.width ?? fallbackWidth,
    height: member.height ?? fallbackHeight,
    assetPath: member.assetPath,
    repeat
  });
}

function applyRelease1NavigatorFrameBeginSpriteEffects(
  movie: DirectorMovie,
  frame: string,
  recordedSprites: readonly RecordedSprite[]
): readonly RecordedSprite[] {
  const frameSprites = applyRelease1PrivateDropdownSpriteState(movie, recordedSprites);
  const state = readRecord(movie.getProperty("release1EntryNavigatorBeginSpriteState"));
  if (state?.frame === frame) {
    return frameSprites;
  }

  const dropSprite = recordedSprites.find((sprite) => sprite.behaviorNames.includes("PrivateRoomDropListBehavior"));
  const popularSprite = recordedSprites.find((sprite) => sprite.behaviorNames.includes("PopularFlatQuery"));
  if (dropSprite) {
    const member = movie.cast.getMember(dropSprite.member);
    clearRelease1FlatResultFields(movie);
    movie.setProperty("release1EntryNavigatorPrivateDrop", {
      status: 0,
      memberName: member?.name ?? "",
      source: privateDropSourcePath
    });
    setMemberTextByName(movie, "flatquery", "");
  }

  if (popularSprite) {
    movie.setProperty("release1EntryNavigatorFirstPlaceNow", 0);
  }

  movie.setProperty("release1EntryNavigatorBeginSpriteState", {
    frame,
    hasPrivateDrop: dropSprite !== undefined,
    hasPopularFlatQuery: popularSprite !== undefined,
    source: [privateDropSourcePath, popularFlatQuerySourcePath]
  });
  return frameSprites;
}

function applyRelease1PrivateDropdownSpriteState(
  movie: DirectorMovie,
  recordedSprites: readonly RecordedSprite[]
): readonly RecordedSprite[] {
  const dropdownItems = recordedSprites.filter((sprite) => sprite.behaviorNames.includes("NavPrivateRoomDropListItems_behav"));
  if (dropdownItems.length === 0) {
    return recordedSprites;
  }

  const dropState = readRecord(movie.getProperty("release1EntryNavigatorPrivateDrop"));
  if (dropState?.status !== 1) {
    return recordedSprites.map((sprite) => sprite.behaviorNames.includes("NavPrivateRoomDropListItems_behav")
      ? {
        ...sprite,
        loc: {
          ...sprite.loc,
          y: 2000
        }
      }
      : sprite);
  }

  return recordedSprites;
}

function clearRelease1FlatResultFields(movie: DirectorMovie): void {
  setMemberTextByName(movie, "flat_results.description", "");
  setMemberTextByName(movie, "flat_results.doorstatus", "");
  setMemberTextByName(movie, "flat_results.names", "");
  setMemberTextByName(movie, "flat_results.load", "");
  setMemberTextByName(movie, "flats_go", "");
}

function setNavigatorOverlaySprites(movie: DirectorMovie, navigatorSprites: readonly DirectorSpriteChannelManifest[]): void {
  const nextWindowSprites = [
    ...readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isNavigatorSprite(sprite)),
    ...navigatorSprites
  ];
  movie.setProperty("windowOverlaySprites", nextWindowSprites);

  const nextDirectorSprites = [
    ...readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isNavigatorSprite(sprite)),
    ...navigatorSprites
  ];
  movie.setProperty("directorOverlaySprites", nextDirectorSprites);
}

function isNavigatorSprite(sprite: DirectorSpriteChannelManifest): boolean {
  return (sprite.channel >= entryNavigatorStartChannel && sprite.channel <= entryNavigatorEndChannel)
    || (sprite.channel >= privateNavigatorStartChannel && sprite.channel <= privateNavigatorEndChannel);
}

function navigatorChannelRange(movie: DirectorMovie): { readonly start: number; readonly end: number } {
  return movie.getProperty("release1PrivateRoomMovieActive") === true
    ? { start: privateNavigatorStartChannel, end: privateNavigatorEndChannel }
    : { start: entryNavigatorStartChannel, end: entryNavigatorEndChannel };
}

function readNavigatorPlace(state: Record<string, unknown> | undefined): { readonly x: number; readonly y: number } | undefined {
  const place = readRecord(state?.place);
  return typeof place?.x === "number" && typeof place.y === "number"
    ? { x: place.x, y: place.y }
    : undefined;
}

function stripRecordedBehaviorInfo(movie: DirectorMovie, sprite: RecordedSprite): DirectorSpriteChannelManifest {
  const progressSprite = sprite.behaviorNames.includes("progressBar_bhv")
    ? release1NavigatorProgressSprite(movie, sprite)
    : undefined;
  return {
    channel: sprite.channel,
    member: sprite.member,
    loc: progressSprite?.loc ?? sprite.loc,
    locZ: sprite.locZ,
    ink: sprite.ink,
    blend: sprite.blend,
    width: progressSprite?.width ?? sprite.width,
    height: progressSprite?.height ?? sprite.height,
    ...(sprite.fgColor ? { fgColor: sprite.fgColor } : {}),
    ...(sprite.bgColor ? { bgColor: sprite.bgColor } : {})
  };
}

function release1NavigatorProgressSprite(
  movie: DirectorMovie,
  sprite: RecordedSprite
): { readonly loc: { readonly x: number; readonly y: number }; readonly width: number; readonly height: number } | undefined {
  const member = movie.cast.getMember(sprite.member);
  const sourceWidth = Math.max(1, Math.round(member?.width ?? sprite.width));
  const sourceHeight = Math.max(1, Math.round(member?.height ?? sprite.height));
  const progress = release1RoomLoaderProgress(movie);
  const fillWidth = Math.max(1, Math.min(sourceWidth, Math.round(sourceWidth * progress)));
  const recordedRegX = Math.round(((member?.regPoint.x ?? 0) * Math.max(1, sprite.width)) / sourceWidth);
  const nextRegX = Math.round(((member?.regPoint.x ?? 0) * fillWidth) / sourceWidth);
  const left = Math.round(sprite.loc.x - recordedRegX);
  return {
    loc: {
      x: left + nextRegX,
      y: sprite.loc.y
    },
    width: fillWidth,
    height: sourceHeight
  };
}

function release1RoomLoaderProgress(movie: DirectorMovie): number {
  const raw = movie.getProperty("roomLoaderProgress");
  const value = typeof raw === "number"
    ? raw
    : typeof raw === "string"
      ? Number.parseFloat(raw)
      : 0;
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function isRelease1NavigatorRoomLoadFrame(frame: string): boolean {
  const normalized = frame.toLowerCase();
  return normalized === "flat_load"
    || normalized === "flat_loading"
    || normalized === "flat_loadready";
}

function navigatorTextRequestsForSprite(movie: DirectorMovie, sprite: RecordedSprite): readonly Release1NavigatorTextRequest[] {
  if (!sprite.behaviorNames.includes("busyflats")) {
    return [];
  }

  return [createNavigatorTextRequest(movie, "SEARCHBUSYFLATS", "/0,11", busyFlatsSourcePath)];
}

function createNavigatorTextRequest(
  movie: DirectorMovie,
  command: Release1NavigatorTextRequest["command"],
  body: string,
  source: string
): Release1NavigatorTextRequest {
  const serial = nextNavigatorRequestSerial(movie);
  return {
    id: serial,
    command,
    body,
    status: "pending",
    source
  };
}

function queueRelease1NavigatorTextRequests(movie: DirectorMovie, requests: readonly Release1NavigatorTextRequest[]): void {
  if (requests.length === 0) {
    return;
  }

  movie.setProperty("release1EntryNavigatorTextRequests", [
    ...readNavigatorTextRequests(movie),
    ...requests
  ]);
}

function readNavigatorTextRequests(movie: DirectorMovie): Release1NavigatorTextRequest[] {
  const value = movie.getProperty("release1EntryNavigatorTextRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is Release1NavigatorTextRequest => {
    const record = readRecord(entry);
    return typeof record?.id === "number"
      && typeof record.command === "string"
      && typeof record.body === "string"
      && (record.status === "pending" || record.status === "sent")
      && typeof record.source === "string";
  });
}

function nextNavigatorRequestSerial(movie: DirectorMovie): number {
  const raw = movie.getProperty("release1EntryNavigatorRequestSerial");
  const next = (typeof raw === "number" ? Math.trunc(raw) : 0) + 1;
  movie.setProperty("release1EntryNavigatorRequestSerial", next);
  return next;
}

function readNavigatorInteractiveActions(movie: DirectorMovie): Release1NavigatorInteractiveAction[] {
  const value = movie.getProperty("release1EntryNavigatorInteractiveActions");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is Release1NavigatorInteractiveAction => {
    const record = readRecord(entry);
    return typeof record?.id === "string"
      && (record.event === "mouseUp" || record.event === "mouseDown")
      && Array.isArray(record.requests)
      && Array.isArray(record.source);
  });
}
