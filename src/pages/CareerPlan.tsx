import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { mockSellerProfiles, demoSellerId, careerConfig } from "@/lib/mockData";
import {
  getStarsCount,
  getSalesToNextStar,
  getStarsToLevelUp,
  getLevelProgressPct,
  isBelowMinimum,
  getNextLevel,
  getLevelBadgeColor,
} from "@/lib/careerUtils";
import AdminCareerTable from "@/components/AdminCareerTable";
import CareerProgressCard from "@/components/CareerProgressCard";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";

const CareerPlanPage = () => {
  const profile = mockSellerProfiles.find((p) => p.sellerId === demoSellerId)!;
  const config = careerConfig[profile.currentLevel];
  const stars = getStarsCount(profile);
  const totalStars = config.starsToLevelUp === "special" ? 4 : (config.starsToLevelUp as number);
  const salesToNextStar = getSalesToNextStar(profile);
  const starsToLevel = getStarsToLevelUp(profile);
  const progressPct = getLevelProgressPct(profile);
  const belowMin = isBelowMinimum(profile);
  const nextLevel = getNextLevel(profile.currentLevel);
  const nextConfig = nextLevel ? careerConfig[nextLevel] : null;
  const badgeColor = getLevelBadgeColor(profile.currentLevel);
  const isSpecial = config.starsToLevelUp === "special";

  const checklist = [
    {
      label: `Atingir ${config.monthlyGoalSales} vendas mensais`,
      done: profile.salesCountCurrentMonth >= config.monthlyGoalSales,
    },
    {
      label: `Manter mínimo de ${config.minMonthlySales} vendas/mês`,
      done: !belowMin,
    },
    ...(isSpecial
      ? [
          {
            label: `Trainee subordinado fechar 4 estrelas (${profile.subordinateCycleStars ?? 0}/4)`,
            done: (profile.subordinateCycleStars ?? 0) >= 4,
          },
        ]
      : [
          {
            label: `Completar ${totalStars} estrelas no ciclo (${stars}/${totalStars})`,
            done: stars >= totalStars,
          },
        ]),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Plano de Carreira</h1>
        <p className="mt-1 text-muted-foreground">
          Acompanhe seu progresso, estrelas e o que falta para subir de nível.
        </p>
      </div>

      {/* Personal progress card (expanded) */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card ring-2 ring-primary/40">
          <CardHeader>
            <CardTitle className="font-display">Meu Progresso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${badgeColor}`}>
                {config.label}
              </span>
              {belowMin && <Badge variant="destructive">Abaixo do mínimo</Badge>}
            </div>

            {/* Stars */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Estrelas no ciclo atual</span>
                <span>{stars} / {totalStars} ★</span>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalStars }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 ${i < stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <Progress value={progressPct} className="h-3" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Vendas no ciclo</p>
                <p className="font-bold text-foreground mt-1">{profile.salesCountCurrentCycle}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">P/ próx. estrela</p>
                <p className="font-bold text-foreground mt-1">{salesToNextStar}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Vendas este mês</p>
                <p className="font-bold text-foreground mt-1">{profile.salesCountCurrentMonth} / {config.monthlyGoalSales}</p>
              </div>
              <div className={`rounded-2xl p-3 ${belowMin ? "bg-destructive/10" : "bg-muted/40"}`}>
                <p className="text-xs text-muted-foreground">Mínimo mensal</p>
                <p className={`font-bold mt-1 ${belowMin ? "text-destructive" : "text-foreground"}`}>
                  {config.minMonthlySales}
                </p>
              </div>
            </div>

            {/* Next level info */}
            {nextConfig && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Próximo nível: <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ml-1 ${getLevelBadgeColor(nextLevel!)}`}>{nextConfig.label}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Salário fixo: <span className="font-medium text-foreground">R$ {nextConfig.fixedSalary.toLocaleString("pt-BR")}</span>
                  {" • "}Comissão: <span className="font-medium text-foreground">{nextConfig.individualCommissionPct}%</span>
                </p>
              </div>
            )}
            {!nextLevel && (
              <p className="text-sm font-medium text-yellow-600">🏆 Você é Diretor — nível máximo!</p>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Para subir de nível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <p className={`text-sm ${item.done ? "text-foreground line-through opacity-60" : "text-foreground"}`}>
                  {item.label}
                </p>
              </div>
            ))}

            {checklist.every((c) => c.done) ? (
              <div className="mt-4 rounded-2xl bg-green-500/10 border border-green-500/20 p-3 text-center">
                <p className="text-sm font-semibold text-green-600">
                  ✓ Todos os requisitos atendidos!
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground text-center">
                  {checklist.filter((c) => !c.done).length} requisito(s) pendente(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Career table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Tabela de Cargos e Benefícios</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminCareerTable highlightLevel={profile.currentLevel} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CareerPlanPage;
