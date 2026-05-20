import type { GatewayPaymentOption } from "@/services/commercialApi";

export type EditingGateway = Record<string, Record<number, GatewayPaymentOption>>;
