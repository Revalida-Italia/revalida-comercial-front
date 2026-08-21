import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Bar, CartesianGrid, ComposedChart, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import { AlertCircle, Star as LucideStar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisplayCurrencySelect from "@/components/DisplayCurrencySelect";
import { useToast } from "@/hooks/use-toast";
import { canViewFixedCosts } from "@/lib/session";
import {
  fetchSalesDashboard,
  type PaymentGateway,
  type SalesDashboardCareerPlanSummary,
} from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import { listUsers, searchUsers, type UserSearchResult } from "@/services/usersApi";
import UserSearchCard from "@/features/admin-career-plan/organisms/UserSearchCard";
import { formatCurrency } from "@/shared/utils/format";
import { toNumberOrZero } from "@/shared/utils/number";
import {
  DASHBOARD_METRICS,
  type DashboardMetricKey,
  type SalesDashboardFeatureProps,
} from "./types";
import { formatDashboardPeriod, toChartRows } from "./utils";

const BAR_SLOT_PX = 56;

const chartConfig = {
  totalSales: {
    label: "Clientes",
    color: "#0c3559",
  },
  grossPayments: {
    label: "Bruto",
    color: "#6d28d9",
  },
  netReceived: {
    label: "Líquido",
    color: "#0369a1",
  },
  fixedCosts: {
    label: "Custos fixos",
    color: "#b45309",
  },
  minimumMonthlySales: {
    label: "Meta mínima",
    color: "#4c87b5",
  },
  monthlyGoalSales: {
    label: "Meta do mês",
    color: "#1a6ea8",
  },
  starsInPeriod: {
    label: "Estrelas",
    color: "#0c3559",
  },
} satisfies ChartConfig;

type GoalLineBadgeProps = {
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
  };
  value?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
};

type SalesCountBadgeProps = {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
};

type StarBadgeProps = {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
};

const GoalLineBadge = ({ viewBox, value, bgColor, borderColor, textColor }: GoalLineBadgeProps) => {
  if (!value) {
    return null;
  }

  const lineRightX = (viewBox?.x ?? 0) + (viewBox?.width ?? 0);
  const lineY = viewBox?.y ?? 0;
  const paddingX = 8;
  const badgeHeight = 18;
  const estimatedTextWidth = Math.max(56, value.length * 6.4);
  const badgeWidth = estimatedTextWidth + paddingX * 2;
  const badgeX = Math.max(0, lineRightX - badgeWidth - 6);
  const badgeY = lineY - badgeHeight - 4;

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={9}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={1}
      />
      <text
        x={badgeX + badgeWidth / 2}
        y={badgeY + 12.5}
        textAnchor="middle"
        fill={textColor}
        fontSize={10}
        fontWeight={600}
      >
        {value}
      </text>
    </g>
  );
};

const SalesCountBadge = ({ x = 0, y = 0, width = 0, value }: SalesCountBadgeProps) => {
  if (value == null || value === "") {
    return null;
  }

  const label = String(value);
  const badgeWidth = Math.max(22, label.length * 7 + 10);
  const badgeHeight = 18;
  const badgeX = x + width / 2 - badgeWidth / 2;
  const badgeY = y - badgeHeight - 4;

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={9}
        fill="#0c3559"
      />
      <text
        x={badgeX + badgeWidth / 2}
        y={badgeY + 12.5}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={10}
        fontWeight={700}
      >
        {label}
      </text>
    </g>
  );
};

const StarBadge = ({ x = 0, y = 0, width = 0, value }: StarBadgeProps) => {
  const starCount = Number(value ?? 0);
  if (!Number.isFinite(starCount) || starCount <= 0) {
    return null;
  }

  const starSize = 10;
  const starSpacing = 2;
  const padding = 4;
  const badgeWidth = padding * 2 + starCount * starSize + Math.max(0, starCount - 1) * starSpacing;
  const badgeHeight = 18;
  const badgeX = x + width / 2 - badgeWidth / 2;
  const badgeY = y + 4;

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={9}
        fill="#fff8e6"
        stroke="#d49300"
        strokeWidth={1}
      />
      {Array.from({ length: starCount }).map((_, index) => (
        <LucideStar
          key={index}
          x={badgeX + padding + index * (starSize + starSpacing)}
          y={badgeY + 4}
          width={starSize}
          height={starSize}
          className="text-[#d49300]"
          fill="#f5b301"
          stroke="#d49300"
          strokeWidth={1.6}
        />
      ))}
    </g>
  );
};

