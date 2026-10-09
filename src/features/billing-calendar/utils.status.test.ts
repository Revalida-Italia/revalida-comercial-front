import { describe, expect, it } from "vitest";
import type { BillingCalendarEvent } from "./types";
import { billingStatusColor, billingStatusLabel, normalizeBillingStatus, summarizeBillingEvents } from "./utils";

function event(status: string, amount: number, paymentStatus?: string): BillingCalendarEvent {
  return {
    instanceId: `${status}-${amount}-${paymentStatus ?? ""}`,
    paymentId: `${status}-${amount}`,
    saleId: "sale_1",
    title: status,
    amount,
    scheduledDate: "2026-10-09",
    status,
    paymentStatus,
  };
}

describe("billing status labels", () => {
  it("keeps CANCELLED out of the pending label and uses a muted color", () => {
    expect(normalizeBillingStatus("CANCELLED")).toBe("CANCELLED");
    expect(normalizeBillingStatus("cancelled")).toBe("CANCELLED");
    expect(billingStatusLabel("CANCELLED")).toBe("Cancelada");
    expect(billingStatusLabel("CANCELLED")).not.toBe("Pendente");
    expect(billingStatusColor("CANCELLED")).toBe("hsl(var(--muted-foreground))");
  });

  it("keeps cancelled charges out of the pending and overdue counts", () => {
    const events = [
      event("PAID", 100),
      event("PENDING", 50),
      event("OVERDUE", 25),
      event("CANCELLED", 80),
      event("PENDING", 10, "CANCELLED"),
    ];

    expect(summarizeBillingEvents(events)).toMatchObject({
      paidCount: 1,
      pendingCount: 1,
      overdueCount: 1,
      cancelledCount: 2,
      paidAmount: 100,
      pendingAmount: 50,
      overdueAmount: 25,
      cancelledAmount: 90,
    });
  });

  it("translates the known payment statuses", () => {
    expect(billingStatusLabel("PENDING")).toBe("Pendente");
    expect(billingStatusLabel("PAID")).toBe("Pago");
    expect(billingStatusLabel("OVERDUE")).toBe("Em atraso");
  });
});
