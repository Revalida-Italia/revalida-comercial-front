import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BillingEventStatus } from "@/features/billing-calendar/types";
import { BILLING_STATUS_LABELS } from "@/features/billing-calendar/utils";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type SellerOption = {
  id: string;
  name: string;
};

type BillingCalendarHeaderProps = {
  monthLabel: string;
  isMonthlyLoading: boolean;
  selectedStatus: "all" | BillingEventStatus;
  showSellerFilter: boolean;
  sellers: SellerOption[];
  selectedSellerId: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onStatusChange: (value: "all" | BillingEventStatus) => void;
  onSellerChange: (value: string) => void;
};

const STATUS_CHIPS: Array<"all" | BillingEventStatus> = ["all", "PAID", "PENDING", "OVERDUE"];

const BillingCalendarHeader = ({
  monthLabel,
  isMonthlyLoading,
  selectedStatus,
  showSellerFilter,
  sellers,
  selectedSellerId,
  onPreviousMonth,
  onNextMonth,
  onStatusChange,
  onSellerChange,
}: BillingCalendarHeaderProps) => {
  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousMonth} disabled={isMonthlyLoading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-44 text-center text-base font-semibold">{monthLabel}</p>
          <Button variant="outline" size="icon" onClick={onNextMonth} disabled={isMonthlyLoading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {showSellerFilter && (
          <div className="w-full max-w-xs">
            <Select value={selectedSellerId} onValueChange={onSellerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((status) => {
          const isActive = selectedStatus === status;
          return (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={cn(!isActive && "bg-background/60")}
              onClick={() => onStatusChange(status)}
              disabled={isMonthlyLoading}
            >
              {status === "all" ? "Todos" : BILLING_STATUS_LABELS[status]}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default BillingCalendarHeader;
