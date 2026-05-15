import type { DirectorMovie } from "../../../runtime";
import { showRelease1EntryAlert } from "./HabboV1EntryAlerts";

export interface Release1EntryRegistrationNameFields {
  readonly characterName: string;
}

export interface Release1EntryRegistrationNameCheckHost<TFields extends Release1EntryRegistrationNameFields> {
  readonly characterNameElementId: string;
  readonly source: string;
  readFields(movie: DirectorMovie): TFields;
  applyFields(movie: DirectorMovie, fields: TFields): void;
  resetRegistrationForm(movie: DirectorMovie): void;
}

export function sanitizeRelease1EntryRegistrationName(movie: DirectorMovie, value: string): string {
  const permitted = movie.cast.getMemberByName("permittedNameChars")?.text?.split(/\r\n|\r|\n/)
    .filter((line) => line.length > 0);
  const normalized = value.replace(/[\r\n]+/g, "").replace(/\s+/g, "");
  return permitted && permitted.length > 0
    ? [...normalized].filter((char) => permitted.includes(char)).join("")
    : normalized;
}

export function queueRelease1EntryRegistrationNameCheckRuntime<TFields extends Release1EntryRegistrationNameFields>(
  movie: DirectorMovie,
  elementId: string,
  host: Release1EntryRegistrationNameCheckHost<TFields>
): boolean {
  if (elementId !== host.characterNameElementId) {
    return false;
  }

  const fields = host.readFields(movie);
  if (fields.characterName.length < 3) {
    clearRelease1EntryRegistrationName(movie, fields, host, "YourNameIstooShort");
    movie.debugLog.add("login", "warn", "release1 registration name too short");
    return true;
  }

  if (movie.getProperty("release1EntryRegistrationLastNameSearch") === fields.characterName) {
    return true;
  }

  const request = {
    name: fields.characterName,
    status: "pending",
    source: host.source
  };
  movie.setProperty("release1EntryRegistrationNameAvailabilityCheck", {
    ...request,
    command: "FINDUSER"
  });
  movie.setProperty("release1EntryRegistrationNameApprovalCheck", {
    ...request,
    command: "APPROVENAME"
  });
  movie.setProperty("release1EntryRegistrationLastNameSearch", fields.characterName);
  movie.debugLog.add("login", "info", `release1 registration name check queued name=${fields.characterName}`);
  return true;
}

export function completeRelease1EntryRegistrationNamePacketRuntime<TFields extends Release1EntryRegistrationNameFields>(
  movie: DirectorMovie,
  packetName: string,
  body: string,
  host: Release1EntryRegistrationNameCheckHost<TFields>
): boolean {
  if (packetName === "NAME_APPROVED") {
    const request = readRecord(movie.getProperty("release1EntryRegistrationNameApprovalCheck"));
    movie.setProperty("release1EntryRegistrationNameApprovalCheck", {
      ...request,
      command: "APPROVENAME",
      status: "approved",
      source: host.source
    });
    movie.debugLog.add("login", "ok", "release1 registration name approved");
    return true;
  }

  if (packetName === "NAME_UNACCEPTABLE" || packetName === "BADNAME") {
    rejectRelease1EntryRegistrationName(movie, host, "unacceptableName");
    return true;
  }

  if (packetName === "MEMBERINFO" && isRelease1RegistrationNameContext(movie)) {
    rejectRelease1EntryRegistrationName(movie, host, "NameAlreadyUse");
    movie.setProperty("release1EntryRegistrationNameAvailabilityCheck", {
      command: "FINDUSER",
      status: "taken",
      body,
      source: host.source
    });
    host.resetRegistrationForm(movie);
    return true;
  }

  if (packetName === "NOSUCHUSER" && isRelease1RegistrationNameContext(movie)) {
    const request = readRecord(movie.getProperty("release1EntryRegistrationNameAvailabilityCheck"));
    movie.setProperty("release1EntryRegistrationNameAvailabilityCheck", {
      ...request,
      command: "FINDUSER",
      status: "available",
      source: host.source
    });
    movie.debugLog.add("login", "ok", "release1 registration name not found");
    return true;
  }

  if (packetName === "ERROR" && body.toLowerCase().includes("user exists")) {
    rejectRelease1EntryRegistrationName(movie, host, "NameAlreadyUse");
    return true;
  }

  return false;
}

function rejectRelease1EntryRegistrationName<TFields extends Release1EntryRegistrationNameFields>(
  movie: DirectorMovie,
  host: Release1EntryRegistrationNameCheckHost<TFields>,
  alert: string
): void {
  clearRelease1EntryRegistrationName(movie, host.readFields(movie), host, alert);
  movie.debugLog.add("login", "warn", `release1 registration name rejected alert=${alert}`);
}

function clearRelease1EntryRegistrationName<TFields extends Release1EntryRegistrationNameFields>(
  movie: DirectorMovie,
  fields: TFields,
  host: Release1EntryRegistrationNameCheckHost<TFields>,
  alert: string
): void {
  host.applyFields(movie, { ...fields, characterName: "" });
  movie.setProperty("release1EntryRegistrationAlert", { alerts: [alert], source: host.source });
  showRelease1EntryAlert(movie, alert, undefined, "", [host.source]);
  movie.setProperty("release1EntryRegistrationLastNameSearch", "");
}

function isRelease1RegistrationNameContext(movie: DirectorMovie): boolean {
  const regist = movie.score.getMarker("regist_2")?.frame;
  const figure = movie.score.getMarker("figure")?.frame;
  return movie.currentFrameIndex === regist
    || movie.currentFrameIndex === figure
    || readRecord(movie.getProperty("release1EntryRegistrationNameAvailabilityCheck"))?.status === "sent";
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}
