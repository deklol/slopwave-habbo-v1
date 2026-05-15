import { LingoSymbol } from "../lingo";
import {
  handleAvailableBadgesPacketRuntime,
  handleBridgePacketRuntime,
  handleRegistrationNameRejectedRuntime,
  handleServerErrorPacketRuntime,
  handleSystemBroadcastPacketRuntime,
  handleUserBadgePacketRuntime,
  handleUserObjectPacketRuntime,
  showModeratorAlertRuntime,
  type HabboBridgePacketRuntimeHost
} from "./protocol/HabboBridgePacketRuntime";
import {
  serializeWindow
} from "./HabboRuntimeSerialization";
import {
  booleanProperty,
  coerceRecord,
  colorFromPropList,
  countWindowElements,
  directorFontStyle,
  directorFontUnderline,
  directorFontWeight,
  directorNumberFromUnknown,
  estimateVolterTextWidth,
  labelForElement,
  normalizeCastName,
  normalizeMemberName,
  normalizeRoomObjectClassName,
  normalizeSymbolish,
  normalizeSymbolKey,
  numberFromPropList,
  numberFromUnknown,
  numberProperty,
  parseWindowRect,
  readLingoPacketWord,
  readStringList,
  roomKioskPasswordFromTempValue,
  roommaticUseTile,
  sanitizeDirectorSingleLineInput,
  sanitizeRoomKioskRoomNameInput,
  stringProperty,
  textAlignFromString,
  threadModulesFromProperties,
  truthySessionValue,
  type LoadingBarProps
} from "./HabboSourceValueHelpers";
import type {
  DirectorBitmapCompositeLayer,
  DirectorMember,
  DirectorMemberManifest,
  DirectorMemberRef,
  DirectorMemberType,
  DirectorMovie,
  DirectorSpriteChannelManifest,
  UnsupportedFeature
} from "../runtime";
import { HabboAlertManager, type HabboAlertDescriptor } from "./HabboAlertManager";
import {
  HabboObjectManager,
  HabboResourceManager,
  HabboThreadManager,
  HabboVariableObject,
  type HabboManagerRecord,
  type HabboThreadModules,
  type HabboThreadRecord
} from "./boot/HabboBootManagers";
import {
  handleRelease1CatalogueOrderInfoPacket,
  handleRelease1CataloguePurchaseResultPacket,
  hideRelease1Catalogue,
  moveRelease1EntryNavigatorBy,
  showRelease1Catalogue,
  type HabboV1CatalogueRuntimeHost,
  moveRelease1MessengerBy,
  showHideRelease1Messenger,
  syncRelease1MessengerIfOpen,
  type HabboV1MessengerRuntimeHost,
  refreshRelease1PrivateRoomScoreFrame,
  refreshRelease1SelectedPrivateRoomUserInfo as refreshRelease1SelectedPrivateRoomUserInfoRuntime,
  showRelease1SelectedPrivateRoomObjectInfo as showRelease1SelectedPrivateRoomObjectInfoRuntime,
  showRelease1SelectedPrivateRoomUserInfo as showRelease1SelectedPrivateRoomUserInfoRuntime
} from "./compatibility/v1";
import {
  brokerExistsRuntime,
  createBrokerRuntime,
  executeObjectHandlerRuntime,
  executeMessageRuntime,
  getMessageRegistrationsRuntime,
  getPendingDelaysRuntime,
  registerMessageRuntime,
  runScheduledDelaysRuntime,
  scheduleDelayRuntime,
  unregisterMessageRuntime,
  type HabboMessageDispatchHost
} from "./boot/HabboMessageDispatchRuntime";
import {
  hideLoadingBarRuntime,
  showLoadingBarRuntime,
  type HabboLoadingBarRuntimeHost
} from "./boot/HabboLoadingBarRuntime";
import {
  applyCastEntryCompatibilityRuntime,
  assignDynamicCastSlotsRuntime,
  castExistsRuntime,
  convertSpecialCharsRuntime,
  dumpImportedCastVariableIndexesRuntime,
  findEntryVisualCandidateForLocaleRuntime,
  getAvailableDynamicCastSlotsRuntime,
  getAnyBitmapAssetByMemberNameRuntime,
  getBitmapAssetCandidatesByMemberNameRuntime,
  getBitmapAssetCandidatesRuntime,
  getBitmapAssetByMemberNameRuntime,
  getBitmapAssetRuntime,
  getBoolVariableRuntime,
  getClassVariableRuntime,
  getEntryVisualCastEntryFallbackRuntime,
  getEntryVisualLocaleHintRuntime,
  getIntVariableRuntime,
  getMoviePathRuntime,
  getRoomCommonCastEntriesRuntime,
  getSequentialCastEntriesRuntime,
  getSourceBackedCastEntryFallbackRuntime,
  getTextRuntime,
  getVariableRuntime,
  hideLogoRuntime,
  importResolvedExternalCastsRuntime,
  readCastListVariableRuntime,
  removeMemberByNameRuntime,
  resolveExternalCastRuntime,
  resolveExternalBitmapMemberRefByNameRuntime,
  resolveLoaderLogoAssetRuntime,
  resolveMemberAliasRuntime,
  setVariableRuntime,
  showLogoRuntime,
  startCastLoadRuntime,
  type HabboExternalCastRuntimeHost
} from "./boot/HabboExternalCastRuntime";
import {
  applyThreadConstructorSideEffectsRuntime,
  constructCoreThreadRuntime,
  constructObjectManagerRuntime,
  createCoreThreadRuntime,
  createThreadModuleObjectsRuntime,
  deconstructObjectManagerRuntime,
  dumpTextFieldRuntime,
  dumpVariableFieldRuntime,
  findExternalCastTextFieldRuntime,
  findExternalFieldRuntime,
  findFieldRuntime,
  findTextFieldRuntime,
  getCastLoadCallbacksRuntime,
  getCurrentCoreThreadCastListRuntime,
  getDownloadCallbacksRuntime,
  initializeExternalThreadsRuntime,
  preIndexMembersRuntime,
  registerCastloadCallbackRuntime,
  registerDownloadCallbackRuntime,
  resetCastLibsRuntime,
  resolveExternalScriptSourcePathRuntime,
  seedRequiredBootVariablesRuntime,
  sourcePathForClassRuntime,
  startClientRuntime,
  stopClientRuntime,
  updateCoreThreadStateRuntime,
  type HabboThreadConstructorHost
} from "./boot/HabboThreadConstructorRuntime";
import type {
  HabboButtonBitmapAssetSet,
  HabboButtonElementAsset,
  HabboButtonElementPartAssetRef,
  HabboButtonElementStateAsset,
  HabboButtonElementTextSpec,
  HabboCastLoadCallback,
  HabboDownloadCallback,
  HabboExternalBitmapAsset,
  HabboExternalBitmapAssetSet,
  HabboExternalCastEntry,
  HabboExternalCastGraph,
  HabboExternalCastMember,
  HabboExternalCastTextFieldEntry,
  HabboExternalCastTextFieldSet,
  HabboExternalCastVisualLayout,
  HabboExternalCastVisualLayoutSet,
  HabboExternalCastWindowLayout,
  HabboExternalCastWindowLayoutSet,
  HabboExternalFieldEntry,
  HabboExternalFieldSet,
  HabboFigurePartIndexEntry,
  HabboFigurePartIndexSet,
  HabboInternalBitmapAsset,
  HabboInternalBitmapAssetSet,
  HabboMessageCallRecord,
  HabboMessageRegistration,
  HabboTextFieldEntry,
  HabboTextFieldSet,
  HabboVisualBitmapAssetSet,
  HabboVisualBitmapVisualEntry,
  HabboWindowBitmapAsset,
  HabboWindowBitmapAssetSet,
  HabboWindowBitmapWindowEntry,
  HabboWindowLayoutBitmapMetadata,
  HabboWindowLayoutElement,
  HabboWindowLayoutResolvedMember
} from "./boot/HabboBootResourceTypes";
import type {
  HabboDelayRecord,
  HabboWindowElementOverride,
  HabboWindowElementActivation,
  HabboWindowElementEventKind,
  HabboWindowInteractiveElement,
  HabboWindowProcedureRecord,
  HabboWindowRecord
} from "./window/HabboWindowTypes";
import {
  adjustWindowTextGeometry,
  allElementsShareNumber,
  applyWindowElementPropertyOverride,
  applyWindowGroupBoundsOverride,
  estimateDialogWriterImageSize,
  estimateDialogWriterWrappedHeight,
  estimateDirectorTextLineCount,
  estimateRuntimeButtonTextWidth,
  groupLayoutElementsById,
  isCommonButtonElement,
  isEditableWindowField,
  isTextWindowElement,
  isWindowElementFlippedH,
  isWindowElementFlippedV,
  layoutElementKey,
  resolveGroupedWindowElementGeometry,
  resolveLayoutRenderSize,
  scrollbarElementPart,
  selectButtonAssetPath,
  zeroWindowBorder
} from "./window/HabboWindowLayoutHelpers";
import {
  createRuntimeButtonShapeMember,
  createRuntimeButtonTextMember,
  createRuntimeEntryVisualShapeMember,
  createRuntimeWindowFieldMember
} from "./window/HabboRuntimeWindowMembers";
import {
  createRuntimeBitmapGroupSpriteRuntime,
  createRuntimeButtonSpritesRuntime,
  createRuntimeDropMenuSpriteRuntime,
  createRuntimeFedWindowElementSpriteRuntime,
  createRuntimeScrollbarSpriteRuntime,
  createRuntimeStaticWindowBitmapElementSpriteRuntime,
  getImageScrollStateRuntime,
  getScrollbarClientScrollStateRuntime,
  getTextScrollStateRuntime,
  getWindowTextScrollOffsetRuntime,
  prepareRuntimeButtonRuntime,
  resolveRuntimeButtonIconRuntime,
  resolveWindowImageScrollSourceSizeRuntime,
  syncWindowSpriteChannelsRuntime,
  type HabboWindowSpriteSyncHost
} from "./window/HabboWindowSpriteSyncRuntime";
import {
  activateAlertElementRuntime,
  activateDialogElementRuntime,
  activateDropMenuElementRuntime,
  activateGenericWindowElementRuntime,
  activateScrollbarElementRuntime,
  activateWindowRuntime,
  activateWindowElementRuntime,
  applyDropMenuSelectionRuntime,
  bringWindowContainingElementToFrontRuntime,
  bringWindowToFrontRuntime,
  clearWindowElementOverridesRuntime,
  closeAlertWindowRuntime,
  closeWindowFromSourceElementRuntime,
  collectInteractiveElementRuntime,
  collectRoomHandInteractiveElementsRuntime,
  collectRoomObjectInteractiveElementsRuntime,
  createWindowRuntime,
  findOpenWindowElementRuntime,
  findWindowProcedureForEventRuntime,
  getEditableDisplayTextRuntime,
  getRuntimeEntryVisualCastSlotRuntime,
  getRuntimeLoadingCastSlotRuntime,
  getRuntimeLogoCastSlotRuntime,
  getRuntimeRoomCastSlotRuntime,
  getRuntimeRoomChatCastSlotRuntime,
  getRuntimeRoomCoverCastSlotRuntime,
  getRuntimeRoomObjectCastSlotRuntime,
  getRuntimeRoomVisualCastSlotRuntime,
  getRuntimeWindowCastSlotRuntime,
  getDropMenuKeyListRuntime,
  getDropMenuLabelsRuntime,
  getDropMenuLineHeightRuntime,
  getDropMenuSelectedKeyRuntime,
  getScrollbarMetricsRuntime,
  getWindowScrollOffsetRuntime,
  getWindowElementOverrideRuntime,
  hideWindowElementRuntime,
  isDropMenuOpenRuntime,
  isOpenWindowElementEditableRuntime,
  isWindowElementPressedRuntime,
  mergeWindowLayoutRuntime,
  moveWindowByIdRuntime,
  moveWindowElementByRuntime,
  moveWindowElementHRuntime,
  procedureEventSymbolRuntime,
  recordWindowElementActivationEventRuntime,
  registerWindowClientRuntime,
  registerWindowProcedureRuntime,
  releasePressedWindowElementRuntime,
  removeLoginWindowPairRuntime,
  removeWindowRuntime,
  resolveElementLabelRuntime,
  resolveInteractiveSpriteBoundsRuntime,
  resizeWindowElementByRuntime,
  resolveAlertContentSizeRuntime,
  resolveDropMenuSpriteGeometryRuntime,
  resolveSourceWindowPositionRuntime,
  resolveStatefulControlMemberNameRuntime,
  resolveWindowBitmapElementRefRuntime,
  resolveWindowElementTextRuntime,
  setWindowElementCommonButtonActivationRuntime,
  setWindowElementEditableRuntime,
  setWindowElementOverrideRuntime,
  setRoomChatModeRuntime,
  setWindowFieldValueRuntime,
  setWindowScrollOffsetRuntime,
  showAlertRuntime,
  showCallForHelpDialogRuntime,
  showGeneralDialogRuntime,
  showHelpDialogRuntime,
  showOpenGeneralDialogRuntime,
  showWindowElementRuntime,
  shouldRouteRoomObjectHitToRoomCanvasRuntime,
  syncDirectorOverlaySpritesRuntime,
  syncRoomInteractiveElementsRuntime,
  syncWindowFieldValueSnapshotRuntime,
  submitWindowFieldRuntime,
  windowHasProcedureForElementEventRuntime,
  type HabboWindowRuntimeHost
} from "./window/HabboWindowRuntime";
import {
  buildRoomUserInfo,
  normalizeBadgeId,
  parseRoomObjectInteractiveId,
  parseRoomUserInteractiveId,
  roomObjectInteractiveId,
  resolveRoomUserControlType,
  roomUserInteractiveId
} from "./room/HabboRoomSelection";
import type { HabboRoomObjectInfo, HabboRoomSelectableObjectKind, HabboRoomUserInfo } from "./room/HabboRoomSelection";
import {
  advanceBadgeEffectAnimationRuntime,
  activateBadgeChooserElementRuntime,
  activateRoomDeleteConfirmElementRuntime,
  activateRoomObjectInterfaceElementRuntime,
  activateRoommaticPassiveObjectRuntime,
  clearRoomObjectSelectionRuntime,
  createBadgePreviewMemberRuntime,
  createBadgeVisibilityRadioMemberRuntime,
  createCenteredBadgeMemberRuntime,
  createBadgeEffectLayerRuntime,
  createInfoStandBadgeMemberRuntime,
  createInfoStandObjectImageMemberRuntime,
  createInfoStandUserImageMemberRuntime,
  getAvailableBadgesRuntime,
  getBadgeEffectPointRuntime,
  getOwnRoomUserRuntime,
  getRoomObjectRuntime,
  getRoomObjectSourceClassValueRuntime,
  getSelectedInfoStandBadgeRuntime,
  getSelectedInfoStandBadgeVisibleRuntime,
  getSelectedRoomObjectFirstAssetRuntime,
  getSelectedRoomObjectInfoRuntime,
  getSelectedRoomUserInfoRuntime,
  getSelectedRoomUserRuntime,
  openBadgeWindowRuntime,
  resolveInfoStandBadgeAssetRuntime,
  resolveRoomObjectLabelRuntime,
  roomObjectUsesClassRuntime,
  selectRoomObjectRuntime,
  selectRoomUserRuntime,
  sessionHasRightRuntime,
  showObjectInterfaceButtonsRuntime,
  showRoomBarRuntime,
  showRoomInfoStandRuntime,
  showRoomDeleteConfirmRuntime,
  showSelectedRoomObjectInfoRuntime,
  showSelectedRoomObjectInterfaceRuntime,
  showSelectedRoomUserInfoRuntime,
  showSelectedRoomUserInterfaceRuntime,
  toggleOwnBadgeVisibilityRuntime,
  type HabboRoomSelectionRuntimeHost
} from "./room/HabboRoomSelectionRuntime";
import {
  parseRoomChatPacket,
  roomChatStyle,
  submitRoomChatRuntime,
  trimRoomChatMessage,
  type HabboRoomChatMessage,
  type HabboRoomChatRuntimeHost,
  type HabboRoomChatMode
} from "./room/HabboRoomChat";
import {
  darkenBrightRoomChatColor,
  readRoomChatMessages
} from "./room/HabboRoomChatData";
import {
  advanceRoomChatBalloonsRuntime,
  handleRoomChatPacketRuntime,
  renderRoomChatBalloonsRuntime,
  retainVisibleRoomChatMessages,
  roomBalloonPositionSignatureRuntime,
  visibleRoomBalloons,
  type HabboRoomBalloonsRuntimeHost
} from "./room/HabboRoomBalloons";
import type {
  HabboRoomEntryState,
  HabboRoomWirePhase
} from "./room/HabboRoomLifecycle";
import {
  beginRoomEntryTransitionRuntime,
  canAcceptActiveRoomPacketRuntime,
  canAcceptInitialStatusPacketRuntime,
  canAcceptRoomBootstrapPacketRuntime,
  completePendingRoomBootstrapRuntime,
  completeRoomActivationAfterPreloadRuntime,
  createDefaultPrivateRoomProgramStateRuntime,
  createRoomLoaderBarMemberRuntime,
  enterEntryRuntime,
  enterRoomRuntime,
  describeRoomVisualCandidatesRuntime,
  getPrivateRoomPatternsRuntime,
  getPrivateRoomProgramStateRuntime,
  getRoomPatternRuntime,
  getRoomWirePhaseRuntime,
  getVisualizerDefaultLocZRuntime,
  handleRoomFlatPropertyPacketRuntime,
  handleRoomProcessStepRuntime,
  hideRoomLoaderBarRuntime,
  hideRoomTrashCoverRuntime,
  ignoreRoomPacketRuntime,
  leaveEntryRuntime,
  leaveRoomRuntime,
  loadRoomCastsRuntime,
  markRoomLoaderFrameRenderedRuntime,
  markRoomRequestSentRuntime,
  maybeFinalizeRoomBootstrapRuntime,
  prepareRoomActivationAfterInitialStatusRuntime,
  queueRoomRequestRuntime,
  roomConnectedRuntime,
  roomCastLoadedRuntime,
  setRoomEntryStateRuntime,
  setRoomLoaderProgressRuntime,
  setRoomWirePhaseRuntime,
  setPrivateRoomProgramStateRuntime,
  showRoomLoaderBarRuntime,
  showRoomRuntime,
  showRoomTrashCoverRuntime,
  type HabboRoomLifecycleRuntimeHost
} from "./room/HabboRoomLifecycleRuntime";
import {
  HabboRoomObjectClassProps,
  parseRoomObjectPartColors,
  roomObjectPartColorToHex
} from "./room/HabboRoomObjectProps";
import {
  isRoomUserRecord,
  type HabboRoomUserRecord
} from "./room/HabboRoomUserData";
import {
  advanceRoomUserAnimationsRuntime,
  collectRoomUserInteractiveElementsRuntime,
  handleRoomLogoutPacketRuntime,
  handleRoomStatusPacketRuntime,
  handleRoomUsersPacketRuntime,
  renderRoomUsersRuntime,
  resolveRoomUserScreenPositionRuntime,
  type HabboRoomUserRuntimeHost
} from "./room/HabboRoomUserRuntime";
import {
  type HabboCallForHelpRequest,
  type HabboPrivateRoomPatterns,
  type HabboPrivateRoomProgramState,
  type HabboRoomDataStruct,
  type HabboRoomPattern,
  type HabboRoomRequest
} from "./room/HabboRoomData";
import {
  directorInteger,
  numberFromRoomData,
  rectsIntersect,
  roomCoordinateToStage,
  roomStageToWorldCoordinate,
  spriteRectForLoc,
  type HabboRoomCoordinate
} from "./room/HabboRoomGeometry";
import {
  colorForPrivateRoomWallMember,
  isPrivateRoomFloorVisualElement,
  isPrivateRoomWallVisualElement,
  resolvePrivateRoomFloorMemberName,
  resolvePrivateRoomWallMemberName
} from "./room/HabboPrivateRoomPatterns";
import {
  normalizeWallItemDirection,
  readRoomObjectZShift,
  uniqueNumbers,
  type HabboRoomObjectRecord,
} from "./room/HabboRoomObjectData";
import {
  roomObjectSourceAnimationForPart as resolveRoomObjectSourceAnimationForPart,
  roomObjectTimedStateActive as resolveRoomObjectTimedStateActive,
  type HabboRoomObjectAnimationRecord
} from "./room/HabboRoomObjectAnimations";
import {
  capitalizeRoomObjectKind,
  dedupeSpritePreloadManifests,
  isWallPlacementSpriteEntry,
  isWallPlacementSpritePlan,
  readRoomObjectSpriteEntries,
  readSpriteManifestArray,
  resolveWallPlacementPlanDirection,
  roomObjectAnimationPreloadCandidateSortKey,
  roomObjectAnimationPreloadInputSignature,
  roomObjectOverlayKey,
  roomObjectOverlayPartKey,
  type HabboRoomObjectAnimationPreloadCandidate,
  type HabboRoomObjectSpriteEntry,
  type HabboRoomObjectSpritePlan
} from "./room/HabboRoomObjectSpritePlanning";
import {
  activateCatalogueElement as activateCatalogueElementRuntime,
  activateCatalogueInfoElement as activateCatalogueInfoElementRuntime,
  activateCataloguePurchaseOkElement as activateCataloguePurchaseOkElementRuntime,
  applyCataloguePageText as applyCataloguePageTextRuntime,
  applyCatalogueProductPageControls as applyCatalogueProductPageControlsRuntime,
  catalogueLayoutHasSmallProductPreviews as catalogueLayoutHasSmallProductPreviewsRuntime,
  catalogueProductPerPageForLayout as catalogueProductPerPageForLayoutRuntime,
  confirmCatalogueOrderInfo as confirmCatalogueOrderInfoRuntime,
  createCatalogueImageMember as createCatalogueImageMemberRuntime,
  createCataloguePageListMember as createCataloguePageListMemberRuntime,
  ensureCatalogueObjects as ensureCatalogueObjectsRuntime,
  getCatalogueEditMode as getCatalogueEditModeRuntime,
  getCatalogueLanguage as getCatalogueLanguageRuntime,
  handleCatalogueIndexPacket as handleCatalogueIndexPacketRuntime,
  handleCataloguePagePacket as handleCataloguePagePacketRuntime,
  handleCataloguePurchaseResultPacket as handleCataloguePurchaseResultPacketRuntime,
  hideCatalogue as hideCatalogueRuntime,
  hideCatalogueOrderInfo as hideCatalogueOrderInfoRuntime,
  queueCatalogueRequest as queueCatalogueRequestRuntime,
  recordCatalogueExternalUrl as recordCatalogueExternalUrlRuntime,
  resolveCatalogueAssetSource as resolveCatalogueAssetSourceRuntime,
  resolveCataloguePageLayout as resolveCataloguePageLayoutRuntime,
  resolveCatalogueSmallSlotBackground as resolveCatalogueSmallSlotBackgroundRuntime,
  resolveCatalogueSourcePosition as resolveCatalogueSourcePositionRuntime,
  setCatalogueOrderGiftMode as setCatalogueOrderGiftModeRuntime,
  showCatalogue as showCatalogueRuntime,
  showCatalogueOrderInfo as showCatalogueOrderInfoRuntime,
  showCataloguePurchaseOk as showCataloguePurchaseOkRuntime,
  showHideCatalogue as showHideCatalogueRuntime,
  type HabboCatalogueRuntimeHost
} from "./features/catalogue";
import {
  HABBO_CATALOGUE_COMPONENT_SOURCE,
  HABBO_CATALOGUE_HANDLER_SOURCE,
  HABBO_CATALOGUE_INFO_WINDOW_ID,
  HABBO_CATALOGUE_LOADING_LAYOUT,
  HABBO_CATALOGUE_LOADER_SOURCE,
  HABBO_CATALOGUE_ORDER_GIFT_LAYOUT,
  HABBO_CATALOGUE_ORDER_LAYOUT,
  HABBO_CATALOGUE_PURCHASE_OK_FALLBACK_TITLE,
  HABBO_CATALOGUE_PURCHASE_OK_LAYOUT,
  HABBO_CATALOGUE_PURCHASE_OK_TEMPLATE,
  HABBO_CATALOGUE_PURCHASE_OK_TITLE_KEY,
  HABBO_CATALOGUE_MODAL_LOCZ,
  HABBO_CATALOGUE_SOURCE,
  HABBO_CATALOGUE_TEMPLATE,
  HABBO_CATALOGUE_WINDOW_ID,
  catalogueIndexRequestBody,
  cataloguePageLayoutName,
  cataloguePageRequestBody,
  catalogueProductPageState,
  cataloguePurchaseRequestBody,
  parseCatalogueIndexPacket,
  parseCataloguePagePacket,
  type HabboCatalogueBitmapAssetSource,
  type HabboCataloguePageRecord,
  type HabboCatalogueProductRecord,
  type HabboCatalogueRequest
} from "./ui/HabboCatalogueDialog";
import type { HabboEntryBarAction } from "./ui/HabboEntryBarActions";
import {
  collectHelpTopics,
  HABBO_CALL_FOR_HELP_FALLBACK_TITLE,
  HABBO_CALL_FOR_HELP_LAYOUT,
  HABBO_CALL_FOR_HELP_SENT_LAYOUT,
  HABBO_CALL_FOR_HELP_TITLE_KEY,
  HABBO_HELP_FALLBACK_TITLE,
  HABBO_HELP_LAYOUT,
  HABBO_HELP_TITLE_KEY,
  helpTopicUrlKeyFromLocalY
} from "./ui/HabboHelpDialog";
import {
  HABBO_MESSENGER_COMPONENT_SOURCE,
  HABBO_MESSENGER_COMPOSE_LAYOUT,
  HABBO_MESSENGER_FALLBACK_TITLE,
  HABBO_MESSENGER_FIND_LAYOUT,
  HABBO_MESSENGER_FRIENDS_LAYOUT,
  HABBO_MESSENGER_GET_MESSAGE_LAYOUT,
  HABBO_MESSENGER_GET_REQUEST_LAYOUT,
  HABBO_MESSENGER_HANDLER_SOURCE,
  HABBO_MESSENGER_MAIN_HELP_LAYOUT,
  HABBO_MESSENGER_MY_INFO_LAYOUT,
  HABBO_MESSENGER_REMOVE_FRIEND_LAYOUT,
  HABBO_MESSENGER_SENT_REQUEST_LAYOUT,
  HABBO_MESSENGER_SOURCE,
  HABBO_MESSENGER_TEMPLATE,
  HABBO_MESSENGER_TITLE_KEY,
  activateMessengerElement as activateMessengerElementRuntime,
  changeMessengerWindowView as changeMessengerWindowViewRuntime,
  createEmptyMessengerBuddyList,
  createMessengerFriendListMember as createMessengerFriendListMemberRuntime,
  createMessengerMessageTextMember as createMessengerMessageTextMemberRuntime,
  ensureMessengerObjects as ensureMessengerObjectsRuntime,
  getMessengerBuddyList as getMessengerBuddyListRuntime,
  getMessengerCounts as getMessengerCountsRuntime,
  getMessengerMessages as getMessengerMessagesRuntime,
  getMessengerRequests as getMessengerRequestsRuntime,
  getSelectedMessengerBuddy as getSelectedMessengerBuddyRuntime,
  getSelectedMessengerBuddyNames as getSelectedMessengerBuddyNamesRuntime,
  formatMessengerLocation as formatMessengerLocationRuntime,
  handleMessengerBuddyListPacket as handleMessengerBuddyListPacketRuntime,
  handleMessengerBuddyRequestsPacket as handleMessengerBuddyRequestsPacketRuntime,
  handleMessengerMemberInfoPacket as handleMessengerMemberInfoPacketRuntime,
  handleMessengerMessagePacket as handleMessengerMessagePacketRuntime,
  handleMessengerPersistentMessagePacket as handleMessengerPersistentMessagePacketRuntime,
  handleMessengerReadyPacket as handleMessengerReadyPacketRuntime,
  handleMessengerRemoveBuddyPacket as handleMessengerRemoveBuddyPacketRuntime,
  handleMessengerUserNotFoundPacket as handleMessengerUserNotFoundPacketRuntime,
  hideMessenger as hideMessengerRuntime,
  isMessengerMemberInfoBody as isMessengerMemberInfoBodyRuntime,
  isMessengerUserLookupBody as isMessengerUserLookupBodyRuntime,
  mergeMessengerBuddyLists,
  parseMessengerBuddyListPacket,
  parseMessengerBuddyRequestsPacket,
  parseMessengerMemberInfoPacket,
  parseMessengerMessagePacket,
  parseMessengerNoSuchUserName,
  readMessengerBuddyList,
  readMessengerRequests,
  resolveMessengerAction,
  setMessengerBuddyList as setMessengerBuddyListRuntime,
  setMessengerMessages as setMessengerMessagesRuntime,
  setMessengerRequests as setMessengerRequestsRuntime,
  sendMessengerFindUser as sendMessengerFindUserRuntime,
  showHideMessenger as showHideMessengerRuntime,
  showMessenger as showMessengerRuntime,
  type HabboMessengerBuddy,
  type HabboMessengerBuddyList,
  type HabboMessengerMessage,
  type HabboMessengerRequest,
  type HabboMessengerSearchResult,
  type HabboFriendsConsoleRuntimeHost
} from "./features/friends-console";
import {
  queueCallForHelpRequestRuntime,
  sendCallForHelpRuntime,
  type HabboCallForHelpRuntimeHost
} from "./features/help";
import {
  activateNavigatorElement as activateNavigatorElementRuntime,
  activateNavigatorHistoryLinks as activateNavigatorHistoryLinksRuntime,
  activateNavigatorRoomList as activateNavigatorRoomListRuntime,
  addNavigatorFavoriteRoom as addNavigatorFavoriteRoomRuntime,
  applyNavigatorSourceLayoutMutations as applyNavigatorSourceLayoutMutationsRuntime,
  applyNavigatorWindowState as applyNavigatorWindowStateRuntime,
  buildNavigatorHistory as buildNavigatorHistoryRuntime,
  buildNavigatorRoomDataStruct as buildNavigatorRoomDataStructRuntime,
  changeNavigatorWindowView as changeNavigatorWindowViewRuntime,
  createNavigatorEmptyRoomListMember as createNavigatorEmptyRoomListMemberRuntime,
  createNavigatorHistoryLinksMember as createNavigatorHistoryLinksMemberRuntime,
  createNavigatorInfoIconMember as createNavigatorInfoIconMemberRuntime,
  createNavigatorRoomListLayers as createNavigatorRoomListLayersRuntime,
  createNavigatorRoomListMember as createNavigatorRoomListMemberRuntime,
  createNavigatorRowBackgroundLayers as createNavigatorRowBackgroundLayersRuntime,
  createNavigatorTextFeedMember as createNavigatorTextFeedMemberRuntime,
  executeNavigatorRoomEntry as executeNavigatorRoomEntryRuntime,
  expandNavigatorHistoryNode as expandNavigatorHistoryNodeRuntime,
  getNavigatorCategoryName as getNavigatorCategoryNameRuntime,
  getNavigatorDefaultHelpHeaderKey as getNavigatorDefaultHelpHeaderKeyRuntime,
  getNavigatorDefaultHelpTextKey as getNavigatorDefaultHelpTextKeyRuntime,
  getNavigatorNodeChildren as getNavigatorNodeChildrenRuntime,
  getNavigatorNodeInfo as getNavigatorNodeInfoRuntime,
  getNavigatorParentId as getNavigatorParentIdRuntime,
  getNavigatorProperty as getNavigatorPropertyRuntime,
  getNavigatorPublicNodeDescription as getNavigatorPublicNodeDescriptionRuntime,
  getNavigatorRoomInfoHeader as getNavigatorRoomInfoHeaderRuntime,
  getNavigatorRoomInfoText as getNavigatorRoomInfoTextRuntime,
  getNavigatorView as getNavigatorViewRuntime,
  getNavigatorViewedNode as getNavigatorViewedNodeRuntime,
  getNavigatorWindowId as getNavigatorWindowIdRuntime,
  handleNavigatorFlatResultsPacket as handleNavigatorFlatResultsPacketRuntime,
  handleNavigatorNoFlatsPacket as handleNavigatorNoFlatsPacketRuntime,
  handleNavigatorNodeInfoPacket as handleNavigatorNodeInfoPacketRuntime,
  handleNavigatorUserFlatCatsPacket as handleNavigatorUserFlatCatsPacketRuntime,
  hideNavigator as hideNavigatorRuntime,
  isNavigatorNodeInfo,
  mutateNavigatorRoomInfoArea as mutateNavigatorRoomInfoAreaRuntime,
  navigatorLeaveRoom as navigatorLeaveRoomRuntime,
  navigatorDoorIconName,
  navigatorPaletteIndexColor,
  navigatorSourceEventForElementId as navigatorSourceEventForElementIdRuntime,
  navigatorStatusIndex,
  navigatorStatusColor,
  navigatorViewForWindow,
  parseNavigatorFlatResultsPacket,
  parseNavigatorNodeInfoPacket,
  parseNavigatorUserFlatCategoriesPacket,
  prepareNavigatorRoomEntry as prepareNavigatorRoomEntryRuntime,
  queueNavigatorFavoriteRoomsRequest as queueNavigatorFavoriteRoomsRequestRuntime,
  queueNavigatorOwnRoomsRequest as queueNavigatorOwnRoomsRequestRuntime,
  queueNavigatorRequest as queueNavigatorRequestRuntime,
  readNavigatorHistoryItems,
  readNavigatorRequests,
  removeNavigatorFavoriteRoom as removeNavigatorFavoriteRoomRuntime,
  renderNavigatorRoomListText as renderNavigatorRoomListTextRuntime,
  setNavigatorProperty as setNavigatorPropertyRuntime,
  setNavigatorRoomInfoArea as setNavigatorRoomInfoAreaRuntime,
  showHideNavigator as showHideNavigatorRuntime,
  showNavigator as showNavigatorRuntime,
  startNavigatorFlatSearch as startNavigatorFlatSearchRuntime,
  updateNavigatorFeedTextValues as updateNavigatorFeedTextValuesRuntime,
  updateNavigatorState as updateNavigatorStateRuntime,
  type HabboNavigatorRuntimeHost,
  type HabboNavigatorHistory,
  type HabboNavigatorNodeInfo,
  type HabboNavigatorRequest,
  type HabboNavigatorView
} from "./features/navigator";
import {
  advanceLoginUserFoundAnimationRuntime,
  createFigurePartPreviewMemberRuntime,
  createFigurePreviewMemberRuntime,
  createFigureSourceLayersRuntime,
  createHumanFeedPreviewMemberRuntime,
  createLoginPreviewMemberRuntime,
  estimateRoomUserLocZRuntime,
  getActiveUserFigurePropsRuntime,
  getLoginUserFoundFigureActionRuntime,
  getMessengerCurrentMessageFigurePropsRuntime,
  getMessengerSearchFigurePropsRuntime,
  resolveRoomHumanCanvasSpecRuntime,
  syncActiveFigurePreloadPathsRuntime,
  syncRoomFigurePreloadPathsRuntime,
  type HabboFigurePartProps,
  type HabboFigureRenderOptions,
  type HabboFigureSourceLayer,
  type HabboHumanCanvasSpec,
  type HabboFigureRuntimeHost
} from "./features/figure";
import {
  activateRegistrationElementRuntime,
  changeRegistrationFigurePartColorRuntime,
  changeRegistrationFigurePartRuntime,
  changeRegistrationPageRuntime,
  changeRegistrationWindowViewRuntime,
  clearRegistrationNameFieldRuntime,
  closeRegistrationFigureCreatorRuntime,
  ensureRegistrationFigurePropsRuntime,
  getFigurePartEntriesRuntime,
  getRegistrationPropRuntime,
  openRegistrationFigureCreatorRuntime,
  setRegistrationFieldValueRuntime,
  setRegistrationSexRuntime,
  setRegistrationPropRuntime,
  showRegistrationAlertRuntime,
  toggleRegistrationPropRuntime,
  type HabboEditHabboRuntimeHost
} from "./features/edit-habbo";
import {
  activateLoginElementRuntime,
  advanceEntryHotelAnimationFrameRuntime,
  advanceEntryHotelAnimationRuntime,
  getEntryHotelVisualMemberNameRuntime,
  resolveLoadedVisualLayoutRuntime,
  showEntryHotelViewRuntime,
  showLoginWindowPairRuntime,
  showUserFoundRuntime,
  setLoginFieldValueRuntime,
  type HabboEntryHotelViewRuntimeHost
} from "./features/entry-hotel-view";
import {
  executeEntryBarActionRuntime,
  showEntryBarRuntime,
  updateEntryBarRuntime,
  updateEntryBarTextValuesRuntime,
  type HabboEntryInterfaceRuntimeHost
} from "./features/entry-interface/HabboEntryInterfaceRuntime";
import {
  HABBO_PURSE_COMPONENT_SOURCE,
  HABBO_PURSE_FALLBACK_TITLE,
  HABBO_PURSE_HANDLER_SOURCE,
  HABBO_PURSE_SOURCE,
  HABBO_PURSE_TITLE_KEY,
  HABBO_PURSE_VOUCHER_FALLBACK_TITLE,
  HABBO_PURSE_VOUCHER_TITLE_KEY,
  activatePurseElement as activatePurseElementRuntime,
  changePurseWindowView as changePurseWindowViewRuntime,
  ensurePurseObjects as ensurePurseObjectsRuntime,
  getPursePageView as getPursePageViewRuntime,
  getPurseTransactionPages as getPurseTransactionPagesRuntime,
  handlePurseCreditLogPacket as handlePurseCreditLogPacketRuntime,
  handlePursePacket as handlePursePacketRuntime,
  handleVoucherRedeemErrorPacket as handleVoucherRedeemErrorPacketRuntime,
  handleVoucherRedeemOkPacket as handleVoucherRedeemOkPacketRuntime,
  hidePurse as hidePurseRuntime,
  hideVoucherWindow as hideVoucherWindowRuntime,
  isPurseValueFieldEnabled as isPurseValueFieldEnabledRuntime,
  openPurseTransactions as openPurseTransactionsRuntime,
  openVoucherFromPurse as openVoucherFromPurseRuntime,
  queuePurseRequest as queuePurseRequestRuntime,
  recordPurseBuyCredits as recordPurseBuyCreditsRuntime,
  recordPurseVoucherHelp as recordPurseVoucherHelpRuntime,
  sendVoucherFromPurse as sendVoucherFromPurseRuntime,
  setVoucherInputState as setVoucherInputStateRuntime,
  showHidePurse as showHidePurseRuntime,
  showPurse as showPurseRuntime,
  showPurseTransactionPage as showPurseTransactionPageRuntime,
  showVoucherWindow as showVoucherWindowRuntime,
  type HabboPurseRequest,
  type HabboPurseRuntimeHost,
  type HabboPurseTransactionPage
} from "./features/purse";
import {
  activateRoomKioskElement as activateRoomKioskElementRuntime,
  applyRoomKioskCategorySelection as applyRoomKioskCategorySelectionRuntime,
  applyRoomKioskPageValues as applyRoomKioskPageValuesRuntime,
  changeRoomKioskWindowView as changeRoomKioskWindowViewRuntime,
  ensureRoomKioskObjects as ensureRoomKioskObjectsRuntime,
  executeRoomKioskCreatedRoomEntry as executeRoomKioskCreatedRoomEntryRuntime,
  handleRoomKioskFlatCreatedPacket as handleRoomKioskFlatCreatedPacketRuntime,
  queueRoomKioskCreateFlat as queueRoomKioskCreateFlatRuntime,
  setRoomKioskDoor as setRoomKioskDoorRuntime,
  setRoomKioskShowOwnerName as setRoomKioskShowOwnerNameRuntime,
  showHideRoomKiosk as showHideRoomKioskRuntime,
  toggleRoomKioskFurnitureMove as toggleRoomKioskFurnitureMoveRuntime,
  updateRoomKioskPropsFromFields as updateRoomKioskPropsFromFieldsRuntime,
  validateRoomKioskPasswordFields as validateRoomKioskPasswordFieldsRuntime,
  type HabboRoomOMaticRuntimeHost,
  type HabboRoomKioskDoor
} from "./features/room-o-matic";
import {
  activateRoomCanvas as activateRoomCanvasRuntime,
  activateRoomFurniInterfaceElement as activateRoomFurniInterfaceElementRuntime,
  activateSelectedActiveObjectProgram as activateSelectedActiveObjectProgramRuntime,
  advanceRoomObjectAnimations as advanceRoomObjectAnimationsRuntime,
  clearRoomObjectMoverPreview as clearRoomObjectMoverPreviewRuntime,
  clearRoomPointer as clearRoomPointerRuntime,
  createRoomItemSpritePlansRuntime,
  createRoomObjectSpritePlansRuntime,
  dynamicFurnitureCastNameForClassNameRuntime,
  ensureDynamicFurnitureCastsForClassNamesRuntime,
  ensureDynamicFurnitureCastsForObjectsRuntime,
  estimateRoomObjectLocZRuntime,
  estimateRoomObjectZSortRuntime,
  getRoomObjectAnimationFrameRuntime,
  getRoomObjectClassPropsRuntime,
  handleRoomActiveObjectRemovePacketRuntime,
  handleRoomActiveObjectUpdatePacketRuntime,
  handleRoomActiveObjectsPacketRuntime,
  handleRoomDoorFlatPacket as handleRoomDoorFlatPacketRuntime,
  handleRoomItemRemovePacketRuntime,
  handleRoomItemUpdatePacketRuntime,
  handleRoomItemsPacketRuntime,
  handleRoomPassiveObjectsPacketRuntime,
  handleRoomTeleporterActivityPacket as handleRoomTeleporterActivityPacketRuntime,
  handleRoomStuffDataUpdatePacketRuntime,
  isMirroredRoomObjectMemberAliasRuntime,
  previousRoomObjectPartMemberNameRuntime,
  refreshRoomObjectTimedStatesRuntime,
  refreshAnimatedRoomObjectSpritesRuntime,
  renderRoomObjectsRuntime,
  resolveRoomItemMemberNameRuntime,
  resolveRoomObjectMemberRefRuntime,
  resolveRoomObjectMoverBaseBlendRuntime,
  resolveRoomObjectMoverBaseVisibleRuntime,
  resolveRoomObjectPartFrameRuntime,
  resolveRoomObjectPartMemberNameExactDirectionRuntime,
  resolveRoomObjectPartMemberNameRuntime,
  resolveRoomObjectPartVisibleRuntime,
  resolveRoomObjectShadowMemberNameRuntime,
  resolveRotatedActiveObjectDirectionRuntime,
  syncRoomObjectAnimationPreloadSpritesRuntime,
  updateRoomObjectTimedStateRuntime,
  updateRoomPointer as updateRoomPointerRuntime,
  type HabboRoomFurniInterfaceOptions,
  type HabboRoomObjectRotateOptions,
  type HabboRoomObjectRuntimeHost
} from "./features/room-objects";
import {
  HABBO_ROOM_INTERFACE_SOURCE,
  resolveRoomBarAction,
  type HabboRoomBarAction
} from "./ui/HabboRoomBarActions";
import {
  HABBO_ROOM_OBJECT_MOVER_GHOST_BLEND,
  HABBO_ROOM_OBJECT_MOVER_INVALID_ITEM_BLEND,
  HABBO_ROOM_OBJECT_MOVER_PREVIEW_CHANNEL_BASE,
  HABBO_ROOM_OBJECT_MOVER_SMALL_BLEND,
  HABBO_ROOM_OBJECT_MOVER_SMALL_LOCZ,
  HABBO_ROOM_OBJECT_MOVER_SOURCE,
  roomObjectMoverSmallMemberCandidates
} from "./ui/HabboRoomFurnitureDialog";
import {
  HABBO_ROOM_ACTIVE_OBJECT_SOURCE,
  resolveRoomObjectSourcePartState,
  resolveRoomObjectSourceAnimationPreloadTicks,
  resolveRoomObjectSourcePartFrame,
  resolveRoomObjectSourcePartVisible,
  roomObjectSourceHasAnimatedUpdate,
  sourceClassValueContains,
} from "./ui/HabboRoomObjectInteractions";
import {
  activateRoomHandElement as activateRoomHandElementRuntime,
  advanceRoomHandAnimation as advanceRoomHandAnimationRuntime,
  handleRemoveStripItemPacket as handleRemoveStripItemPacketRuntime,
  handleStripInfoPacket as handleStripInfoPacketRuntime,
  handleStripUpdatedPacket as handleStripUpdatedPacketRuntime,
  openCloseRoomHandContainer as openCloseRoomHandContainerRuntime,
  renderRoomHandContainer as renderRoomHandContainerRuntime,
  readRoomObjectMoverPlacement,
  type HabboRoomDeleteConfirmationState,
  type HabboInventoryHandRuntimeHost,
  type HabboRoomObjectMoverActiveMove,
  type HabboRoomObjectMoverActivePlacement,
  type HabboRoomObjectMoverItemPlacement,
  type HabboRoomObjectMoverPlacement
} from "./features/inventory-hand";
import {
  HABBO_CLUB_COMPONENT_SOURCE,
  HABBO_CLUB_HANDLER_SOURCE,
  HABBO_CLUB_INTERFACE_SOURCE,
  HABBO_CLUB_WINDOW_ID,
  activateClubElement as activateClubElementRuntime,
  changeClubWindowView as changeClubWindowViewRuntime,
  confirmChosenClubPeriod as confirmChosenClubPeriodRuntime,
  continueClubPurchase as continueClubPurchaseRuntime,
  ensureClubObjects as ensureClubObjectsRuntime,
  getClubStatus as getClubStatusRuntime,
  getClubWindowId as getClubWindowIdRuntime,
  handleClubNoSubscriptionPacket as handleClubNoSubscriptionPacketRuntime,
  handleClubSubscriptionInfoPacket as handleClubSubscriptionInfoPacketRuntime,
  handleClubSubscriptionOkPacket as handleClubSubscriptionOkPacketRuntime,
  hideClubInfo as hideClubInfoRuntime,
  notifyClub as notifyClubRuntime,
  queueClubRequest as queueClubRequestRuntime,
  setClubStatus as setClubStatusRuntime,
  showClubInfo as showClubInfoRuntime,
  type HabboClubRequest,
  type HabboClubRuntimeHost,
  type HabboClubStatus
} from "./features/habbo-club";
import { classifySourceWindowCloseElement, type HabboWindowCloseMatch } from "./ui/HabboWindowClose";