function getMetricValue(row: ReturnType<typeof toChartRows>[number], metric: DashboardMetricKey) {
  if (metric === "totalSales") {
    return toNumberOrZero(row.totalSales);
  }
  if (metric === "grossPayments") {
    return toNumberOrZero(row.grossPayments);
  }
  if (metric === "netReceived") {
    return toNumberOrZero(row.netReceived);
  }
  return toNumberOrZero(row.fixedCosts);
}

const ChartPanel = ({
  isLoading,
  isError,
  onRetry,
  periodsEmpty,
  chartRows,
  chartMaxY,
  chartMinWidthPx,
  minimumGoalLineValue,
  monthlyGoalLineValue,
  latestPeriod,
  periodsCount,
  activeMetric,
  onMetricChange,
  availableMetrics,
  displayCurrency,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  periodsEmpty: boolean;
  chartRows: ReturnType<typeof toChartRows>;
  chartMaxY: number;
  chartMinWidthPx: number;
  minimumGoalLineValue: number;
  monthlyGoalLineValue: number;
  latestPeriod?: string;
  periodsCount: number;
  activeMetric: DashboardMetricKey;
  onMetricChange: (metric: DashboardMetricKey) => void;
  availableMetrics: typeof DASHBOARD_METRICS;
  displayCurrency: DisplayCurrency;
}) => {
  const metricOption = availableMetrics.find((item) => item.key === activeMetric) ?? availableMetrics[0];
  const isClientsMetric = activeMetric === "totalSales";
  const isCurrencyMetric = Boolean(metricOption?.currency);
  const metricColorVar = `var(--color-${activeMetric})`;

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Erro ao carregar dados do dashboard.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
        <CardHeader className="space-y-2 p-3 pb-0">
          <Skeleton className="h-5 w-52" />
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <Skeleton className="h-[210px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (periodsEmpty) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Tabs value={activeMetric} onValueChange={(value) => onMetricChange(value as DashboardMetricKey)}>
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              {availableMetrics.map((metric) => (
                <TabsTrigger key={metric.key} value={metric.key} className="text-xs">
                  {metric.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sem dados para os filtros selecionados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
      <CardHeader className="space-y-2 p-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base text-[#0c3559]">
              {isClientsMetric ? "Histórico de clientes vs metas" : `Histórico — ${metricOption.label}`}
            </CardTitle>
            <CardDescription className="text-xs">{metricOption.description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge className="border-[#b4cde0] bg-[#e9f2f9] text-[#0c3559] hover:bg-[#e9f2f9]">
              {formatDashboardPeriod(latestPeriod ?? "-")}
            </Badge>
            <Badge className="border-[#b4cde0] bg-[#e9f2f9] text-[#0c3559] hover:bg-[#e9f2f9]">
              {periodsCount} reg.
            </Badge>
          </div>
        </div>

        <Tabs value={activeMetric} onValueChange={(value) => onMetricChange(value as DashboardMetricKey)}>
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            {availableMetrics.map((metric) => (
              <TabsTrigger key={metric.key} value={metric.key} className="text-xs">
                {metric.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isClientsMetric ? (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#1d4d73]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-[#0c3559]" />
              Clientes
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#4c87b5]" />
              Mínima
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#1a6ea8]" />
              Meta
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <LucideStar className="h-3 w-3 fill-[#f5b301] text-[#d49300]" />
              Estrelas
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#1d4d73]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartConfig[activeMetric].color }} />
              {metricOption.label}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <div className="w-full overflow-x-auto">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[210px] w-full"
            style={{ minWidth: `max(100%, ${chartMinWidthPx}px)` }}
          >
            <ComposedChart data={chartRows} margin={{ top: 36, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="periodLabel"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={isCurrencyMetric ? 72 : 40}
                domain={[0, chartMaxY]}
                allowDecimals={isCurrencyMetric}
                tickFormatter={(value) =>
                  isCurrencyMetric
                    ? formatCurrency(Number(value), displayCurrency).replace(/\s/g, "\u00a0")
                    : String(value)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      isCurrencyMetric
                        ? formatCurrency(Number(value), displayCurrency)
                        : Number(value).toLocaleString("pt-BR")
                    }
                  />
                }
              />

              {isClientsMetric && minimumGoalLineValue > 0 && (
                <ReferenceLine
                  y={minimumGoalLineValue}
                  stroke="var(--color-minimumMonthlySales)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  label={(
                    <GoalLineBadge
                      value={`Mínima ${minimumGoalLineValue}`}
                      bgColor="#e8f1f8"
                      borderColor="#4c87b5"
                      textColor="#1d4d73"
                    />
                  )}
                />
              )}

              {isClientsMetric && monthlyGoalLineValue > 0 && (
                <ReferenceLine
                  y={monthlyGoalLineValue}
                  stroke="var(--color-monthlyGoalSales)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  label={(
                    <GoalLineBadge
                      value={`Meta ${monthlyGoalLineValue}`}
                      bgColor="#e6eff8"
                      borderColor="#1a6ea8"
                      textColor="#0c3559"
                    />
                  )}
                />
              )}

              <Bar
                dataKey={activeMetric}
                name={metricOption.label}
                fill={metricColorVar}
                radius={[6, 6, 2, 2]}
                barSize={28}
                maxBarSize={30}
              >
                {isClientsMetric ? (
                  <>
                    <LabelList
                      dataKey="totalSales"
                      content={(props) => (
                        <SalesCountBadge
                          x={Number(props.x)}
                          y={Number(props.y)}
                          width={Number(props.width)}
                          value={props.value}
                        />
                      )}
                    />
                    <LabelList
                      dataKey="starsInPeriod"
                      content={(props) => (
                        <StarBadge
                          x={Number(props.x)}
                          y={Number(props.y)}
                          width={Number(props.width)}
                          value={props.value}
                        />
                      )}
                    />
                  </>
                ) : null}
              </Bar>
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const SalesDashboardFeature = ({
  mode,
  displayCurrency: displayCurrencyProp,
  searchTerm,
  gateway,
  status,
}: SalesDashboardFeatureProps) => {
  const isAdminMode = mode === "admin";
  const canSeeFixedCostsMetric = canViewFixedCosts();
  const { toast } = useToast();

  const [sellerId, setSellerId] = useState("all");
  const [sellerSearchTerm, setSellerSearchTerm] = useState("");
  const [debouncedSellerSearchTerm] = useDebounce(sellerSearchTerm, 300);
  const [internalDisplayCurrency, setInternalDisplayCurrency] = useState<DisplayCurrency>("BRL");
  const [activeMetric, setActiveMetric] = useState<DashboardMetricKey>("totalSales");
  const displayCurrency = displayCurrencyProp ?? internalDisplayCurrency;
  const showCurrencySelect = displayCurrencyProp == null;

  const availableMetrics = useMemo(
    () => DASHBOARD_METRICS.filter((metric) => !metric.costsManagersOnly || canSeeFixedCostsMetric),
    [canSeeFixedCostsMetric],
  );

  useEffect(() => {
    if (!availableMetrics.some((metric) => metric.key === activeMetric)) {
      setActiveMetric("totalSales");
    }
  }, [activeMetric, availableMetrics]);

  const usersQuery = useQuery({
    queryKey: ["dashboard-users", debouncedSellerSearchTerm],
    queryFn: () => {
      if (!isAdminMode) {
        return Promise.resolve<UserSearchResult[]>([]);
      }

      if (!debouncedSellerSearchTerm.trim()) {
        return listUsers();
      }

      return searchUsers(debouncedSellerSearchTerm);
    },
    enabled: isAdminMode,
    staleTime: 60_000,
  });

  const sellerOptions = useMemo(() => {
    if (!isAdminMode) {
      return [];
    }

    return (usersQuery.data ?? []).filter((user) => user.role === "SELLER" || !user.role);
  }, [isAdminMode, usersQuery.data]);

  const selectedSeller = useMemo(() => {
    if (!isAdminMode || sellerId === "all") {
      return null;
    }

    return sellerOptions.find((item) => (item.externalId || item.id) === sellerId) ?? null;
  }, [isAdminMode, sellerId, sellerOptions]);

  const normalizedGateway = gateway && gateway !== "all" ? (gateway as PaymentGateway) : undefined;
  const normalizedStatus = status && status !== "all" ? status : undefined;
  const normalizedSearchTerm = searchTerm?.trim() || undefined;

  const dashboardQuery = useQuery({
    queryKey: [
      "sales-dashboard",
      mode,
      sellerId,
      displayCurrency,
      normalizedSearchTerm ?? "",
      normalizedGateway ?? "",
      normalizedStatus ?? "",
    ],
    queryFn: () =>
      fetchSalesDashboard({
        sellerId: isAdminMode ? sellerId : undefined,
        displayCurrency,
        searchTerm: isAdminMode ? undefined : normalizedSearchTerm,
        gateway: isAdminMode ? undefined : normalizedGateway,
        status: isAdminMode ? undefined : normalizedStatus,
      }),
    enabled: !isAdminMode || sellerId !== "all",
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dashboard",
        description: (dashboardQuery.error as Error).message,
      });
    }
  }, [dashboardQuery.error, dashboardQuery.isError, toast]);

  const periods = dashboardQuery.data?.periods ?? [];
  const careerPlanSummary: SalesDashboardCareerPlanSummary = {
    minimumMonthlySales: Number(dashboardQuery.data?.summary?.careerPlan?.minimumMonthlySales ?? 0),
    monthlyGoalSales: Number(dashboardQuery.data?.summary?.careerPlan?.monthlyGoalSales ?? 0),
  };

  const chartRows = useMemo(() => toChartRows(periods), [periods]);

  const chartMaxY = useMemo(() => {
    if (!chartRows.length) {
      return 5;
    }

    if (activeMetric === "totalSales") {
      const maxValue = Math.max(
        ...chartRows.map((item) => item.totalSales),
        careerPlanSummary.minimumMonthlySales,
        careerPlanSummary.monthlyGoalSales,
        1,
      );
      return Math.ceil(maxValue * 1.35);
    }

    const maxValue = Math.max(...chartRows.map((item) => getMetricValue(item, activeMetric)), 1);
    return Math.ceil(maxValue * 1.2);
  }, [
    activeMetric,
    careerPlanSummary.minimumMonthlySales,
    careerPlanSummary.monthlyGoalSales,
    chartRows,
  ]);

  const chartMinWidthPx = useMemo(
    () => Math.max(chartRows.length * BAR_SLOT_PX, BAR_SLOT_PX),
    [chartRows.length],
  );

  const minimumGoalLineValue = careerPlanSummary.minimumMonthlySales;
  const monthlyGoalLineValue = careerPlanSummary.monthlyGoalSales;
  const latestPeriod = periods[0]?.period;

  return (
    <div className="space-y-2">
      {(isAdminMode || showCurrencySelect) && (
        <div className="space-y-2">
          {isAdminMode && (
            <UserSearchCard
              searchTerm={sellerSearchTerm}
              onSearchTermChange={(value) => {
                setSellerSearchTerm(value);
                if (sellerId !== "all") {
                  setSellerId("all");
                }
              }}
              searchResults={sellerOptions}
              isSearching={usersQuery.isLoading || usersQuery.isFetching}
              selectedUser={selectedSeller}
              onSelectUser={(user) => {
                setSellerId(user.externalId || user.id);
                setSellerSearchTerm(user.email || user.name || "");
              }}
              hideResultsWhenSelected
              selectedItemClassName="bg-[#0c3559] text-white hover:bg-[#0a2c4a]"
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {showCurrencySelect ? (
              <DisplayCurrencySelect
                value={displayCurrency}
                onChange={setInternalDisplayCurrency}
                ratesStale={Boolean(dashboardQuery.data?.summary?.ratesStale)}
                rateDate={dashboardQuery.data?.summary?.rateDate}
                label="Moeda do balanço"
              />
            ) : (
              <div />
            )}

            {isAdminMode && (
              <Button
                variant="outline"
                onClick={() => {
                  setSellerSearchTerm("");
                  setSellerId("all");
                }}
              >
                Limpar seleção
              </Button>
            )}
          </div>
        </div>
      )}

      {isAdminMode && sellerId === "all" ? (
        <Card className="border-dashed border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
          <CardHeader className="space-y-1 p-3 pb-2">
            <CardTitle className="text-base text-[#0c3559]">Histórico de vendas vs metas</CardTitle>
            <CardDescription className="text-xs">
              Selecione um vendedor na busca para carregar os dados do gráfico.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="h-[210px] rounded-xl border border-dashed border-[#d2e3ef] bg-white/65 p-3">
              <div className="grid h-full grid-rows-[1fr_auto] gap-2">
                <div className="rounded-lg border border-dashed border-[#dbe8f2] bg-[#f7fbff]" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-2.5 rounded bg-[#dbe8f2]" />
                  <div className="h-2.5 rounded bg-[#dbe8f2]" />
                  <div className="h-2.5 rounded bg-[#dbe8f2]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ChartPanel
          isLoading={dashboardQuery.isLoading}
          isError={dashboardQuery.isError}
          onRetry={() => {
            void dashboardQuery.refetch();
          }}
          periodsEmpty={periods.length === 0}
          chartRows={chartRows}
          chartMaxY={chartMaxY}
          chartMinWidthPx={chartMinWidthPx}
          minimumGoalLineValue={minimumGoalLineValue}
          monthlyGoalLineValue={monthlyGoalLineValue}
          latestPeriod={latestPeriod}
          periodsCount={periods.length}
          activeMetric={activeMetric}
          onMetricChange={setActiveMetric}
          availableMetrics={availableMetrics}
          displayCurrency={displayCurrency}
        />
      )}
    </div>
  );
};

export default SalesDashboardFeature;
