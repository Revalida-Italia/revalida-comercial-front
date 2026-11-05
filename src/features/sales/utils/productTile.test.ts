import { describe, expect, it } from "vitest";
import { productTileInitials } from "./productTile";

describe("product tile initials", () => {
  it("uses two initials for a long product name and none for a short one", () => {
    expect(productTileInitials(
      "PROGRAMA REVALIDA ITÁLIA — TRILHA COMPLETA COM MENTORIA INDIVIDUAL E SIMULADOS OFICIAIS",
    )).toBe("PR");
    expect(productTileInitials("PROGRAMA COMPLETO SEM DECRETO")).toBeNull();
    expect(productTileInitials("ESCOLA DE HABILIDADES CLÍNICAS")).toBeNull();
    expect(productTileInitials("MODULO 1 - CURSO START")).toBeNull();
  });
});
