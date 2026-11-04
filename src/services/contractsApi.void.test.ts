import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/http";
import { voidContract } from "@/services/contractsApi";

vi.mock("@/lib/http", () => ({
  apiRequest: vi.fn(),
}));

describe("voidContract", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("posts /contracts/:contractId/void and returns the updated contract", async () => {
    const updated = { id: "ct-1", status: "VOIDED" };
    vi.mocked(apiRequest).mockResolvedValue(updated);

    await expect(voidContract("ct-1")).resolves.toEqual(updated);
    expect(vi.mocked(apiRequest).mock.calls[0]?.slice(1)).toEqual([
      "/contracts/ct-1/void",
      { method: "POST", body: {} },
    ]);

    await voidContract("ct-2", "Cliente desistiu");
    expect(vi.mocked(apiRequest).mock.calls[1]?.slice(1)).toEqual([
      "/contracts/ct-2/void",
      { method: "POST", body: { reason: "Cliente desistiu" } },
    ]);
  });
});