const servicesProperty = "habbo.boot.services";

export {
  HabboObjectManager,
  HabboResourceManager,
  HabboThreadManager,
  HabboVariableObject
} from "./boot/HabboBootManagers";
export type {
  HabboManagerRecord,
  HabboThreadModules,
  HabboThreadRecord
} from "./boot/HabboBootManagers";
export type {
  HabboButtonBitmapAssetSet,
  HabboButtonElementAsset,
  HabboButtonElementPartAssetRef,
  HabboButtonElementStateAsset,
  HabboButtonElementTextSpec,
  HabboCastLoadCallback,
  HabboDownloadCallback,
  HabboExternalBitmapAsset,
  HabboExternalBitmapAssetSet,
  HabboExternalCastEntry,
  HabboExternalCastGraph,
  HabboExternalCastMember,
  HabboExternalCastTextFieldEntry,
  HabboExternalCastTextFieldSet,
  HabboExternalCastVisualLayout,
  HabboExternalCastVisualLayoutSet,
  HabboExternalCastWindowLayout,
  HabboExternalCastWindowLayoutSet,
  HabboExternalFieldEntry,
  HabboExternalFieldSet,
  HabboFigurePartIndexEntry,
  HabboFigurePartIndexSet,
  HabboInternalBitmapAsset,
  HabboInternalBitmapAssetSet,
  HabboMessageCallRecord,
  HabboMessageRegistration,
  HabboTextFieldEntry,
  HabboTextFieldSet,
  HabboVisualBitmapAssetSet,
  HabboVisualBitmapVisualEntry,
  HabboWindowBitmapAsset,
  HabboWindowBitmapAssetSet,
  HabboWindowBitmapWindowEntry,
  HabboWindowLayoutBitmapMetadata,
  HabboWindowLayoutElement,
  HabboWindowLayoutResolvedMember
} from "./boot/HabboBootResourceTypes";
export type {
  HabboDelayRecord,
  HabboWindowElementActivation,
  HabboWindowElementEventKind,
  HabboWindowInteractiveElement,
  HabboWindowProcedureRecord,
  HabboWindowRecord
} from "./window/HabboWindowTypes";

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

