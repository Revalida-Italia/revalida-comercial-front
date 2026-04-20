export type Currency = "EUR" | "USD" | "BRL";
export type PaymentType =
  | "SLOT_RESERVATION"
  | "DOWN_PAYMENT"
  | "FULL_PAYMENT"
  | "INSTALLMENT"
  | "SUBSCRIPTION";
export type PaymentGateway = "NUBANK" | "HOTMART" | "PAYPAL" | "WISE" | "ASAAS" | "PIX";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type SaleStatus = "DRAFT" | "ACTIVE" | "CANCELLED";
export type ProductCode = "MODULE_1" | "MODULE_2" | "MODULE_3" | "MODULE_4";

export interface ModuleSchedule {
  product: ProductCode;
  releaseDate: string;
  value: number;
}

export interface PaymentDraft {
  type: PaymentType;
  value: number;
  currency: Currency;
  gateway: PaymentGateway;
  firstDueDate: string;
  installments?: number;
  installmentValue?: number;
}

export interface ScheduledPayment {
  id: string;
  installmentNumber?: number;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
  paidDate?: string;
}

export interface PaymentEntry extends PaymentDraft {
  id: string;
  taxPercentage: number;
  scheduledPayments: ScheduledPayment[];
}

export interface CommissionLine {
  id: string;
  paymentMethodId: string;
  paymentType: PaymentType;
  gateway: PaymentGateway;
  installmentNumber?: number;
  paymentDate: string;
  originalAmount: number;
  originalCurrency: Currency;
  amountBRL: number;
  appliedTaxPercentage: number;
  commissionPercentage: number;
  valueAfterTaxBRL: number;
  finalValueBRL: number;
  status: PaymentStatus;
}

export interface Sale {
  id: string;
  sellerId: string;
  sellerName: string;
  createdAt: string;
  clientNames: string[];
  slots: number;
  contractValue: number;
  contractValueBRL: number;
  currency: Currency;
  products: ProductCode[];
  moduleSchedules: ModuleSchedule[];
  payments: PaymentEntry[];
  commissionLines: CommissionLine[];
  sellerCommissionPercentage: number;
  totalCommissionBRL: number;
  totalReceivedBRL: number;
  totalPendingBRL: number;
  status: SaleStatus;
}

export interface SaleDraftInput {
  sellerId?: string;
  sellerName?: string;
  createdAt?: string;
  clientNames: string[];
  slots: number;
  contractValue: number;
  currency: Currency;
  moduleSchedules: ModuleSchedule[];
  payments: PaymentDraft[];
  sellerCommissionPercentage?: number;
  status?: SaleStatus;
}

export const demoSellerId = "seller-paula";
export const demoSellerName = "Paula Costa";
export const defaultCommissionPercentage = 5;
export const storageKey = "sales-flow.mock-sales.v2";

export const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  BRL: "R$",
};

export const currencyLabels: Record<Currency, string> = {
  EUR: "Euro",
  USD: "Dólar",
  BRL: "Real",
};

export const conversionRatesToBRL: Record<Currency, number> = {
  EUR: 6.2,
  USD: 5.4,
  BRL: 1,
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  SLOT_RESERVATION: "Reserva de vaga",
  DOWN_PAYMENT: "Entrada",
  FULL_PAYMENT: "Pagamento à vista",
  INSTALLMENT: "Parcelamento",
  SUBSCRIPTION: "Assinatura",
};

export const paymentTypeDescriptions: Record<PaymentType, string> = {
  SLOT_RESERVATION: "Reserva de vaga via PIX.",
  DOWN_PAYMENT: "Entrada inicial; o restante pode ser lançado em outras linhas.",
  FULL_PAYMENT: "Liquidação integral em um único pagamento.",
  INSTALLMENT: "Comissão calculada por parcela paga.",
  SUBSCRIPTION: "Pagamentos recorrentes com cálculo por cobrança.",
};

export const gatewayLabels: Record<PaymentGateway, string> = {
  NUBANK: "Nubank",
  HOTMART: "Hotmart",
  PAYPAL: "PayPal",
  WISE: "Wise",
  ASAAS: "Asaas",
  PIX: "PIX",
};

