import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/shared/utils/format";
import type { BillingCalendarEvent, BillingDailyTotal } from "@/features/billing-calendar/types";
import {
  billingStatusColor,
  buildMonthGrid,
  isOutsideCurrentMonth,
  toDateKey,
} from "@/features/billing-calendar/utils";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

type BillingMonthlyGridProps = {
  currentMonth: Date;
  eventsByDate: Record<string, BillingCalendarEvent[]>;
  dailyTotalsByDate: Record<string, BillingDailyTotal>;
  onEventClick: (event: BillingCalendarEvent) => void;
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const BillingMonthlyGrid = ({
  currentMonth,
  eventsByDate,
  dailyTotalsByDate,
  onEventClick,
}: BillingMonthlyGridProps) => {
  const days = buildMonthGrid(currentMonth);
  const [openPopoverDate, setOpenPopoverDate] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/70 shadow-sm">
      <div className="grid min-w-[900px] grid-cols-7 border-b border-border/70">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-w-[900px] grid-cols-7">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const dayEvents = eventsByDate[dateKey] ?? [];
          const visibleEvents = dayEvents.slice(0, 3);
          const dailyTotal = dailyTotalsByDate[dateKey];
          const isMuted = isOutsideCurrentMonth(day, currentMonth);

          return (
            <div
              key={dateKey}
              className={`min-h-40 border-b border-r border-border/70 p-2 text-left align-top ${
                isMuted
                  ? "bg-muted/60 opacity-40"
                  : "bg-background/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm font-semibold ${isMuted ? "text-muted-foreground" : "text-foreground"}`}>
                  {day.getDate()}
                </span>

                {dayEvents.length > 0 && (
                  <Popover
                    open={openPopoverDate === dateKey}
                    onOpenChange={(open) => setOpenPopoverDate(open ? dateKey : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-2" onClick={(event) => event.stopPropagation()}>
                      <div className="px-2 py-1">
                        <p className="text-sm font-semibold">Cobrancas de {format(day, "dd/MM/yyyy")}</p>
                        <p className="text-xs text-muted-foreground">{dayEvents.length} cobranca(s) neste dia</p>
                      </div>

                      <div className="mt-1 max-h-72 space-y-1 overflow-y-auto">
                        {dayEvents.map((eventItem) => (
                          <Button
                            key={eventItem.instanceId}
                            variant="ghost"
                            className="h-auto w-full justify-start rounded-md px-2 py-2 text-left"
                            onClick={() => {
                              setOpenPopoverDate(null);
                              onEventClick(eventItem);
                            }}
                          >
                            <span
                              className="mr-2 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: billingStatusColor(eventItem.status) }}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{eventItem.title}</span>
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                {visibleEvents.map((event) => (
                  <Button
                    key={event.instanceId}
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2 rounded-md border border-border/70 bg-card px-2 py-1.5 text-left"
                    onClick={() => onEventClick(event)}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: billingStatusColor(event.status) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs">{event.title}</span>
                  </Button>
                ))}
              </div>

              {dailyTotal && (
                <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                  Total do dia: {formatCurrency(dailyTotal.totalAmount)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillingMonthlyGrid;
