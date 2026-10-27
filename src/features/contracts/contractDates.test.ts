import { describe, expect, it } from "vitest";
import { addMonthsIso, displayToIso, isIsoDate, isoToDisplay, maskDateInput } from "./contractDates";

describe("contract dates", () => {
  it("adds months keeping the day and clamping at the end of the month", () => {
    expect(addMonthsIso("2026-10-15", 12)).toBe("2027-10-15");
    expect(addMonthsIso("2026-10-15", 6)).toBe("2027-04-15");
    expect(addMonthsIso("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonthsIso("2027-08-31", 6)).toBe("2028-02-29");
  });

  it("converts between ISO and dd/mm/aaaa without shifting the day", () => {
    expect(isoToDisplay("2026-08-20")).toBe("20/08/2026");
    expect(displayToIso("20/08/2026")).toBe("2026-08-20");
    expect(displayToIso("31/02/2026")).toBeNull();
    expect(displayToIso("20/08/26")).toBeNull();
    expect(isIsoDate("2026-13-01")).toBe(false);
  });

  it("masks typing", () => {
    expect(maskDateInput("1")).toBe("1");
    expect(maskDateInput("1510")).toBe("15/10");
    expect(maskDateInput("15102026")).toBe("15/10/2026");
    expect(maskDateInput("15/10/2026999")).toBe("15/10/2026");
  });
});
