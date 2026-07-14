import SalesDashboardFeature from "@/features/sales-dashboard/SalesDashboardFeature";

const AdminDashboard = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione um vendedor para visualizar perfil e histórico mensal de clientes.
        </p>
      </div>

      <SalesDashboardFeature mode="admin" />
    </div>
  );
};

export default AdminDashboard;
