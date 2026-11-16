import { describe, expect, it } from "vitest";
import { formatCpf, isValidCpf } from "./cpf";

describe("formatCpf", () => {
  it("applies the mask while typing", () => {
    let value = "";
    const shown: string[] = [];
    for (const digit of "52998224725") {
      value = formatCpf(value + digit, value);
      shown.push(value);
    }
    expect(shown).toEqual([
      "5",
      "52",
      "529",
      "529.9",
      "529.98",
      "529.982",
      "529.982.2",
      "529.982.24",
      "529.982.247",
      "529.982.247-2",
      "529.982.247-25",
    ]);
    expect(formatCpf("529.982.247-25")).toBe("529.982.247-25");
  });

  it("drops extra digits and letters", () => {
    expect(formatCpf("529.982.247-25999")).toBe("529.982.247-25");
    expect(formatCpf("cpf 39053344705")).toBe("390.533.447-05");
  });

  it("removes a digit when a punctuation mark is deleted", () => {
    expect(formatCpf("529.982.24725", "529.982.247-25")).toBe("529.982.247-2");
    expect(formatCpf("529982.247-25", "529.982.247-25")).toBe("529.982.247-2");
  });
});

describe("isValidCpf", () => {
  it("accepts a CPF with the right check digits, masked or not", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("390.533.447-05")).toBe(true);
  });

  it("rejects a wrong check digit, a repeated sequence and an incomplete value", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("123.456.789-00")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("529.982.247-2")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});
