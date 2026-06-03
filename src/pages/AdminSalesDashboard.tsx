import SalesDashboardFeature from "@/features/sales-dashboard/SalesDashboardFeature";

const AdminSalesDashboard = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análise de vendas, comissão e progresso de carreira por competência mensal.
        </p>
      </div>

      <SalesDashboardFeature mode="admin" />
    </div>
  );
};

export default AdminSalesDashboard;
