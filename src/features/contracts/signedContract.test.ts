import { describe, expect, it } from "vitest";
import {
  defaultPortalPasswordHint,
  formatPortalStudentsSummary,
  isSignedContract,
  mapSignedContractError,
  normalizePortalStudentResults,
  portalStudentStatusLabel,
  summarizePortalStudentResults,
} from "./signedContract";

describe("isSignedContract", () => {
  it("is true when status is SIGNED", () => {
    expect(isSignedContract({ status: "SIGNED" })).toBe(true);
  });

  it("is true when signedContract is present even if status is not SIGNED", () => {
    expect(isSignedContract({ status: "SENT", signedContract: { id: "sc_1" } })).toBe(true);
  });

  it("is false when only signedAt exists", () => {
    expect(isSignedContract({ status: "SENT" })).toBe(false);
  });

  it("is false for generated or sent contracts without signedContract", () => {
    expect(isSignedContract({ status: "GENERATED" })).toBe(false);
    expect(isSignedContract({ status: "SENT", signedContract: null })).toBe(false);
    expect(isSignedContract({ status: "DECLINED" })).toBe(false);
  });
});

describe("portal password helpers", () => {
  it("uses Primeironome@YEAR as the ops hint", () => {
    expect(defaultPortalPasswordHint(2026)).toBe("Primeironome@2026");
  });
});

describe("portal student results", () => {
  it("labels statuses in pt-BR", () => {
    expect(portalStudentStatusLabel("created")).toBe("Criado");
    expect(portalStudentStatusLabel("already_exists")).toBe("Já existia");
    expect(portalStudentStatusLabel("failed")).toBe("Falhou");
  });

  it("summarizes mixed outcomes", () => {
    const results = [
      { email: "a@x.com", status: "created" as const },
      { email: "b@x.com", status: "already_exists" as const },
      { email: "c@x.com", status: "failed" as const },
    ];
    expect(summarizePortalStudentResults(results)).toEqual({
      created: 1,
      alreadyExists: 1,
      failed: 1,
    });
    expect(formatPortalStudentsSummary(summarizePortalStudentResults(results))).toBe(
      "1 criado(s) · 1 já existia(m) · 1 falha(s)",
    );
  });

  it("normalizes the backend provision-portal-students payload", () => {
    expect(
      normalizePortalStudentResults({
        contractId: "ct_1",
        results: [
          {
            signerId: "s1",
            email: "a@x.com",
            name: "Ana",
            status: "created",
            coreUserId: "usr_1",
          },
          {
            signerId: "s2",
            email: "b@x.com",
            name: "João",
            status: "already_exists",
            coreUserId: "usr_2",
          },
          { signerId: "s3", email: "c@x.com", name: "Cris", status: "failed" },
        ],
        summary: { created: 1, alreadyExists: 1, failed: 1 },
      }),
    ).toEqual({
      contractId: "ct_1",
      results: [
        {
          signerId: "s1",
          email: "a@x.com",
          name: "Ana",
          status: "created",
          coreUserId: "usr_1",
          error: null,
        },
        {
          signerId: "s2",
          email: "b@x.com",
          name: "João",
          status: "already_exists",
          coreUserId: "usr_2",
          error: null,
        },
        {
          signerId: "s3",
          email: "c@x.com",
          name: "Cris",
          status: "failed",
          coreUserId: null,
          error: null,
        },
      ],
      summary: { created: 1, alreadyExists: 1, failed: 1 },
    });
  });

  it("does not keep password fields from the payload", () => {
    const normalized = normalizePortalStudentResults({
      results: [
        {
          email: "a@x.com",
          status: "created",
          temporaryPassword: "ANA@2026",
          password: "secret",
        },
      ],
      summary: { created: 1, alreadyExists: 0, failed: 0 },
    });
    expect(normalized.results[0]).not.toHaveProperty("temporaryPassword");
    expect(normalized.results[0]).not.toHaveProperty("password");
  });

  it("rejects unknown payloads", () => {
    expect(() => normalizePortalStudentResults(null)).toThrow(/contrato esperado/);
    expect(() => normalizePortalStudentResults({})).toThrow(/contrato esperado/);
  });
});

describe("mapSignedContractError", () => {
  it("maps 400/502 contract codes", () => {
    expect(mapSignedContractError({ code: "CONTRACT_NOT_SIGNED" })).toBe(
      "Este contrato ainda não está assinado.",
    );
    expect(mapSignedContractError({ code: "CONTRACT_ENVELOPE_MISSING" })).toBe(
      "Envelope do DocuSign não encontrado para este contrato.",
    );
    expect(mapSignedContractError(Object.assign(new Error("DOCUSIGN_DOWNLOAD_FAILED"), {
      code: "DOCUSIGN_DOWNLOAD_FAILED",
    }))).toBe("Não foi possível baixar o PDF no DocuSign. Tente novamente.");
  });
});
