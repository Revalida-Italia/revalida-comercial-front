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
import { useToast } from "@/hooks/use-toast";
import {
  fetchSalesDashboard,
  type SalesDashboardCareerPlanSummary,
} from "@/services/commercialApi";
import { listUsers, searchUsers, type UserSearchResult } from "@/services/usersApi";
import UserSearchCard from "@/features/admin-career-plan/organisms/UserSearchCard";
import { type SalesDashboardFeatureProps } from "./types";
import { formatDashboardPeriod, toChartRows } from "./utils";

const BAR_SLOT_PX = 56;

const chartConfig = {
  totalSales: {
    label: "Clientes",
    color: "#0c3559",
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
        fontSize={11}
        fontWeight={700}
        fill={textColor}
      >
        {value}
      </text>
    </g>
  );
};

const SalesCountBadge = ({ x, y, width, value }: SalesCountBadgeProps) => {
  if (x == null || y == null || width == null || value == null) {
    return null;
  }

  const label = String(value);
  const badgeRadius = Math.max(12, label.length > 2 ? 14 : 12);
  const badgeCx = Math.max(badgeRadius, x - badgeRadius - 10);
  const badgeCy = y + 12;

  return (
    <g>
      <circle
        cx={badgeCx}
        cy={badgeCy}
        r={badgeRadius}
        fill="#e8f1f8"
        stroke="#4c87b5"
        strokeWidth={1}
      />
      <text
        x={badgeCx}
        y={badgeCy + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#1d4d73"
      >
        {label}
      </text>
    </g>
  );
};

const StarBadge = ({ x, y, width, value }: StarBadgeProps) => {
  if (x == null || y == null || width == null || !value) {
    return null;
  }

  const starCount = Math.min(Number(value), 5);
  const starSize = 18;
  const starSpacing = 2;
  const padding = 4;
  const badgeWidth = padding * 2 + starCount * starSize + (starCount - 1) * starSpacing;
  const badgeHeight = 26;

  const barCenterX = x + width / 2;
  const badgeX = barCenterX - badgeWidth / 2;
  const badgeY = Math.max(0, y - badgeHeight - 6);

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={13}
        fill="#fff7e1"
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
}) => {
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
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sem dados para os filtros selecionados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
      <CardHeader className="space-y-2 p-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base text-[#0c3559]">Histórico de clientes vs metas</CardTitle>
            <CardDescription className="text-xs">
              Clientes no mês, metas e estrelas do período
            </CardDescription>
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
                width={40}
                domain={[0, chartMaxY]}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => Number(value).toLocaleString("pt-BR")}
                  />
                }
              />

              {minimumGoalLineValue > 0 && (
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

              {monthlyGoalLineValue > 0 && (
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
                dataKey="totalSales"
                name="Clientes"
                fill="var(--color-totalSales)"
                radius={[6, 6, 2, 2]}
                barSize={28}
                maxBarSize={30}
              >
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
              </Bar>
            </ComposedChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const SalesDashboardFeature = ({ mode }: SalesDashboardFeatureProps) => {
  const isAdminMode = mode === "admin";
  const { toast } = useToast();

  const [sellerId, setSellerId] = useState("all");
  const [sellerSearchTerm, setSellerSearchTerm] = useState("");
  const [debouncedSellerSearchTerm] = useDebounce(sellerSearchTerm, 300);

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

  const dashboardQuery = useQuery({
    queryKey: ["sales-dashboard", mode, sellerId],
    queryFn: () =>
      fetchSalesDashboard({
        sellerId: isAdminMode ? sellerId : undefined,
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

    const maxValue = Math.max(
      ...chartRows.map((item) => item.totalSales),
      careerPlanSummary.minimumMonthlySales,
      careerPlanSummary.monthlyGoalSales,
      1,
    );

    return Math.ceil(maxValue * 1.35);
  }, [careerPlanSummary.minimumMonthlySales, careerPlanSummary.monthlyGoalSales, chartRows]);

  const chartMinWidthPx = useMemo(
    () => Math.max(chartRows.length * BAR_SLOT_PX, BAR_SLOT_PX),
    [chartRows.length],
  );

  const minimumGoalLineValue = careerPlanSummary.minimumMonthlySales;
  const monthlyGoalLineValue = careerPlanSummary.monthlyGoalSales;
  const latestPeriod = periods[0]?.period;

  return (
    <div className="space-y-2">
      {isAdminMode && (
        <div className="space-y-2">
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

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSellerSearchTerm("");
                setSellerId("all");
              }}
            >
              Limpar seleção
            </Button>
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
        />
      )}
    </div>
  );
};

export default SalesDashboardFeature;
