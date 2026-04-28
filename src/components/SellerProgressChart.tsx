import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { ShoppingCart, Star } from "lucide-react";
import { MonthlyPerformance } from "@/lib/mockData";

interface Props {
  data: MonthlyPerformance[];
  showGoal?: boolean;
}

const SALES_COLOR = "hsl(var(--primary))";
const STARS_COLOR = "#f59e0b";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg text-sm space-y-1.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => {
        const isStar = entry.dataKey === "stars";
        return (
          <div key={entry.name} className="flex items-center gap-2">
            {isStar
              ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              : <ShoppingCart className="h-3.5 w-3.5 text-primary" />}
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-6 pt-3 text-sm">
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-5 rounded-sm bg-primary" />
      <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Vendas</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-0.5 w-5 rounded-full bg-amber-400" />
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-muted-foreground">Estrelas</span>
    </div>
  </div>
);

const SellerProgressChart = ({ data, showGoal = true }: Props) => {
  const goalValue = data[0]?.goal ?? 0;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="sales"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="stars"
            orientation="right"
            tick={{ fontSize: 12, fill: STARS_COLOR }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, 5]}
          />
          <Tooltip content={<CustomTooltip />} />
          {showGoal && goalValue > 0 && (
            <ReferenceLine
              yAxisId="sales"
              y={goalValue}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 3"
              label={{ value: "Meta Atual", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--primary))" }}
            />
          )}
          <Bar
            yAxisId="sales"
            dataKey="sales"
            name="Vendas"
            fill={SALES_COLOR}
            opacity={0.9}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Line
            yAxisId="stars"
            type="monotone"
            dataKey="stars"
            name="Estrelas"
            stroke={STARS_COLOR}
            strokeWidth={2.5}
            dot={{ r: 4, fill: STARS_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
};

export default SellerProgressChart;
