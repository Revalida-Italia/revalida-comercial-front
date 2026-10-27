import { beforeEach, describe, expect, it } from "vitest";
import { setProfile } from "@/lib/session";
import { canCreateStudentAccess, canGenerateContracts, canManageSignature } from "./access";

function as(role: string) {
  setProfile({ sub: "u1", email: "u@example.com", name: "U", role, roles: [role] } as never);
}

describe("contract access", () => {
  beforeEach(() => window.localStorage.clear());

  it("administrator: everything", () => {
    as("ADMIN");
    expect(canGenerateContracts()).toBe(true);
    expect(canManageSignature()).toBe(true);
    expect(canCreateStudentAccess()).toBe(true);
  });

  it("seller: generates, lists and downloads; no signature flow and no student access", () => {
    as("SELLER");
    expect(canGenerateContracts()).toBe(true);
    expect(canManageSignature()).toBe(false);
    expect(canCreateStudentAccess()).toBe(false);
  });

  it("other roles and no login: nothing", () => {
    as("FIXED_COSTS_MANAGER");
    expect(canGenerateContracts()).toBe(false);
    window.localStorage.clear();
    expect(canGenerateContracts()).toBe(false);
  });
});