export const gatewayOptions: PaymentGateway[] = ["NUBANK", "HOTMART", "PAYPAL", "WISE", "ASAAS", "PIX"];

export const moduleNames: Record<ProductCode, string> = {
  MODULE_1: "Módulo 1",
  MODULE_2: "Módulo 2",
  MODULE_3: "Módulo 3",
  MODULE_4: "Módulo 4",
};

export const productOptions: ProductCode[] = ["MODULE_1", "MODULE_2", "MODULE_3", "MODULE_4"];

export const saleStatusLabels: Record<SaleStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

export const paymentTaxRules: Record<PaymentGateway, Record<PaymentType, number>> = {
  HOTMART: {
    SLOT_RESERVATION: 4,
    DOWN_PAYMENT: 4,
    FULL_PAYMENT: 4,
    INSTALLMENT: 17,
    SUBSCRIPTION: 4,
  },
  ASAAS: {
    SLOT_RESERVATION: 4,
    DOWN_PAYMENT: 4,
    FULL_PAYMENT: 4,
    INSTALLMENT: 17,
    SUBSCRIPTION: 4,
  },
  NUBANK: {
    SLOT_RESERVATION: 2,
    DOWN_PAYMENT: 2,
    FULL_PAYMENT: 2,
    INSTALLMENT: 2,
    SUBSCRIPTION: 2,
  },
  WISE: {
    SLOT_RESERVATION: 2,
    DOWN_PAYMENT: 2,
    FULL_PAYMENT: 2,
    INSTALLMENT: 2,
    SUBSCRIPTION: 2,
  },
  PAYPAL: {
    SLOT_RESERVATION: 10,
    DOWN_PAYMENT: 10,
    FULL_PAYMENT: 10,
    INSTALLMENT: 10,
    SUBSCRIPTION: 10,
  },
  PIX: {
    SLOT_RESERVATION: 0,
    DOWN_PAYMENT: 0,
    FULL_PAYMENT: 0,
    INSTALLMENT: 0,
    SUBSCRIPTION: 0,
  },
};

export const monthlyCostOptions = [
  { monthLabel: "Abril/2026", amount: 28500 },
  { monthLabel: "Maio/2026", amount: 31200 },
];

const today = new Date("2026-04-13T12:00:00");

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const shiftMonths = (dateString: string, months: number) => {
  const baseDate = new Date(dateString);
  if (Number.isNaN(baseDate.getTime())) {
    return formatDateOnly(today);
  }

  const shiftedDate = new Date(baseDate);
  shiftedDate.setMonth(shiftedDate.getMonth() + months);
  return formatDateOnly(shiftedDate);
};

export const convertToBRL = (amount: number, currency: Currency) => roundCurrency(amount * conversionRatesToBRL[currency]);

export const getGatewayTaxRate = (gateway: PaymentGateway, paymentType: PaymentType) => paymentTaxRules[gateway][paymentType] ?? 0;

const getNormalizedPaymentTotal = (payment: PaymentDraft) => {
  if (payment.type === "INSTALLMENT" || payment.type === "SUBSCRIPTION") {
    const installments = payment.installments ?? 1;
    const installmentValue = payment.installmentValue ?? payment.value / installments;
    return roundCurrency(installments * installmentValue);
  }

  return roundCurrency(payment.value);
};

