import BillingCalendarFeature from "@/features/billing-calendar/BillingCalendarFeature";

const BillingCalendar = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendario de Cobrancas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe assinaturas pagas, pendentes e em atraso no mes.
        </p>
      </div>

      <BillingCalendarFeature />
    </div>
  );
};

export default BillingCalendar;