interface HabboRuntimeBitmapGroupSprite {
  readonly member: DirectorMemberManifest;
  readonly sprite: DirectorSpriteChannelManifest;
  readonly channel: number;
  readonly sourceKind: "template" | "content";
  readonly nextMemberNumber: number;
}

interface HabboRuntimeWindowElementSprite {
  readonly member: DirectorMemberManifest;
  readonly sprite: DirectorSpriteChannelManifest;
  readonly channel: number;
  readonly nextMemberNumber: number;
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

interface HabboUserObjectFields {
  readonly [key: string]: string;
}

const navigatorInterfaceClassSource = "hh_navigator/casts/External/ParentScript 3 - Navigator Window Interface Class.ls";
const navigatorRoomlistInterfaceClassSource = "hh_navigator/casts/External/ParentScript 4 - Navigator Roomlist Interface Class.ls";
const navigatorComponentClassSource = "hh_navigator/casts/External/ParentScript 5 - Navigator Component Class.ls";
const navigatorHandlerClassSource = "hh_navigator/casts/External/ParentScript 6 - Navigator Handler Class.ls";
const navigatorHistoryEntrySymbol = "#entry";
const navigatorHistoryItemHeight = 18;
const roomKioskInterfaceClassSource = "hh_kiosk_room/casts/External/ParentScript 3 - RoomKiosk Interface Class.ls";
const roomKioskComponentClassSource = "hh_kiosk_room/casts/External/ParentScript 4 - RoomKiosk Component Class.ls";
const roomKioskHandlerClassSource = "hh_kiosk_room/casts/External/ParentScript 5 - RoomKiosk Handler Class.ls";
const roomItemObjectClassSource = "hh_room/casts/External/ParentScript 20 - Item Object Class.ls";
const roomObjectMoverClassSource = "hh_room/casts/External/ParentScript 9 - Object Mover Class.ls";
const roomHandlerClassSource = "hh_room/casts/External/ParentScript 5 - Room Handler Class.ls";
const roomHiliterClassSource = "hh_room/casts/External/ParentScript 8 - Room Hiliter Class.ls";
const roomBalloonManagerClassSource = "hh_room/casts/External/ParentScript 22 - Balloon Manager.ls";
export class HabboBootServices {
  readonly objectManager = new HabboObjectManager();
  readonly resourceManager: HabboResourceManager;
  readonly threadManager = new HabboThreadManager();
  readonly alertManager = new HabboAlertManager();
  readonly variables = new Map<string, unknown>();
  readonly texts = new Map<string, string>();
  private readonly brokers = new Map<string, HabboMessageRegistration[]>();
  private readonly delays = new Map<string, HabboDelayRecord>();
  private readonly windows = new Map<string, HabboWindowRecord>();
  private readonly windowElementOverrides = new Map<string, Map<string, HabboWindowElementOverride>>();
  private readonly windowScrollOffsets = new Map<string, number>();
  private readonly downloadCallbacks: HabboDownloadCallback[] = [];
  private readonly castLoadCallbacks: HabboCastLoadCallback[] = [];
  private readonly loadedCastNames = new Set<string>();
  private readonly loadedCastSlots = new Map<string, number>();
  private textFieldSet: HabboTextFieldSet | undefined;
  private externalFieldSet: HabboExternalFieldSet | undefined;
  private externalCastGraph: HabboExternalCastGraph | undefined;
  private externalCastTextFieldSet: HabboExternalCastTextFieldSet | undefined;
  private externalCastWindowLayoutSet: HabboExternalCastWindowLayoutSet | undefined;
  private externalCastVisualLayoutSet: HabboExternalCastVisualLayoutSet | undefined;
  private windowBitmapAssetSet: HabboWindowBitmapAssetSet | undefined;
  private visualBitmapAssetSet: HabboVisualBitmapAssetSet | undefined;
  private buttonBitmapAssetSet: HabboButtonBitmapAssetSet | undefined;
  private internalBitmapAssetSet: HabboInternalBitmapAssetSet | undefined;
  private externalBitmapAssetSet: HabboExternalBitmapAssetSet | undefined;
  private readonly bitmapAssetLookupCache = new Map<string, readonly HabboWindowBitmapAsset[]>();
  private readonly bitmapMemberNameLookupCache = new Map<string, readonly HabboWindowBitmapAsset[]>();
  private figurePartIndexSet: HabboFigurePartIndexSet | undefined;
  private runtimeWindowCastSlot: number | undefined;
  private runtimeLoadingCastSlot: number | undefined;
  private runtimeLogoCastSlot: number | undefined;
  private runtimeEntryVisualCastSlot: number | undefined;
  private runtimeRoomCastSlot: number | undefined;
  private runtimeRoomVisualCastSlot: number | undefined;
  private runtimeRoomObjectCastSlot: number | undefined;
  private runtimeRoomChatCastSlot: number | undefined;
  private runtimeRoomCoverCastSlot: number | undefined;
  private readonly roomObjectPropsCache = new Map<string, HabboRoomObjectClassProps>();
  private readonly loginFieldValues = new Map<string, string>();
  private readonly registrationFieldValues = new Map<string, string>();
  private readonly windowTextValues = new Map<string, string>();
  private nextCastLoadId = 1;
  private nextDelayId = 1;
  private nextNavigatorRequestId = 1;
  private nextMessengerRequestId = 1;
  private nextPurseRequestId = 1;
  private nextCatalogueRequestId = 1;
  private nextClubRequestId = 1;
  private nextCallForHelpRequestId = 1;
  private nextRoomRequestId = 1;
  private nextRoomChatMessageId = 1;
  private nextRoomEntryEpoch = 1;

  constructor(private readonly movie: DirectorMovie) {
    this.resourceManager = new HabboResourceManager(movie);
    this.logDebug("habbo", "info", "boot-services-created");
  }

  setTextFieldSet(textFieldSet: HabboTextFieldSet | undefined): this {
    this.textFieldSet = textFieldSet;
    return this;
  }

  setExternalFieldSet(externalFieldSet: HabboExternalFieldSet | undefined): this {
    this.externalFieldSet = externalFieldSet;
    return this;
  }

  setExternalCastGraph(externalCastGraph: HabboExternalCastGraph | undefined): this {
    this.externalCastGraph = externalCastGraph;
    return this;
  }

  setExternalCastTextFieldSet(externalCastTextFieldSet: HabboExternalCastTextFieldSet | undefined): this {
    this.externalCastTextFieldSet = externalCastTextFieldSet;
    return this;
  }

  setExternalCastWindowLayoutSet(externalCastWindowLayoutSet: HabboExternalCastWindowLayoutSet | undefined): this {
    this.externalCastWindowLayoutSet = externalCastWindowLayoutSet;
    return this;
  }

  setExternalCastVisualLayoutSet(externalCastVisualLayoutSet: HabboExternalCastVisualLayoutSet | undefined): this {
    this.externalCastVisualLayoutSet = externalCastVisualLayoutSet;
    return this;
  }

  setWindowBitmapAssetSet(windowBitmapAssetSet: HabboWindowBitmapAssetSet | undefined): this {
    this.windowBitmapAssetSet = windowBitmapAssetSet;
    this.clearBitmapAssetLookupCache();
    return this;
  }

  setVisualBitmapAssetSet(visualBitmapAssetSet: HabboVisualBitmapAssetSet | undefined): this {
    this.visualBitmapAssetSet = visualBitmapAssetSet;
    this.clearBitmapAssetLookupCache();
    return this;
  }

  setButtonBitmapAssetSet(buttonBitmapAssetSet: HabboButtonBitmapAssetSet | undefined): this {
    this.buttonBitmapAssetSet = buttonBitmapAssetSet;
    this.clearBitmapAssetLookupCache();
    return this;
  }

  setInternalBitmapAssetSet(internalBitmapAssetSet: HabboInternalBitmapAssetSet | undefined): this {
    this.internalBitmapAssetSet = internalBitmapAssetSet;
    this.clearBitmapAssetLookupCache();
    return this;
  }

  setExternalBitmapAssetSet(externalBitmapAssetSet: HabboExternalBitmapAssetSet | undefined): this {
    this.externalBitmapAssetSet = externalBitmapAssetSet;
    this.clearBitmapAssetLookupCache();
    return this;
  }

  setFigurePartIndexSet(figurePartIndexSet: HabboFigurePartIndexSet | undefined): this {
    this.figurePartIndexSet = figurePartIndexSet;
    return this;
  }

  private clearBitmapAssetLookupCache(): void {
    this.bitmapAssetLookupCache.clear();
    this.bitmapMemberNameLookupCache.clear();
  }

  constructObjectManager(release: string): HabboObjectManager {
    return constructObjectManagerRuntime(this.threadConstructorHost(), release) as HabboObjectManager;
  }

  deconstructObjectManager(): boolean {
    return deconstructObjectManagerRuntime(this.threadConstructorHost());
  }

  dumpVariableField(fieldName: string, release: string): boolean {
    return dumpVariableFieldRuntime(this.threadConstructorHost(), fieldName, release);
  }

  private seedRequiredBootVariables(): void {
    seedRequiredBootVariablesRuntime(this.threadConstructorHost());
  }

  dumpTextField(fieldName: string, release: string): boolean {
    return dumpTextFieldRuntime(this.threadConstructorHost(), fieldName, release);
  }

  private findField(fieldName: string): ReturnType<typeof findFieldRuntime> {
    return findFieldRuntime(this.threadConstructorHost(), fieldName);
  }

  private findTextField(fieldName: string): ReturnType<typeof findTextFieldRuntime> {
    return findTextFieldRuntime(this.threadConstructorHost(), fieldName);
  }

  private findExternalField(fieldName: string): ReturnType<typeof findExternalFieldRuntime> {
    return findExternalFieldRuntime(this.threadConstructorHost(), fieldName);
  }

  private findExternalCastTextField(fieldName: string): ReturnType<typeof findExternalCastTextFieldRuntime> {
    return findExternalCastTextFieldRuntime(this.threadConstructorHost(), fieldName);
  }

  resetCastLibs(clean: number, forced: number, release: string): boolean {
    return resetCastLibsRuntime(this.threadConstructorHost(), clean, forced, release);
  }

  preIndexMembers(release: string): boolean {
    return preIndexMembersRuntime(this.threadConstructorHost(), release);
  }

  createCoreThread(release: string): boolean {
    return createCoreThreadRuntime(this.threadConstructorHost(), release);
  }

  constructCoreThread(release: string): boolean {
    return constructCoreThreadRuntime(this.threadConstructorHost(), release);
  }

