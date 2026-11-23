import { t } from "@/i18n";
import { formatAccessDate } from "./dates";
import type { CourseSaleItem } from "./types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** One clause 3.2 line. The contract template language is chosen by the caller via the active locale of the template, not by this helper. */
export function clauseLine(item: CourseSaleItem, index: number): string {
  const letter = LETTERS[index] ?? String(index + 1);
  const label = item.kind === "course"
    ? t("contract.doc.wholeCourse", { curso: item.courseName || item.name })
    : t("contract.doc.module", { curso: item.courseName, modulo: item.name });
  const range = t("contract.doc.available", {
    start: formatAccessDate(item.startsAt),
    end: formatAccessDate(item.endsAt),
  });
  return `(${letter}) ${label} ${range}`;
}

export function clauseLines(items: CourseSaleItem[]): string[] {
  return items.map((item, index) => clauseLine(item, index));
}
