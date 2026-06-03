import AdminUsersFeature from "@/features/admin-users/AdminUsersFeature";

const AdminUsers = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel central para criação de usuários e gerenciamento de carreira.
        </p>
      </div>

      <AdminUsersFeature />
    </div>
  );
};

export default AdminUsers;
