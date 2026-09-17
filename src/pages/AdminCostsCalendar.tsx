import CostsCalendarFeature from "@/features/costs-calendar/CostsCalendarFeature";

const AdminCostsCalendar = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendário de Movimentações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Custos e lançamentos de caixa em grade mensal.
        </p>
      </div>

      <CostsCalendarFeature />
    </div>
  );
};

export default AdminCostsCalendar;
