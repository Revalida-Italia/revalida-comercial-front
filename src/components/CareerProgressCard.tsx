import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { SellerCareerProfile, careerConfig } from "@/lib/mockData";
import {
  getStarsCount,
  getSalesToNextStar,
  getStarsToLevelUp,
  getLevelProgressPct,
  isBelowMinimum,
  getNextLevel,
  getLevelBadgeColor,
} from "@/lib/careerUtils";

interface CareerProgressCardProps {
  profile: SellerCareerProfile;
  highlighted?: boolean;
}

const StarRow = ({ filled, total }: { filled: number; total: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: total }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
      />
    ))}
  </div>
);

const CareerProgressCard = ({ profile, highlighted = false }: CareerProgressCardProps) => {
  const config = careerConfig[profile.currentLevel];
  const stars = getStarsCount(profile);
  const totalStars = config.starsToLevelUp === "special" ? 4 : (config.starsToLevelUp as number);
  const salesToNextStar = getSalesToNextStar(profile);
  const starsToLevel = getStarsToLevelUp(profile);
  const progressPct = getLevelProgressPct(profile);
  const belowMin = isBelowMinimum(profile);
  const nextLevel = getNextLevel(profile.currentLevel);
  const nextLevelLabel = nextLevel ? careerConfig[nextLevel].label : null;
  const badgeColor = getLevelBadgeColor(profile.currentLevel);
  const isSpecial = config.starsToLevelUp === "special";

  return (
    <Card className={`glass-card ${highlighted ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-foreground">{profile.sellerName}</p>
            <span
              className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeColor}`}
            >
              {config.label}
            </span>
          </div>
          {belowMin && (
            <Badge variant="destructive" className="text-xs shrink-0">
              Abaixo do mínimo
            </Badge>
          )}
        </div>

        {/* Stars progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Estrelas no ciclo</span>
            {!isSpecial && (
              <span>{stars} / {totalStars} ★</span>
            )}
          </div>
          {isSpecial ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Subordinado: <span className="font-medium text-foreground">{profile.subordinateName ?? "—"}</span>
              </p>
              <div className="flex items-center gap-2">
                <StarRow filled={profile.subordinateCycleStars ?? 0} total={4} />
                <span className="text-xs text-muted-foreground">
                  {profile.subordinateCycleStars ?? 0}/4 estrelas
                </span>
              </div>
              <Progress value={progressPct} className="h-2" />
              <p className="text-xs text-muted-foreground">
                O trainee precisa fechar 4 estrelas para você subir de nível.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <StarRow filled={stars} total={totalStars} />
              <Progress value={progressPct} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {profile.salesCountCurrentCycle} vendas este ciclo •{" "}
                {salesToNextStar} venda(s) para próxima ★
              </p>
              {starsToLevel !== null && starsToLevel > 0 && (
                <p className="text-xs text-muted-foreground">
                  {starsToLevel} estrela(s) para{" "}
                  <span className="font-medium text-foreground">
                    {nextLevelLabel ?? "nível máximo"}
                  </span>
                </p>
              )}
              {starsToLevel === 0 && (
                <p className="text-xs font-medium text-green-600">
                  ✓ Pronto para subir de nível!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Monthly stats */}
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <p className="text-muted-foreground">Este mês</p>
            <p className="font-bold text-foreground">{profile.salesCountCurrentMonth}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <p className="text-muted-foreground">Meta</p>
            <p className="font-bold text-foreground">{config.monthlyGoalSales}</p>
          </div>
          <div
            className={`rounded-lg p-2 text-center ${belowMin ? "bg-destructive/10" : "bg-muted/40"}`}
          >
            <p className="text-muted-foreground">Mínimo</p>
            <p
              className={`font-bold ${belowMin ? "text-destructive" : "text-foreground"}`}
            >
              {config.minMonthlySales}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CareerProgressCard;
