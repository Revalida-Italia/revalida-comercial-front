import type { GatewayPaymentOption } from "@/lib/commercialApi";

export type EditingGateway = Record<string, Record<number, GatewayPaymentOption>>;
