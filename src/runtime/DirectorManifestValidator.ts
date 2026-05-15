import type { DirectorMemberType } from "./DirectorMember";
import type { DirectorMovieManifest } from "./DirectorMovie";

export interface DirectorManifestValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface DirectorManifestValidationResult {
  readonly valid: boolean;
  readonly issues: readonly DirectorManifestValidationIssue[];
  readonly manifest?: DirectorMovieManifest;
}

export class DirectorManifestValidationError extends Error {
  readonly issues: readonly DirectorManifestValidationIssue[];

  constructor(issues: readonly DirectorManifestValidationIssue[]) {
    super(`Invalid Director movie manifest: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    this.name = "DirectorManifestValidationError";
    this.issues = issues;
  }
}

const memberTypes = new Set<DirectorMemberType>([
  "bitmap",
  "text",
  "field",
  "sound",
  "script",
  "palette",
  "shape",
  "unknown"
]);

export function validateDirectorMovieManifest(input: unknown): DirectorManifestValidationResult {
  const issues: DirectorManifestValidationIssue[] = [];
  const memberRefs = new Set<string>();

  if (!isRecord(input)) {
    return invalid([{ path: "$", message: "manifest must be an object" }]);
  }

  requireString(input, "id", "$.id", issues);
  requireString(input, "name", "$.name", issues);

  validateStage(input["stage"], "$.stage", issues);
  validateCasts(input["casts"], "$.casts", issues, memberRefs);
  validateScore(input["score"], "$.score", issues, memberRefs);

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    valid: true,
    issues: [],
    manifest: input as unknown as DirectorMovieManifest
  };
}

export function assertDirectorMovieManifest(input: unknown): asserts input is DirectorMovieManifest {
  const result = validateDirectorMovieManifest(input);
  if (!result.valid) {
    throw new DirectorManifestValidationError(result.issues);
  }
}

function validateStage(input: unknown, path: string, issues: DirectorManifestValidationIssue[]): void {
  if (!isRecord(input)) {
    addIssue(issues, path, "stage must be an object");
    return;
  }

  requirePositiveInteger(input, "width", `${path}.width`, issues);
  requirePositiveInteger(input, "height", `${path}.height`, issues);
  optionalString(input, "backgroundColor", `${path}.backgroundColor`, issues);
}

function validateCasts(
  input: unknown,
  path: string,
  issues: DirectorManifestValidationIssue[],
  memberRefs: Set<string>
): void {
  if (!Array.isArray(input)) {
    addIssue(issues, path, "casts must be an array");
    return;
  }

  const castNumbers = new Set<number>();
  input.forEach((cast, castIndex) => {
    const castPath = `${path}[${castIndex}]`;
    if (!isRecord(cast)) {
      addIssue(issues, castPath, "cast library must be an object");
      return;
    }

    const castNumber = requirePositiveInteger(cast, "number", `${castPath}.number`, issues);
    if (castNumber !== undefined) {
      if (castNumbers.has(castNumber)) {
        addIssue(issues, `${castPath}.number`, `duplicate cast library ${castNumber}`);
      }

      castNumbers.add(castNumber);
    }

    optionalString(cast, "name", `${castPath}.name`, issues);
    optionalString(cast, "fileName", `${castPath}.fileName`, issues);
    optionalPositiveInteger(cast, "preloadMode", `${castPath}.preloadMode`, issues);

    validateMembers(cast["members"], `${castPath}.members`, issues, memberRefs, castNumber);
  });
}

function validateMembers(
  input: unknown,
  path: string,
  issues: DirectorManifestValidationIssue[],
  memberRefs: Set<string>,
  castNumber: number | undefined
): void {
  if (!Array.isArray(input)) {
    addIssue(issues, path, "members must be an array");
    return;
  }

  const memberNumbers = new Set<number>();
  input.forEach((member, memberIndex) => {
    const memberPath = `${path}[${memberIndex}]`;
    if (!isRecord(member)) {
      addIssue(issues, memberPath, "member must be an object");
      return;
    }

    const memberNumber = requirePositiveInteger(member, "number", `${memberPath}.number`, issues);
    if (memberNumber !== undefined) {
      if (memberNumbers.has(memberNumber)) {
        addIssue(issues, `${memberPath}.number`, `duplicate member ${memberNumber}`);
      }

      memberNumbers.add(memberNumber);
      if (castNumber !== undefined) {
        memberRefs.add(makeMemberKey(castNumber, memberNumber));
      }
    }

    const type = member["type"];
    if (typeof type !== "string" || !memberTypes.has(type as DirectorMemberType)) {
      addIssue(issues, `${memberPath}.type`, "member type is unsupported or missing");
    }

    optionalString(member, "name", `${memberPath}.name`, issues);
    optionalPositiveInteger(member, "width", `${memberPath}.width`, issues);
    optionalPositiveInteger(member, "height", `${memberPath}.height`, issues);
    optionalString(member, "shapeType", `${memberPath}.shapeType`, issues);
    optionalFiniteNumber(member, "shapeFillType", `${memberPath}.shapeFillType`, issues);
    optionalFiniteNumber(member, "shapeLineThickness", `${memberPath}.shapeLineThickness`, issues);
    optionalString(member, "color", `${memberPath}.color`, issues);
    optionalString(member, "backgroundColor", `${memberPath}.backgroundColor`, issues);
    optionalString(member, "text", `${memberPath}.text`, issues);
    optionalPositiveNumber(member, "fontSize", `${memberPath}.fontSize`, issues);
    optionalString(member, "fontFamily", `${memberPath}.fontFamily`, issues);
    optionalString(member, "fontWeight", `${memberPath}.fontWeight`, issues);
    optionalString(member, "fontStyle", `${memberPath}.fontStyle`, issues);
    optionalTextAlign(member, "textAlign", `${memberPath}.textAlign`, issues);
    optionalPositiveNumber(member, "lineHeight", `${memberPath}.lineHeight`, issues);
    optionalBoolean(member, "wordWrap", `${memberPath}.wordWrap`, issues);
    optionalTextSpans(member["textSpans"], `${memberPath}.textSpans`, issues);
    optionalBoolean(member, "editable", `${memberPath}.editable`, issues);
    optionalString(member, "assetPath", `${memberPath}.assetPath`, issues);
    optionalStringRecord(member, "inkAssetPaths", `${memberPath}.inkAssetPaths`, issues);
    optionalPoint(member, "regPoint", `${memberPath}.regPoint`, issues);
  });
}

function validateScore(
  input: unknown,
  path: string,
  issues: DirectorManifestValidationIssue[],
  memberRefs: Set<string>
): void {
  if (!isRecord(input)) {
    addIssue(issues, path, "score must be an object");
    return;
  }

  optionalMarkers(input["markers"], `${path}.markers`, issues);
  optionalBehaviors(input["behaviors"], `${path}.behaviors`, issues, memberRefs);
  requirePositiveNumber(input, "frameRate", `${path}.frameRate`, issues);

  const frames = input["frames"];
  if (!Array.isArray(frames) || frames.length === 0) {
    addIssue(issues, `${path}.frames`, "frames must be a non-empty array");
    return;
  }

  const frameIndexes = new Set<number>();
  frames.forEach((frame, frameArrayIndex) => {
    const framePath = `${path}.frames[${frameArrayIndex}]`;
    if (!isRecord(frame)) {
      addIssue(issues, framePath, "frame must be an object");
      return;
    }

    const frameIndex = requirePositiveInteger(frame, "index", `${framePath}.index`, issues);
    if (frameIndex !== undefined) {
      if (frameIndexes.has(frameIndex)) {
        addIssue(issues, `${framePath}.index`, `duplicate frame ${frameIndex}`);
      }

      frameIndexes.add(frameIndex);
    }

    validateSprites(frame["sprites"], `${framePath}.sprites`, issues, memberRefs);
    validateFrameScripts(frame["scripts"], `${framePath}.scripts`, issues);
  });
}

function optionalBehaviors(
  input: unknown,
  path: string,
  issues: DirectorManifestValidationIssue[],
  memberRefs: Set<string>
): void {
  if (input === undefined) {
    return;
  }

  if (!Array.isArray(input)) {
    addIssue(issues, path, "behaviors must be an array when present");
    return;
  }

  input.forEach((behavior, behaviorIndex) => {
    const behaviorPath = `${path}[${behaviorIndex}]`;
    if (!isRecord(behavior)) {
      addIssue(issues, behaviorPath, "behavior interval must be an object");
      return;
    }

    const startFrame = requirePositiveInteger(behavior, "startFrame", `${behaviorPath}.startFrame`, issues);
    const endFrame = requirePositiveInteger(behavior, "endFrame", `${behaviorPath}.endFrame`, issues);
    if (startFrame !== undefined && endFrame !== undefined && endFrame < startFrame) {
      addIssue(issues, `${behaviorPath}.endFrame`, "must be greater than or equal to startFrame");
    }

    requireNonNegativeInteger(behavior, "channel", `${behaviorPath}.channel`, issues);
    validateMemberRef(behavior["script"], `${behaviorPath}.script`, issues, memberRefs);
    optionalRecord(behavior["properties"], `${behaviorPath}.properties`, issues);
    optionalNonNegativeInteger(behavior, "propertiesEntry", `${behaviorPath}.propertiesEntry`, issues);
  });
}

function validateFrameScripts(input: unknown, path: string, issues: DirectorManifestValidationIssue[]): void {
  if (input === undefined) {
    return;
  }

  if (!Array.isArray(input)) {
    addIssue(issues, path, "frame scripts must be an array when present");
    return;
  }

  input.forEach((script, scriptIndex) => {
    const scriptPath = `${path}[${scriptIndex}]`;
    if (!isRecord(script)) {
      addIssue(issues, scriptPath, "frame script reference must be an object");
      return;
    }

    requireString(script, "scriptId", `${scriptPath}.scriptId`, issues);
    requireString(script, "event", `${scriptPath}.event`, issues);
    optionalString(script, "handler", `${scriptPath}.handler`, issues);
  });
}

function optionalMarkers(input: unknown, path: string, issues: DirectorManifestValidationIssue[]): void {
  if (input === undefined) {
    return;
  }

  if (!Array.isArray(input)) {
    addIssue(issues, path, "markers must be an array when present");
    return;
  }

  const names = new Set<string>();
  input.forEach((marker, markerIndex) => {
    const markerPath = `${path}[${markerIndex}]`;
    if (!isRecord(marker)) {
      addIssue(issues, markerPath, "marker must be an object");
      return;
    }

    const name = requireString(marker, "name", `${markerPath}.name`, issues);
    if (name !== undefined) {
      const normalized = name.toLowerCase();
      if (names.has(normalized)) {
        addIssue(issues, `${markerPath}.name`, `duplicate marker ${name}`);
      }

      names.add(normalized);
    }

    requirePositiveInteger(marker, "frame", `${markerPath}.frame`, issues);
  });
}

function validateSprites(
  input: unknown,
  path: string,
  issues: DirectorManifestValidationIssue[],
  memberRefs: Set<string>
): void {
  if (!Array.isArray(input)) {
    addIssue(issues, path, "sprites must be an array");
    return;
  }

  const channels = new Set<number>();
  input.forEach((sprite, spriteIndex) => {
    const spritePath = `${path}[${spriteIndex}]`;
    if (!isRecord(sprite)) {
      addIssue(issues, spritePath, "sprite must be an object");
      return;
    }

    const channel = requirePositiveInteger(sprite, "channel", `${spritePath}.channel`, issues);
    if (channel !== undefined) {
      if (channels.has(channel)) {
        addIssue(issues, `${spritePath}.channel`, `duplicate sprite channel ${channel}`);
      }

      channels.add(channel);
    }

    validateMemberRef(sprite["member"], `${spritePath}.member`, issues, memberRefs);
    requirePoint(sprite["loc"], `${spritePath}.loc`, issues);
    optionalPositiveInteger(sprite, "width", `${spritePath}.width`, issues);
    optionalPositiveInteger(sprite, "height", `${spritePath}.height`, issues);
    optionalBoolean(sprite, "visible", `${spritePath}.visible`, issues);
    optionalFiniteNumber(sprite, "ink", `${spritePath}.ink`, issues);
    optionalFiniteNumber(sprite, "blend", `${spritePath}.blend`, issues);
    optionalString(sprite, "fgColor", `${spritePath}.fgColor`, issues);
    optionalString(sprite, "bgColor", `${spritePath}.bgColor`, issues);
    optionalString(sprite, "textColorSource", `${spritePath}.textColorSource`, issues);
    if (sprite["textColorSource"] !== undefined && sprite["textColorSource"] !== "member" && sprite["textColorSource"] !== "sprite") {
      addIssue(issues, `${spritePath}.textColorSource`, "expected member or sprite");
    }
  });
}

function validateMemberRef(
  input: unknown,
  path: string,
  issues: DirectorManifestValidationIssue[],
  memberRefs: Set<string>
): void {
  if (!isRecord(input)) {
    addIssue(issues, path, "member reference must be an object");
    return;
  }

  const castLib = requirePositiveInteger(input, "castLib", `${path}.castLib`, issues);
  const member = requirePositiveInteger(input, "member", `${path}.member`, issues);
  if (castLib !== undefined && member !== undefined && !memberRefs.has(makeMemberKey(castLib, member))) {
    addIssue(issues, path, `unknown member reference ${castLib}:${member}`);
  }
}

function requirePoint(input: unknown, path: string, issues: DirectorManifestValidationIssue[]): void {
  if (!isRecord(input)) {
    addIssue(issues, path, "point must be an object");
    return;
  }

  requireFiniteNumber(input, "x", `${path}.x`, issues);
  requireFiniteNumber(input, "y", `${path}.y`, issues);
}

function optionalPoint(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined) {
    requirePoint(value, path, issues);
  }
}

function requireString(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): string | undefined {
  const value = input[property];
  if (typeof value !== "string" || value.length === 0) {
    addIssue(issues, path, "must be a non-empty string");
    return undefined;
  }

  return value;
}

function optionalString(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && typeof value !== "string") {
    addIssue(issues, path, "must be a string when present");
  }
}

function optionalStringRecord(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object when present");
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key.length === 0 || typeof entry !== "string") {
      addIssue(issues, `${path}.${key}`, "must map non-empty keys to strings");
    }
  }
}

function optionalRecord(value: unknown, path: string, issues: DirectorManifestValidationIssue[]): void {
  if (value !== undefined && !isRecord(value)) {
    addIssue(issues, path, "must be an object when present");
  }
}

function optionalTextAlign(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && value !== "left" && value !== "center" && value !== "right") {
    addIssue(issues, path, "must be left, center, or right when present");
  }
}

function requirePositiveInteger(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): number | undefined {
  const value = input[property];
  if (!Number.isInteger(value) || (value as number) <= 0) {
    addIssue(issues, path, "must be a positive integer");
    return undefined;
  }

  return value as number;
}

function requireNonNegativeInteger(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): number | undefined {
  const value = input[property];
  if (!Number.isInteger(value) || (value as number) < 0) {
    addIssue(issues, path, "must be a non-negative integer");
    return undefined;
  }

  return value as number;
}

function optionalPositiveInteger(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && (!Number.isInteger(value) || (value as number) <= 0)) {
    addIssue(issues, path, "must be a positive integer when present");
  }
}

function optionalNonNegativeInteger(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && (!Number.isInteger(value) || (value as number) < 0)) {
    addIssue(issues, path, "must be a non-negative integer when present");
  }
}

function requirePositiveNumber(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    addIssue(issues, path, "must be a positive number");
  }
}

function optionalPositiveNumber(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value <= 0)) {
    addIssue(issues, path, "must be a positive number when present");
  }
}

function requireFiniteNumber(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    addIssue(issues, path, "must be a finite number");
  }
}

function optionalFiniteNumber(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
    addIssue(issues, path, "must be a finite number when present");
  }
}

function optionalBoolean(
  input: Record<string, unknown>,
  property: string,
  path: string,
  issues: DirectorManifestValidationIssue[]
): void {
  const value = input[property];
  if (value !== undefined && typeof value !== "boolean") {
    addIssue(issues, path, "must be a boolean when present");
  }
}

function optionalTextSpans(value: unknown, path: string, issues: DirectorManifestValidationIssue[]): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    addIssue(issues, path, "must be an array when present");
    return;
  }

  value.forEach((span, index) => {
    const spanPath = `${path}[${index}]`;
    if (!isRecord(span)) {
      addIssue(issues, spanPath, "text span must be an object");
      return;
    }

    requireFiniteNumber(span, "start", `${spanPath}.start`, issues);
    requireFiniteNumber(span, "end", `${spanPath}.end`, issues);
    optionalString(span, "color", `${spanPath}.color`, issues);
    optionalString(span, "fontFamily", `${spanPath}.fontFamily`, issues);
    optionalPositiveNumber(span, "fontSize", `${spanPath}.fontSize`, issues);
    optionalString(span, "fontWeight", `${spanPath}.fontWeight`, issues);
    optionalString(span, "fontStyle", `${spanPath}.fontStyle`, issues);
    optionalBoolean(span, "underline", `${spanPath}.underline`, issues);
  });
}

function addIssue(issues: DirectorManifestValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function invalid(issues: readonly DirectorManifestValidationIssue[]): DirectorManifestValidationResult {
  return {
    valid: false,
    issues
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeMemberKey(castLib: number, member: number): string {
  return `${castLib}:${member}`;
}
