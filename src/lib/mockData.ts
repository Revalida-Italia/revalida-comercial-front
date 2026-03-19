export interface Sale {
  id: string;
  date: string;
  clientNames: string[];
  slots: number;
  contractValue: number;
  currency: "EUR" | "USD" | "BRL";
  modules: number[];
  moduleDates: Record<number, string>;
  payments: PaymentEntry[];
  commission?: number;
  status: "pendente" | "processado";
}

export interface PaymentEntry {
  type: "reserva" | "entrada" | "avista" | "parcelamento" | "recorrencia";
  value: number;
  currency: "EUR" | "USD" | "BRL";
  gateway: string;
  installments?: number;
  installmentValue?: number;
}

export const mockSales: Sale[] = [
  {
    id: "1",
    date: "2026-03-15",
    clientNames: ["Maria Silva"],
    slots: 1,
    contractValue: 5000,
    currency: "EUR",
    modules: [1, 2],
    moduleDates: { 1: "2026-04-01", 2: "2026-05-01" },
    payments: [
      { type: "reserva", value: 500, currency: "EUR", gateway: "Nubank" },
      { type: "parcelamento", value: 4500, currency: "EUR", gateway: "Hotmart", installments: 6, installmentValue: 750 },
    ],
    commission: 215.5,
    status: "processado",
  },
  {
    id: "2",
    date: "2026-03-10",
    clientNames: ["João Santos", "Ana Costa"],
    slots: 2,
    contractValue: 8000,
    currency: "BRL",
    modules: [1, 2, 3],
    moduleDates: { 1: "2026-04-01", 2: "2026-05-15", 3: "2026-06-01" },
    payments: [
      { type: "avista", value: 8000, currency: "BRL", gateway: "Nubank" },
    ],
    status: "pendente",
  },
  {
    id: "3",
    date: "2026-03-05",
    clientNames: ["Carlos Mendes"],
    slots: 1,
    contractValue: 3500,
    currency: "USD",
    modules: [1],
    moduleDates: { 1: "2026-04-01" },
    payments: [
      { type: "entrada", value: 1000, currency: "USD", gateway: "PayPal" },
      { type: "recorrencia", value: 2500, currency: "USD", gateway: "Asaas", installments: 5, installmentValue: 500 },
    ],
    commission: 145.25,
    status: "processado",
  },
];

export const currencySymbols: Record<string, string> = {
  EUR: "€",
  USD: "$",
  BRL: "R$",
};

export const paymentTypeLabels: Record<string, string> = {
  reserva: "Reserva de Vaga",
  entrada: "Entrada",
  avista: "À Vista",
  parcelamento: "Parcelamento",
  recorrencia: "Assinatura/Recorrência",
};

export const gatewayOptions = ["Nubank", "Hotmart", "PayPal", "Wise", "Asaas"];

export const moduleNames: Record<number, string> = {
  1: "Módulo 1",
  2: "Módulo 2",
  3: "Módulo 3",
  4: "Módulo 4",
};
