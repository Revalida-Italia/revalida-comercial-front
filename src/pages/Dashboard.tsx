import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DisplayCurrencySelect from "@/components/DisplayCurrencySelect";
import SaleListCard from "@/features/sales/organisms/SaleListCard";
import SalesFiltersCard from "@/features/sales/organisms/SalesFiltersCard";
import SalesSummaryCards from "@/features/sales/organisms/SalesSummaryCards";
import SalesDashboardFeature from "@/features/sales-dashboard/SalesDashboardFeature";
import { t } from "@/i18n";
import { canViewGlobalSalesExtras, getProfile } from "@/lib/session";
import { canMutateSales } from "@/services/usersApi";
import { listSales, type ExchangeScope } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "use-debounce";

const Dashboard = () => {
  const canSeeGlobalSalesExtras = canViewGlobalSalesExtras();
  const [searchTerm, setSearchTerm] = useState("");
  const [gateway, setGateway] = useState("all");
  const [status, setStatus] = useState("all");
  const [exchangeScope, setExchangeScope] = useState<ExchangeScope>("all");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("BRL");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const salesQuery = useQuery({
    queryKey: ["sales", debouncedSearchTerm, gateway, status, exchangeScope, displayCurrency],
    queryFn: () => listSales({
      searchTerm: debouncedSearchTerm || undefined,
      gateway: gateway !== "all" ? gateway : undefined,
      status: status !== "all" ? status : undefined,
      exchangeScope: exchangeScope !== "all" ? exchangeScope : undefined,
      displayCurrency,
    }),
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setGateway("all");
    setStatus("all");
    setExchangeScope("all");
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
  const ratesStale = Boolean(summary.ratesStale);
  const rateDate = summary.rateDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 px-4 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard comercial</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Resumo, metas e histórico de vendas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DisplayCurrencySelect
            value={displayCurrency}
            onChange={setDisplayCurrency}
            ratesStale={ratesStale}
            rateDate={rateDate}
            label="Moeda do balanço"
          />
        </div>
      </div>

      <SalesSummaryCards
        summary={summary}
        sales={sales}
        canViewFixedCosts={canSeeGlobalSalesExtras}
        displayCurrency={displayCurrency}
      />

      <div className="space-y-2">
        <SalesFiltersCard
          searchTerm={searchTerm}
          gateway={gateway}
          status={status}
          exchangeScope={exchangeScope}
          onSearchTermChange={setSearchTerm}
          onGatewayChange={setGateway}
          onStatusChange={setStatus}
          onExchangeScopeChange={(value) => setExchangeScope(value as ExchangeScope)}
          onClearFilters={handleClearFilters}
          compact
          showStatusFilter={canSeeGlobalSalesExtras}
        />

        <SalesDashboardFeature
          mode="seller"
          displayCurrency={displayCurrency}
          searchTerm={debouncedSearchTerm}
          gateway={gateway !== "all" ? gateway : undefined}
          status={status !== "all" ? status : undefined}
          exchangeScope={exchangeScope !== "all" ? exchangeScope : undefined}
        />
      </div>

      <section className="space-y-3" aria-labelledby="sales-list-title">
        <h2 id="sales-list-title" className="text-xl font-semibold">{t("sales.list.title")}</h2>
        {salesQuery.isLoading ? (
          <div className="sale-list" aria-busy="true" aria-label={t("common.loading")}>
            {[1, 2, 3].map((item) => (
              <div key={item} className="sale-card rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(36,56,79,0.06)]">
                <div className="sale-card-head space-y-2">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="sale-card-nums">
                  {[1, 2, 3, 4].map((cell) => (
                    <div key={cell} className="space-y-2">
                      <div className="h-3 w-16 rounded bg-muted" />
                      <div className="h-4 w-20 rounded bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="sale-card-acts">
                  <div className="h-9 w-36 rounded bg-muted" />
                  <div className="h-9 w-9 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : salesQuery.isError ? (
          <div className="rounded-md bg-card p-6 shadow-[0_1px_2px_rgba(36,56,79,0.06)]">
            <p className="text-sm">{t("sales.list.error")}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void salesQuery.refetch()}>
              {t("sales.list.retry")}
            </Button>
          </div>
        ) : sales.length === 0 ? (
          <div className="rounded-md bg-card p-6 shadow-[0_1px_2px_rgba(36,56,79,0.06)]">
            <p className="text-sm">{t("sales.list.empty")}</p>
            {canMutateSales(getProfile()?.role) ? (
              <Button asChild className="mt-3">
                <Link to="/nova-venda">{t("sales.list.emptyAction")}</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="sale-list">
            {sales.map((sale) => (
              <SaleListCard key={sale.id} sale={sale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
