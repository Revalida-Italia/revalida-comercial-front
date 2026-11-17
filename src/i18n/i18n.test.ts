import { describe, expect, it } from "vitest";
import { setLocale, t, tCount } from "@/i18n";
import { en } from "@/i18n/locales/en";
import { es } from "@/i18n/locales/es";
import { it as italian } from "@/i18n/locales/it";
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
    expect(t("sales.card.paidInstallments.one", { paid: 1, total: 1 })).toBe("1 de 1 parcela paga");
    expect(t("sales.card.paidInstallments.other", { paid: 1, total: 6 })).toBe("1 de 6 parcelas pagas");
    expect(t("contract.page.installments.one", { n: 1, valor: "R$ 10,00", paid: "0 pagas" })).toBe("1 parcela de R$ 10,00 · 0 pagas");
    expect(t("contract.page.installments.other", { n: 5, valor: "R$ 10,00", paid: "2 pagas" })).toBe("5 parcelas de R$ 10,00 · 2 pagas");
    expect(t("contract.page.confirmLine.one", { cliente: "Ana", valor: "R$ 10,00", n: 1 })).toBe("Ana · R$ 10,00 · 1 item incluso");
    expect(t("contract.page.confirmLine.other", { cliente: "Ana", valor: "R$ 10,00", n: 3 })).toBe("Ana · R$ 10,00 · 3 itens inclusos");
    expect(tCount("sales.card.pending", 1)).toBe("1 pendente");
    expect(tCount("sales.card.pending", 5)).toBe("5 pendentes");
    expect(tCount("portalAccess.created", 1)).toBe("Acesso criado para 1 aluno");
    expect(tCount("portalAccess.created", 2)).toBe("Acesso criado para 2 alunos");
    setLocale("en");
    expect(tCount("portalAccess.created", 1)).toBe("Access created for 1 student");
    expect(tCount("portalAccess.created", 2)).toBe("Access created for 2 students");
    setLocale("it");
    expect(tCount("portalAccess.created", 1)).toBe("Accesso creato per 1 studente");
    expect(tCount("portalAccess.created", 2)).toBe("Accesso creato per 2 studenti");
    setLocale("es");
    expect(tCount("portalAccess.created", 1)).toBe("Acceso creado para 1 alumno");
    expect(tCount("portalAccess.created", 2)).toBe("Acceso creado para 2 alumnos");
    setLocale("pt-BR");
  });

  it("translates the course step in Portuguese, Italian, Spanish and English", () => {
    const samples = [
      ["pt-BR", "Cursos e módulos", "Informe o fim do acesso para continuar."],
      ["it", "Corsi e moduli", "Indica la fine dell'accesso per continuare."],
      ["es", "Cursos y módulos", "Indica el fin del acceso para continuar."],
      ["en", "Courses and modules", "Enter the access end date to continue."],
    ] as const;
    for (const [locale, title, end] of samples) {
      setLocale(locale);
      expect(t("sale.courses.title")).toBe(title);
      expect(t("sale.access.endRequired")).toBe(end);
      expect(t("sale.courses.title")).not.toBe("sale.courses.title");
    }
    setLocale("pt-BR");
    for (const messages of [ptBR, italian, es, en]) {
      expect(messages.sale.courses.wholeCourse.trim()).not.toBe("");
      expect(messages.contract.doc.module).toContain("{modulo}");
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
