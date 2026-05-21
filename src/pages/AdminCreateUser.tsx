import AdminCreateUserFeature from "@/features/admin-create-user/AdminCreateUserFeature";

const AdminCreateUser = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Criar Usuario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro de novos usuarios por administradores.
        </p>
      </div>

      <AdminCreateUserFeature />
    </div>
  );
};

export default AdminCreateUser;
