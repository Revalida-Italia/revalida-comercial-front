import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { getSaleById } from "@/services/commercialApi";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import { saleSummaryPropsFromRecord } from "./saleSummaryFromRecord";

export default function SaleSummaryFromRecord({ saleId }: { saleId: string }) {
  const saleQuery = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => getSaleById(saleId),
    enabled: Boolean(saleId),
  });

  if (!saleId) return null;

  if (saleQuery.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t("common.loading")}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (saleQuery.isError || !saleQuery.data) {
    return (
      <div>
        <p className="mb-3 text-sm">{t("contract.page.saleLoadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void saleQuery.refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return <SaleSummary {...saleSummaryPropsFromRecord(saleQuery.data)} />;
}
