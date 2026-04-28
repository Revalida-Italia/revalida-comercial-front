import { Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { mockSellerProfiles, demoSellerId, careerConfig } from "@/lib/mockData";
import {
  getStarsCount,
  getSalesToNextStar,
  getLevelProgressPct,
  isBelowMinimum,
  getLevelBadgeColor,
} from "@/lib/careerUtils";

const CareerBadge = ({ sellerId = demoSellerId }: { sellerId?: string }) => {
  const profile = mockSellerProfiles.find((p) => p.sellerId === sellerId);
  if (!profile) return null;

  const config = careerConfig[profile.currentLevel];
  const stars = getStarsCount(profile);
  const totalStars = config.starsToLevelUp === "special" ? 4 : config.starsToLevelUp;
  const salesToNext = getSalesToNextStar(profile);
  const progressPct = getLevelProgressPct(profile);
  const belowMin = isBelowMinimum(profile);
  const badgeColor = getLevelBadgeColor(profile.currentLevel);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80 ${badgeColor}`}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          <span>{config.label}</span>
          <span className="opacity-70">
            {stars}★ / {totalStars}★
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" align="end">
        <div>
          <p className="font-semibold text-foreground">{config.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.sellerName}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso no nível</span>
            <span>{stars} / {totalStars} ★</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {salesToNext} venda(s) para a próxima estrela
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Vendas este mês</p>
            <p className="font-semibold text-foreground mt-0.5">
              {profile.salesCountCurrentMonth} / {config.monthlyGoalSales}
            </p>
          </div>
          <div className={`rounded-lg p-2 ${belowMin ? "bg-destructive/10" : "bg-muted/40"}`}>
            <p className="text-muted-foreground">Mínimo mensal</p>
            <p className={`font-semibold mt-0.5 ${belowMin ? "text-destructive" : "text-foreground"}`}>
              {config.minMonthlySales} vendas
            </p>
          </div>
        </div>

        {belowMin && (
          <p className="text-xs text-destructive font-medium">
            ⚠ Abaixo do mínimo — risco de perda de contrato
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CareerBadge;