  updateCoreThreadState(state: string, release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), state, release);
  }

  private enterLoadVariables(release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), "load_variables", release);
  }

  private enterLoadParams(release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), "load_params", release);
  }

  private enterLoadTexts(release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), "load_texts", release);
  }

  private enterLoadCasts(release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), "load_casts", release);
  }

  private enterValidateResources(release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), "validate_resources", release);
  }

  private getCurrentCoreThreadCastList(release: string): readonly string[] {
    return getCurrentCoreThreadCastListRuntime(this.threadConstructorHost(), release);
  }

  private enterInitThreads(release: string): boolean {
    return updateCoreThreadStateRuntime(this.threadConstructorHost(), "init_threads", release);
  }

  private loadingBarRuntimeHost(): HabboLoadingBarRuntimeHost {
    return this as unknown as HabboLoadingBarRuntimeHost;
  }

  showLoadingBar(loadId: number, release: string, buffer: "#window" | "#stage" = "#window", percent = 0): void {
    showLoadingBarRuntime(this.loadingBarRuntimeHost(), loadId, release, buffer, percent);
  }

  hideLoadingBar(): void {
    hideLoadingBarRuntime(this.loadingBarRuntimeHost());
  }

  private externalCastRuntimeHost(): HabboExternalCastRuntimeHost {
    return this as unknown as HabboExternalCastRuntimeHost;
  }

  private windowRuntimeHost(): HabboWindowRuntimeHost {
    return this as unknown as HabboWindowRuntimeHost;
  }

  private initializeExternalThreads(release: string): void {
    initializeExternalThreadsRuntime(this.threadConstructorHost(), release);
  }

  private createThreadModuleObjects(threadId: string, modules: HabboThreadModules, release: string, sourceCastName?: string): void {
    createThreadModuleObjectsRuntime(this.threadConstructorHost(), threadId, modules, release, sourceCastName);
  }

  private sourcePathForClass(className: string, release: string, fallbackRelativePath: string): string {
    return sourcePathForClassRuntime(this.threadConstructorHost(), className, release, fallbackRelativePath);
  }

  private resolveExternalScriptSourcePath(className: string): string | undefined {
    return resolveExternalScriptSourcePathRuntime(this.threadConstructorHost(), className);
  }

  private threadConstructorHost(): HabboThreadConstructorHost {
    return this as unknown as HabboThreadConstructorHost;
  }

  private applyThreadConstructorSideEffects(object: HabboVariableObject, classNames: readonly string[], release: string): void {
    return applyThreadConstructorSideEffectsRuntime(this.threadConstructorHost(), object, classNames, release);
  }
  private executeRegisteredMessageHandler(registration: HabboMessageRegistration, argument: unknown, release: string): HabboMessageCallRecord {
    return this.executeObjectHandler(registration.clientId, registration.method, argument, release, registration.source);
  }

  private messageDispatchHost(): HabboMessageDispatchHost {
    return this as unknown as HabboMessageDispatchHost;
  }

  private executeObjectHandler(
    clientIdValue: LingoSymbol | string,
    methodValue: LingoSymbol | string,
    argument: unknown,
    release: string,
    source?: string
  ): HabboMessageCallRecord {
    return executeObjectHandlerRuntime(this.messageDispatchHost(), clientIdValue, methodValue, argument, release, source);
  }
  private entryHotelViewRuntimeHost(): HabboEntryHotelViewRuntimeHost {
    return this as unknown as HabboEntryHotelViewRuntimeHost;
  }

  private entryInterfaceRuntimeHost(): HabboEntryInterfaceRuntimeHost {
    return this as unknown as HabboEntryInterfaceRuntimeHost;
  }

  private showEntryHotelView(release: string): boolean {
    return showEntryHotelViewRuntime(this.entryHotelViewRuntimeHost(), release);
  }

  private getEntryHotelVisualMemberName(release: string): string {
    return getEntryHotelVisualMemberNameRuntime(this.entryHotelViewRuntimeHost(), release);
  }

  private resolveLoadedVisualLayout(memberName: string): HabboExternalCastVisualLayout | undefined {
    return resolveLoadedVisualLayoutRuntime(this.entryHotelViewRuntimeHost(), memberName);
  }

  advanceEntryHotelAnimation(elapsedMs: number, release: string): boolean {
    return advanceEntryHotelAnimationRuntime(this.entryHotelViewRuntimeHost(), elapsedMs, release);
  }

  advanceEntryHotelAnimationFrame(deltaMs: number, release: string): boolean {
    return advanceEntryHotelAnimationFrameRuntime(this.entryHotelViewRuntimeHost(), deltaMs, release);
  }

  private showEntryBar(release: string): boolean {
    return showEntryBarRuntime(this.entryInterfaceRuntimeHost(), release);
  }

  private updateEntryBar(release: string): boolean {
    return updateEntryBarRuntime(this.entryInterfaceRuntimeHost(), release);
  }

  private updateEntryBarTextValues(): void {
    updateEntryBarTextValuesRuntime(this.entryInterfaceRuntimeHost());
  }

  private executeEntryBarAction(action: HabboEntryBarAction, release: string): boolean {
    return executeEntryBarActionRuntime(this.entryInterfaceRuntimeHost(), action, release);
  }

  private executeRoomBarAction(action: HabboRoomBarAction, release: string): boolean {
    switch (action.kind) {
      case "message":
        return this.executeMessage(action.message, "argument" in action ? action.argument : undefined, release);
      case "container-open-close":
        return this.openCloseRoomHandContainer(release);
      default:
        return false;
    }
  }

  private navigatorRuntimeHost(): HabboNavigatorRuntimeHost {
    return this as unknown as HabboNavigatorRuntimeHost;
  }

  private roomOMaticRuntimeHost(): HabboRoomOMaticRuntimeHost {
    return this as unknown as HabboRoomOMaticRuntimeHost;
  }

  private roomObjectRuntimeHost(): HabboRoomObjectRuntimeHost {
    return this as unknown as HabboRoomObjectRuntimeHost;
  }

  private roomUserRuntimeHost(): HabboRoomUserRuntimeHost {
    return this as unknown as HabboRoomUserRuntimeHost;
  }

  private roomChatRuntimeHost(): HabboRoomChatRuntimeHost {
    return this as unknown as HabboRoomChatRuntimeHost;
  }

  private roomSelectionRuntimeHost(): HabboRoomSelectionRuntimeHost {
    return this as unknown as HabboRoomSelectionRuntimeHost;
  }

  private inventoryHandRuntimeHost(): HabboInventoryHandRuntimeHost {
    return this as unknown as HabboInventoryHandRuntimeHost;
  }

  private friendsConsoleRuntimeHost(): HabboFriendsConsoleRuntimeHost {
    return this as unknown as HabboFriendsConsoleRuntimeHost;
  }

  private v1MessengerRuntimeHost(): HabboV1MessengerRuntimeHost {
    return this as unknown as HabboV1MessengerRuntimeHost;
  }

  private callForHelpRuntimeHost(): HabboCallForHelpRuntimeHost {
    return this as unknown as HabboCallForHelpRuntimeHost;
  }

  private showHideMessenger(release: string): boolean {
    if (release.startsWith("release1_")) {
      return showHideRelease1Messenger(this.v1MessengerRuntimeHost(), release);
    }
    return showHideMessengerRuntime(this.friendsConsoleRuntimeHost(), release);
  }

  private showMessenger(release: string): boolean {
    return showMessengerRuntime(this.friendsConsoleRuntimeHost(), release);
  }

  private changeMessengerWindowView(windowName: string, release: string): boolean {
    return changeMessengerWindowViewRuntime(this.friendsConsoleRuntimeHost(), windowName, release);
  }

  private hideMessenger(release: string): boolean {
    return hideMessengerRuntime(this.friendsConsoleRuntimeHost(), release);
  }

  private getMessengerCounts(): { readonly messages: number; readonly requests: number } {
    return getMessengerCountsRuntime(this.friendsConsoleRuntimeHost());
  }

  private getMessengerBuddyList(): HabboMessengerBuddyList {
    return getMessengerBuddyListRuntime(this.friendsConsoleRuntimeHost());
  }

  private setMessengerBuddyList(list: HabboMessengerBuddyList): void {
    setMessengerBuddyListRuntime(this.friendsConsoleRuntimeHost(), list);
  }

  private getMessengerRequests(): readonly string[] {
    return getMessengerRequestsRuntime(this.friendsConsoleRuntimeHost());
  }

  private setMessengerRequests(requests: readonly string[], release: string): void {
    setMessengerRequestsRuntime(this.friendsConsoleRuntimeHost(), requests, release);
  }

  private getMessengerMessages(): readonly HabboMessengerMessage[] {
    return getMessengerMessagesRuntime(this.friendsConsoleRuntimeHost());
  }

  private setMessengerMessages(messages: readonly HabboMessengerMessage[], release: string): void {
    setMessengerMessagesRuntime(this.friendsConsoleRuntimeHost(), messages, release);
  }

  private getSelectedMessengerBuddyNames(): readonly string[] {
    return getSelectedMessengerBuddyNamesRuntime(this.friendsConsoleRuntimeHost());
  }

  private getSelectedMessengerBuddy(): HabboMessengerBuddy | undefined {
    return getSelectedMessengerBuddyRuntime(this.friendsConsoleRuntimeHost());
  }

  private formatMessengerLocation(location: string): string {
    return formatMessengerLocationRuntime(this.friendsConsoleRuntimeHost(), location);
  }

  private sendMessengerFindUser(release: string): boolean {
    return sendMessengerFindUserRuntime(this.friendsConsoleRuntimeHost(), release);
  }

  private allocateCallForHelpRequestId(): number {
    return this.nextCallForHelpRequestId++;
  }

  private queueCallForHelpRequest(
    request: Omit<HabboCallForHelpRequest, "id" | "status" | "command">,
    release: string
  ): HabboCallForHelpRequest {
    return queueCallForHelpRequestRuntime(this.callForHelpRuntimeHost(), request, release);
  }

  private purseRuntimeHost(): HabboPurseRuntimeHost {
    return this as unknown as HabboPurseRuntimeHost;
  }

  private showHidePurse(release: string): boolean {
    return showHidePurseRuntime(this.purseRuntimeHost(), release);
  }

  private showPurse(release: string): boolean {
    return showPurseRuntime(this.purseRuntimeHost(), release);
  }

  private changePurseWindowView(layoutName: string, release: string): boolean {
    return changePurseWindowViewRuntime(this.purseRuntimeHost(), layoutName, release);
  }

  private hidePurse(release: string): boolean {
    return hidePurseRuntime(this.purseRuntimeHost(), release);
  }

  private showVoucherWindow(release: string): boolean {
    return showVoucherWindowRuntime(this.purseRuntimeHost(), release);
  }

  private hideVoucherWindow(release: string, sync = true): boolean {
    return hideVoucherWindowRuntime(this.purseRuntimeHost(), release, sync);
  }

  private setVoucherInputState(enabled: boolean, release: string, sync = true): void {
    setVoucherInputStateRuntime(this.purseRuntimeHost(), enabled, release, sync);
  }

  private openPurseTransactions(release: string): boolean {
    return openPurseTransactionsRuntime(this.purseRuntimeHost(), release);
  }

  private showPurseTransactionPage(pageNumber: number, release: string): boolean {
    return showPurseTransactionPageRuntime(this.purseRuntimeHost(), pageNumber, release);
  }

  private recordPurseBuyCredits(release: string): boolean {
    return recordPurseBuyCreditsRuntime(this.purseRuntimeHost(), release);
  }

  private openVoucherFromPurse(release: string): boolean {
    return openVoucherFromPurseRuntime(this.purseRuntimeHost(), release);
  }

  private sendVoucherFromPurse(release: string): boolean {
    return sendVoucherFromPurseRuntime(this.purseRuntimeHost(), release);
  }

  private recordPurseVoucherHelp(release: string): boolean {
    return recordPurseVoucherHelpRuntime(this.purseRuntimeHost(), release);
  }

  private getPursePageView(): number {
    return getPursePageViewRuntime(this.purseRuntimeHost());
  }

  private getPurseTransactionPages(): readonly HabboPurseTransactionPage[] {
    return getPurseTransactionPagesRuntime(this.purseRuntimeHost());
  }

  private isPurseValueFieldEnabled(): boolean {
    return isPurseValueFieldEnabledRuntime(this.purseRuntimeHost());
  }

  private queuePurseRequest(request: Omit<HabboPurseRequest, "id" | "status">, release: string): void {
    queuePurseRequestRuntime(this.purseRuntimeHost(), request, release);
  }

  private catalogueRuntimeHost(): HabboCatalogueRuntimeHost {
    return this as unknown as HabboCatalogueRuntimeHost;
  }

  private release1CatalogueRuntimeHost(): HabboV1CatalogueRuntimeHost {
    return this as unknown as HabboV1CatalogueRuntimeHost;
  }

  private showHideCatalogue(release: string): boolean {
    if (release.startsWith("release1_roseau_dcr0910")) {
      const state = coerceRecord(this.movie.getProperty("release1CatalogueState"));
      return state?.open === true
        ? hideRelease1Catalogue(this.release1CatalogueRuntimeHost(), release)
        : showRelease1Catalogue(this.release1CatalogueRuntimeHost(), release);
    }
    return showHideCatalogueRuntime(this.catalogueRuntimeHost(), release);
  }

  private showCatalogue(release: string, argument?: unknown): boolean {
    if (release.startsWith("release1_roseau_dcr0910")) {
      return showRelease1Catalogue(this.release1CatalogueRuntimeHost(), release, argument);
    }
    return showCatalogueRuntime(this.catalogueRuntimeHost(), release);
  }

  private hideCatalogue(release: string): boolean {
    if (release.startsWith("release1_roseau_dcr0910")) {
      return hideRelease1Catalogue(this.release1CatalogueRuntimeHost(), release);
    }
    return hideCatalogueRuntime(this.catalogueRuntimeHost(), release);
  }

  consumeRelease1NavigatorGoAway(release: string): boolean {
    if (!release.startsWith("release1_roseau_dcr0910")) {
      return false;
    }

    const request = coerceRecord(this.movie.getProperty("release1NavigatorGoAwayRequest"));
    if (request?.status !== "pending") {
      return false;
    }

    this.movie.setProperty("release1NavigatorGoAwayRequest", {
      ...request,
      status: "sent"
    });
    queueRoomRequestRuntime(this.roomLifecycleHost(), { command: "QUIT" }, release);
    leaveRoomRuntime(this.roomLifecycleHost(), release);
    this.logDebug("navigator", "info", "release1 Hotel view queued GOAWAY");
    return true;
  }

  private resolveCatalogueSourcePosition(): { readonly x: number; readonly y: number } {
    return resolveCatalogueSourcePositionRuntime(this.catalogueRuntimeHost());
  }

  private getCatalogueEditMode(): string {
    return getCatalogueEditModeRuntime(this.catalogueRuntimeHost());
  }

  private getCatalogueLanguage(): string {
    return getCatalogueLanguageRuntime(this.catalogueRuntimeHost());
  }

  private queueCatalogueRequest(request: Omit<HabboCatalogueRequest, "id" | "status">, release: string): HabboCatalogueRequest {
    return queueCatalogueRequestRuntime(this.catalogueRuntimeHost(), request, release);
  }

  private resolveCataloguePageLayout(layout: string): string {
    return resolveCataloguePageLayoutRuntime(this.catalogueRuntimeHost(), layout);
  }

  private applyCataloguePageText(window: HabboWindowRecord, page: HabboCataloguePageRecord, layoutName: string): void {
    applyCataloguePageTextRuntime(this.catalogueRuntimeHost(), window, page, layoutName);
  }

  private catalogueProductPerPageForLayout(layoutName: string, productCount: number): number {
    return catalogueProductPerPageForLayoutRuntime(this.catalogueRuntimeHost(), layoutName, productCount);
  }

  private catalogueLayoutHasSmallProductPreviews(layoutName: string | undefined): boolean {
    return catalogueLayoutHasSmallProductPreviewsRuntime(this.catalogueRuntimeHost(), layoutName);
  }

  private applyCatalogueProductPageControls(
    window: HabboWindowRecord,
    state: ReturnType<typeof catalogueProductPageState>
  ): void {
    applyCatalogueProductPageControlsRuntime(this.catalogueRuntimeHost(), window, state);
  }

  private activateCatalogueElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateCatalogueElementRuntime(this.catalogueRuntimeHost(), elementId, release, activation);
  }

  private showCatalogueOrderInfo(product: HabboCatalogueProductRecord, release: string): boolean {
    return showCatalogueOrderInfoRuntime(this.catalogueRuntimeHost(), product, release);
  }

  private hideCatalogueOrderInfo(release: string): boolean {
    return hideCatalogueOrderInfoRuntime(this.catalogueRuntimeHost(), release);
  }

  private setCatalogueOrderGiftMode(enabled: boolean, release: string): boolean {
    return setCatalogueOrderGiftModeRuntime(this.catalogueRuntimeHost(), enabled, release);
  }

  private activateCatalogueInfoElement(elementId: string, release: string): boolean {
    return activateCatalogueInfoElementRuntime(this.catalogueRuntimeHost(), elementId, release);
  }

  private confirmCatalogueOrderInfo(release: string): boolean {
    return confirmCatalogueOrderInfoRuntime(this.catalogueRuntimeHost(), release);
  }

  private recordCatalogueExternalUrl(urlKey: string, release: string): boolean {
    return recordCatalogueExternalUrlRuntime(this.catalogueRuntimeHost(), urlKey, release);
  }

  private showCataloguePurchaseOk(release: string): boolean {
    return showCataloguePurchaseOkRuntime(this.catalogueRuntimeHost(), release);
  }

  private activateCataloguePurchaseOkElement(elementId: string, release: string): boolean {
    return activateCataloguePurchaseOkElementRuntime(this.catalogueRuntimeHost(), elementId, release);
  }

  private clubRuntimeHost(): HabboClubRuntimeHost {
    return this as unknown as HabboClubRuntimeHost;
  }

  private showClubInfo(release: string): boolean {
    return showClubInfoRuntime(this.clubRuntimeHost(), release);
  }

  private hideClubInfo(release: string): boolean {
    return hideClubInfoRuntime(this.clubRuntimeHost(), release);
  }

  private notifyClub(argument: unknown, release: string): boolean {
    return notifyClubRuntime(this.clubRuntimeHost(), argument, release);
  }

  private changeClubWindowView(layoutName: string, release: string): boolean {
    return changeClubWindowViewRuntime(this.clubRuntimeHost(), layoutName, release);
  }

  private activateClubElement(elementId: string, release: string): boolean {
    return activateClubElementRuntime(this.clubRuntimeHost(), elementId, release);
  }

  private continueClubPurchase(release: string): boolean {
    return continueClubPurchaseRuntime(this.clubRuntimeHost(), release);
  }

  private confirmChosenClubPeriod(release: string): boolean {
    return confirmChosenClubPeriodRuntime(this.clubRuntimeHost(), release);
  }

  private getClubWindowId(): string {
    return getClubWindowIdRuntime(this.clubRuntimeHost());
  }

  private getClubStatus(): HabboClubStatus | undefined {
    return getClubStatusRuntime(this.clubRuntimeHost());
  }

  private setClubStatus(status: HabboClubStatus, release: string): void {
    setClubStatusRuntime(this.clubRuntimeHost(), status, release);
  }

  private queueClubRequest(request: Omit<HabboClubRequest, "id" | "status">, release: string): void {
    queueClubRequestRuntime(this.clubRuntimeHost(), request, release);
  }

  private sendCallForHelp(argument: unknown, release: string): boolean {
    return sendCallForHelpRuntime(this.callForHelpRuntimeHost(), argument, release);
  }

  private updateNavigatorState(state: string, release: string): boolean {
    return updateNavigatorStateRuntime(this.navigatorRuntimeHost(), state, release);
  }

  private showNavigator(release: string): boolean {
    return showNavigatorRuntime(this.navigatorRuntimeHost(), release);
  }

  private hideNavigator(release: string): boolean {
    return hideNavigatorRuntime(this.navigatorRuntimeHost(), release);
  }

  private showHideNavigator(release: string): boolean {
    return showHideNavigatorRuntime(this.navigatorRuntimeHost(), release);
  }

  private navigatorLeaveRoom(release: string): boolean {
    return navigatorLeaveRoomRuntime(this.navigatorRuntimeHost(), release);
  }

  private ensureRoomKioskObjects(release: string): void {
    ensureRoomKioskObjectsRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private ensureMessengerInterfaceObject(release: string): void {
    this.ensureMessengerObjects(release);
  }

  private ensureMessengerObjects(release: string): void {
    ensureMessengerObjectsRuntime(this.friendsConsoleRuntimeHost(), release);
  }

  private ensurePurseInterfaceObject(release: string): void {
    this.ensurePurseObjects(release);
  }

  private ensurePurseObjects(release: string): void {
    ensurePurseObjectsRuntime(this.purseRuntimeHost(), release);
  }

  private ensureCatalogueObjects(release: string): void {
    ensureCatalogueObjectsRuntime(this.catalogueRuntimeHost(), release);
  }

  private ensureClubInterfaceObject(release: string): void {
    this.ensureClubObjects(release);
  }

  private ensureClubObjects(release: string): void {
    ensureClubObjectsRuntime(this.clubRuntimeHost(), release);
  }

  private ensureThreadInterfaceObject(id: string, threadId: string, className: string, release: string): void {
    this.ensureThreadModuleObject(id, threadId, "interface", className, release);
  }

  private ensureThreadModuleObject(id: string, threadId: string, module: "interface" | "component" | "handler", className: string, release: string): void {
    if (this.objectManager.objectExists(id)) {
      return;
    }

    const object = this.objectManager.createObject(id, className);
    object.set("threadId", threadId);
    object.set("module", module);
    object.set("classNames", [className]);
    this.applyThreadConstructorSideEffects(object, [className], release);
  }

  private showHideRoomKiosk(release: string): boolean {
    return showHideRoomKioskRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private changeRoomKioskWindowView(windowName: string, release: string): boolean {
    return changeRoomKioskWindowViewRuntime(this.roomOMaticRuntimeHost(), windowName, release);
  }

  private applyRoomKioskPageValues(windowName: string, release: string): void {
    applyRoomKioskPageValuesRuntime(this.roomOMaticRuntimeHost(), windowName, release);
  }

  private changeNavigatorWindowView(windowName: string, release: string): boolean {
    return changeNavigatorWindowViewRuntime(this.navigatorRuntimeHost(), windowName, release);
  }

  private getNavigatorWindowId(): string {
    return getNavigatorWindowIdRuntime(this.navigatorRuntimeHost());
  }

  private setNavigatorProperty(prop: string, value: unknown, view: HabboNavigatorView = this.getNavigatorView()): void {
    setNavigatorPropertyRuntime(this.navigatorRuntimeHost(), prop, value, view);
  }

  private getNavigatorProperty(prop: string, view: HabboNavigatorView = this.getNavigatorView()): unknown {
    return getNavigatorPropertyRuntime(this.navigatorRuntimeHost(), prop, view);
  }

  private getNavigatorView(): HabboNavigatorView {
    return getNavigatorViewRuntime(this.navigatorRuntimeHost());
  }

  private getNavigatorCurrentNodeMask(): number {
    const value = this.objectManager.getObject("#navigator_component")?.get("hideFullRoomsFlag");
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric !== 0 ? 1 : 0;
  }

  private queueNavigatorRequest(
    request: Omit<HabboNavigatorRequest, "id" | "status">,
    release: string
  ): void {
    queueNavigatorRequestRuntime(this.navigatorRuntimeHost(), request, release);
  }

  private updateNavigatorFeedTextValues(view: HabboNavigatorView): void {
    updateNavigatorFeedTextValuesRuntime(this.navigatorRuntimeHost(), view);
  }

  private applyNavigatorWindowState(window: HabboWindowRecord, view: HabboNavigatorView): void {
    applyNavigatorWindowStateRuntime(this.navigatorRuntimeHost(), window, view);
  }

  private applyNavigatorSourceLayoutMutations(window: HabboWindowRecord, view: HabboNavigatorView): void {
    applyNavigatorSourceLayoutMutationsRuntime(this.navigatorRuntimeHost(), window, view);
  }

  private mutateNavigatorRoomInfoArea(window: HabboWindowRecord, view: HabboNavigatorView, state: "show" | "hide"): boolean {
    return mutateNavigatorRoomInfoAreaRuntime(this.navigatorRuntimeHost(), window, view, state);
  }

  private setNavigatorRoomInfoArea(state: "show" | "hide", release: string, view: HabboNavigatorView = this.getNavigatorView()): boolean {
    return setNavigatorRoomInfoAreaRuntime(this.navigatorRuntimeHost(), state, release, view);
  }

  private buildNavigatorHistory(view: HabboNavigatorView): HabboNavigatorHistory {
    return buildNavigatorHistoryRuntime(this.navigatorRuntimeHost(), view);
  }

  private getNavigatorParentId(nodeId: string, categoryIndex: Readonly<Record<string, unknown>>): string {
    return getNavigatorParentIdRuntime(this.navigatorRuntimeHost(), nodeId, categoryIndex);
  }

  private getNavigatorCategoryName(nodeId: string, categoryIndex: Readonly<Record<string, unknown>>): string {
    return getNavigatorCategoryNameRuntime(this.navigatorRuntimeHost(), nodeId, categoryIndex);
  }

  private getNavigatorRoomInfoHeader(view: HabboNavigatorView): string {
    return getNavigatorRoomInfoHeaderRuntime(this.navigatorRuntimeHost(), view);
  }

  private getNavigatorRoomInfoText(view: HabboNavigatorView): string {
    return getNavigatorRoomInfoTextRuntime(this.navigatorRuntimeHost(), view);
  }

  private getNavigatorViewedNode(view: HabboNavigatorView): HabboNavigatorNodeInfo | undefined {
    return getNavigatorViewedNodeRuntime(this.navigatorRuntimeHost(), view);
  }

  private getNavigatorDefaultHelpHeaderKey(view: HabboNavigatorView): string {
    return getNavigatorDefaultHelpHeaderKeyRuntime(view);
  }

  private getNavigatorDefaultHelpTextKey(view: HabboNavigatorView): string {
    return getNavigatorDefaultHelpTextKeyRuntime(view);
  }

  private getNavigatorPublicNodeDescription(node: HabboNavigatorNodeInfo): string {
    return getNavigatorPublicNodeDescriptionRuntime(this.navigatorRuntimeHost(), node);
  }

  private getNavigatorNodeInfo(nodeId: string): HabboNavigatorNodeInfo | undefined {
    return getNavigatorNodeInfoRuntime(this.navigatorRuntimeHost(), nodeId);
  }

  private getNavigatorNodeChildren(nodeId: string): readonly HabboNavigatorNodeInfo[] {
    return getNavigatorNodeChildrenRuntime(this.navigatorRuntimeHost(), nodeId);
  }

  private renderNavigatorRoomListText(view: HabboNavigatorView): string {
    return renderNavigatorRoomListTextRuntime(this.navigatorRuntimeHost(), view);
  }

  private showLoginWindowPair(release: string): boolean {
    return showLoginWindowPairRuntime(this.entryHotelViewRuntimeHost(), release);
  }

  private showUserFound(release: string): boolean {
    return showUserFoundRuntime(this.entryHotelViewRuntimeHost(), release);
  }

  private editHabboRuntimeHost(): HabboEditHabboRuntimeHost {
    return this;
  }

  private openRegistrationFigureCreator(release: string, mode = "registration"): boolean {
    return openRegistrationFigureCreatorRuntime(this.editHabboRuntimeHost(), release, mode);
  }

  private changeRegistrationWindowView(windowName: string, release: string): boolean {
    return changeRegistrationWindowViewRuntime(this.editHabboRuntimeHost(), windowName, release);
  }

  private closeRegistrationFigureCreator(release: string, returnToLogin: boolean): boolean {
    return closeRegistrationFigureCreatorRuntime(this.editHabboRuntimeHost(), release, returnToLogin);
  }

  private removeLoginWindowPair(release: string): void {
    removeLoginWindowPairRuntime(this.windowRuntimeHost(), release);
  }

  private removeWindow(id: LingoSymbol | string): boolean {
    return removeWindowRuntime(this.windowRuntimeHost(), id);
  }

  moveWindowById(windowId: string, offsetX: number, offsetY: number, release: string): boolean {
    if (release.startsWith("release1_roseau_dcr0910") && windowId === "#release1_navigator") {
      return moveRelease1EntryNavigatorBy(this.movie, offsetX, offsetY);
    }
    if (release.startsWith("release1_roseau_dcr0910") && windowId === "#release1_messenger") {
      return moveRelease1MessengerBy(this as unknown as HabboV1MessengerRuntimeHost, offsetX, offsetY, release);
    }
    return moveWindowByIdRuntime(this.windowRuntimeHost(), windowId, offsetX, offsetY, release);
  }

  private createWindow(id: LingoSymbol | string, template?: string, x?: number, y?: number): HabboWindowRecord {
    return createWindowRuntime(this.windowRuntimeHost(), id, template, x, y);
  }

  private activateWindow(window: HabboWindowRecord): boolean {
    return activateWindowRuntime(this.windowRuntimeHost(), window);
  }

  bringWindowToFront(windowId: string, release: string): boolean {
    return bringWindowToFrontRuntime(this.windowRuntimeHost(), windowId, release);
  }

  bringWindowContainingElementToFront(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return bringWindowContainingElementToFrontRuntime(this.windowRuntimeHost(), elementId, release, activation);
  }

  private clearWindowElementOverrides(window: HabboWindowRecord): void {
    clearWindowElementOverridesRuntime(this.windowRuntimeHost(), window);
  }

  private getWindowElementOverride(window: HabboWindowRecord, elementId: string | undefined): HabboWindowElementOverride | undefined {
    return getWindowElementOverrideRuntime(this.windowRuntimeHost(), window, elementId);
  }

  private setWindowElementOverride(window: HabboWindowRecord, elementId: string, patch: HabboWindowElementOverride): void {
    setWindowElementOverrideRuntime(this.windowRuntimeHost(), window, elementId, patch);
  }

  private hideWindowElement(window: HabboWindowRecord, elementId: string): void {
    hideWindowElementRuntime(this.windowRuntimeHost(), window, elementId);
  }

  private showWindowElement(window: HabboWindowRecord, elementId: string): void {
    showWindowElementRuntime(this.windowRuntimeHost(), window, elementId);
  }

  private setWindowElementCommonButtonActivation(window: HabboWindowRecord, elementId: string, active: boolean): void {
    setWindowElementCommonButtonActivationRuntime(this.windowRuntimeHost(), window, elementId, active);
  }

  private setWindowElementEditable(window: HabboWindowRecord, elementId: string, editable: boolean): void {
    setWindowElementEditableRuntime(this.windowRuntimeHost(), window, elementId, editable);
  }

  private isOpenWindowElementEditable(window: HabboWindowRecord, element: HabboWindowLayoutElement): boolean {
    return isOpenWindowElementEditableRuntime(this.windowRuntimeHost(), window, element);
  }

  private moveWindowElementH(window: HabboWindowRecord, elementId: string, locH: number): void {
    moveWindowElementHRuntime(this.windowRuntimeHost(), window, elementId, locH);
  }

  private moveWindowElementBy(window: HabboWindowRecord, elementId: string, offsetH: number, offsetV: number): void {
    moveWindowElementByRuntime(this.windowRuntimeHost(), window, elementId, offsetH, offsetV);
  }

  private resizeWindowElementBy(window: HabboWindowRecord, elementId: string, resizeWidth: number, resizeHeight: number): void {
    resizeWindowElementByRuntime(this.windowRuntimeHost(), window, elementId, resizeWidth, resizeHeight);
  }

  private mergeWindowLayout(window: HabboWindowRecord, memberName: string): void {
    mergeWindowLayoutRuntime(this.windowRuntimeHost(), window, memberName);
  }

  private resolveSourceWindowPosition(
    contentLayoutName: string,
    templateLayoutName?: string,
    fallback: { readonly x: number; readonly y: number } = { x: 100, y: 100 }
  ): { readonly x: number; readonly y: number } {
    return resolveSourceWindowPositionRuntime(this.windowRuntimeHost(), contentLayoutName, templateLayoutName, fallback);
  }

  private registerWindowClient(window: HabboWindowRecord, clientId: LingoSymbol | string): void {
    registerWindowClientRuntime(window, clientId);
  }

  private registerWindowProcedure(
    window: HabboWindowRecord,
    handler: LingoSymbol | string,
    clientId: LingoSymbol | string,
    event: LingoSymbol | string
  ): void {
    registerWindowProcedureRuntime(window, handler, clientId, event);
  }

  private procedureEventSymbol(event: HabboWindowElementEventKind): LingoSymbol {
    return procedureEventSymbolRuntime(event);
  }

  private findWindowProcedureForEvent(
    window: HabboWindowRecord,
    event?: HabboWindowElementEventKind
  ): HabboWindowProcedureRecord | undefined {
    return findWindowProcedureForEventRuntime(window, event);
  }

  private windowHasProcedureForElementEvent(
    elementId: string,
    activation?: HabboWindowElementActivation
  ): boolean {
    return windowHasProcedureForElementEventRuntime(this.windowRuntimeHost(), elementId, activation);
  }

  private recordWindowElementActivationEvent(elementId: string, activation?: HabboWindowElementActivation): boolean {
    return recordWindowElementActivationEventRuntime(this.windowRuntimeHost(), elementId, activation);
  }

  private showAlert(payload: unknown, release: string): boolean {
    return showAlertRuntime(this.windowRuntimeHost(), payload, release);
  }

  private resolveAlertContentSize(
    alert: HabboAlertDescriptor,
    layout: HabboExternalCastWindowLayout,
    border: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
  ): { readonly width: number; readonly height: number; readonly resizeWidth: number; readonly resizeHeight: number } {
    return resolveAlertContentSizeRuntime(this.windowRuntimeHost(), alert, layout, border);
  }

  private closeAlertWindow(release: string): boolean {
    return closeAlertWindowRuntime(this.windowRuntimeHost(), release);
  }

  private closeWindowFromSourceElement(window: HabboWindowRecord, release: string, match: HabboWindowCloseMatch): boolean {
    return closeWindowFromSourceElementRuntime(this.windowRuntimeHost(), window, release, match);
  }

  private activateAlertElement(elementId: string, release: string): boolean {
    return activateAlertElementRuntime(this.windowRuntimeHost(), elementId, release);
  }

  private showOpenGeneralDialog(argument: unknown, release: string): boolean {
    return showOpenGeneralDialogRuntime(this.windowRuntimeHost(), argument, release);
  }

  showGeneralDialog(dialogId: unknown, payload: unknown, release: string): boolean {
    return showGeneralDialogRuntime(this.windowRuntimeHost(), dialogId, payload, release);
  }

  private showHelpDialog(release: string): boolean {
    return showHelpDialogRuntime(this.windowRuntimeHost(), release);
  }

  private showCallForHelpDialog(release: string): boolean {
    return showCallForHelpDialogRuntime(this.windowRuntimeHost(), release);
  }

  private activateDialogElement(
    elementId: string,
    found: {
      readonly window: HabboWindowRecord;
      readonly element: HabboWindowLayoutElement;
    },
    release: string,
    activation?: HabboWindowElementActivation
  ): boolean {
    return activateDialogElementRuntime(this.windowRuntimeHost(), elementId, found, release, activation);
  }

  private bridgePacketRuntimeHost(): HabboBridgePacketRuntimeHost {
    return this as unknown as HabboBridgePacketRuntimeHost;
  }

  private bridgePacketHandlersRuntimeHost(): HabboBridgePacketRuntimeHost {
    return this as unknown as HabboBridgePacketRuntimeHost;
  }

  handleBridgePacket(packetName: string, body: string, release: string): boolean {
    return handleBridgePacketRuntime(this.bridgePacketRuntimeHost(), packetName, body, release);
  }
  private handleNavigatorNodeInfoPacket(body: string, release: string): boolean {
    return handleNavigatorNodeInfoPacketRuntime(this.navigatorRuntimeHost(), body, release);
  }

  private handleNavigatorUserFlatCatsPacket(body: string, release: string): boolean {
    return handleNavigatorUserFlatCatsPacketRuntime(this.navigatorRuntimeHost(), body, release);
  }

  private handleNavigatorFlatResultsPacket(packetName: string, body: string, release: string): boolean {
    return handleNavigatorFlatResultsPacketRuntime(this.navigatorRuntimeHost(), packetName, body, release);
  }

  private handleNavigatorNoFlatsPacket(packetName: string, release: string): boolean {
    return handleNavigatorNoFlatsPacketRuntime(this.navigatorRuntimeHost(), packetName, release);
  }

  private handleRoomKioskFlatCreatedPacket(body: string, release: string): boolean {
    return handleRoomKioskFlatCreatedPacketRuntime(this.roomOMaticRuntimeHost(), body, release);
  }

  private handleUserObjectPacket(body: string, release: string): boolean {
    return handleUserObjectPacketRuntime(this.bridgePacketHandlersRuntimeHost(), body, release);
  }

  private handlePursePacket(body: string, release: string): void {
    handlePursePacketRuntime(this.purseRuntimeHost(), body, release);
  }

  private handlePurseCreditLogPacket(body: string, release: string): boolean {
    return handlePurseCreditLogPacketRuntime(this.purseRuntimeHost(), body, release);
  }

  private handleVoucherRedeemOkPacket(body: string, release: string): boolean {
    return handleVoucherRedeemOkPacketRuntime(this.purseRuntimeHost(), body, release);
  }

  private handleVoucherRedeemErrorPacket(body: string, release: string): boolean {
    return handleVoucherRedeemErrorPacketRuntime(this.purseRuntimeHost(), body, release);
  }

  private handleCatalogueIndexPacket(body: string, release: string): boolean {
    return handleCatalogueIndexPacketRuntime(this.catalogueRuntimeHost(), body, release);
  }

  private handleCataloguePagePacket(body: string, release: string): boolean {
    return handleCataloguePagePacketRuntime(this.catalogueRuntimeHost(), body, release);
  }

  private handleCataloguePurchaseResultPacket(status: "OK" | "NOBALANCE" | "ERROR", body: string, release: string): boolean {
    return handleCataloguePurchaseResultPacketRuntime(this.catalogueRuntimeHost(), status, body, release);
  }

  private handleStripInfoPacket(body: string, release: string): boolean {
    return handleStripInfoPacketRuntime(this.inventoryHandRuntimeHost(), body, release);
  }

  private handleStripUpdatedPacket(body: string, release: string): boolean {
    return handleStripUpdatedPacketRuntime(this.inventoryHandRuntimeHost(), body, release);
  }

  private handleRemoveStripItemPacket(body: string, release: string): boolean {
    return handleRemoveStripItemPacketRuntime(this.inventoryHandRuntimeHost(), body, release);
  }

  private handleClubNoSubscriptionPacket(body: string, release: string): boolean {
    return handleClubNoSubscriptionPacketRuntime(this.clubRuntimeHost(), body, release);
  }

  private handleClubSubscriptionInfoPacket(body: string, release: string): boolean {
    return handleClubSubscriptionInfoPacketRuntime(this.clubRuntimeHost(), body, release);
  }

  private handleClubSubscriptionOkPacket(release: string): boolean {
    return handleClubSubscriptionOkPacketRuntime(this.clubRuntimeHost(), release);
  }

  private handleMessengerReadyPacket(release: string): boolean {
    const handled = handleMessengerReadyPacketRuntime(this.friendsConsoleRuntimeHost(), release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerPersistentMessagePacket(body: string, release: string): boolean {
    const handled = handleMessengerPersistentMessagePacketRuntime(this.friendsConsoleRuntimeHost(), body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerBuddyListPacket(packetName: string, body: string, release: string): boolean {
    const handled = handleMessengerBuddyListPacketRuntime(this.friendsConsoleRuntimeHost(), packetName, body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerBuddyRequestsPacket(body: string, release: string): boolean {
    const handled = handleMessengerBuddyRequestsPacketRuntime(this.friendsConsoleRuntimeHost(), body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerMessagePacket(body: string, release: string): boolean {
    const handled = handleMessengerMessagePacketRuntime(this.friendsConsoleRuntimeHost(), body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerRemoveBuddyPacket(body: string, release: string): boolean {
    const handled = handleMessengerRemoveBuddyPacketRuntime(this.friendsConsoleRuntimeHost(), body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerMemberInfoPacket(body: string, release: string): boolean {
    const handled = handleMessengerMemberInfoPacketRuntime(this.friendsConsoleRuntimeHost(), body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private handleMessengerUserNotFoundPacket(body: string, release: string): boolean {
    const handled = handleMessengerUserNotFoundPacketRuntime(this.friendsConsoleRuntimeHost(), body, release);
    this.syncRelease1MessengerAfterPacket(release);
    return handled;
  }

  private syncRelease1MessengerAfterPacket(release: string): void {
    if (release.startsWith("release1_")) {
      syncRelease1MessengerIfOpen(this.v1MessengerRuntimeHost(), release);
    }
  }

  private isMessengerUserLookupBody(body: string): boolean {
    return isMessengerUserLookupBodyRuntime(this.friendsConsoleRuntimeHost(), body);
  }

  private isMessengerMemberInfoBody(body: string): boolean {
    return isMessengerMemberInfoBodyRuntime(this.friendsConsoleRuntimeHost(), body);
  }

  private handleAvailableBadgesPacket(body: string, release: string): boolean {
    return handleAvailableBadgesPacketRuntime(this.bridgePacketHandlersRuntimeHost(), body, release);
  }

  private handleUserBadgePacket(body: string, release: string): boolean {
    return handleUserBadgePacketRuntime(this.bridgePacketHandlersRuntimeHost(), body, release);
  }

  private handleRegistrationNameRejected(release: string, messageKey: string, id: string, clearName: boolean): void {
    handleRegistrationNameRejectedRuntime(this.bridgePacketHandlersRuntimeHost(), release, messageKey, id, clearName);
  }

  private handleServerErrorPacket(body: string, release: string): boolean {
    return handleServerErrorPacketRuntime(this.bridgePacketHandlersRuntimeHost(), body, release);
  }

  private showModeratorAlert(body: string, release: string, source: "error" | "modalert"): boolean {
    return showModeratorAlertRuntime(this.bridgePacketHandlersRuntimeHost(), body, release, source);
  }

  private handleSystemBroadcastPacket(body: string, release: string): boolean {
    return handleSystemBroadcastPacketRuntime(this.bridgePacketHandlersRuntimeHost(), body, release);
  }

  private syncWindowSnapshot(): void {
    this.movie.setProperty("windows", [...this.windows.values()].map((window) => serializeWindow(window)));
  }

  private windowSpriteSyncHost(): HabboWindowSpriteSyncHost {
    return this as unknown as HabboWindowSpriteSyncHost;
  }

  private syncWindowSpriteChannels(release: string): void {
    return syncWindowSpriteChannelsRuntime(this.windowSpriteSyncHost(), release);
  }
  private createRuntimeBitmapGroupSprite(
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
    return createRuntimeBitmapGroupSpriteRuntime(this.windowSpriteSyncHost(), startMemberNumber, window, sourceLayout, groupId, groupElements, bitmapElements, geometryTarget, originX, originY, channel, sourceKind, release);
  }

  private createRuntimeStaticWindowBitmapElementSprite(
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
    return createRuntimeStaticWindowBitmapElementSpriteRuntime(this.windowSpriteSyncHost(), startMemberNumber, window, preferredVersionId, element, geometry, x, y, channel, release);
  }

  private prepareRuntimeButton(
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    label: string,
    options: { readonly applyAlignmentOffset?: boolean; readonly stateName?: string } = {}
  ): HabboPreparedRuntimeButton | undefined {
    return prepareRuntimeButtonRuntime(this.windowSpriteSyncHost(), element, geometry, label, options);
  }

  private resolveRuntimeButtonIcon(
    element: HabboWindowLayoutElement,
    buttonElement: HabboButtonElementAsset
  ): {
    readonly asset: HabboWindowBitmapAsset;
    readonly alignment: "left" | "center" | "right";
    readonly marginH: number;
    readonly marginV: number;
    readonly ink: number;
  } | undefined {
    return resolveRuntimeButtonIconRuntime(this.windowSpriteSyncHost(), element, buttonElement);
  }

  private createRuntimeButtonSprites(
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
    return createRuntimeButtonSpritesRuntime(this.windowSpriteSyncHost(), startMemberNumber, window, element, geometry, x, y, channel, label, preparedButton);
  }

  private createRuntimeDropMenuSprite(
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
    return createRuntimeDropMenuSpriteRuntime(this.windowSpriteSyncHost(), startMemberNumber, window, sourceLayout, element, geometry, x, y, channel, release);
  }

  private createRuntimeScrollbarSprite(
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
    return createRuntimeScrollbarSpriteRuntime(this.windowSpriteSyncHost(), startMemberNumber, window, sourceLayout, element, geometry, geometryTarget, x, y, channel);
  }

  private getScrollbarClientScrollState(
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    scrollbarElement: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number }
  ): HabboTextScrollState | undefined {
    return getScrollbarClientScrollStateRuntime(this.windowSpriteSyncHost(), window, sourceLayout, scrollbarElement, geometryTarget);
  }

  private getWindowTextScrollOffset(
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    text: string
  ): number {
    return getWindowTextScrollOffsetRuntime(this.windowSpriteSyncHost(), window, sourceLayout, element, geometryTarget, text);
  }

  private getTextScrollState(
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    text: string,
    scrollbarElement?: HabboWindowLayoutElement
  ): HabboTextScrollState {
    return getTextScrollStateRuntime(this.windowSpriteSyncHost(), window, sourceLayout, element, geometryTarget, text, scrollbarElement);
  }

  private getImageScrollState(
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    geometryTarget: { readonly width: number; readonly height: number },
    scrollbarElement: HabboWindowLayoutElement
  ): HabboTextScrollState | undefined {
    return getImageScrollStateRuntime(this.windowSpriteSyncHost(), window, sourceLayout, element, geometryTarget, scrollbarElement);
  }

  private resolveWindowImageScrollSourceSize(
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number }
  ): { readonly width: number; readonly height: number; readonly lineHeight: number } | undefined {
    return resolveWindowImageScrollSourceSizeRuntime(this.windowSpriteSyncHost(), window, element, geometry);
  }
  private getScrollbarMetrics(
    element: HabboWindowLayoutElement,
    height: number,
    model: number,
    scrollState?: HabboTextScrollState
  ): { readonly topHeight: number; readonly bottomHeight: number; readonly barHeight: number; readonly liftHeight: number; readonly liftY: number } {
    return getScrollbarMetricsRuntime(this.windowRuntimeHost(), element, height, model, scrollState);
  }

  private findOpenWindowElement(elementId: string, windowId?: string): {
    readonly window: HabboWindowRecord;
    readonly layout: HabboExternalCastWindowLayout;
    readonly element: HabboWindowLayoutElement;
    readonly geometryTarget: { readonly width: number; readonly height: number };
    readonly geometry: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  } | undefined {
    return findOpenWindowElementRuntime(this.windowRuntimeHost(), elementId, windowId);
  }

  private createRuntimeFedWindowElementSprite(
    startMemberNumber: number,
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number,
    channel: number,
    release: string
  ): HabboRuntimeWindowElementSprite | undefined {
    return createRuntimeFedWindowElementSpriteRuntime(this.windowSpriteSyncHost(), startMemberNumber, window, element, geometry, x, y, channel, release);
  }

  private createMessengerFriendListMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createMessengerFriendListMemberRuntime(this.friendsConsoleRuntimeHost(), number, window, elementId, geometry);
  }

  private createMessengerMessageTextMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createMessengerMessageTextMemberRuntime(this.friendsConsoleRuntimeHost(), number, window, elementId, geometry);
  }

  private createRoomLoaderBarMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createRoomLoaderBarMemberRuntime(this.roomLifecycleHost(), number, window, elementId, geometry);
  }

  private createNavigatorRoomListMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    release: string
  ): DirectorMemberManifest {
    void release;
    return createNavigatorRoomListMemberRuntime(this.navigatorRuntimeHost(), number, window, elementId, geometry);
  }

  private createNavigatorEmptyRoomListMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    text: string
  ): DirectorMemberManifest {
    return createNavigatorEmptyRoomListMemberRuntime(this.navigatorRuntimeHost(), number, window, elementId, geometry, text);
  }

  private createNavigatorRoomListLayers(
    children: readonly HabboNavigatorNodeInfo[],
    geometry: { readonly width: number; readonly height: number },
    scrollOffset = 0
  ): DirectorBitmapCompositeLayer[] {
    return createNavigatorRoomListLayersRuntime(this.navigatorRuntimeHost(), children, geometry, scrollOffset);
  }

  private createCataloguePageListMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createCataloguePageListMemberRuntime(this.catalogueRuntimeHost(), number, window, elementId, geometry);
  }

  private createCatalogueImageMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest | undefined {
    return createCatalogueImageMemberRuntime(this.catalogueRuntimeHost(), number, window, elementId, geometry);
  }

  private resolveCatalogueSmallSlotBackground(
    window: HabboWindowRecord,
    elementId: string
  ): HabboCatalogueBitmapAssetSource | undefined {
    return resolveCatalogueSmallSlotBackgroundRuntime(this.catalogueRuntimeHost(), window, elementId);
  }

  private resolveCatalogueAssetSource(
    candidates: readonly string[],
    preferredCasts: readonly string[]
  ): HabboCatalogueBitmapAssetSource | undefined {
    return resolveCatalogueAssetSourceRuntime(this.catalogueRuntimeHost(), candidates, preferredCasts);
  }

  private createNavigatorRowBackgroundLayers(
    type: "room" | "cat",
    statusIndex: number,
    y: number,
    width: number,
    height: number
  ): DirectorBitmapCompositeLayer[] {
    return createNavigatorRowBackgroundLayersRuntime(this.navigatorRuntimeHost(), type, statusIndex, y, width, height);
  }

  private createNavigatorTextFeedMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createNavigatorTextFeedMemberRuntime(this.navigatorRuntimeHost(), number, window, elementId, geometry);
  }

  private createNavigatorHistoryLinksMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createNavigatorHistoryLinksMemberRuntime(this.navigatorRuntimeHost(), number, window, elementId, geometry);
  }

  private createNavigatorInfoIconMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest | undefined {
    return createNavigatorInfoIconMemberRuntime(this.navigatorRuntimeHost(), number, window, elementId, geometry);
  }

  private createFigurePreviewMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    release: string
  ): DirectorMemberManifest | undefined {
    return createFigurePreviewMemberRuntime(this.figureRuntimeHost(), number, window, elementId, geometry, release);
  }

  private createInfoStandUserImageMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    _geometry: { readonly width: number; readonly height: number },
    release: string
  ): DirectorMemberManifest | undefined {
    return createInfoStandUserImageMemberRuntime(this.roomSelectionRuntimeHost(), number, window, elementId, _geometry, release);
  }

  private createInfoStandObjectImageMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest | undefined {
    return createInfoStandObjectImageMemberRuntime(this.roomSelectionRuntimeHost(), number, window, elementId, geometry);
  }

  private createInfoStandBadgeMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createInfoStandBadgeMemberRuntime(this.roomSelectionRuntimeHost(), number, window, elementId, geometry);
  }

  private createBadgePreviewMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createBadgePreviewMemberRuntime(this.roomSelectionRuntimeHost(), number, window, elementId, geometry);
  }

  private createBadgeVisibilityRadioMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number }
  ): DirectorMemberManifest {
    return createBadgeVisibilityRadioMemberRuntime(this.roomSelectionRuntimeHost(), number, window, elementId, geometry);
  }

  private createCenteredBadgeMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    badgeId: string,
    alpha: number
  ): DirectorMemberManifest {
    return createCenteredBadgeMemberRuntime(this.roomSelectionRuntimeHost(), number, window, elementId, geometry, badgeId, alpha);
  }

  private createBadgeEffectLayer(geometry: { readonly width: number; readonly height: number }): DirectorBitmapCompositeLayer | undefined {
    return createBadgeEffectLayerRuntime(this.roomSelectionRuntimeHost(), geometry);
  }

  private getBadgeEffectPoint(geometry: { readonly width: number; readonly height: number }): ReturnType<typeof getBadgeEffectPointRuntime> {
    return getBadgeEffectPointRuntime(this.roomSelectionRuntimeHost(), geometry);
  }

  private resolveInfoStandBadgeAsset(badgeId: string): HabboWindowBitmapAsset | undefined {
    return resolveInfoStandBadgeAssetRuntime(this.roomSelectionRuntimeHost(), badgeId);
  }

  private getSelectedRoomUser(): HabboRoomUserRecord | undefined {
    return getSelectedRoomUserRuntime(this.roomSelectionRuntimeHost());
  }

  private getOwnRoomUser(): HabboRoomUserRecord | undefined {
    return getOwnRoomUserRuntime(this.roomSelectionRuntimeHost());
  }

  private getSelectedRoomUserInfo(): HabboRoomUserInfo | undefined {
    return getSelectedRoomUserInfoRuntime(this.roomSelectionRuntimeHost());
  }

  private getSelectedRoomObjectInfo(): HabboRoomObjectInfo | undefined {
    return getSelectedRoomObjectInfoRuntime(this.roomSelectionRuntimeHost());
  }

  private getSelectedRoomObjectFirstAsset(info: HabboRoomObjectInfo): HabboWindowBitmapAsset | undefined {
    return getSelectedRoomObjectFirstAssetRuntime(this.roomSelectionRuntimeHost(), info);
  }

  private getAvailableBadges(): readonly string[] {
    return getAvailableBadgesRuntime(this.roomSelectionRuntimeHost());
  }

  private getChosenBadgeIndex(): number {
    const sessionValue = this.objectManager.getObject("#session")?.get("chosen_badge_index");
    const index = Number(sessionValue ?? this.movie.getProperty("chosenBadgeIndex") ?? 1);
    return Number.isFinite(index) && index > 0 ? Math.trunc(index) : 1;
  }

  private getBadgeChooserChosenIndex(): number {
    const index = Number(this.movie.getProperty("badgeChooserChosenIndex") ?? this.getChosenBadgeIndex());
    return Number.isFinite(index) && index > 0 ? Math.trunc(index) : 1;
  }

  private getSelectedInfoStandBadge(): string {
    return getSelectedInfoStandBadgeRuntime(this.roomSelectionRuntimeHost());
  }

  private getSelectedInfoStandBadgeVisible(): boolean {
    return getSelectedInfoStandBadgeVisibleRuntime(this.roomSelectionRuntimeHost());
  }

  private figureRuntimeHost(): HabboFigureRuntimeHost {
    return this as unknown as HabboFigureRuntimeHost;
  }

  private createLoginPreviewMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    release: string
  ): DirectorMemberManifest | undefined {
    return createLoginPreviewMemberRuntime(this.figureRuntimeHost(), number, window, elementId, geometry, release);
  }

  private getLoginUserFoundFigureAction(): HabboFigureRenderOptions {
    return getLoginUserFoundFigureActionRuntime(this.figureRuntimeHost());
  }

  advanceLoginUserFoundAnimation(deltaMs: number, release: string): boolean {
    return advanceLoginUserFoundAnimationRuntime(this.figureRuntimeHost(), deltaMs, release);
  }

  advanceRoomUserAnimations(deltaMs: number, release: string): boolean {
    return advanceRoomUserAnimationsRuntime(this.roomUserRuntimeHost(), deltaMs, release);
  }

  advanceRoomObjectAnimations(deltaMs: number, release: string): boolean {
    return advanceRoomObjectAnimationsRuntime(this.roomObjectRuntimeHost(), deltaMs, release);
  }

  private roomObjectOverlayRenderSignature(): string {
    return JSON.stringify({
      entries: readRoomObjectSpriteEntries(this.movie.getProperty("roomObjectOverlaySpriteEntries")),
      sprites: readSpriteManifestArray(this.movie.getProperty("roomObjectOverlaySprites"))
    });
  }

  advanceRoomHandAnimation(deltaMs: number, release: string): boolean {
    return advanceRoomHandAnimationRuntime(this.inventoryHandRuntimeHost(), deltaMs, release);
  }

  advanceBadgeEffectAnimation(deltaMs: number, release: string): boolean {
    return advanceBadgeEffectAnimationRuntime(this.roomSelectionRuntimeHost(), deltaMs, release);
  }

  private createHumanFeedPreviewMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    parts: readonly string[],
    figure: Readonly<Record<string, HabboFigurePartProps>>,
    direction: number,
    release: string
  ): DirectorMemberManifest | undefined {
    return createHumanFeedPreviewMemberRuntime(this.figureRuntimeHost(), number, window, elementId, geometry, parts, figure, direction, release);
  }

  private createFigurePartPreviewMember(
    number: number,
    window: HabboWindowRecord,
    elementId: string,
    geometry: { readonly width: number; readonly height: number },
    part: string,
    release: string
  ): DirectorMemberManifest | undefined {
    return createFigurePartPreviewMemberRuntime(this.figureRuntimeHost(), number, window, elementId, geometry, part, release);
  }

  private getActiveUserFigureProps(release: string): Record<string, HabboFigurePartProps> {
    return getActiveUserFigurePropsRuntime(this.figureRuntimeHost(), release);
  }

  private getMessengerSearchFigureProps(release: string): Record<string, HabboFigurePartProps> | undefined {
    return getMessengerSearchFigurePropsRuntime(this.figureRuntimeHost());
  }

  private getMessengerCurrentMessageFigureProps(release: string): Record<string, HabboFigurePartProps> | undefined {
    return getMessengerCurrentMessageFigurePropsRuntime(this.figureRuntimeHost());
  }

  private createFigureSourceLayers(
    parts: readonly string[],
    figure: Readonly<Record<string, HabboFigurePartProps>>,
    release: string,
    direction: number,
    options: HabboFigureRenderOptions = {}
  ): readonly HabboFigureSourceLayer[] {
    return createFigureSourceLayersRuntime(this.figureRuntimeHost(), parts, figure, release, direction, options);
  }

  private ensureRegistrationFigureProps(): Record<string, HabboFigurePartProps> {
    return ensureRegistrationFigurePropsRuntime(this.editHabboRuntimeHost());
  }

  private setRegistrationSex(sex: "M" | "F", release: string): void {
    setRegistrationSexRuntime(this.editHabboRuntimeHost(), sex, release);
  }

  private changeRegistrationFigurePart(part: string, direction: -1 | 1, release: string): boolean {
    return changeRegistrationFigurePartRuntime(this.editHabboRuntimeHost(), part, direction, release);
  }

  private changeRegistrationFigurePartColor(part: string, direction: -1 | 1, release: string): boolean {
    return changeRegistrationFigurePartColorRuntime(this.editHabboRuntimeHost(), part, direction, release);
  }

  private getFigurePartEntries(part: string): readonly HabboFigurePartIndexEntry[] {
    return getFigurePartEntriesRuntime(this.editHabboRuntimeHost(), part);
  }

  private getBitmapAssetByMemberName(
    memberName: string,
    preferredCasts: readonly string[] = ["hh_people_1", "hh_people_2"]
  ): HabboWindowBitmapAsset | undefined {
    return getBitmapAssetByMemberNameRuntime(this.externalCastRuntimeHost(), memberName, preferredCasts);
  }

  private resolveMemberAlias(memberName: string, preferredCasts: readonly string[] = []): string | undefined {
    return resolveMemberAliasRuntime(this.externalCastRuntimeHost(), memberName, preferredCasts);
  }

  private getAnyBitmapAssetByMemberName(
    memberName: string,
    preferredCasts: readonly string[] = []
  ): HabboWindowBitmapAsset | undefined {
    return getAnyBitmapAssetByMemberNameRuntime(this.externalCastRuntimeHost(), memberName, preferredCasts);
  }

  private resolveButtonElementAsset(element: HabboWindowLayoutElement): HabboButtonElementAsset | undefined {
    const model = numberProperty(element.properties, "model") ?? 1;
    const memberName = `button${model}.element`;
    return this.buttonBitmapAssetSet?.elements.find((candidate) => normalizeMemberName(candidate.memberName) === normalizeMemberName(memberName));
  }

  private getDropMenuSelectedKey(element: HabboWindowLayoutElement): string {
    return getDropMenuSelectedKeyRuntime(this.windowRuntimeHost(), element);
  }

  private getDropMenuKeyList(element: HabboWindowLayoutElement): readonly string[] {
    return getDropMenuKeyListRuntime(this.windowRuntimeHost(), element);
  }

  private getDropMenuLabels(element: HabboWindowLayoutElement, keyList: readonly string[]): readonly string[] {
    return getDropMenuLabelsRuntime(this.windowRuntimeHost(), element, keyList);
  }

  private isDropMenuOpen(element: HabboWindowLayoutElement): boolean {
    return isDropMenuOpenRuntime(this.windowRuntimeHost(), element);
  }

  private getDropMenuLineHeight(
    element: HabboWindowLayoutElement,
    geometry: { readonly height: number }
  ): number {
    return getDropMenuLineHeightRuntime(this.windowRuntimeHost(), element, geometry);
  }

  private resolveDropMenuSpriteGeometry(
    element: HabboWindowLayoutElement,
    geometry: { readonly width: number; readonly height: number },
    x: number,
    y: number
  ): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
    return resolveDropMenuSpriteGeometryRuntime(this.windowRuntimeHost(), element, geometry, x, y);
  }

  private getButtonBitmapAsset(part: HabboButtonElementPartAssetRef): HabboWindowBitmapAsset | undefined {
    return this.buttonBitmapAssetSet?.assets.find((asset) => {
      return normalizeCastName(asset.castName) === normalizeCastName(part.castName) && asset.member === part.member;
    });
  }

  private resolveWindowBitmapElementRef(element: HabboWindowLayoutElement): DirectorMemberRef | undefined {
    return resolveWindowBitmapElementRefRuntime(this.windowRuntimeHost(), element);
  }

  private resolveStatefulControlMemberName(element: HabboWindowLayoutElement): string | undefined {
    return resolveStatefulControlMemberNameRuntime(this.windowRuntimeHost(), element);
  }

  private collectInteractiveElement(
    interactiveElements: HabboWindowInteractiveElement[],
    window: HabboWindowRecord,
    sourceLayout: HabboExternalCastWindowLayout,
    element: HabboWindowLayoutElement,
    x: number,
    y: number,
    geometry: { readonly width: number; readonly height: number },
    geometryTarget: { readonly width: number; readonly height: number },
    originX: number,
    originY: number
  ): void {
    collectInteractiveElementRuntime(this.windowRuntimeHost(), interactiveElements, window, sourceLayout, element, x, y, geometry, geometryTarget, originX, originY);
  }

  private isWindowElementPressed(
    window: HabboWindowRecord,
    element: HabboWindowLayoutElement,
    sourceKind: "template" | "content"
  ): boolean {
    return isWindowElementPressedRuntime(this.windowRuntimeHost(), window, element, sourceKind);
  }

  private collectRoomUserInteractiveElements(interactiveElements: HabboWindowInteractiveElement[]): void {
    return collectRoomUserInteractiveElementsRuntime(this.roomUserRuntimeHost(), interactiveElements);
  }

  private resolveInteractiveSpriteBounds(
    sprite: DirectorSpriteChannelManifest,
    member: DirectorMember | undefined
  ): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
    return resolveInteractiveSpriteBoundsRuntime(sprite, member);
  }

  private collectRoomObjectInteractiveElements(interactiveElements: HabboWindowInteractiveElement[]): void {
    collectRoomObjectInteractiveElementsRuntime(this.windowRuntimeHost(), interactiveElements);
  }

  private collectRoomHandInteractiveElements(interactiveElements: HabboWindowInteractiveElement[]): void {
    collectRoomHandInteractiveElementsRuntime(this.windowRuntimeHost(), interactiveElements);
  }

  private syncRoomInteractiveElements(): void {
    syncRoomInteractiveElementsRuntime(this.windowRuntimeHost());
  }

  private resolveElementLabel(element: HabboWindowLayoutElement): string {
    return resolveElementLabelRuntime(this.windowRuntimeHost(), element);
  }

  private resolveWindowElementText(window: HabboWindowRecord, element: HabboWindowLayoutElement): string | undefined {
    return resolveWindowElementTextRuntime(this.windowRuntimeHost(), window, element);
  }

  private getEditableDisplayText(elementId: string): string | undefined {
    return getEditableDisplayTextRuntime(this.windowRuntimeHost(), elementId);
  }

  private syncDirectorOverlaySprites(): void {
    syncDirectorOverlaySpritesRuntime(this.windowRuntimeHost());
  }

  private getRuntimeWindowCastSlot(): number {
    return getRuntimeWindowCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeLoadingCastSlot(): number {
    return getRuntimeLoadingCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeLogoCastSlot(): number {
    return getRuntimeLogoCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeEntryVisualCastSlot(): number {
    return getRuntimeEntryVisualCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeRoomCastSlot(): number {
    return getRuntimeRoomCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeRoomVisualCastSlot(): number {
    return getRuntimeRoomVisualCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeRoomObjectCastSlot(): number {
    return getRuntimeRoomObjectCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeRoomChatCastSlot(): number {
    return getRuntimeRoomChatCastSlotRuntime(this.windowRuntimeHost());
  }

  private getRuntimeRoomCoverCastSlot(): number {
    return getRuntimeRoomCoverCastSlotRuntime(this.windowRuntimeHost());
  }

  private recordUnsupportedWindowElement(release: string, layout: HabboExternalCastWindowLayout, element: HabboWindowLayoutElement): void {
    this.recordUnsupportedOnce(`window-layout-element-unresolved:${layout.memberName}:${element.index}`, {
      subsystem: "habbo",
      feature: "window-layout-element-unresolved",
      detail: `${release} ${layout.memberName} element ${element.index} (${element.media ?? "unknown"} ${element.memberName ?? ""}) is recorded from generated layout data but is not renderable in the current window sprite slice`,
      source: layout.textChunkPath
    });
  }

  private recordUnsupportedVisualElement(release: string, layout: HabboExternalCastVisualLayout, element: HabboWindowLayoutElement): void {
    this.recordUnsupportedOnce(`visual-layout-element-unresolved:${layout.memberName}:${element.index}`, {
      subsystem: "habbo",
      feature: "visual-layout-element-unresolved",
      detail: `${release} ${layout.memberName} element ${element.index} (${element.media ?? "unknown"} ${element.memberName ?? ""}) is recorded from generated visual data but is not renderable in the current visualizer slice`,
      source: layout.textChunkPath
    });
  }

  private syncDelaySnapshot(): void {
    this.movie.setProperty("scheduledDelays", this.getPendingDelays());
  }

  private getExternalVariablesPath(): string | undefined {
    const variable = this.getVariable("external.variables.txt") ?? this.getVariable("external.variables.path");
    return typeof variable === "string" && variable.length > 0 ? variable : undefined;
  }

  private getExternalTextsPath(): string | undefined {
    const variable = this.getVariable("external.texts.txt");
    return typeof variable === "string" && variable.length > 0 ? variable : undefined;
  }

  private getPrivateRoomPatterns(): HabboPrivateRoomPatterns {
    return getPrivateRoomPatternsRuntime(this.roomLifecycleHost());
  }

  private createDefaultPrivateRoomProgramState(): HabboPrivateRoomProgramState {
    return createDefaultPrivateRoomProgramStateRuntime(this.roomLifecycleHost());
  }

  private getPrivateRoomProgramState(): HabboPrivateRoomProgramState {
    return getPrivateRoomProgramStateRuntime(this.roomLifecycleHost());
  }

  private setPrivateRoomProgramState(state: HabboPrivateRoomProgramState): void {
    setPrivateRoomProgramStateRuntime(this.roomLifecycleHost(), state);
  }

  private handleRoomFlatPropertyPacket(body: string, release: string): boolean {
    const handled = handleRoomFlatPropertyPacketRuntime(this.roomLifecycleHost(), body, release);
    if (handled && release.startsWith("release1_roseau_dcr0910")) {
      refreshRelease1PrivateRoomScoreFrame(this as unknown as Parameters<typeof refreshRelease1PrivateRoomScoreFrame>[0], release);
    }
    return handled;
  }

  private getRoomPattern(patternsFieldName: string, index: string): HabboRoomPattern | undefined {
    return getRoomPatternRuntime(this.roomLifecycleHost(), patternsFieldName, index);
  }

  private buildDownloadUrl(url: string): string {
    const moviePath = this.getMoviePath();
    const needsCacheBust = moviePath.includes("http://") || url.includes("http://");
    if (!needsCacheBust) {
      return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}${Date.now()}`;
  }

  registerDownloadCallback(memberNumber: number, handler: LingoSymbol | string, targetId: LingoSymbol | string, nextState: string): boolean {
    return registerDownloadCallbackRuntime(this.threadConstructorHost(), memberNumber, handler, targetId, nextState);
  }

  getDownloadCallbacks(): readonly HabboDownloadCallback[] {
    return getDownloadCallbacksRuntime(this.threadConstructorHost());
  }

  registerCastloadCallback(loadId: number, handler: LingoSymbol | string, targetId: LingoSymbol | string, nextState: string): boolean {
    return registerCastloadCallbackRuntime(this.threadConstructorHost(), loadId, handler, targetId, nextState);
  }

  getCastLoadCallbacks(): readonly HabboCastLoadCallback[] {
    return getCastLoadCallbacksRuntime(this.threadConstructorHost());
  }

  createBroker(id: LingoSymbol | string): void {
    createBrokerRuntime(this.messageDispatchHost(), id);
  }

  brokerExists(id: LingoSymbol | string): boolean {
    return brokerExistsRuntime(this.messageDispatchHost(), id);
  }

  registerMessage(
    message: LingoSymbol | string,
    clientId: LingoSymbol | string,
    method: LingoSymbol | string,
    source?: string
  ): boolean {
    return registerMessageRuntime(this.messageDispatchHost(), message, clientId, method, source);
  }

  unregisterMessage(message: LingoSymbol | string, clientId: LingoSymbol | string): boolean {
    return unregisterMessageRuntime(this.messageDispatchHost(), message, clientId);
  }

  getMessageRegistrations(message: LingoSymbol | string): readonly Record<string, unknown>[] {
    return getMessageRegistrationsRuntime(this.messageDispatchHost(), message);
  }

  executeMessage(message: LingoSymbol | string, argument: unknown, release: string): boolean {
    return executeMessageRuntime(this.messageDispatchHost(), message, argument, release);
  }

  scheduleDelay(
    clientId: LingoSymbol | string,
    method: LingoSymbol | string,
    delayMs: number,
    argument: unknown,
    source?: string
  ): HabboDelayRecord {
    return scheduleDelayRuntime(this.messageDispatchHost(), clientId, method, delayMs, argument, source);
  }

  getPendingDelays(): readonly Record<string, unknown>[] {
    return getPendingDelaysRuntime(this.messageDispatchHost());
  }

  runScheduledDelays(elapsedMs: number, release: string): readonly HabboMessageCallRecord[] {
    return runScheduledDelaysRuntime(this.messageDispatchHost(), elapsedMs, release);
  }

  setVariable(name: string, value: unknown): void {
    setVariableRuntime(this.externalCastRuntimeHost(), name, value);
  }

  getVariable(name: string): unknown {
    return getVariableRuntime(this.externalCastRuntimeHost(), name);
  }

  getClassVariable(name: string): unknown {
    return getClassVariableRuntime(this.externalCastRuntimeHost(), name);
  }

  private convertSpecialChars(value: string, direction = 0): string {
    return convertSpecialCharsRuntime(this.externalCastRuntimeHost(), value, direction);
  }

  setLoginFieldValue(elementId: string, value: string, release: string): boolean {
    return setLoginFieldValueRuntime(this.entryHotelViewRuntimeHost(), elementId, value, release);
  }

  setWindowFieldValue(elementId: string, value: string, release: string): boolean {
    if (release.startsWith("release1_") && elementId.startsWith("release1_messenger_field_")) {
      this.windowTextValues.set(elementId, value);
      this.syncWindowFieldValueSnapshot();
      return true;
    }
    return setWindowFieldValueRuntime(this.windowRuntimeHost(), elementId, value, release);
  }

  submitWindowField(elementId: string, release: string, options: { readonly shiftKey?: boolean } = {}): boolean {
    return submitWindowFieldRuntime(this.windowRuntimeHost(), elementId, release, options);
  }

  private submitRoomChat(release: string, options: { readonly shiftKey?: boolean } = {}): boolean {
    return submitRoomChatRuntime(this.roomChatRuntimeHost(), release, options);
  }

  private setRegistrationFieldValue(elementId: string, value: string, release: string): boolean {
    return setRegistrationFieldValueRuntime(this.editHabboRuntimeHost(), elementId, value, release);
  }

  private clearRegistrationNameField(): void {
    clearRegistrationNameFieldRuntime(this.editHabboRuntimeHost());
  }

  activateWindowElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateWindowElementRuntime(this.windowRuntimeHost(), elementId, release, activation);
  }

  releasePressedWindowElement(release?: string): boolean {
    return releasePressedWindowElementRuntime(this.windowRuntimeHost(), release);
  }

  private shouldRouteRoomObjectHitToRoomCanvas(activation?: HabboWindowElementActivation): boolean {
    return shouldRouteRoomObjectHitToRoomCanvasRuntime(this.windowRuntimeHost(), activation);
  }

  private activateRoomHandElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateRoomHandElementRuntime(this.inventoryHandRuntimeHost(), elementId, release, activation);
  }

  private activateRoomCanvas(release: string, activation?: HabboWindowElementActivation): boolean {
    return activateRoomCanvasRuntime(this.roomObjectRuntimeHost(), release, activation);
  }

  updateRoomPointer(release: string, activation?: HabboWindowElementActivation): boolean {
    return updateRoomPointerRuntime(this.roomObjectRuntimeHost(), release, activation);
  }

  clearRoomPointer(): boolean {
    return clearRoomPointerRuntime(this.roomObjectRuntimeHost());
  }

  private clearRoomObjectMoverPreview(): boolean {
    return clearRoomObjectMoverPreviewRuntime(this.roomObjectRuntimeHost());
  }

  private activateDropMenuElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateDropMenuElementRuntime(this.windowRuntimeHost(), elementId, release, activation);
  }

  private applyDropMenuSelection(
    found: {
      readonly window: HabboWindowRecord;
      readonly layout: HabboExternalCastWindowLayout;
      readonly element: HabboWindowLayoutElement;
    },
    selectedKey: string,
    release: string
  ): void {
    applyDropMenuSelectionRuntime(this.windowRuntimeHost(), found, selectedKey, release);
  }

  private setRoomChatMode(selectedKey: string, release: string): void {
    setRoomChatModeRuntime(this.windowRuntimeHost(), selectedKey, release);
  }

  private openCloseRoomHandContainer(release: string): boolean {
    return openCloseRoomHandContainerRuntime(this.inventoryHandRuntimeHost(), release);
  }

  private renderRoomHandContainer(release: string): boolean {
    return renderRoomHandContainerRuntime(this.inventoryHandRuntimeHost(), release);
  }

  private resolveExternalBitmapMemberRefByName(
    memberName: string,
    preferredCasts: readonly string[]
  ): DirectorMemberRef | undefined {
    return resolveExternalBitmapMemberRefByNameRuntime(this.externalCastRuntimeHost(), memberName, preferredCasts);
  }

  private activateGenericWindowElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateGenericWindowElementRuntime(this.windowRuntimeHost(), elementId, release, activation);
  }

  private activatePurseElement(elementId: string, window: HabboWindowRecord, release: string): boolean {
    return activatePurseElementRuntime(this.purseRuntimeHost(), elementId, window, release);
  }

  private activateMessengerElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    if (release.startsWith("release1_")) {
      return false;
    }
    return activateMessengerElementRuntime(this.friendsConsoleRuntimeHost(), elementId, release, activation);
  }

  private activateRoomKioskElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateRoomKioskElementRuntime(this.roomOMaticRuntimeHost(), elementId, release, activation);
  }

  private updateRoomKioskPropsFromFields(release: string): boolean {
    return updateRoomKioskPropsFromFieldsRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private validateRoomKioskPasswordFields(release: string): boolean {
    return validateRoomKioskPasswordFieldsRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private applyRoomKioskCategorySelection(categoryId: string, release: string): void {
    applyRoomKioskCategorySelectionRuntime(this.roomOMaticRuntimeHost(), categoryId, release);
  }

  private setRoomKioskDoor(door: HabboRoomKioskDoor, release: string): void {
    setRoomKioskDoorRuntime(this.roomOMaticRuntimeHost(), door, release);
  }

  private setRoomKioskShowOwnerName(showOwnerName: boolean, release: string): void {
    setRoomKioskShowOwnerNameRuntime(this.roomOMaticRuntimeHost(), showOwnerName, release);
  }

  private toggleRoomKioskFurnitureMove(release: string): void {
    toggleRoomKioskFurnitureMoveRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private queueRoomKioskCreateFlat(release: string): void {
    queueRoomKioskCreateFlatRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private executeRoomKioskCreatedRoomEntry(release: string): boolean {
    return executeRoomKioskCreatedRoomEntryRuntime(this.roomOMaticRuntimeHost(), release);
  }

  private activateRoomObjectInterfaceElement(elementId: string, release: string): boolean {
    return activateRoomObjectInterfaceElementRuntime(this.roomSelectionRuntimeHost(), elementId, release);
  }

  private activateRoomFurniInterfaceElement(
    elementId: string,
    object: HabboRoomObjectRecord,
    release: string,
    options?: HabboRoomFurniInterfaceOptions
  ): boolean {
    return activateRoomFurniInterfaceElementRuntime(this.roomObjectRuntimeHost(), elementId, object, release, options);
  }

  private showRoomDeleteConfirm(object: HabboRoomObjectRecord, release: string): boolean {
    return showRoomDeleteConfirmRuntime(this.roomSelectionRuntimeHost(), object, release);
  }

  private activateRoomDeleteConfirmElement(elementId: string, release: string): boolean {
    return activateRoomDeleteConfirmElementRuntime(this.roomSelectionRuntimeHost(), elementId, release);
  }

  private resolveRotatedActiveObjectDirection(
    object: HabboRoomObjectRecord,
    release: string,
    options?: HabboRoomObjectRotateOptions
  ): number | undefined {
    return resolveRotatedActiveObjectDirectionRuntime(this.roomObjectRuntimeHost(), object, release, options);
  }

  private openBadgeWindow(release: string): boolean {
    return openBadgeWindowRuntime(this.roomSelectionRuntimeHost(), release);
  }

  private activateBadgeChooserElement(elementId: string, release: string): boolean {
    return activateBadgeChooserElementRuntime(this.roomSelectionRuntimeHost(), elementId, release);
  }

  private toggleOwnBadgeVisibility(release: string): boolean {
    return toggleOwnBadgeVisibilityRuntime(this.roomSelectionRuntimeHost(), release);
  }

  private navigatorSourceEventForElementId(elementId: string): HabboWindowElementEventKind | undefined {
    return navigatorSourceEventForElementIdRuntime(elementId);
  }

  private activateNavigatorElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateNavigatorElementRuntime(this.navigatorRuntimeHost(), elementId, release, activation);
  }

  private queueNavigatorOwnRoomsRequest(release: string): void {
    queueNavigatorOwnRoomsRequestRuntime(this.navigatorRuntimeHost(), release);
  }

  private queueNavigatorFavoriteRoomsRequest(release: string): void {
    queueNavigatorFavoriteRoomsRequestRuntime(this.navigatorRuntimeHost(), release);
  }

  private startNavigatorFlatSearch(release: string): boolean {
    return startNavigatorFlatSearchRuntime(this.navigatorRuntimeHost(), release);
  }

  private activateNavigatorHistoryLinks(
    activation: HabboWindowElementActivation | undefined,
    release: string,
    view: HabboNavigatorView
  ): boolean {
    return activateNavigatorHistoryLinksRuntime(this.navigatorRuntimeHost(), activation, release, view);
  }

  private expandNavigatorHistoryNode(nodeId: string, release: string, view: HabboNavigatorView): boolean {
    return expandNavigatorHistoryNodeRuntime(this.navigatorRuntimeHost(), nodeId, release, view);
  }

  private addNavigatorFavoriteRoom(release: string, view: HabboNavigatorView): boolean {
    return addNavigatorFavoriteRoomRuntime(this.navigatorRuntimeHost(), release, view);
  }

  private removeNavigatorFavoriteRoom(release: string, view: HabboNavigatorView): boolean {
    return removeNavigatorFavoriteRoomRuntime(this.navigatorRuntimeHost(), release, view);
  }

  private activateNavigatorRoomList(activation: HabboWindowElementActivation | undefined, release: string): boolean {
    return activateNavigatorRoomListRuntime(this.navigatorRuntimeHost(), activation, release);
  }

  private prepareNavigatorRoomEntry(nodeId: string, release: string): boolean {
    return prepareNavigatorRoomEntryRuntime(this.navigatorRuntimeHost(), nodeId, release);
  }

  private buildNavigatorRoomDataStruct(node: HabboNavigatorNodeInfo): HabboRoomDataStruct | undefined {
    return buildNavigatorRoomDataStructRuntime(this.navigatorRuntimeHost(), node);
  }

  private executeNavigatorRoomEntry(argument: unknown, release: string): boolean {
    return executeNavigatorRoomEntryRuntime(this.navigatorRuntimeHost(), argument, release);
  }

  private enterRoom(argument: unknown, release: string): boolean {
    return enterRoomRuntime(this.roomLifecycleHost(), argument, release);
  }

  private beginRoomEntryTransition(release: string, roomData: HabboRoomDataStruct): number {
    return beginRoomEntryTransitionRuntime(this.roomLifecycleHost(), release, roomData);
  }

  private setRoomEntryState(state: HabboRoomEntryState): void {
    setRoomEntryStateRuntime(this.roomLifecycleHost(), state);
  }

  private setRoomWirePhase(phase: HabboRoomWirePhase): void {
    setRoomWirePhaseRuntime(this.roomLifecycleHost(), phase);
  }

  markRoomRequestSent(request: { readonly command?: unknown; readonly isPublic?: unknown }, release: string): boolean {
    return markRoomRequestSentRuntime(this.roomLifecycleHost(), request, release);
  }

  private loadRoomCasts(release: string): boolean {
    return loadRoomCastsRuntime(this.roomLifecycleHost(), release);
  }

  private showRoomLoaderBar(text: string, release: string, castLoadId?: number): boolean {
    return showRoomLoaderBarRuntime(this.roomLifecycleHost(), text, release, castLoadId);
  }

  private hideRoomLoaderBar(release: string): boolean {
    return hideRoomLoaderBarRuntime(this.roomLifecycleHost(), release);
  }

  private setRoomLoaderProgress(progress: number, release: string, sync = true): void {
    setRoomLoaderProgressRuntime(this.roomLifecycleHost(), progress, release, sync);
  }

  private roomCastLoaded(release: string): boolean {
    return roomCastLoadedRuntime(this.roomLifecycleHost(), release);
  }

  private getRoomWirePhase(): HabboRoomWirePhase {
    return getRoomWirePhaseRuntime(this.roomLifecycleHost()) as HabboRoomWirePhase;
  }

  private ignoreRoomPacket(packetName: string, release: string, reason: string): boolean {
    return ignoreRoomPacketRuntime(this.roomLifecycleHost(), packetName, release, reason);
  }

  private canAcceptRoomBootstrapPacket(packetName: string, release: string): boolean {
    return canAcceptRoomBootstrapPacketRuntime(this.roomLifecycleHost(), packetName, release);
  }

  private canAcceptActiveRoomPacket(packetName: string, release: string): boolean {
    return canAcceptActiveRoomPacketRuntime(this.roomLifecycleHost(), packetName, release);
  }

  private canAcceptInitialStatusPacket(packetName: string, release: string): boolean {
    return canAcceptInitialStatusPacketRuntime(this.roomLifecycleHost(), packetName, release);
  }

  private roomLifecycleHost(): HabboRoomLifecycleRuntimeHost {
    return this as unknown as HabboRoomLifecycleRuntimeHost;
  }

  private roomConnected(marker: string | undefined, state: "OPC_OK" | "FLAT_LETIN" | "ROOM_READY", release: string): boolean {
    return roomConnectedRuntime(this.roomLifecycleHost(), marker, state, release);
  }

  private describeRoomVisualCandidates(marker: string, release: string): readonly Record<string, unknown>[] {
    return describeRoomVisualCandidatesRuntime(this.roomLifecycleHost(), marker, release);
  }

  private showRoom(marker: string, release: string): boolean {
    return showRoomRuntime(this.roomLifecycleHost(), marker, release);
  }

  private getVisualizerDefaultLocZ(): number {
    return getVisualizerDefaultLocZRuntime(this.roomLifecycleHost());
  }

  private showRoomTrashCover(release: string): void {
    showRoomTrashCoverRuntime(this.roomLifecycleHost(), release);
  }

  private hideRoomTrashCover(release: string): boolean {
    return hideRoomTrashCoverRuntime(this.roomLifecycleHost(), release);
  }

  private showRoomBar(release: string): boolean {
    return showRoomBarRuntime(this.roomSelectionRuntimeHost(), release);
  }

  private showRoomInfoStand(release: string): boolean {
    return showRoomInfoStandRuntime(this.roomSelectionRuntimeHost(), release);
  }

  private selectRoomUser(userId: string, release: string): boolean {
    return selectRoomUserRuntime(this.roomSelectionRuntimeHost(), userId, release);
  }

  private showRelease1SelectedPrivateRoomUserInfo(user: HabboRoomUserRecord, info: HabboRoomUserInfo, release: string): boolean {
    return showRelease1SelectedPrivateRoomUserInfoRuntime(this as unknown as Parameters<typeof showRelease1SelectedPrivateRoomUserInfoRuntime>[0], user, info, release);
  }

  private showRelease1SelectedPrivateRoomObjectInfo(object: HabboRoomObjectRecord, info: HabboRoomObjectInfo, release: string): boolean {
    return showRelease1SelectedPrivateRoomObjectInfoRuntime(this as unknown as Parameters<typeof showRelease1SelectedPrivateRoomObjectInfoRuntime>[0], object, info, release);
  }

  private refreshRelease1SelectedPrivateRoomUserInfo(release: string): void {
    refreshRelease1SelectedPrivateRoomUserInfoRuntime(this as unknown as Parameters<typeof refreshRelease1SelectedPrivateRoomUserInfoRuntime>[0], release);
  }

  private selectRoomObject(kind: HabboRoomSelectableObjectKind, objectId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return selectRoomObjectRuntime(this.roomSelectionRuntimeHost(), kind, objectId, release, activation);
  }

  private activateSelectedActiveObjectProgram(
    object: HabboRoomObjectRecord,
    sourceClassValue: string | undefined,
    release: string,
    activation?: HabboWindowElementActivation
  ): boolean {
    return activateSelectedActiveObjectProgramRuntime(
      this.roomObjectRuntimeHost(),
      object,
      sourceClassValue,
      release,
      activation
    );
  }

  private getRoomObject(kind: HabboRoomSelectableObjectKind, objectId: string): HabboRoomObjectRecord | undefined {
    return getRoomObjectRuntime(this.roomSelectionRuntimeHost(), kind, objectId);
  }

  private activateRoommaticPassiveObject(object: HabboRoomObjectRecord, release: string): boolean | undefined {
    return activateRoommaticPassiveObjectRuntime(this.roomSelectionRuntimeHost(), object, release);
  }

  private roomObjectUsesClass(className: string, sourceClassName: string): boolean {
    return roomObjectUsesClassRuntime(this.roomSelectionRuntimeHost(), className, sourceClassName);
  }

  private getRoomObjectSourceClassValue(className: string): string | undefined {
    return getRoomObjectSourceClassValueRuntime(this.roomSelectionRuntimeHost(), className);
  }

  private resolveRoomObjectLabel(object: HabboRoomObjectRecord): string {
    return resolveRoomObjectLabelRuntime(this.roomSelectionRuntimeHost(), object);
  }

  private sessionHasRight(right: string): boolean {
    return sessionHasRightRuntime(this.roomSelectionRuntimeHost(), right);
  }

  private clearRoomObjectSelection(release: string): void {
    clearRoomObjectSelectionRuntime(this.roomSelectionRuntimeHost(), release);
  }

  private showSelectedRoomUserInfo(info: { readonly name: string; readonly custom: string; readonly badge: string }, release: string): void {
    showSelectedRoomUserInfoRuntime(this.roomSelectionRuntimeHost(), info, release);
  }

  private showSelectedRoomObjectInfo(info: HabboRoomObjectInfo, release: string): void {
    showSelectedRoomObjectInfoRuntime(this.roomSelectionRuntimeHost(), info, release);
  }

  private showSelectedRoomUserInterface(user: HabboRoomUserRecord, release: string): boolean {
    return showSelectedRoomUserInterfaceRuntime(this.roomSelectionRuntimeHost(), user, release);
  }

  private showSelectedRoomObjectInterface(object: HabboRoomObjectRecord, release: string): boolean {
    return showSelectedRoomObjectInterfaceRuntime(this.roomSelectionRuntimeHost(), object, release);
  }

  private showObjectInterfaceButtons(buttonList: readonly string[], release: string): boolean {
    return showObjectInterfaceButtonsRuntime(this.roomSelectionRuntimeHost(), buttonList, release);
  }

  private handleRoomProcessStep(key: "heightmap" | "users" | "passive" | "Active" | "items", release: string): void {
    handleRoomProcessStepRuntime(this.roomLifecycleHost(), key, release);
  }

  private maybeFinalizeRoomBootstrap(release: string): void {
    maybeFinalizeRoomBootstrapRuntime(this.roomLifecycleHost(), release);
  }

  markRoomLoaderFrameRendered(release: string): boolean {
    return markRoomLoaderFrameRenderedRuntime(this.roomLifecycleHost(), release);
  }

  completePendingRoomBootstrap(release: string): boolean {
    return completePendingRoomBootstrapRuntime(this.roomLifecycleHost(), release);
  }

  private handleRoomUsersPacket(body: string, release: string): boolean {
    return handleRoomUsersPacketRuntime(this.roomUserRuntimeHost(), body, release);
  }

  private handleRoomStatusPacket(body: string, release: string): boolean {
    return handleRoomStatusPacketRuntime(this.roomUserRuntimeHost(), body, release);
  }

  private handleRoomLogoutPacket(body: string, release: string): boolean {
    return handleRoomLogoutPacketRuntime(this.roomUserRuntimeHost(), body, release);
  }

  private prepareRoomActivationAfterInitialStatus(release: string): void {
    prepareRoomActivationAfterInitialStatusRuntime(this.roomLifecycleHost(), release);
  }

  completeRoomActivationAfterPreload(release: string): boolean {
    return completeRoomActivationAfterPreloadRuntime(this.roomLifecycleHost(), release);
  }

  private roomBalloonsRuntimeHost(): HabboRoomBalloonsRuntimeHost {
    return this as unknown as HabboRoomBalloonsRuntimeHost;
  }

  private handleRoomChatPacket(body: string, mode: HabboRoomChatMode, release: string): boolean {
    return handleRoomChatPacketRuntime(this.roomBalloonsRuntimeHost(), body, mode, release);
  }

  private renderRoomChatBalloons(release: string): void {
    return renderRoomChatBalloonsRuntime(this.roomBalloonsRuntimeHost(), release);
  }

  advanceRoomChatBalloons(deltaMs: number, release: string): boolean {
    return advanceRoomChatBalloonsRuntime(this.roomBalloonsRuntimeHost(), deltaMs, release);
  }

  private roomBalloonPositionSignature(messages: readonly HabboRoomChatMessage[], elapsedMs: number): string {
    return roomBalloonPositionSignatureRuntime(this.roomBalloonsRuntimeHost(), messages, elapsedMs);
  }
  private handleRoomPassiveObjectsPacket(body: string, release: string): boolean {
    return handleRoomPassiveObjectsPacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomActiveObjectsPacket(body: string, release: string): boolean {
    return handleRoomActiveObjectsPacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomActiveObjectUpdatePacket(body: string, release: string): boolean {
    return handleRoomActiveObjectUpdatePacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomStuffDataUpdatePacket(body: string, release: string): boolean {
    return handleRoomStuffDataUpdatePacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private ensureDynamicFurnitureCastsForObjects(
    objects: readonly HabboRoomObjectRecord[],
    release: string,
    reason: string
  ): void {
    ensureDynamicFurnitureCastsForObjectsRuntime(this.roomObjectRuntimeHost(), objects, release, reason);
  }

  private ensureDynamicFurnitureCastsForClassNames(
    classNames: readonly string[],
    release: string,
    reason: string
  ): void {
    ensureDynamicFurnitureCastsForClassNamesRuntime(this.roomObjectRuntimeHost(), classNames, release, reason);
  }

  private dynamicFurnitureCastNameForClassName(className: string): string | undefined {
    return dynamicFurnitureCastNameForClassNameRuntime(this.roomObjectRuntimeHost(), className);
  }

  private refreshRoomObjectTimedStates(activeObjects: Readonly<Record<string, HabboRoomObjectRecord>>): void {
    refreshRoomObjectTimedStatesRuntime(this.roomObjectRuntimeHost(), activeObjects);
  }

  private updateRoomObjectTimedState(object: HabboRoomObjectRecord): void {
    updateRoomObjectTimedStateRuntime(this.roomObjectRuntimeHost(), object);
  }

  private roomObjectSourceAnimationForPart(
    object: HabboRoomObjectRecord,
    sourceClassValue: string | undefined,
    part: string
  ): HabboRoomObjectAnimationRecord | undefined {
    return resolveRoomObjectSourceAnimationForPart(
      this.movie.getProperty("roomObjectSourceAnimations"),
      object,
      sourceClassValue,
      part
    );
  }

  private roomObjectTimedStateActive(object: HabboRoomObjectRecord, sourceClassValue: string | undefined): boolean | undefined {
    return resolveRoomObjectTimedStateActive(
      this.movie.getProperty("roomObjectTimedStates"),
      object,
      sourceClassValue
    );
  }

  private handleRoomDoorFlatPacket(body: string, release: string): boolean {
    return handleRoomDoorFlatPacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomTeleporterActivityPacket(packetName: string, body: string, release: string): boolean {
    return handleRoomTeleporterActivityPacketRuntime(this.roomObjectRuntimeHost(), packetName, body, release);
  }

  private handleRoomActiveObjectRemovePacket(body: string, release: string): boolean {
    return handleRoomActiveObjectRemovePacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomItemsPacket(body: string, release: string): boolean {
    return handleRoomItemsPacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomItemUpdatePacket(body: string, release: string): boolean {
    return handleRoomItemUpdatePacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private handleRoomItemRemovePacket(body: string, release: string): boolean {
    return handleRoomItemRemovePacketRuntime(this.roomObjectRuntimeHost(), body, release);
  }

  private renderRoomObjects(release: string): void {
    return renderRoomObjectsRuntime(this.roomObjectRuntimeHost(), release);
  }

  private refreshAnimatedRoomObjectSprites(objects: readonly HabboRoomObjectRecord[], release: string): void {
    return refreshAnimatedRoomObjectSpritesRuntime(this.roomObjectRuntimeHost(), objects, release);
  }

  private resolveRoomObjectMoverBaseBlend(
    plan: HabboRoomObjectSpritePlan,
    mover: HabboRoomObjectMoverPlacement | undefined
  ): number {
    return resolveRoomObjectMoverBaseBlendRuntime(this.roomObjectRuntimeHost(), plan, mover);
  }

  private resolveRoomObjectMoverBaseVisible(
    plan: HabboRoomObjectSpritePlan,
    mover: HabboRoomObjectMoverPlacement | undefined
  ): boolean {
    return resolveRoomObjectMoverBaseVisibleRuntime(this.roomObjectRuntimeHost(), plan, mover);
  }

  private syncRoomObjectAnimationPreloadSprites(release: string): void {
    return syncRoomObjectAnimationPreloadSpritesRuntime(this.roomObjectRuntimeHost(), release);
  }

  private createRoomObjectSpritePlans(
    object: HabboRoomObjectRecord,
    roomData: Readonly<Record<string, string | number>>,
    rectLeft: number,
    rectTop: number,
    release: string,
    privateRoomPatterns: HabboPrivateRoomPatterns = {}
  ): HabboRoomObjectSpritePlan[] {
    return createRoomObjectSpritePlansRuntime(this.roomObjectRuntimeHost(), object, roomData, rectLeft, rectTop, release, privateRoomPatterns);
  }
  private createRoomItemSpritePlans(
    object: HabboRoomObjectRecord,
    roomData: Readonly<Record<string, string | number>>,
    rectLeft: number,
    rectTop: number,
    release: string,
    passivePlans: readonly HabboRoomObjectSpritePlan[]
  ): HabboRoomObjectSpritePlan[] {
    return createRoomItemSpritePlansRuntime(this.roomObjectRuntimeHost(), object, roomData, rectLeft, rectTop, release, passivePlans);
  }

  private resolveRoomItemMemberName(className: string, direction: "leftwall" | "rightwall", itemType: string): string | undefined {
    return resolveRoomItemMemberNameRuntime(className, direction, itemType);
  }

  private resolveRoomObjectPartFrame(object: HabboRoomObjectRecord, part: string, sourceClassValue: string | undefined): number {
    return resolveRoomObjectPartFrameRuntime(this.roomObjectRuntimeHost(), object, part, sourceClassValue);
  }

  private getRoomObjectAnimationFrame(): number {
    return getRoomObjectAnimationFrameRuntime(this.roomObjectRuntimeHost());
  }

  private resolveRoomObjectPartVisible(object: HabboRoomObjectRecord, part: string, sourceClassValue: string | undefined): boolean {
    return resolveRoomObjectPartVisibleRuntime(this.roomObjectRuntimeHost(), object, part, sourceClassValue);
  }

  private previousRoomObjectPartMemberName(object: HabboRoomObjectRecord, part: string): string | undefined {
    return previousRoomObjectPartMemberNameRuntime(this.roomObjectRuntimeHost(), object, part);
  }

  private resolveRoomObjectPartMemberName(
    className: string,
    part: string,
    dimensions: readonly [number, number] | undefined,
    direction: number,
    frame: number
  ): string | undefined {
    return resolveRoomObjectPartMemberNameRuntime(this.roomObjectRuntimeHost(), className, part, dimensions, direction, frame);
  }

  private resolveRoomObjectPartMemberNameExactDirection(
    className: string,
    part: string,
    dimensions: readonly [number, number] | undefined,
    direction: number,
    frame: number
  ): string | undefined {
    return resolveRoomObjectPartMemberNameExactDirectionRuntime(this.roomObjectRuntimeHost(), className, part, dimensions, direction, frame);
  }

  private resolveRoomObjectShadowMemberName(className: string, direction: number): string | undefined {
    return resolveRoomObjectShadowMemberNameRuntime(this.roomObjectRuntimeHost(), className, direction);
  }

  private resolveRoomObjectMemberRef(memberName: string): DirectorMemberRef | undefined {
    return resolveRoomObjectMemberRefRuntime(this.roomObjectRuntimeHost(), memberName);
  }

  private isMirroredRoomObjectMemberAlias(memberName: string): boolean {
    return isMirroredRoomObjectMemberAliasRuntime(this.roomObjectRuntimeHost(), memberName);
  }

  private estimateRoomObjectLocZ(object: HabboRoomObjectRecord, part: string, direction: number): number {
    return estimateRoomObjectLocZRuntime(this.roomObjectRuntimeHost(), object, part, direction);
  }

  private getRoomObjectClassProps(className: string): HabboRoomObjectClassProps {
    return getRoomObjectClassPropsRuntime(this.roomObjectRuntimeHost(), className);
  }

  private estimateRoomObjectZSort(object: HabboRoomObjectRecord, locZ: number): number {
    return estimateRoomObjectZSortRuntime(object, locZ);
  }

  private estimateRoomUserLocZ(screenLocZ: number, user: HabboRoomUserRecord, canvas: HabboHumanCanvasSpec): number {
    return estimateRoomUserLocZRuntime(screenLocZ, user, canvas);
  }

  private resolveRoomHumanCanvasSpec(factorX: number, mode = "std"): HabboHumanCanvasSpec {
    return resolveRoomHumanCanvasSpecRuntime(this.figureRuntimeHost(), factorX, mode);
  }

  private renderRoomUsers(release: string): void {
    return renderRoomUsersRuntime(this.roomUserRuntimeHost(), release);
  }

  private syncRoomFigurePreloadPaths(roomUsers: readonly HabboRoomUserRecord[], release: string, canvas: HabboHumanCanvasSpec): void {
    syncRoomFigurePreloadPathsRuntime(this.figureRuntimeHost(), roomUsers, release, canvas);
  }

  private syncActiveFigurePreloadPaths(release: string): void {
    syncActiveFigurePreloadPathsRuntime(this.figureRuntimeHost(), release);
  }

  private resolveRoomUserScreenPosition(
    user: HabboRoomUserRecord,
    roomData: Readonly<Record<string, string | number>>,
    rectLeft: number,
    rectTop: number
  ): { readonly screen: HabboRoomCoordinate; readonly moving: boolean } {
    return resolveRoomUserScreenPositionRuntime(this.roomUserRuntimeHost(), user, roomData, rectLeft, rectTop);
  }

  private leaveEntry(release: string): boolean {
    return leaveEntryRuntime(this.roomLifecycleHost(), release);
  }

  private enterEntry(release: string): boolean {
    return enterEntryRuntime(this.roomLifecycleHost(), release);
  }

  private leaveRoom(release: string, jumpingToSubUnit = false): boolean {
    return leaveRoomRuntime(this.roomLifecycleHost(), release, jumpingToSubUnit);
  }

  private queueRoomRequest(request: Omit<HabboRoomRequest, "id" | "status">, release: string): void {
    queueRoomRequestRuntime(this.roomLifecycleHost(), request, release);
  }

  private getRoomCommonCastEntries(): readonly string[] {
    return getRoomCommonCastEntriesRuntime(this.externalCastRuntimeHost());
  }

  private readCastListVariable(name: string): readonly string[] {
    return readCastListVariableRuntime(this.externalCastRuntimeHost(), name);
  }

  private activateScrollbarElement(elementId: string, release: string, activation?: HabboWindowElementActivation): boolean {
    return activateScrollbarElementRuntime(this.windowRuntimeHost(), elementId, release, activation);
  }

  activateLoginElement(elementId: string, release: string): boolean {
    return activateLoginElementRuntime(this.entryHotelViewRuntimeHost(), elementId, release);
  }

  private activateRegistrationElement(elementId: string, release: string): boolean {
    return activateRegistrationElementRuntime(this.editHabboRuntimeHost(), elementId, release);
  }

  private changeRegistrationPage(delta: number, release: string): boolean {
    return changeRegistrationPageRuntime(this.editHabboRuntimeHost(), delta, release);
  }

  private showRegistrationAlert(release: string, msg: string, id = "problems", title = "alert_reg_t"): boolean {
    return showRegistrationAlertRuntime(this.editHabboRuntimeHost(), release, msg, id, title);
  }

  private setRegistrationProp(name: string, value: unknown): void {
    setRegistrationPropRuntime(this.editHabboRuntimeHost(), name, value);
  }

  private getRegistrationProp(name: string): unknown {
    return getRegistrationPropRuntime(this.editHabboRuntimeHost(), name);
  }

  private toggleRegistrationProp(name: string): void {
    toggleRegistrationPropRuntime(this.editHabboRuntimeHost(), name);
  }

  private getWindowScrollOffset(window: HabboWindowRecord, clientId: string): number {
    return getWindowScrollOffsetRuntime(this.windowRuntimeHost(), window, clientId);
  }

  private setWindowScrollOffset(window: HabboWindowRecord, clientId: string, offset: number): void {
    setWindowScrollOffsetRuntime(this.windowRuntimeHost(), window, clientId, offset);
  }

  private syncWindowFieldValueSnapshot(): void {
    syncWindowFieldValueSnapshotRuntime(this.windowRuntimeHost());
  }

  private getIntVariable(name: string, fallback: number): number {
    return getIntVariableRuntime(this.externalCastRuntimeHost(), name, fallback);
  }

  private getBoolVariable(name: string): boolean {
    return getBoolVariableRuntime(this.externalCastRuntimeHost(), name);
  }

  private getSequentialCastEntries(release: string): readonly string[] {
    return getSequentialCastEntriesRuntime(this.externalCastRuntimeHost(), release);
  }

  private applyCastEntryCompatibility(release: string, castList: readonly string[]): readonly string[] {
    return applyCastEntryCompatibilityRuntime(this.externalCastRuntimeHost(), release, castList);
  }

  private getSourceBackedCastEntryFallback(release: string): readonly string[] {
    return getSourceBackedCastEntryFallbackRuntime(this.externalCastRuntimeHost(), release);
  }

  private getEntryVisualCastEntryFallback(
    release: string,
    orderedThreadCasts: readonly string[]
  ): { readonly castName: string; readonly source: string; readonly reason: string } | undefined {
    return getEntryVisualCastEntryFallbackRuntime(this.externalCastRuntimeHost(), release, orderedThreadCasts);
  }

  private getEntryVisualLocaleHint(): string | undefined {
    return getEntryVisualLocaleHintRuntime(this.externalCastRuntimeHost());
  }

  private findEntryVisualCandidateForLocale(
    candidates: readonly HabboExternalCastVisualLayout[],
    locale: string
  ): HabboExternalCastVisualLayout | undefined {
    return findEntryVisualCandidateForLocaleRuntime(candidates, locale);
  }

  private startCastLoad(castList: readonly string[], priority: number, release: string): number {
    return startCastLoadRuntime(this.externalCastRuntimeHost(), castList, priority, release);
  }

  private dumpImportedCastVariableIndexes(
    imports: readonly { readonly castName: string; readonly castLib: number; readonly memberCount: number }[],
    release: string
  ): readonly { readonly castName: string; readonly propertyCount: number }[] {
    return dumpImportedCastVariableIndexesRuntime(this.externalCastRuntimeHost(), imports, release);
  }

  private importResolvedExternalCasts(assignments: readonly { readonly castName: string; readonly castLib: number }[]): readonly {
    readonly castName: string;
    readonly castLib: number;
    readonly memberCount: number;
  }[] {
    return importResolvedExternalCastsRuntime(this.externalCastRuntimeHost(), assignments);
  }

  private assignDynamicCastSlots(castList: readonly string[]): readonly { readonly castName: string; readonly castLib: number }[] {
    return assignDynamicCastSlotsRuntime(this.externalCastRuntimeHost(), castList);
  }

  private getAvailableDynamicCastSlots(): number[] {
    return getAvailableDynamicCastSlotsRuntime(this.externalCastRuntimeHost());
  }

  private resolveExternalCast(castName: string): HabboExternalCastEntry | undefined {
    return resolveExternalCastRuntime(this.externalCastRuntimeHost(), castName);
  }

  private getBitmapAsset(castName: string, member: number, paletteName?: string, preferredVersionId?: string): HabboWindowBitmapAsset | undefined {
    return getBitmapAssetRuntime(this.externalCastRuntimeHost(), castName, member, paletteName, preferredVersionId);
  }

  private getBitmapAssetCandidates(
    sourceId: string,
    assets: readonly HabboWindowBitmapAsset[] | undefined,
    normalizedCastName: string,
    member: number
  ): readonly HabboWindowBitmapAsset[] {
    return getBitmapAssetCandidatesRuntime(this.externalCastRuntimeHost(), sourceId, assets, normalizedCastName, member);
  }

  private getBitmapAssetCandidatesByMemberName(
    sourceId: string,
    assets: readonly HabboWindowBitmapAsset[] | undefined,
    normalizedMemberName: string
  ): readonly HabboWindowBitmapAsset[] {
    return getBitmapAssetCandidatesByMemberNameRuntime(this.externalCastRuntimeHost(), sourceId, assets, normalizedMemberName);
  }

  private castExists(castName: string): boolean {
    return castExistsRuntime(this.externalCastRuntimeHost(), castName);
  }

  private removeMemberByName(memberName: string, release: string): void {
    removeMemberByNameRuntime(this.externalCastRuntimeHost(), memberName, release);
  }

  private showLogo(release: string): boolean {
    return showLogoRuntime(this.externalCastRuntimeHost(), release);
  }

  private hideLogo(release: string): boolean {
    return hideLogoRuntime(this.externalCastRuntimeHost(), release);
  }

  private resolveLoaderLogoAsset(): ReturnType<typeof resolveLoaderLogoAssetRuntime> {
    return resolveLoaderLogoAssetRuntime(this.externalCastRuntimeHost());
  }

  private getMoviePath(): string {
    return getMoviePathRuntime(this.externalCastRuntimeHost());
  }

  startClient(release: string): boolean {
    return startClientRuntime(this.threadConstructorHost(), release);
  }
  stopClient(release: string): boolean {
    return stopClientRuntime(this.threadConstructorHost(), release);
  }
  private recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void {
    const seenKey = `habbo.boot.unsupported.${key}`;
    if (this.movie.getProperty(seenKey)) {
      return;
    }

    this.movie.setProperty(seenKey, true);
    this.movie.unsupported.add(entry);
    this.logDebug("unsupported", "warn", `${entry.feature}: ${entry.detail}`);
  }
  private logDebug(channel: string, level: "info" | "ok" | "warn" | "error", message: string, data?: unknown): void {
    this.movie.debugLog.add(channel, level, message, data);
  }

  private getText(key: string): string | undefined {
    return getTextRuntime(this.externalCastRuntimeHost(), key);
  }
}

export function getHabboBootServices(movie: DirectorMovie): HabboBootServices {
  const existing = movie.getProperty(servicesProperty);
  if (existing instanceof HabboBootServices) {
    return existing;
  }

  const services = new HabboBootServices(movie);
  movie.setProperty(servicesProperty, services);
  return services;
}


