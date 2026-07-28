import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import { DISPLAY_CURRENCY_OPTIONS, formatRateDateLabel } from "@/shared/utils/exchange";
import { cn } from "@/lib/utils";

type DisplayCurrencySelectProps = {
  value: DisplayCurrency;
  onChange: (value: DisplayCurrency) => void;
  ratesStale?: boolean;
  rateDate?: string | null;
  className?: string;
  triggerClassName?: string;
  label?: string;
  disabled?: boolean;
};

const DisplayCurrencySelect = ({
  value,
  onChange,
  ratesStale = false,
  rateDate,
  className,
  triggerClassName,
  label = "Moeda",
  disabled = false,
}: DisplayCurrencySelectProps) => (
  <div className={cn("flex flex-wrap items-end gap-2", className)}>
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(next as DisplayCurrency)}
      >
        <SelectTrigger className={cn("w-[110px]", triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISPLAY_CURRENCY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {ratesStale && value !== "BRL" && (
      <Badge variant="outline" className="mb-0.5 border-amber-300 bg-amber-50 text-[10px] text-amber-900">
        Cotação do dia anterior{rateDate ? ` (${formatRateDateLabel(rateDate)})` : ""}
      </Badge>
    )}
  </div>
);

export default DisplayCurrencySelect;
