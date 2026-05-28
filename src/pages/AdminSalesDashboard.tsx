import SalesDashboardFeature from "@/features/sales-dashboard/SalesDashboardFeature";

const AdminSalesDashboard = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analise de vendas, comissao e progresso de carreira por competencia mensal.
        </p>
      </div>

      <SalesDashboardFeature mode="admin" />
    </div>
  );
};

export default AdminSalesDashboard;
