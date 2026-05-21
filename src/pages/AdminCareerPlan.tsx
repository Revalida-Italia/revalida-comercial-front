import AdminCareerPlanFeature from "@/features/admin-career-plan/AdminCareerPlanFeature";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminCareerPlan = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" size="sm" className="mb-3 gap-1.5" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Usuarios
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Carreira</h1>
        <p className="text-muted-foreground mt-2">Associe usuários a níveis de carreira e defina percentuais de comissão</p>
      </div>

      <AdminCareerPlanFeature />
    </div>
  );
};

export default AdminCareerPlan;
