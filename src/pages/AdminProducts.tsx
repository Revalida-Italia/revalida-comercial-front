import AdminProductsFeature from "@/features/admin-products/AdminProductsFeature";

const AdminProducts = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie produtos disponíveis para operação comercial.</p>
      </div>

      <AdminProductsFeature />
    </div>
  );
};

export default AdminProducts;
