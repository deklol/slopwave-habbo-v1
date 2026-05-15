export const HABBO_PURSE_TITLE_KEY = "win_purse";
export const HABBO_PURSE_FALLBACK_TITLE = "Habbo Purse";
export const HABBO_PURSE_LAYOUT = "purse.window";
export const HABBO_PURSE_TEMPLATE = "habbo_full.window";
export const HABBO_PURSE_TRANSACTIONS_LAYOUT = "PurseTransactions.window";
export const HABBO_PURSE_TRANSACTIONS_NO_VALUE_LAYOUT = "PurseTransactions2.window";
export const HABBO_PURSE_NO_TRANSACTIONS_LAYOUT = "PurseNoTransactions.window";
export const HABBO_PURSE_VOUCHER_TITLE_KEY = "win_voucher";
export const HABBO_PURSE_VOUCHER_FALLBACK_TITLE = "Habbo Credit Code";
export const HABBO_PURSE_VOUCHER_TEMPLATE = "habbo_basic.window";
export const HABBO_PURSE_VOUCHER_LAYOUT = "PurseVouchers.window";

export const HABBO_PURSE_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_purse/casts/External/ParentScript 2 - Purse Interface Class.ls";

export const HABBO_PURSE_COMPONENT_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_purse/casts/External/ParentScript 3 - Purse Component Class.ls";

export const HABBO_PURSE_HANDLER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_purse/casts/External/ParentScript 4 - Purse Handler Class.ls";

export interface HabboPurseTransaction {
  readonly date: string;
  readonly time: string;
  readonly creditValue: string;
  readonly realValue: string;
  readonly currency: string;
  readonly transactionSystemName: string;
}

export type HabboPurseTransactionPage = readonly HabboPurseTransaction[];

export type HabboPurseAction =
  | { readonly kind: "view-transactions" }
  | { readonly kind: "previous-page" }
  | { readonly kind: "next-page" }
  | { readonly kind: "buy-credits" }
  | { readonly kind: "open-voucher" }
  | { readonly kind: "send-voucher" }
  | { readonly kind: "voucher-help" }
  | { readonly kind: "close-voucher" }
  | { readonly kind: "close-purse" };

const purseActions: Readonly<Record<string, HabboPurseAction>> = {
  purse_view: { kind: "view-transactions" },
  taction_prev: { kind: "previous-page" },
  taction_next: { kind: "next-page" },
  purse_buy: { kind: "buy-credits" },
  purse_voucher: { kind: "open-voucher" },
  voucher_send: { kind: "send-voucher" },
  voucher_help: { kind: "voucher-help" },
  voucher_exit: { kind: "close-voucher" },
  close: { kind: "close-purse" },
  purse_close: { kind: "close-purse" }
};

export function resolvePurseAction(elementId: string): HabboPurseAction | undefined {
  return purseActions[elementId];
}

export function parsePurseCreditCount(body: string): string {
  const firstWord = body.split(/[\s\u0000-\u001f]+/).find((word) => word.length > 0) ?? "";
  if (!firstWord) {
    return "";
  }

  // Purse Handler Class uses integer(getLocalFloat(tMsg.content.word[1])).
  const parsed = Number.parseFloat(firstWord.replace(",", "."));
  return Number.isFinite(parsed) ? String(Math.round(parsed)) : firstWord;
}

export function parsePurseCreditLogPacket(body: string): readonly HabboPurseTransactionPage[] {
  const pages: HabboPurseTransaction[][] = [[]];
  let pageIndex = 0;
  for (const line of body.split(/\r?\n|\r/)) {
    if (line.length === 0) {
      break;
    }

    const items = line.split("\t");
    pages[pageIndex]!.push({
      date: items[0] ?? "",
      time: items[1] ?? "",
      creditValue: items[2] ?? "",
      realValue: items[3] ?? "",
      currency: items[4] ?? "",
      transactionSystemName: items[5] ?? ""
    });
    if (pages[pageIndex]!.length === 10) {
      pageIndex += 1;
      pages[pageIndex] = [];
    }
  }

  if (pages.at(-1)?.length === 0) {
    pages.pop();
  }
  return pages;
}

export function purseColumnText(
  page: HabboPurseTransactionPage,
  column: keyof Pick<HabboPurseTransaction, "date" | "time" | "creditValue" | "realValue" | "transactionSystemName">,
  getText: (key: string) => string | undefined
): string {
  return page.map((transaction) => {
    if (column === "date") {
      return transaction.date.replaceAll("-", ".");
    }
    if (column === "transactionSystemName") {
      return getText(`transaction_system_${transaction.transactionSystemName}`) ?? transaction.transactionSystemName;
    }
    return transaction[column];
  }).join("\r");
}
