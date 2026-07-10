import { useQuery } from "@tanstack/react-query";
import { Notranslate } from "@/components/Notranslate";
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
import { listCareerPlans, type CareerPlanOption } from "@/services/careerPlansApi";
import type { CareerAssignmentCardProps } from "../types";

function getPlanCommissionRate(plan: CareerPlanOption): string {
  const rawRate = plan.individualCommissionRate ?? plan.commissionPercentage ?? plan.percentage;

  if (rawRate === undefined || rawRate === null) {
    return "";
  }

  return String(rawRate);
}

const CareerAssignmentCard = ({
  selectedUser,
  careerPlanId,
  percentage,
  onCareerPlanIdChange,
  onPercentageChange,
  onSubmit,
  onReset,
  isSubmitting,
}: CareerAssignmentCardProps) => {
  const { data: careerPlans = [] } = useQuery({
    queryKey: ["careerPlans"],
    queryFn: listCareerPlans,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Atualizar Carreira</CardTitle>
        <CardDescription>
          {selectedUser ? (
            <>
              Usuário: <span className="font-semibold text-foreground">{selectedUser.email}</span>
            </>
          ) : (
            "Selecione um usuário à esquerda para atribuir carreira"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email do usuário</Label>
            <Input
              id="email"
              value={selectedUser?.email || ""}
              placeholder="Selecione um usuário..."
              disabled
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="careerPlan">Nível de carreira</Label>
              <Select
                value={careerPlanId}
                onValueChange={(value) => {
                  onCareerPlanIdChange(value);

                  const selectedPlan = careerPlans.find((plan) => plan.id === value);
                  if (!selectedPlan) {
                    onPercentageChange("");
                    return;
                  }

                  onPercentageChange(getPlanCommissionRate(selectedPlan));
                }}
                disabled={isSubmitting || !selectedUser}
              >
                <SelectTrigger id="careerPlan">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {careerPlans.map((plan: CareerPlanOption) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <Notranslate>{plan.name}</Notranslate>
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
                onChange={(e) => onPercentageChange(e.target.value)}
                disabled={isSubmitting || !selectedUser}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !selectedUser}
            >
              {isSubmitting ? "Atualizando..." : "Atualizar carreira"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={isSubmitting || !selectedUser}
            >
              Limpar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CareerAssignmentCard;
