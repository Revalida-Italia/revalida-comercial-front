import { getSaleById } from "@/services/commercialApi";

/** Keep a sale that was just loaded fresh enough for the contract screen to share it. */
export const SALE_QUERY_STALE_MS = 30_000;

export function saleQueryOptions(saleId: string) {
  return {
    queryKey: ["sale", saleId] as const,
    queryFn: () => getSaleById(saleId),
    enabled: Boolean(saleId),
    staleTime: SALE_QUERY_STALE_MS,
  };
}
