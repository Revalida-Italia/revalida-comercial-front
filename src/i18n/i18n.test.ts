import { describe, expect, it } from "vitest";
import { t, tCount } from "@/i18n";
import { ptBR } from "@/i18n/locales/pt-BR";

function leaves(node: unknown): string[] {
  if (typeof node === "string") return [node];
  return Object.values(node as Record<string, unknown>).flatMap(leaves);
}

describe("i18n", () => {
  it("fills placeholders and picks singular or plural", () => {
    expect(t("contract.party.title", { n: 2 })).toBe("Contratante 2");
    expect(tCount("contract.summary.contractors", 1)).toBe("1 contratante");
    expect(tCount("contract.summary.contractors", 3)).toBe("3 contratantes");
  });

  it("has no empty text, no emoji and no field names in the copy", () => {
    for (const text of leaves(ptBR)) {
      expect(text.trim()).not.toBe("");
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text).not.toMatch(/[a-z]+[A-Z][a-z]+|_[A-Z]|payload|endpoint|template/);
    }
  });
});
