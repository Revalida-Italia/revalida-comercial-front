import { describe, expect, it } from "vitest";
import { billingStatusColor, billingStatusLabel, normalizeBillingStatus, resolveBillingEventStatus } from "./utils";

describe("billing status labels", () => {
  it("keeps CANCELLED out of the pending label and uses a muted color", () => {
    expect(normalizeBillingStatus("CANCELLED")).toBe("CANCELLED");
    expect(normalizeBillingStatus("cancelled")).toBe("CANCELLED");
    expect(billingStatusLabel("CANCELLED")).toBe("Cancelada");
    expect(billingStatusLabel("CANCELLED")).not.toBe("Pendente");
    expect(billingStatusColor("CANCELLED")).toBe("hsl(var(--muted-foreground))");
  });

  it("reads CANCELLED from event.status", () => {
    expect(resolveBillingEventStatus({ status: "CANCELLED" })).toBe("CANCELLED");
    expect(resolveBillingEventStatus({ status: "PENDING", paymentStatus: "CANCELLED" })).toBe("CANCELLED");
    expect(resolveBillingEventStatus({ status: "PAID" })).toBe("PAID");
    expect(resolveBillingEventStatus({ status: "OVERDUE" })).toBe("OVERDUE");
  });

  it("translates the known payment statuses", () => {
    expect(billingStatusLabel("PENDING")).toBe("Pendente");
    expect(billingStatusLabel("PAID")).toBe("Pago");
    expect(billingStatusLabel("OVERDUE")).toBe("Em atraso");
  });
});
