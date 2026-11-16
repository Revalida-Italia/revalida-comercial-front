import { describe, expect, it } from "vitest";
import { mapGenerateError, sendForSignatureErrorMessage } from "./contractErrors";

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
  it("puts period errors next to the right product", () => {
    const result = mapGenerateError(
      apiError([
        { code: "V_PERIOD", field: "products.1.releaseDate", message: "Release date of ITALIANO_MEDICO is required" },
        { code: "V_PERIOD", field: "products.0.endDate", message: "START: the period goes past the end of the contract" },
      ]),
      ctx,
    );
    expect(result.banner).toBeNull();
    expect(result.issues.map((i) => [i.fieldId, i.message])).toEqual([
      ["contract-product-ITALIANO_MEDICO-release", "Escolha a data de liberação."],
      ["contract-product-START-duration", "Esse período passa do fim da vigência."],
    ]);
  });

  it("maps the 3.2 list, the term, the city and the sum of installments", () => {
    const result = mapGenerateError(
      apiError([
        { code: "V_SERVICES", field: "products", message: "Clause 3.2 needs at least one product or extra" },
        { code: "V_PERIOD", field: "contractEndDate", message: "Contract end date is required" },
        { code: "V_SCHEMA", field: "referenceCity", message: "Too small" },
        { code: "V-M8", field: "phases", message: "Sum of phases (25000.00) differs from totalAmount (25002.00)" },
      ]),
      ctx,
    );
    expect(result.banner).toBeNull();
    expect(result.issues.map((i) => i.fieldId)).toEqual([
      "contract-product-START-toggle",
      "contract-term-end",
      "contract-reference-city",
      "contract-section-payment",
    ]);
    const text = result.issues.map((i) => `${i.message} ${i.summary}`).join(" ");
    expect(text).not.toMatch(/Sum of phases|Clause|required|totalAmount|Too small/);
  });

  it("maps errors on the Escola students and course", () => {
    const result = mapGenerateError(
      apiError([
        { code: "V_SCHEMA", field: "students.1.cpf", message: "Invalid CPF" },
        { code: "V_PERIOD", field: "course.startDate", message: "Invalid start date" },
      ]),
      { ...ctx, studentLabels: ["Giulia", "Lucas"] },
    );
    expect(result.issues.map((i) => [i.fieldId, i.summary])).toEqual([
      ["contract-school-1-cpf", "Falta: CPF válido de Lucas"],
      ["contract-school-startDate", "Falta: início do curso"],
    ]);
  });

  it("maps schema errors on the contractors", () => {
    const result = mapGenerateError(
      apiError([{ code: "V_SCHEMA", field: "parties.0.email", message: "Invalid email address" }]),
      ctx,
    );
    expect(result.issues[0]).toMatchObject({ fieldId: "contract-party-0-email", message: "Digite um e-mail válido." });
  });

  it("never shows raw text: unknown errors become the generic banner", () => {
    for (const error of [
      new Error("Internal Server Error"),
      apiError([{ code: "V_SCHEMA", field: "weird.field", message: "Too small: expected array" }]),
      apiError([{ code: "V_SCHEMA", field: "witnesses.1.document", message: "Too small" }]),
    ]) {
      const result = mapGenerateError(error, ctx);
      expect(result.banner).toBe("Não foi possível gerar o contrato. Tente novamente.");
      expect(result.issues.map((i) => `${i.fieldId} ${i.message}`).join(" ")).not.toMatch(/Too small|Internal|contract-witness|testemunha/i);
    }
  });
});

describe("sendForSignatureErrorMessage", () => {
  const fallback = "Contrato registrado, mas não foi possível enviar para assinatura. Tente novamente pelo botão Enviar para assinatura.";
  const notConfigured = "Contrato registrado. A assinatura digital não está configurada, então o envio não foi feito.";

  it("says the contract was registered when the signature is not configured", () => {
    const configured = Object.assign(new Error("DIGITAL_SIGNATURE_NOT_CONFIGURED"), {
      code: "DIGITAL_SIGNATURE_NOT_CONFIGURED",
      status: 503,
    });
    expect(sendForSignatureErrorMessage(configured, fallback)).toBe(notConfigured);
    expect(sendForSignatureErrorMessage(configured, fallback)).not.toMatch(/DIGITAL_SIGNATURE|DocuSign|envelope|payload/i);
  });

  it("keeps the fallback for other failures, including a 503 with another code", () => {
    expect(sendForSignatureErrorMessage(new Error("offline"), fallback)).toBe(fallback);
    expect(sendForSignatureErrorMessage(Object.assign(new Error("other"), { code: "OTHER", status: 503 }), fallback)).toBe(fallback);
    expect(sendForSignatureErrorMessage(Object.assign(new Error("down"), { status: 503 }), fallback)).toBe(fallback);
  });
});
