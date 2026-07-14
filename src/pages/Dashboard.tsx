import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import SaleListCard from "@/features/sales/organisms/SaleListCard";
import SalesFiltersCard from "@/features/sales/organisms/SalesFiltersCard";
import SalesSummaryCards from "@/features/sales/organisms/SalesSummaryCards";
import SalesDashboardFeature from "@/features/sales-dashboard/SalesDashboardFeature";
import { hasRole } from "@/lib/session";
import { listSales } from "@/services/commercialApi";

const Dashboard = () => {
  const isAdmin = hasRole("ADMIN");
  const [searchTerm, setSearchTerm] = useState("");
  const [gateway, setGateway] = useState("all");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const salesQuery = useQuery({
    queryKey: ["sales", debouncedSearchTerm, gateway],
    queryFn: () => listSales({
      searchTerm: debouncedSearchTerm || undefined,
      gateway: gateway !== "all" ? gateway : undefined,
    }),
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setGateway("all");
  };

  const sales = salesQuery.data?.sales ?? [];
  const summary = salesQuery.data?.summary ?? {
    totalSales: 0,
    totalAmount: 0,
    comission: 0,
    comissionFuture: 0,
    totalFixedCostsThisMonth: 0,
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard comercial</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Resumo, metas e histórico de vendas.
        </p>
      </div>

      <SalesSummaryCards summary={summary} isAdmin={isAdmin} />

      <div className="space-y-2">
        <SalesFiltersCard
          searchTerm={searchTerm}
          gateway={gateway}
          onSearchTermChange={setSearchTerm}
          onGatewayChange={setGateway}
          onClearFilters={handleClearFilters}
          compact
        />

        <SalesDashboardFeature mode="seller" />
      </div>

      <Card>
        <CardHeader className="px-3 pb-1.5 pt-3 md:px-4">
          <CardTitle className="text-base">Vendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0 md:p-4 md:pt-0">
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
                    <div className="grid gap-x-3 gap-y-2 md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))_auto] md:items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
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

export default Dashboard;
