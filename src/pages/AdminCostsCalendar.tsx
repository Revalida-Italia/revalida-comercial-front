import CostsCalendarFeature from "@/features/costs-calendar/CostsCalendarFeature";

const AdminCostsCalendar = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendario de Custos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie custos fixos mensais com visao em grade, recorrencia e categorias.
        </p>
      </div>

      <CostsCalendarFeature />
    </div>
  );
};

export default AdminCostsCalendar;
