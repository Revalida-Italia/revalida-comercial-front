import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CalendarFold, CircleCheck, CircleDollarSign, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canManagePaymentStatus } from "@/lib/session";
import { getMonthlyBilling, updateSalePaymentStatus } from "@/services/billingCalendarApi";
import { listUsers } from "@/services/usersApi";
import { formatCurrency } from "@/shared/utils/format";
import type { BillingCalendarEvent, BillingEventStatus } from "./types";
import {
  BILLING_STATUS_COLORS,
  formatMonthLabel,
  groupEventsByDate,
  mapDailyTotals,
} from "./utils";
import BillingCalendarHeader from "./organisms/BillingCalendarHeader";
import BillingMonthlyGrid from "./organisms/BillingMonthlyGrid";
import BillingEventDetailsDialog from "./organisms/BillingEventDetailsDialog";

const BillingCalendarFeature = () => {
  const queryClient = useQueryClient();
  const canUpdatePaymentStatus = canManagePaymentStatus();
  const canFilterBySeller = canUpdatePaymentStatus;
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedStatus, setSelectedStatus] = useState<"all" | BillingEventStatus>("all");
  const [selectedSellerId, setSelectedSellerId] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<BillingCalendarEvent | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);

  const month = currentMonthDate.getMonth() + 1;
  const year = currentMonthDate.getFullYear();

  const sellersQuery = useQuery({
    queryKey: ["billingCalendar", "sellers"],
    queryFn: listUsers,
    enabled: canFilterBySeller,
  });

  const monthlyQuery = useQuery({
    queryKey: ["billingCalendar", "monthly", month, year, selectedStatus, selectedSellerId],
    queryFn: () =>
      getMonthlyBilling({
        month,
        year,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        sellerId: selectedSellerId === "all" ? undefined : selectedSellerId,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateSalePaymentStatus,
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.status === "PAID"
          ? "Pagamento marcado como pago."
          : "Pagamento marcado como pendente.",
      );
      await queryClient.invalidateQueries({ queryKey: ["billingCalendar", "monthly"] });

      const refreshed = await queryClient.fetchQuery({
        queryKey: ["billingCalendar", "monthly", month, year, selectedStatus, selectedSellerId],
        queryFn: () =>
          getMonthlyBilling({
            month,
            year,
            status: selectedStatus === "all" ? undefined : selectedStatus,
            sellerId: selectedSellerId === "all" ? undefined : selectedSellerId,
          }),
      });

      const paymentId = variables.paymentId;
      const nextEvent = refreshed.events.find(
        (event) => event.paymentId === paymentId || event.instanceId === paymentId,
      );

      if (nextEvent) {
        setSelectedEvent(nextEvent);
      } else {
        setEventDetailsOpen(false);
        setSelectedEvent(null);
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar status do pagamento.");
    },
  });

  const sellers = useMemo(
    () =>
      (sellersQuery.data ?? [])
        .filter((user) => user.role === "SELLER" || !user.role)
        .map((user) => ({
          id: user.externalId || user.id,
          name: user.name || user.email || "Vendedor",
        })),
    [sellersQuery.data],
  );

  const monthlyData = monthlyQuery.data;
  const monthLabel = formatMonthLabel(currentMonthDate);

  const eventsByDate = useMemo(
    () => groupEventsByDate(monthlyData?.events ?? []),
    [monthlyData?.events],
  );

  const dailyTotalsByDate = useMemo(
    () => mapDailyTotals(monthlyData?.dailyTotals ?? []),
    [monthlyData?.dailyTotals],
  );

  const totals = monthlyData?.totals;
  const totalEvents = monthlyData?.events?.length ?? 0;
  const monthlyTotal = monthlyData?.totalAmount ?? 0;

  const handleOpenEventDetails = (event: BillingCalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  const handlePreviousMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const resolvePaymentIds = () => {
    const saleId = selectedEvent?.saleId || selectedEvent?.sale?.id;
    const paymentId = selectedEvent?.paymentId || selectedEvent?.instanceId;

    if (!saleId || !paymentId) {
      toast.error("Nao foi possivel identificar a cobranca selecionada.");
      return null;
    }

    return { saleId, paymentId };
  };

  const handleMarkPaid = () => {
    const ids = resolvePaymentIds();
    if (!ids) {
      return;
    }

    updateStatusMutation.mutate({
      ...ids,
      status: "PAID",
      paymentDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleMarkPending = () => {
    const ids = resolvePaymentIds();
    if (!ids) {
      return;
    }

    updateStatusMutation.mutate({
      ...ids,
      status: "PENDING",
    });
  };

  return (
    <div className="space-y-4">
      <BillingCalendarHeader
        monthLabel={monthLabel}
        isMonthlyLoading={monthlyQuery.isLoading || monthlyQuery.isFetching}
        selectedStatus={selectedStatus}
        showSellerFilter={canFilterBySeller}
        sellers={sellers}
        selectedSellerId={selectedSellerId}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onStatusChange={setSelectedStatus}
        onSellerChange={setSelectedSellerId}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 bg-card/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total do mes</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(monthlyTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{totalEvents} cobranca(s)</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pago</CardTitle>
            <CircleCheck className="h-4 w-4" style={{ color: BILLING_STATUS_COLORS.PAID }} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals?.paidAmount ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{totals?.paidCount ?? 0} cobranca(s)</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pendente</CardTitle>
            <Clock3 className="h-4 w-4" style={{ color: BILLING_STATUS_COLORS.PENDING }} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals?.pendingAmount ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{totals?.pendingCount ?? 0} cobranca(s)</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Em atraso</CardTitle>
            <AlertCircle className="h-4 w-4" style={{ color: BILLING_STATUS_COLORS.OVERDUE }} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals?.overdueAmount ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{totals?.overdueCount ?? 0} cobranca(s)</p>
          </CardContent>
        </Card>
      </div>

      {monthlyQuery.isLoading && (
        <div className="rounded-xl border border-border/80 bg-card/60 p-8 text-center text-sm text-muted-foreground">
          Carregando calendario de cobrancas...
        </div>
      )}

      {monthlyQuery.isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center text-sm text-destructive">
          Erro ao carregar calendario: {(monthlyQuery.error as Error).message}
        </div>
      )}

      {!monthlyQuery.isLoading && !monthlyQuery.isError && totalEvents === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-8 text-center text-sm text-muted-foreground">
          <CalendarFold className="mx-auto mb-2 h-5 w-5 opacity-70" />
          Nenhuma cobranca encontrada para este mes.
        </div>
      )}

      {!monthlyQuery.isLoading && !monthlyQuery.isError && (
        <BillingMonthlyGrid
          currentMonth={currentMonthDate}
          eventsByDate={eventsByDate}
          dailyTotalsByDate={dailyTotalsByDate}
          onEventClick={handleOpenEventDetails}
        />
      )}

      <BillingEventDetailsDialog
        open={eventDetailsOpen}
        event={selectedEvent}
        canManageStatus={canUpdatePaymentStatus}
        isUpdatingStatus={updateStatusMutation.isPending}
        onOpenChange={setEventDetailsOpen}
        onMarkPaid={handleMarkPaid}
        onMarkPending={handleMarkPending}
      />
    </div>
  );
};

export default BillingCalendarFeature;
