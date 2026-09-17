import { describe, expect, it } from "vitest";
import {
  defaultPortalPasswordHint,
  formatPortalStudentsSummary,
  inferPortalPassword,
  isSignedContract,
  normalizePortalStudentResults,
  portalStudentStatusLabel,
  summarizePortalStudentResults,
} from "./signedContract";

describe("isSignedContract", () => {
  it("is true when status is SIGNED", () => {
    expect(isSignedContract({ status: "SIGNED" })).toBe(true);
  });

  it("is true when signedAt is present", () => {
    expect(isSignedContract({ status: "SENT", signedAt: "2026-09-17T12:00:00.000Z" })).toBe(true);
  });

  it("is true when SignedContract exists", () => {
    expect(isSignedContract({ status: "SENT", signedContract: { id: "sc_1" } })).toBe(true);
    expect(isSignedContract({ status: "SENT", signedContractId: "sc_1" })).toBe(true);
  });

  it("is false for generated or sent contracts without signed payload", () => {
    expect(isSignedContract({ status: "GENERATED" })).toBe(false);
    expect(isSignedContract({ status: "SENT" })).toBe(false);
    expect(isSignedContract({ status: "DECLINED" })).toBe(false);
  });
});

describe("portal password helpers", () => {
  it("uses PRIMEIRONOME@YEAR", () => {
    expect(defaultPortalPasswordHint(2026)).toBe("PRIMEIRONOME@2026");
    expect(inferPortalPassword("João Silva", 2026)).toBe("JOAO@2026");
    expect(inferPortalPassword("  maria  costa", 2026)).toBe("MARIA@2026");
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
    expect(formatPortalStudentsSummary(results)).toBe("1 criado(s) · 1 já existia(m) · 1 falha(s)");
  });

  it("normalizes results[], grouped lists and aliases", () => {
    expect(
      normalizePortalStudentResults({
        results: [
          { email: "a@x.com", status: "CREATED", temporaryPassword: "ANA@2026" },
          { email: "b@x.com", status: "already-exists" },
          { email: "c@x.com", error: "core timeout" },
        ],
      }).results,
    ).toEqual([
      {
        email: "a@x.com",
        name: null,
        status: "created",
        coreUserId: null,
        temporaryPassword: "ANA@2026",
        error: null,
      },
      {
        email: "b@x.com",
        name: null,
        status: "already_exists",
        coreUserId: null,
        temporaryPassword: null,
        error: null,
      },
      {
        email: "c@x.com",
        name: null,
        status: "failed",
        coreUserId: null,
        temporaryPassword: null,
        error: "core timeout",
      },
    ]);

    expect(
      normalizePortalStudentResults({
        created: [{ email: "ok@x.com", name: "Ok" }],
        already_exists: ["dup@x.com"],
        failed: [{ email: "bad@x.com", message: "invalid" }],
      }).results,
    ).toEqual([
      {
        email: "ok@x.com",
        name: "Ok",
        status: "created",
        coreUserId: null,
        temporaryPassword: null,
        error: null,
      },
      { email: "dup@x.com", status: "already_exists" },
      {
        email: "bad@x.com",
        name: null,
        status: "failed",
        coreUserId: null,
        temporaryPassword: null,
        error: "invalid",
      },
    ]);
  });

  it("rejects unknown payloads", () => {
    expect(() => normalizePortalStudentResults(null)).toThrow(/contrato esperado/);
    expect(() => normalizePortalStudentResults({})).toThrow(/contrato esperado/);
  });
});
