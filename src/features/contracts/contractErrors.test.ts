import { describe, expect, it } from "vitest";
import { mapGenerateError } from "./contractErrors";

const ctx = {
  productCodes: ["START", "ITALIANO_MEDICO"] as ("START" | "ITALIANO_MEDICO")[],
  catalog: [
    { code: "START" as const, name: "Curso Start", description: "x" },
    { code: "ITALIANO_MEDICO" as const, name: "Italiano Médico", description: "y" },
  ],
  partyLabels: ["Billy Willy"],
};

function apiError(errors: Array<{ code?: string; field?: string; message?: string }>) {
  return Object.assign(new Error(errors.map((e) => e.message).join("; ")), { errors });
}

describe("mapGenerateError", () => {
  it("puts period errors next to the right product, in Portuguese", () => {
    const result = mapGenerateError(
      apiError([
        { code: "V_PERIOD", field: "products.1.releaseDate", message: "ITALIANO_MEDICO: a liberação deve ser antes do fim da vigência do contrato" },
        { code: "V_PERIOD", field: "products.0.endDate", message: "START: o período não pode passar do fim da vigência do contrato" },
      ]),
      ctx,
    );
    expect(result.banner).toBeNull();
    expect(result.issues.map((i) => [i.fieldId, i.message])).toEqual([
      ["contract-product-ITALIANO_MEDICO-release", "Escolha uma data de liberação antes do fim da vigência."],
      ["contract-product-START-duration", "Esse período passa do fim da vigência."],
    ]);
  });

  it("maps the decree, the term and the sum of installments", () => {
    const result = mapGenerateError(
      apiError([
        { code: "V_PERIOD", field: "decreeReleaseDate", message: "O período do decreto não pode passar do fim da vigência do contrato" },
        { code: "V_PERIOD", field: "contractEndDate", message: "Vigência do contrato: end must be after the release date" },
        { code: "V-M8", field: "phases", message: "Sum of phases (25000.00) differs from totalAmount (25002.00)" },
      ]),
      ctx,
    );
    expect(result.issues.map((i) => i.fieldId)).toEqual([
      "contract-decree-release",
      "contract-term-end",
      "contract-section-payment",
    ]);
    const text = result.issues.map((i) => `${i.message} ${i.summary}`).join(" ");
    expect(text).not.toMatch(/Sum of phases|end must be|totalAmount/);
  });

  it("maps schema errors on the contractors", () => {
    const result = mapGenerateError(
      apiError([{ code: "V_SCHEMA", field: "parties.0.email", message: "Invalid email address" }]),
      ctx,
    );
    expect(result.issues[0]).toMatchObject({ fieldId: "contract-party-0-email", message: "Digite um e-mail válido." });
  });

  it("never shows raw text: unknown errors become the generic banner", () => {
    for (const error of [new Error("Internal Server Error"), apiError([{ code: "V_SCHEMA", field: "weird.field", message: "Too small: expected array" }])]) {
      const result = mapGenerateError(error, ctx);
      expect(result.banner).toBe("Não foi possível gerar o contrato. Tente novamente.");
      expect(result.issues.map((i) => i.message).join(" ")).not.toMatch(/Too small|Internal/);
    }
  });
});
