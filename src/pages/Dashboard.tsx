import SalesDashboardFeature from "@/features/sales-dashboard/SalesDashboardFeature";

const Dashboard = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visao mensal de vendas, comissao e progresso da sua carreira.
        </p>
      </div>

      <SalesDashboardFeature mode="seller" />
    </div>
  );
};

export default Dashboard;
