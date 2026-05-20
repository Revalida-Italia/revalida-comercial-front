import AdminCareerPlanFeature from "@/features/admin-career-plan/AdminCareerPlanFeature";

const AdminCareerPlan = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Carreira</h1>
        <p className="text-muted-foreground mt-2">Associe usuários a níveis de carreira e defina percentuais de comissão</p>
      </div>

      <AdminCareerPlanFeature />
    </div>
  );
};

export default AdminCareerPlan;