const buildScheduledPayments = (payment: PaymentDraft): ScheduledPayment[] => {
  if (payment.type === "INSTALLMENT" || payment.type === "SUBSCRIPTION") {
    const installments = Math.max(payment.installments ?? 1, 1);
    const installmentValue = roundCurrency(payment.installmentValue ?? payment.value / installments);

    return Array.from({ length: installments }, (_, index) => {
      const dueDate = shiftMonths(payment.firstDueDate, index);
      const due = new Date(dueDate);
      const isPaid = !Number.isNaN(due.getTime()) && due <= today;

      return {
        id: createId("scheduled"),
        installmentNumber: index + 1,
        dueDate,
        amount: installmentValue,
        status: isPaid ? "PAID" : "PENDING",
        paidDate: isPaid ? dueDate : undefined,
      };
    });
  }

  const parsedDate = new Date(payment.firstDueDate);
  const isPaid = !Number.isNaN(parsedDate.getTime()) && parsedDate <= today;

  return [
    {
      id: createId("scheduled"),
      dueDate: payment.firstDueDate,
      amount: roundCurrency(payment.value),
      status: isPaid ? "PAID" : "PENDING",
      paidDate: isPaid ? payment.firstDueDate : undefined,
    },
  ];
};

const buildPaymentEntry = (payment: PaymentDraft): PaymentEntry => {
  const normalizedTotal = getNormalizedPaymentTotal(payment);

  return {
    ...payment,
    id: createId("payment"),
    value: normalizedTotal,
    taxPercentage: getGatewayTaxRate(payment.gateway, payment.type),
    scheduledPayments: buildScheduledPayments({ ...payment, value: normalizedTotal }),
  };
};

const buildCommissionLines = (payments: PaymentEntry[], commissionPercentage: number): CommissionLine[] =>
  payments.flatMap((payment) =>
    payment.scheduledPayments.map((scheduledPayment) => {
      const amountBRL = convertToBRL(scheduledPayment.amount, payment.currency);
      const valueAfterTaxBRL = roundCurrency(amountBRL * (1 - payment.taxPercentage / 100));
      const finalValueBRL = roundCurrency(valueAfterTaxBRL * (commissionPercentage / 100));

      return {
        id: createId("commission"),
        paymentMethodId: payment.id,
        paymentType: payment.type,
        gateway: payment.gateway,
        installmentNumber: scheduledPayment.installmentNumber,
        paymentDate: scheduledPayment.paidDate ?? scheduledPayment.dueDate,
        originalAmount: scheduledPayment.amount,
        originalCurrency: payment.currency,
        amountBRL,
        appliedTaxPercentage: payment.taxPercentage,
        commissionPercentage,
        valueAfterTaxBRL,
        finalValueBRL,
        status: scheduledPayment.status,
      };
    })
  );

export const buildSaleFromDraft = (draft: SaleDraftInput): Sale => {
  const payments = draft.payments.map(buildPaymentEntry);
  const commissionPercentage = draft.sellerCommissionPercentage ?? defaultCommissionPercentage;
  const commissionLines = buildCommissionLines(payments, commissionPercentage);
  const totalReceivedBRL = roundCurrency(
    commissionLines
      .filter((line) => line.status === "PAID")
      .reduce((total, line) => total + line.amountBRL, 0)
  );
  const totalPendingBRL = roundCurrency(
    commissionLines
      .filter((line) => line.status === "PENDING")
      .reduce((total, line) => total + line.amountBRL, 0)
  );
  const totalCommissionBRL = roundCurrency(
    commissionLines.reduce((total, line) => total + line.finalValueBRL, 0)
  );
  const hasPaidLine = commissionLines.some((line) => line.status === "PAID");
  const hasPendingLine = commissionLines.some((line) => line.status === "PENDING");

  return {
    id: createId("sale"),
    sellerId: draft.sellerId ?? demoSellerId,
    sellerName: draft.sellerName ?? demoSellerName,
    createdAt: draft.createdAt ?? formatDateOnly(today),
    clientNames: draft.clientNames,
    slots: draft.slots,
    contractValue: roundCurrency(draft.contractValue),
    contractValueBRL: convertToBRL(draft.contractValue, draft.currency),
    currency: draft.currency,
    products: draft.moduleSchedules.map((schedule) => schedule.product),
    moduleSchedules: draft.moduleSchedules,
    payments,
    commissionLines,
    sellerCommissionPercentage: commissionPercentage,
    totalCommissionBRL,
    totalReceivedBRL,
    totalPendingBRL,
    status: draft.status ?? (hasPaidLine || hasPendingLine ? "ACTIVE" : "DRAFT"),
  };
};

