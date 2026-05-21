import AdminProductCreateFeature from "@/features/admin-products/AdminProductCreateFeature";

const AdminProductsCreate = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Criar Produto</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastro de novo produto para o catalogo comercial.</p>
      </div>

      <AdminProductCreateFeature />
    </div>
  );
};

export default AdminProductsCreate;
