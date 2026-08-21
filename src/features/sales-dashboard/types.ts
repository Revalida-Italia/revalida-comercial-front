import type { PaymentGateway, SalesDashboardPeriod } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";

export type DashboardMode = "seller" | "admin";

export type DashboardMetricKey =
  | "totalSales"
  | "grossPayments"
  | "netReceived"
  | "fixedCosts";

export interface DashboardMetricOption {
  key: DashboardMetricKey;
  label: string;
  description: string;
  currency?: boolean;
  /** Visível para ADMIN e FIXED_COSTS_MANAGER. */
  costsManagersOnly?: boolean;
}

export interface SalesDashboardFeatureProps {
  mode: DashboardMode;
  displayCurrency?: DisplayCurrency;
  searchTerm?: string;
  gateway?: string;
  status?: string;
}

export interface SalesDashboardChartRow extends SalesDashboardPeriod {
  periodLabel: string;
}

export const PAYMENT_GATEWAYS: PaymentGateway[] = ["NUBANK", "HOTMART", "PAYPAL", "ASAAS", "WISE"];

export const DASHBOARD_METRICS: DashboardMetricOption[] = [
  {
    key: "totalSales",
    label: "Clientes",
    description: "Clientes no mês, metas e estrelas do período",
  },
  {
    key: "grossPayments",
    label: "Bruto",
    description: "Pagamentos elegíveis do mês (assinaturas só quando pagas)",
    currency: true,
  },
  {
    key: "netReceived",
    label: "Líquido",
    description: "Bruto − taxa gateway − comissão do vendedor",
    currency: true,
  },
  {
    key: "fixedCosts",
    label: "Custos fixos",
    description: "Total de custos fixos do calendário no mês",
    currency: true,
    costsManagersOnly: true,
  },
];