export const previewSaleFromDraft = (draft: SaleDraftInput) => buildSaleFromDraft(draft);

const initialSales: Sale[] = [
  buildSaleFromDraft({
    sellerId: demoSellerId,
    sellerName: demoSellerName,
    createdAt: "2026-04-02",
    clientNames: ["Marina Freitas"],
    slots: 1,
    contractValue: 18000,
    currency: "BRL",
    moduleSchedules: [
      { product: "MODULE_1", releaseDate: "2026-04-08", value: 9000 },
      { product: "MODULE_2", releaseDate: "2026-05-08", value: 9000 },
    ],
    payments: [
      {
        type: "SLOT_RESERVATION",
        value: 1500,
        currency: "BRL",
        gateway: "PIX",
        firstDueDate: "2026-04-02",
      },
      {
        type: "INSTALLMENT",
        value: 16500,
        currency: "BRL",
        gateway: "HOTMART",
        firstDueDate: "2026-04-10",
        installments: 5,
        installmentValue: 3300,
      },
    ],
  }),
  buildSaleFromDraft({
    sellerId: demoSellerId,
    sellerName: demoSellerName,
    createdAt: "2026-04-11",
    clientNames: ["Leonardo Mota", "Fernanda Mota"],
    slots: 2,
    contractValue: 6200,
    currency: "USD",
    moduleSchedules: [
      { product: "MODULE_1", releaseDate: "2026-04-18", value: 2200 },
      { product: "MODULE_2", releaseDate: "2026-05-20", value: 2000 },
      { product: "MODULE_3", releaseDate: "2026-06-15", value: 2000 },
    ],
    payments: [
      {
        type: "DOWN_PAYMENT",
        value: 1400,
        currency: "USD",
        gateway: "NUBANK",
        firstDueDate: "2026-04-11",
      },
      {
        type: "SUBSCRIPTION",
        value: 4800,
        currency: "USD",
        gateway: "WISE",
        firstDueDate: "2026-05-11",
        installments: 6,
        installmentValue: 800,
      },
    ],
  }),
  buildSaleFromDraft({
    sellerId: "seller-joana",
    sellerName: "Joana Santos",
    createdAt: "2026-04-03",
    clientNames: ["Rafael Lima"],
    slots: 1,
    contractValue: 4200,
    currency: "EUR",
    moduleSchedules: [{ product: "MODULE_4", releaseDate: "2026-04-25", value: 4200 }],
    sellerCommissionPercentage: 7,
    payments: [
      {
        type: "FULL_PAYMENT",
        value: 4200,
        currency: "EUR",
        gateway: "PAYPAL",
        firstDueDate: "2026-04-03",
      },
    ],
  }),
  buildSaleFromDraft({
    sellerId: "seller-carla",
    sellerName: "Carla Oliveira",
    createdAt: "2026-04-05",
    clientNames: ["Bianca Vieira"],
    slots: 1,
    contractValue: 12500,
    currency: "BRL",
    moduleSchedules: [
      { product: "MODULE_1", releaseDate: "2026-04-15", value: 3000 },
      { product: "MODULE_2", releaseDate: "2026-05-15", value: 3000 },
      { product: "MODULE_3", releaseDate: "2026-06-15", value: 3000 },
      { product: "MODULE_4", releaseDate: "2026-07-15", value: 3500 },
    ],
    sellerCommissionPercentage: 4,
    payments: [
      {
        type: "DOWN_PAYMENT",
        value: 2500,
        currency: "BRL",
        gateway: "ASAAS",
        firstDueDate: "2026-04-05",
      },
      {
        type: "INSTALLMENT",
        value: 10000,
        currency: "BRL",
        gateway: "ASAAS",
        firstDueDate: "2026-05-05",
        installments: 4,
        installmentValue: 2500,
      },
    ],
  }),
];

const readStoredSales = (): Sale[] => {
  if (typeof window === "undefined") {
    return initialSales;
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    return initialSales;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Sale[];
    return Array.isArray(parsedValue) && parsedValue.length > 0 ? parsedValue : initialSales;
  } catch {
    return initialSales;
  }
};

