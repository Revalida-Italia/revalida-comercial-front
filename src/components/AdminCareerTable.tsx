import { careerConfig, careerLevelOrder, CareerLevel } from "@/lib/mockData";
import { formatMoney } from "@/lib/mockData";
import { getLevelBadgeColor } from "@/lib/careerUtils";

interface AdminCareerTableProps {
  highlightLevel?: CareerLevel;
}

const AdminCareerTable = ({ highlightLevel }: AdminCareerTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Cargo</th>
            <th className="py-3 pr-4 font-medium">Valor Fixo</th>
            <th className="py-3 pr-4 font-medium">Comissão Individual</th>
            <th className="py-3 pr-4 font-medium">Comissão do Time</th>
            <th className="py-3 pr-4 font-medium">Meta p/ Crescimento</th>
            <th className="py-3 pr-4 font-medium">Meta Mensal</th>
            <th className="py-3 pr-4 font-medium">Mínimo Mensal</th>
            <th className="py-3 font-medium">Equipe de Trainees</th>
          </tr>
        </thead>
        <tbody>
          {careerLevelOrder.map((level) => {
            const cfg = careerConfig[level];
            const isHighlighted = level === highlightLevel;
            const badgeColor = getLevelBadgeColor(level);

            const growthGoal =
              cfg.starsToLevelUp === "special"
                ? "1 trainee fechar 4 ★"
                : `${cfg.starsToLevelUp} estrelas`;

            return (
              <tr
                key={level}
                className={`border-b border-border/40 last:border-0 transition-colors ${
                  isHighlighted ? "bg-primary/5" : "hover:bg-muted/20"
                }`}
              >
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColor} ${
                      isHighlighted ? "ring-1 ring-primary" : ""
                    }`}
                  >
                    {cfg.label}
                  </span>
                </td>
                <td className="py-3 pr-4 font-semibold text-foreground">
                  {formatMoney(cfg.fixedSalary)}
                </td>
                <td className="py-3 pr-4 text-foreground">{cfg.individualCommissionPct}%</td>
                <td className="py-3 pr-4 text-foreground">
                  {cfg.teamCommissionPct > 0 ? `${cfg.teamCommissionPct}%` : "—"}
                </td>
                <td className="py-3 pr-4 text-foreground">{growthGoal}</td>
                <td className="py-3 pr-4 text-foreground">{cfg.monthlyGoalSales} vendas</td>
                <td className="py-3 pr-4 text-foreground">{cfg.minMonthlySales} vendas</td>
                <td className="py-3 text-foreground">{cfg.traineeTeamSize}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminCareerTable;
