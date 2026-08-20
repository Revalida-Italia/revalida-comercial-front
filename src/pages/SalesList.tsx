import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DisplayCurrencySelect from "@/components/DisplayCurrencySelect";
import SaleListCard from "@/features/sales/organisms/SaleListCard";
import SalesFiltersCard from "@/features/sales/organisms/SalesFiltersCard";
import SalesSummaryCards from "@/features/sales/organisms/SalesSummaryCards";
import { getProfile } from "@/lib/session";
import { canViewAllSales } from "@/services/usersApi";
import { listSales } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "use-debounce";

const SalesList = () => {
  const profile = getProfile();
  const canSeeGlobalSalesExtras = canViewAllSales(profile?.role);
  const [searchTerm, setSearchTerm] = useState("");
  const [gateway, setGateway] = useState("all");
  const [status, setStatus] = useState("all");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("BRL");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const salesQuery = useQuery({
    queryKey: ["sales", debouncedSearchTerm, gateway, status, displayCurrency],
    queryFn: () => listSales({
      searchTerm: debouncedSearchTerm || undefined,
      gateway: gateway !== "all" ? gateway : undefined,
      status: status !== "all" ? status : undefined,
      displayCurrency,
    }),
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setGateway("all");
    setStatus("all");
  };

  const sales = salesQuery.data?.sales ?? [];
  const summary = salesQuery.data?.summary ?? {
    totalSales: 0,
    totalAmount: 0,
    grossPaymentsThisMonth: 0,
    totalGatewayFeesThisMonth: 0,
    netReceivedThisMonth: 0,
    comission: 0,
    comissionFuture: 0,
    totalFixedCostsThisMonth: 0,
    netMarginThisMonth: 0,
    netMarginPercent: 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 p-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Histórico comercial com resumo financeiro e acesso ao detalhe completo.</p>
        </div>
        <DisplayCurrencySelect
          value={displayCurrency}
          onChange={setDisplayCurrency}
          ratesStale={Boolean(summary.ratesStale)}
          rateDate={summary.rateDate}
          label="Moeda do balanço"
        />
      </div>

      <SalesSummaryCards
        summary={summary}
        sales={sales}
        isAdmin={canSeeGlobalSalesExtras}
        displayCurrency={displayCurrency}
      />

      <SalesFiltersCard
        searchTerm={searchTerm}
        gateway={gateway}
        status={status}
        onSearchTermChange={setSearchTerm}
        onGatewayChange={setGateway}
        onStatusChange={setStatus}
        onClearFilters={handleClearFilters}
        showStatusFilter={canSeeGlobalSalesExtras}
      />

      <Card>
        <CardContent className="space-y-2.5 p-3 md:p-4">
          {salesQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao carregar vendas: {(salesQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          )}

          {salesQuery.isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/70">
                  <CardContent className="p-3.5">
                        <div className="grid gap-x-3 gap-y-2 md:grid-cols-[1.25fr_repeat(5,minmax(0,1fr))_auto] md:items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda encontrada.</p>
          ) : (
            sales.map((sale) => (
              <SaleListCard key={sale.id} sale={sale} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesList;
