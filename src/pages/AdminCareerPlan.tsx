import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { listCareerPlans, updateUserCareerPlanById, type CareerPlanOption } from "@/lib/careerPlansApi";

const AdminCareerPlan = () => {
  const [externalId, setExternalId] = useState("");
  const [careerPlanId, setCareerPlanId] = useState("");
  const [percentage, setPercentage] = useState("");

  // Fetch career plans
  const { data: careerPlans = [] } = useQuery({
    queryKey: ["careerPlans"],
    queryFn: listCareerPlans,
  });

  // Mutation para atualizar career plan
  const updateCareerMutation = useMutation({
    mutationFn: async (data: { externalId: string; careerPlanId: string; percentage: string }) => {
      await updateUserCareerPlanById(data.externalId, data.careerPlanId, Number(data.percentage));
    },
    onSuccess: () => {
      toast.success("Carreira atualizada com sucesso");
      setExternalId("");
      setCareerPlanId("");
      setPercentage("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar carreira";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalId.trim() || !careerPlanId || !percentage) {
      toast.error("Preencha todos os campos");
      return;
    }
    updateCareerMutation.mutate({ externalId, careerPlanId, percentage });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Carreira</h1>
        <p className="text-muted-foreground mt-2">Associe usuários a níveis de carreira e defina percentuais de comissão</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Associar usuário a nível de carreira</CardTitle>
          <CardDescription>Defina a carreira e o percentual de comissão para um vendedor</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="externalId">Sub/externalId do usuário</Label>
              <Input
                id="externalId"
                placeholder="ex: auth0|abc123"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                disabled={updateCareerMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="careerPlan">Nível de carreira</Label>
                <Select value={careerPlanId} onValueChange={setCareerPlanId} disabled={updateCareerMutation.isPending}>
                  <SelectTrigger id="careerPlan">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {careerPlans.map((plan: CareerPlanOption) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentage">Percentual de comissão (%)</Label>
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="5"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  disabled={updateCareerMutation.isPending}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateCareerMutation.isPending}
            >
              {updateCareerMutation.isPending ? "Atualizando..." : "Atualizar carreira"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCareerPlan;