const persistSales = (sales: Sale[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(sales));
};

export const getSales = () => readStoredSales();

export const getSellerSales = (sellerId = demoSellerId) =>
  getSales().filter((sale) => sale.sellerId === sellerId);

export const createMockSale = (draft: SaleDraftInput) => {
  const sale = buildSaleFromDraft({
    ...draft,
    sellerId: draft.sellerId ?? demoSellerId,
    sellerName: draft.sellerName ?? demoSellerName,
  });
  const nextSales = [sale, ...getSales()];
  persistSales(nextSales);
  return sale;
};

export const getCurrentMonthlyCost = () => monthlyCostOptions[0].amount;

export const getMonthlyPaidAmountBRL = (sales: Sale[]) =>
  roundCurrency(
    sales
      .flatMap((sale) => sale.commissionLines)
      .filter((line) => line.status === "PAID")
      .reduce((total, line) => total + line.amountBRL, 0)
  );

export const getMonthlyCommissionBRL = (sales: Sale[]) =>
  roundCurrency(
    sales
      .flatMap((sale) => sale.commissionLines)
      .filter((line) => line.status !== "CANCELLED")
      .reduce((total, line) => total + line.finalValueBRL, 0)
  );

export const formatPercent = (value: number) => `${roundCurrency(value)}%`;

export const formatMoney = (value: number, currency: Currency = "BRL") => {
  const locale = currency === "BRL" ? "pt-BR" : "en-US";
  const symbol = currencySymbols[currency];
  return `${symbol} ${roundCurrency(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const getSellerSummary = (sellerId = demoSellerId) => {
  const sales = getSellerSales(sellerId);
  const totalContractsBRL = roundCurrency(sales.reduce((total, sale) => total + sale.contractValueBRL, 0));
  const totalSlots = sales.reduce((total, sale) => total + sale.slots, 0);
  const totalCommissionBRL = getMonthlyCommissionBRL(sales);
  const paidAmountBRL = getMonthlyPaidAmountBRL(sales);
  const pendingLines = sales.flatMap((sale) => sale.commissionLines).filter((line) => line.status === "PENDING").length;

  return {
    sales,
    totalContractsBRL,
    totalSlots,
    totalCommissionBRL,
    paidAmountBRL,
    pendingLines,
  };
};

export const getAdminSummary = () => {
  const sales = getSales();
  const totalContractsBRL = roundCurrency(sales.reduce((total, sale) => total + sale.contractValueBRL, 0));
  const paidAmountBRL = getMonthlyPaidAmountBRL(sales);
  const totalCommissionBRL = getMonthlyCommissionBRL(sales);
  const monthlyCost = getCurrentMonthlyCost();
  const margin = monthlyCost > 0 ? roundCurrency((paidAmountBRL / monthlyCost) * 100) : 0;

  const commissionsBySeller = Object.values(
    sales.reduce<Record<string, { sellerName: string; commissionRate: number; totalCommissionBRL: number; paidAmountBRL: number; salesCount: number }>>(
      (accumulator, sale) => {
        const current = accumulator[sale.sellerId] ?? {
          sellerName: sale.sellerName,
          commissionRate: sale.sellerCommissionPercentage,
          totalCommissionBRL: 0,
          paidAmountBRL: 0,
          salesCount: 0,
        };

        current.totalCommissionBRL += sale.totalCommissionBRL;
        current.paidAmountBRL += sale.totalReceivedBRL;
        current.salesCount += 1;
        accumulator[sale.sellerId] = current;
        return accumulator;
      },
      {}
    )
  ).map((summary) => ({
    ...summary,
    totalCommissionBRL: roundCurrency(summary.totalCommissionBRL),
    paidAmountBRL: roundCurrency(summary.paidAmountBRL),
  }));

  return {
    sales,
    totalContractsBRL,
    paidAmountBRL,
    totalCommissionBRL,
    monthlyCost,
    margin,
    commissionsBySeller,
  };
};
