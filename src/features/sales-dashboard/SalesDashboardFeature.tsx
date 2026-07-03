import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Bar, CartesianGrid, ComposedChart, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import { AlertCircle, Check, Mail, PenLine, Shield, Star as LucideStar, Target, UserRound, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Notranslate } from "@/components/Notranslate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getProfile, setProfile } from "@/lib/session";
import { updateProfileName } from "@/services/authApi";
import {
  fetchSalesDashboard,
  type SalesDashboardCareerPlanSummary,
  type PaymentGateway,
} from "@/services/commercialApi";
import { listUsers, searchUsers, type UserSearchResult } from "@/services/usersApi";
import UserSearchCard from "@/features/admin-career-plan/organisms/UserSearchCard";
import { type SalesDashboardFeatureProps } from "./types";
import { formatDashboardPeriod, toChartRows } from "./utils";

const chartConfig = {
  totalSales: {
    label: "Vendas",
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

type SellerBadgeData = {
  userId: string;
  name: string;
  email: string;
  roleRaw: string;
  roleLabel: string;
  careerPlan: string;
  stars?: number;
  salesToNextStar?: number;
  minimumGoal: number;
  monthlyGoal: number;
};

function toRoleLabel(role: string): string {
  return role === "ADMIN" ? "Admin" : "Vendedor";
}

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

  const starCount = Math.min(Number(value), 5); // Limitar a 5 estrelas para não ficar muito largo
  const starSize = 18;
  const starSpacing = 2;
  const padding = 4;
  const badgeWidth = padding * 2 + starCount * starSize + (starCount - 1) * starSpacing;
  const badgeHeight = 26;
  
  // Centralizar o badge em relação à barra
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

const SalesDashboardFeature = ({ mode }: SalesDashboardFeatureProps) => {
  const isAdminMode = mode === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentProfile = getProfile();

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

  const updateNameMutation = useMutation({
    mutationFn: async (payload: { userId: string; name: string; fallback?: { email?: string; role?: string } }) =>
      updateProfileName({
        userId: payload.userId,
        name: payload.name,
        fallback: {
          email: payload.fallback?.email,
          role: payload.fallback?.role,
        },
      }),
    onSuccess: (updatedProfile, variables) => {
      if (!isAdminMode && currentProfile?.sub === variables.userId) {
        setProfile(updatedProfile);
      }

      queryClient.invalidateQueries({ queryKey: ["dashboard-users"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });

      toast({
        title: "Nome atualizado",
        description: "Perfil atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar nome",
        description: (error as Error).message,
      });
    },
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

  const minimumGoalLineValue = careerPlanSummary.minimumMonthlySales;
  const monthlyGoalLineValue = careerPlanSummary.monthlyGoalSales;
  const latestPeriod = periods[0]?.period;

  const sellerBadgeData: SellerBadgeData | null = useMemo(() => {
    if (isAdminMode) {
      if (!selectedSeller) {
        return null;
      }

      return {
        userId: selectedSeller.externalId || selectedSeller.id,
        name: selectedSeller.name || "Sem nome",
        email: selectedSeller.email || "Sem email",
        roleRaw: selectedSeller.role || "SELLER",
        roleLabel: toRoleLabel(selectedSeller.role || "SELLER"),
        careerPlan: selectedSeller.careerPlan?.name || "Sem career plan",
        minimumGoal: careerPlanSummary.minimumMonthlySales,
        monthlyGoal: careerPlanSummary.monthlyGoalSales,
      };
    }

    if (!currentProfile) {
      return null;
    }

    return {
      userId: currentProfile.externalId || currentProfile.sub,
      name: currentProfile.name || "Sem nome",
      email: currentProfile.email || "Sem email",
      roleRaw: currentProfile.role,
      roleLabel: toRoleLabel(currentProfile.role),
      careerPlan: currentProfile.careerPlan?.name || "Sem career plan",
      stars: currentProfile.careerProgress?.stars,
      salesToNextStar:
        currentProfile.careerProgress?.salesToNextStar
        ?? currentProfile.careerProgress?.salesToNextStart,
      minimumGoal: careerPlanSummary.minimumMonthlySales,
      monthlyGoal: careerPlanSummary.monthlyGoalSales,
    };
  }, [careerPlanSummary.minimumMonthlySales, careerPlanSummary.monthlyGoalSales, currentProfile, isAdminMode, selectedSeller]);

  return (
    <div className="space-y-4">
      {isAdminMode && (
        <div className="space-y-3">
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
            disabled={updateNameMutation.isPending}
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

      <div className="min-h-[620px] transition-all duration-300">
      {isAdminMode && sellerId === "all" ? (
        <>
          <SellerProfileBadge
            data={null}
            isLoading={false}
            isSaving={false}
            showPlaceholder
            onSaveName={() => undefined}
          />

          <Card className="border-dashed border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[#0c3559]">Histórico de vendas vs metas</CardTitle>
                  <CardDescription>
                    Selecione um vendedor na busca para carregar os dados do gráfico.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge className="border-[#b4cde0] bg-[#e9f2f9] text-[#0c3559] hover:bg-[#e9f2f9]">Período atual: ---</Badge>
                  <Badge className="border-[#b4cde0] bg-[#e9f2f9] text-[#0c3559] hover:bg-[#e9f2f9]">Registros: ---</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[330px] rounded-xl border border-dashed border-[#d2e3ef] bg-white/65 p-4">
                <div className="grid h-full grid-rows-[1fr_auto] gap-3">
                  <div className="rounded-lg border border-dashed border-[#dbe8f2] bg-[#f7fbff]" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-3 rounded bg-[#dbe8f2]" />
                    <div className="h-3 rounded bg-[#dbe8f2]" />
                    <div className="h-3 rounded bg-[#dbe8f2]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <SellerProfileBadge
            data={sellerBadgeData}
            isLoading={dashboardQuery.isLoading}
            isSaving={updateNameMutation.isPending}
            showPlaceholder={false}
            onSaveName={(name) => {
              if (!sellerBadgeData) {
                return;
              }

              updateNameMutation.mutate({
                userId: sellerBadgeData.userId,
                name,
                fallback: {
                  email: sellerBadgeData.email,
                  role: sellerBadgeData.roleRaw,
                },
              });
            }}
          />

          {dashboardQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>Erro ao carregar dados do dashboard.</span>
                <Button size="sm" variant="outline" onClick={() => dashboardQuery.refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {dashboardQuery.isLoading ? (
            <Card className="min-h-[470px] border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
              <CardHeader>
                <Skeleton className="h-6 w-60" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-[330px] w-full" />
                </div>
              </CardContent>
            </Card>
          ) : periods.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Sem dados para os filtros selecionados.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#cfe0ec] bg-gradient-to-b from-[#f7fbff] via-white to-white">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-[#0c3559]">Histórico de vendas vs metas</CardTitle>
                    <CardDescription>
                      Barras para vendas no mês e linhas de metas. As estrelas mostram conquistas do período.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge className="border-[#b4cde0] bg-[#e9f2f9] text-[#0c3559] hover:bg-[#e9f2f9]">
                      Período atual: {formatDashboardPeriod(latestPeriod ?? "-")}
                    </Badge>
                    <Badge className="border-[#b4cde0] bg-[#e9f2f9] text-[#0c3559] hover:bg-[#e9f2f9]">
                      Registros: {periods.length}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#1d4d73]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0c3559]" />
                    Vendas no mês
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-[#4c87b5]" />
                    Meta mínima
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-[#1a6ea8]" />
                    Meta do mês
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <LucideStar className="h-3.5 w-3.5 fill-[#f5b301] text-[#d49300]" />
                    Estrelas conquistadas no mês
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <ChartContainer config={chartConfig} className="h-[330px] w-full">
                  <ComposedChart data={chartRows} margin={{ top: 48, right: 8, left: 0, bottom: 0 }}>
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
                      name="Vendas"
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
              </CardContent>
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  );
};

type SellerProfileBadgeProps = {
  data: SellerBadgeData | null;
  isLoading: boolean;
  isSaving: boolean;
  showPlaceholder: boolean;
  onSaveName: (name: string) => void;
};

const SellerProfileBadge = ({ data, isLoading, isSaving, showPlaceholder, onSaveName }: SellerProfileBadgeProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (!data) {
      return;
    }

    setDraftName(data.name);
    setIsEditingName(false);
  }, [data]);

  if (isLoading) {
    return (
      <Card className="border-[#cfe0ec] bg-[#f8fbfe]">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    if (showPlaceholder) {
      return (
        <Card className="border-dashed border-[#c8dceb] bg-gradient-to-r from-[#f8fcff] to-[#edf6fc]">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2 rounded-xl border border-dashed border-[#d4e4f1] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4d7190]">Vendedor</p>
                <p className="text-sm font-semibold text-[#0c3559]">---</p>
                <p className="text-xs text-[#3b607f]">---</p>
              </div>

              <div className="space-y-2 rounded-xl border border-dashed border-[#d4e4f1] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4d7190]">Perfil</p>
                <p className="text-sm font-semibold text-[#0c3559]">---</p>
                <p className="text-xs text-[#3b607f]">---</p>
              </div>

              <div className="space-y-2 rounded-xl border border-dashed border-[#d4e4f1] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4d7190]">Career plan</p>
                <p className="text-sm font-semibold text-[#0c3559]">---</p>
                <p className="text-xs text-[#3b607f]">---</p>
              </div>

              <div className="space-y-2 rounded-xl border border-dashed border-[#d4e4f1] bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4d7190]">Progresso</p>
                <p className="text-sm font-semibold text-[#0c3559]">---</p>
                <p className="text-xs text-[#3b607f]">---</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return (
    <Card className="border-[#c8dceb] bg-gradient-to-r from-[#f8fcff] to-[#edf6fc]">
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2 rounded-xl border border-[#d4e4f1] bg-white/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4d7190]">
                <UserRound className="h-3.5 w-3.5" /> Vendedor
              </p>

              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditingName(false);
                      setDraftName(data.name);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isSaving || !draftName.trim()}
                    onClick={() => {
                      onSaveName(draftName);
                      setIsEditingName(false);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setIsEditingName(true)}
                >
                  <PenLine className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {isEditingName ? (
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Nome do vendedor"
                className="h-8"
              />
            ) : (
              <p className="text-sm font-semibold text-[#0c3559]">{data.name}</p>
            )}
            <p className="inline-flex items-center gap-1.5 text-xs text-[#3b607f]">
              <Mail className="h-3.5 w-3.5" /> {data.email}
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-[#d4e4f1] bg-white/80 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4d7190]">
              <Shield className="h-3.5 w-3.5" /> Perfil
            </p>
            <p className="text-sm font-semibold text-[#0c3559]">{data.roleLabel}</p>
            <p className="text-xs text-[#3b607f]">Regra de acesso aplicada pelo grupo do usuário.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-[#d4e4f1] bg-white/80 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4d7190]">
              <Target className="h-3.5 w-3.5" /> Career plan
            </p>
            <p className="text-sm font-semibold text-[#0c3559]">
              <Notranslate>{data.careerPlan}</Notranslate>
            </p>
            <p className="text-xs text-[#3b607f]">Mínima {data.minimumGoal} | Meta {data.monthlyGoal}</p>
          </div>

          <div className="space-y-2 rounded-xl border border-[#d4e4f1] bg-white/80 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4d7190]">
              <LucideStar className="h-3.5 w-3.5" /> Progresso
            </p>
            <p className="text-sm font-semibold text-[#0c3559]">Estrelas: {data.stars ?? "-"}</p>
            <p className="text-xs text-[#3b607f]">Prox. estrela: {data.salesToNextStar ?? "-"} vendas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesDashboardFeature;
