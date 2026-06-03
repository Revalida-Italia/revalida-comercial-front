import AdminCreateUserFeature from "@/features/admin-create-user/AdminCreateUserFeature";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminCreateUser = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <Button variant="outline" size="sm" className="mb-3 gap-1.5" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Usuários
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Criar Usuário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro de novos usuários por administradores.
        </p>
      </div>

      <AdminCreateUserFeature />
    </div>
  );
};

export default AdminCreateUser;
