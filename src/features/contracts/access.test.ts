import { beforeEach, describe, expect, it } from "vitest";
import { setProfile } from "@/lib/session";
import { canCreateStudentAccess, canGenerateContracts, canManageSignature, canSendForSignature } from "./access";

function as(role: string, sub = "u1") {
  setProfile({ sub, id: sub, externalId: sub, email: "u@example.com", name: "U", role, roles: [role] } as never);
}

describe("contract access", () => {
  beforeEach(() => window.localStorage.clear());

  it("administrator: everything, including send on a sale they do not own", () => {
    as("ADMIN", "admin-1");
    expect(canGenerateContracts()).toBe(true);
    expect(canManageSignature()).toBe(true);
    expect(canCreateStudentAccess()).toBe(true);
    expect(canSendForSignature({ sellerId: "seller-1" })).toBe(true);
    expect(canSendForSignature(null)).toBe(true);
  });

  it("seller: generates and lists; sends only on their own sale; no status refresh and no student access", () => {
    as("SELLER", "seller-1");
    expect(canGenerateContracts()).toBe(true);
    expect(canManageSignature()).toBe(false);
    expect(canCreateStudentAccess()).toBe(false);
    expect(canSendForSignature({ sellerId: "seller-1" })).toBe(true);
    expect(canSendForSignature({ sellerId: "seller-2" })).toBe(false);
    expect(canSendForSignature(null)).toBe(false);
    expect(canSendForSignature({ sellerId: "  " })).toBe(false);
  });

  it("matches the owner by sellerId, seller.id or seller.externalId against the profile", () => {
    setProfile({
      sub: "ext-1",
      id: "internal-1",
      externalId: "ext-1",
      email: "s@example.com",
      name: "S",
      role: "SELLER",
      roles: ["SELLER"],
    } as never);
    expect(canSendForSignature({ sellerId: "ext-1" })).toBe(true);
    expect(canSendForSignature({ sellerId: " internal-1 " })).toBe(true);
    expect(canSendForSignature({
      sellerId: "other",
      seller: { id: "internal-1", externalId: "ext-1" },
    })).toBe(true);
    expect(canSendForSignature({
      sellerId: "someone-else",
      seller: { id: "nope", externalId: "nope" },
    })).toBe(false);
  });

  it("other roles and no login: nothing", () => {
    as("FIXED_COSTS_MANAGER", "cost-1");
    expect(canGenerateContracts()).toBe(false);
    expect(canSendForSignature({ sellerId: "cost-1" })).toBe(false);
    window.localStorage.clear();
    expect(canGenerateContracts()).toBe(false);
    expect(canSendForSignature({ sellerId: "u1" })).toBe(false);
  });
});
