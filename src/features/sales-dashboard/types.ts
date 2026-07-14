import type { PaymentGateway, SalesDashboardPeriod } from "@/services/commercialApi";

export type DashboardMode = "seller" | "admin";

export type DashboardMetricKey =
  | "totalSales"
  | "totalSalesAmount"
  | "totalComission"
  | "starsInPeriod"
  | "minimumMonthlySales";

export interface DashboardMetricOption {
  key: DashboardMetricKey;
  label: string;
  description: string;
}

export interface SalesDashboardFeatureProps {
  mode: DashboardMode;
}

export interface SalesDashboardChartRow extends SalesDashboardPeriod {
  periodLabel: string;
}

export const PAYMENT_GATEWAYS: PaymentGateway[] = ["NUBANK", "HOTMART", "PAYPAL", "ASAAS", "WISE"];

export const DASHBOARD_METRICS: DashboardMetricOption[] = [
  {
    key: "totalSales",
    label: "Quantidade de clientes",
    description: "Total de clientes nas vendas do periodo",
  },
  {
    key: "totalSalesAmount",
    label: "Valor vendido",
    description: "Soma do valor de contrato no periodo",
  },
  {
    key: "totalComission",
    label: "Comissao",
    description: "Comissao total valida no periodo",
  },
  {
    key: "starsInPeriod",
    label: "Estrelas",
    description: "Estrelas conquistadas no periodo",
  },
  {
    key: "minimumMonthlySales",
    label: "Meta minima",
    description: "Meta minima mensal do plano vigente",
  },
];
