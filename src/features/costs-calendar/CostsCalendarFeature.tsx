import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCostCategory,
  deleteCostCategory,
  deleteCostEvent,
  getMonthlyCosts,
  listCostCategories,
  updateCostCategory,
  updateCostEvent,
} from "@/services/costsCalendarApi";
import { listBankAccounts, listCostCenters, createCashMovement } from "@/services/treasuryApi";
import type {
  CostsCalendarEvent,
  CreateCostCategoryInput,
  UpdateCostCategoryInput,
  UpdateCostEventInput,
} from "./types";
import { formatMonthLabel, groupEventsByDate } from "./utils";
import CostsCalendarHeader from "./organisms/CostsCalendarHeader";
import CostsMonthlyGrid from "./organisms/CostsMonthlyGrid";
import CostEventDialog from "./organisms/CostEventDialog";
import CashMovementDialog from "./organisms/CashMovementDialog";
import CostCategoriesDialog from "./organisms/CostCategoriesDialog";
import EventDetailsDialog from "./organisms/EventDetailsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/shared/utils/format";
import { CalendarFold, CircleDollarSign } from "lucide-react";

const CostsCalendarFeature = () => {
  const queryClient = useQueryClient();
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("all");
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("all");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CostsCalendarEvent | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementInitialDate, setMovementInitialDate] = useState<string | undefined>(undefined);

  const month = currentMonthDate.getMonth() + 1;
  const year = currentMonthDate.getFullYear();

  const categoriesQuery = useQuery({
    queryKey: ["costsCalendar", "categories"],
    queryFn: listCostCategories,
  });

  const banksQuery = useQuery({
    queryKey: ["treasury-bank-accounts"],
    queryFn: listBankAccounts,
  });

  const centersQuery = useQuery({
    queryKey: ["treasury-cost-centers"],
    queryFn: listCostCenters,
  });

  const monthlyQuery = useQuery({
    queryKey: [
      "costsCalendar",
      "monthly",
      month,
      year,
      selectedCategoryId,
      selectedBankAccountId,
      selectedCostCenterId,
    ],
    queryFn: () =>
      getMonthlyCosts({
        month,
        year,
        categoryId: selectedCategoryId === "all" ? undefined : selectedCategoryId,
        bankAccountId: selectedBankAccountId === "all" ? undefined : selectedBankAccountId,
        costCenterId: selectedCostCenterId === "all" ? undefined : selectedCostCenterId,
      }),
  });

  const refetchMonthlyData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["costsCalendar", "monthly"] });
  };

  const refetchCategoriesData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["costsCalendar", "categories"] });
  };

  const updateEventMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCostEventInput }) => updateCostEvent(id, payload),
    onSuccess: async () => {
      toast.success("Custo atualizado com sucesso.");
      setEventDialogOpen(false);
      setEventDetailsOpen(false);
      setSelectedEvent(null);
      await refetchMonthlyData();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar custo.");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => deleteCostEvent(id),
    onSuccess: async () => {
      toast.success("Custo excluido com sucesso.");
      setEventDialogOpen(false);
      setEventDetailsOpen(false);
      setSelectedEvent(null);
      await refetchMonthlyData();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir custo.");
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (payload: CreateCostCategoryInput) => createCostCategory(payload),
    onSuccess: async () => {
      toast.success("Categoria criada com sucesso.");
      await refetchCategoriesData();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria.");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCostCategoryInput }) => updateCostCategory(id, payload),
    onSuccess: async () => {
      toast.success("Categoria atualizada com sucesso.");
      await refetchCategoriesData();
      await refetchMonthlyData();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar categoria.");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCostCategory(id),
    onSuccess: async () => {
      toast.success("Categoria excluida com sucesso.");
      if (selectedCategoryId !== "all") {
        setSelectedCategoryId("all");
      }
      await refetchCategoriesData();
      await refetchMonthlyData();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir categoria.");
    },
  });

  const createMovementMutation = useMutation({
    mutationFn: createCashMovement,
    onSuccess: async () => {
      toast.success("Movimentação lançada.");
      setMovementDialogOpen(false);
      await Promise.all([
        refetchMonthlyData(),
        queryClient.invalidateQueries({ queryKey: ["treasury-bank-balances"] }),
        queryClient.invalidateQueries({ queryKey: ["treasury-cash-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["billingCalendar"] }),
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
      ]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao lançar movimentação.";
      toast.error(
        message === "EXCHANGE_RATE_UNAVAILABLE"
          ? "Cotação indisponível para converter o valor para BRL."
          : message,
      );
    },
  });

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = banksQuery.data ?? [];
  const costCenters = centersQuery.data ?? [];
  const monthlyData = monthlyQuery.data;

  const monthLabel = formatMonthLabel(currentMonthDate);

  const eventsByDate = useMemo(
    () => groupEventsByDate(monthlyData?.events ?? []),
    [monthlyData?.events],
  );

  const dailyTotalsByDate = useMemo(() => {
    return Object.fromEntries(
      Object.entries(eventsByDate).map(([date, events]) => [
        date,
        {
          date,
          totalAmount: events.reduce((sum, event) => sum + event.amount, 0),
          count: events.length,
        },
      ]),
    );
  }, [eventsByDate]);

  const totalEvents = monthlyData?.events?.length ?? 0;
  const monthlyTotal = (monthlyData?.events ?? []).reduce((sum, event) => sum + event.amount, 0);

  const handleOpenCreateMovement = () => {
    setMovementInitialDate(undefined);
    setMovementDialogOpen(true);
  };

  const handleOpenCreateFromDay = (dateKey: string) => {
    setMovementInitialDate(dateKey);
    setMovementDialogOpen(true);
  };

  const handleOpenEventDetails = (event: CostsCalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  const handleOpenEditEvent = (event: CostsCalendarEvent) => {
    if (event.source === "CASH_MOVEMENT") {
      toast.message("Movimentações de caixa são lançadas pelo botão Nova movimentação.");
      return;
    }
    setEventDetailsOpen(false);
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handlePreviousMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-4">
      <CostsCalendarHeader
        monthLabel={monthLabel}
        categories={categories}
        bankAccounts={bankAccounts}
        costCenters={costCenters}
        selectedCategoryId={selectedCategoryId}
        selectedBankAccountId={selectedBankAccountId}
        selectedCostCenterId={selectedCostCenterId}
        isMonthlyLoading={monthlyQuery.isLoading || monthlyQuery.isFetching}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onCategoryChange={setSelectedCategoryId}
        onBankAccountChange={setSelectedBankAccountId}
        onCostCenterChange={setSelectedCostCenterId}
        onOpenCreateMovement={handleOpenCreateMovement}
        onOpenCategories={() => setCategoriesDialogOpen(true)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-border/80 bg-card/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total do mês</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Eventos no calendário</CardTitle>
            <CalendarFold className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalEvents}</p>
          </CardContent>
        </Card>
      </div>

      {monthlyQuery.isLoading && (
        <div className="rounded-xl border border-border/80 bg-card/60 p-8 text-center text-sm text-muted-foreground">
          Carregando calendario de custos...
        </div>
      )}

      {monthlyQuery.isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center text-sm text-destructive">
          Erro ao carregar calendario: {(monthlyQuery.error as Error).message}
        </div>
      )}

      {!monthlyQuery.isLoading && !monthlyQuery.isError && totalEvents === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-8 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado para este mes.
        </div>
      )}

      {!monthlyQuery.isLoading && !monthlyQuery.isError && (
        <CostsMonthlyGrid
          currentMonth={currentMonthDate}
          eventsByDate={eventsByDate}
          dailyTotalsByDate={dailyTotalsByDate}
          onDayClick={handleOpenCreateFromDay}
          onEventClick={handleOpenEventDetails}
          onDayListEventClick={handleOpenEditEvent}
        />
      )}

      <EventDetailsDialog
        open={eventDetailsOpen}
        event={selectedEvent}
        onOpenChange={setEventDetailsOpen}
        onEdit={handleOpenEditEvent}
      />

      <CostEventDialog
        open={eventDialogOpen}
        mode="edit"
        categories={categories}
        bankAccounts={bankAccounts}
        costCenters={costCenters}
        event={selectedEvent}
        isSubmitting={updateEventMutation.isPending}
        isDeleting={deleteEventMutation.isPending}
        onOpenChange={setEventDialogOpen}
        onUpdate={(id, payload) => updateEventMutation.mutate({ id, payload })}
        onDelete={(id) => deleteEventMutation.mutate(id)}
      />

      <CashMovementDialog
        open={movementDialogOpen}
        bankAccounts={bankAccounts}
        costCenters={costCenters}
        initialDate={movementInitialDate}
        isSubmitting={createMovementMutation.isPending}
        onOpenChange={setMovementDialogOpen}
        onSubmit={(payload) => createMovementMutation.mutate(payload)}
      />

      <CostCategoriesDialog
        open={categoriesDialogOpen}
        categories={categories}
        isLoading={categoriesQuery.isLoading}
        isCreating={createCategoryMutation.isPending}
        isUpdating={updateCategoryMutation.isPending}
        isDeleting={deleteCategoryMutation.isPending}
        onOpenChange={setCategoriesDialogOpen}
        onCreate={(payload) => createCategoryMutation.mutate(payload)}
        onUpdate={(id, payload) => updateCategoryMutation.mutate({ id, payload })}
        onDelete={(id) => deleteCategoryMutation.mutate(id)}
      />
    </div>
  );
};

export default CostsCalendarFeature;
