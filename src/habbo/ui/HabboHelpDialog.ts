export const HABBO_HELP_TITLE_KEY = "win_help";
export const HABBO_HELP_FALLBACK_TITLE = "Help";
export const HABBO_HELP_LAYOUT = "habbo_help.window";
export const HABBO_CALL_FOR_HELP_TITLE_KEY = "win_callforhelp";
export const HABBO_CALL_FOR_HELP_FALLBACK_TITLE = "Alert a Hobba";
export const HABBO_CALL_FOR_HELP_LAYOUT = "habbo_hobba_compose.window";
export const HABBO_CALL_FOR_HELP_SENT_LAYOUT = "habbo_hobba_alertsent.window";

export function collectHelpTopics(getText: (key: string) => string | undefined): readonly string[] {
  const topics: string[] = [];
  for (let index = 1; ; index++) {
    const text = getText(`help_txt_${index}`);
    if (text === undefined) {
      break;
    }
    topics.push(text);
  }
  return topics;
}

export function helpTopicUrlKeyFromLocalY(localY: number | undefined): string | undefined {
  if (localY === undefined || !Number.isFinite(localY)) {
    return undefined;
  }

  return `url_help_${Math.max(1, Math.floor(localY / 14) + 1)}`;
}
