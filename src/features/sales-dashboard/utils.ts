import type { SalesDashboardPeriod } from "@/services/commercialApi";

const MONTHS_PT_BR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatDashboardPeriod(period: string): string {
  const [yearPart, monthPart] = period.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return period;
  }

  return `${MONTHS_PT_BR[month - 1]}/${year}`;
}

export function toChartRows(periods: SalesDashboardPeriod[]) {
  return [...periods]
    .reverse()
    .map((item) => ({
      ...item,
      periodLabel: formatDashboardPeriod(item.period),
    }));
}

export function resolveSelectedPeriod(periods: SalesDashboardPeriod[], selectedPeriod: string): SalesDashboardPeriod | null {
  if (!periods.length) {
    return null;
  }

  if (!selectedPeriod) {
    return periods[0];
  }

  return periods.find((period) => period.period === selectedPeriod) ?? periods[0];
}
