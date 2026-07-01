import type { SaleRecord } from "@/services/commercialApi";
import { toNumberOrZero } from "@/shared/utils/number";

export const getSaleContractValue = (sale: SaleRecord): number => {
  const contract = toNumberOrZero(sale.contractValue);
  if (contract > 0) {
    return contract;
  }
  return (sale.payments ?? []).reduce((acc, payment) => acc + toNumberOrZero(payment.amount), 0);
};

export const getSaleCommissionValue = (sale: SaleRecord): number => {
  const fromCommissions = (sale.commissions ?? []).reduce((acc, commission) => acc + toNumberOrZero(commission.amount), 0);
  if (fromCommissions > 0) {
    return fromCommissions;
  }
  return (sale.payments ?? []).reduce((acc, payment) => acc + toNumberOrZero(payment.commission?.amount), 0);
};

export const getPrimaryClientName = (sale: SaleRecord): string =>
  sale.clients?.[0]?.nameCiphertext?.trim() || "Cliente";

export const getPrimaryClientPhone = (sale: SaleRecord): string =>
  sale.clients?.[0]?.telefone?.trim() || "";

export const getSaleCustomerNames = (sale: SaleRecord): string => {
  const names = (sale.clients ?? [])
    .map((client) => client.nameCiphertext?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return "Cliente não informado";
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names[0]} +${names.length - 1}`;
};

export const getSaleProductName = (sale: SaleRecord): string =>
  sale.items?.[0]?.product?.name ?? "Produto não informado";

export const getSaleSellerInfo = (sale: SaleRecord): string => {
  if (!sale.seller) {
    return "Vendedor não informado";
  }
  
  if (sale.seller.name) {
    return `${sale.seller.name} (${sale.seller.email || "sem email"})`;
  }
  
  return sale.seller.email || "Vendedor não informado";
};
