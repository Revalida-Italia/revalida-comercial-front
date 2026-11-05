import { describe, expect, it } from "vitest";
import { t, tCount } from "@/i18n";
import { ptBR } from "@/i18n/locales/pt-BR";
import { salesCardV2Copy } from "@/i18n/locales/salesCardV2";

function leaves(node: unknown): string[] {
  if (typeof node === "string") return [node];
  return Object.values(node as Record<string, unknown>).flatMap(leaves);
}

describe("i18n", () => {
  it("fills placeholders and picks singular or plural", () => {
    expect(t("contract.party.title", { n: 2 })).toBe("Contratante 2");
    expect(tCount("contract.summary.contractors", 1)).toBe("1 contratante");
    expect(tCount("contract.summary.contractors", 3)).toBe("3 contratantes");
    expect(t("sales.card.paidInstallments.one", { paid: 1, total: 1 })).toBe("1 de 1 parcela paga");
    expect(t("sales.card.paidInstallments.other", { paid: 1, total: 6 })).toBe("1 de 6 parcelas pagas");
    expect(tCount("sales.card.pending", 1)).toBe("1 pendente");
    expect(tCount("sales.card.pending", 5)).toBe("5 pendentes");
    expect(t("sales.card.paidShort", { paid: 1, total: 6 })).toBe("1 de 6");
    expect(t("sales.card.clientsExtra", { count: 2 })).toBe("+2");
    expect(t("sales.actions.unarchive")).toBe("Desarquivar");
    expect(t("sales.actions.paymentLinkShort")).toBe(salesCardV2Copy["pt-BR"].paymentLinkShort);
    expect(t("sales.actions.otherLinks")).toBe(salesCardV2Copy["pt-BR"].otherLinks);
    expect(t("sales.actions.whatsapp")).toBe(salesCardV2Copy["pt-BR"].whatsapp);
  });

  it("keeps the V2 card copy for pt-BR, it, es and en", () => {
    expect(salesCardV2Copy.it.paidShort).toBe("{paid} di {total}");
    expect(salesCardV2Copy.es.paymentLinkShort).toBe("Enlace");
    expect(salesCardV2Copy.es.otherLinks).toBe("Otros enlaces");
    expect(salesCardV2Copy.en.paidShort).toBe("{paid} of {total}");
    expect(salesCardV2Copy.en.unarchive).toBe("Unarchive");
    expect(salesCardV2Copy.en.whatsapp).toBe("Open client's WhatsApp");
    for (const copy of Object.values(salesCardV2Copy)) {
      expect(copy.clientsExtra).toBe("+{count}");
      expect(copy.paidShort).toContain("{paid}");
      expect(copy.paidShort).toContain("{total}");
      expect(copy.unarchive.trim()).not.toBe("");
    }
  });

  it("has no empty text, no emoji and no field names in the copy", () => {
    for (const text of leaves(ptBR)) {
      expect(text.trim()).not.toBe("");
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text.replace(/WhatsApp/g, "Whatsapp")).not.toMatch(/[a-z]+[A-Z][a-z]+|_[A-Z]|payload|endpoint|template/);
    }
  });
});
