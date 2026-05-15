import type { DirectorMovie } from "../../../runtime";
import { release1EntrySourcePaths } from "./HabboV1EntrySources";

export const release1EntryAlertSources = {
  alertHandler: release1EntrySourcePaths.alertHandler,
  alertParent: release1EntrySourcePaths.alertParent,
  epConnectionScripts: release1EntrySourcePaths.epConnectionScripts
} as const;

export interface Release1EntryAlertState {
  readonly alertId: string;
  readonly message: string;
  readonly body: string;
  readonly source: readonly string[];
}

export interface Release1DirectorAlertState {
  readonly alertId: string;
  readonly message: string;
  readonly body: string;
  readonly visible: boolean;
  readonly source: readonly string[];
}

export function showRelease1EntryAlert(
  movie: DirectorMovie,
  alertId: string,
  optionalMessage: string | undefined,
  body: string,
  source: readonly string[] = [release1EntryAlertSources.epConnectionScripts, release1EntryAlertSources.alertHandler]
): Release1EntryAlertState {
  const message = release1AlertMessage(movie, alertId, optionalMessage);
  const state: Release1EntryAlertState = {
    alertId,
    message,
    body,
    source
  };
  const directorAlert: Release1DirectorAlertState = {
    ...state,
    visible: true,
    source: [release1EntryAlertSources.alertHandler, release1EntryAlertSources.alertParent, ...source]
  };
  movie.setProperty("release1EntryAlert", state);
  movie.setProperty("release1DirectorAlert", directorAlert);
  movie.setProperty("release1DirectorAlertQueue", [
    ...readRelease1DirectorAlertQueue(movie),
    directorAlert
  ]);
  movie.debugLog.add("windows", "warn", `release1 ShowAlert ${alertId}`);
  return state;
}

export function release1AlertMessage(movie: DirectorMovie, alertId: string, optionalMessage: string | undefined): string {
  const alertMessages = movie.cast.getMemberByName("AlertMessages")?.text;
  if (!alertMessages) {
    return optionalMessage ?? alertId;
  }

  const normalizedAlertId = alertId.toLowerCase();
  for (const line of alertMessages.split(/\r\n|\r|\n/)) {
    const separator = line.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (!key.toLowerCase().includes(normalizedAlertId)) {
      continue;
    }

    if (alertId === "MessageFromAdmin") {
      return optionalMessage ?? "";
    }
    if (alertId === "ModeratorWarning") {
      return `${line.slice(separator + 1).trim()} ${optionalMessage ?? ""}`.trim();
    }
    return line.slice(separator + 1).trim();
  }

  return optionalMessage ?? alertId;
}

function readRelease1DirectorAlertQueue(movie: DirectorMovie): readonly Release1DirectorAlertState[] {
  const value = movie.getProperty("release1DirectorAlertQueue");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRelease1DirectorAlertState);
}

function isRelease1DirectorAlertState(value: unknown): value is Release1DirectorAlertState {
  return typeof value === "object"
    && value !== null
    && "alertId" in value
    && "message" in value
    && "visible" in value;
}
