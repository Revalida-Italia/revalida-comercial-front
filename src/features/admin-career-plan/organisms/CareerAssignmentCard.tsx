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
import { DatePicker } from "@/components/ui/date-picker";
import { listCareerPlans, type CareerPlanOption } from "@/services/careerPlansApi";
import type { CareerAssignmentCardProps } from "../types";
import { formatCareerPlanStartDateLabel } from "../careerPlanStartDate";
import { UserCircle } from "lucide-react";

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
  careerPlanStartDate,
  onCareerPlanIdChange,
  onPercentageChange,
  onCareerPlanStartDateChange,
  onSubmit,
  onReset,
  isSubmitting,
}: CareerAssignmentCardProps) => {
  const { data: careerPlans = [] } = useQuery({
    queryKey: ["careerPlans"],
    queryFn: listCareerPlans,
  });

  return (
    <Card className="min-h-[420px]">
      <CardHeader>
        <CardTitle className="text-lg">Atualizar Carreira</CardTitle>
        <CardDescription>
          {selectedUser
            ? <>Usuário: <span className="font-semibold text-foreground">{selectedUser.email}</span></>
            : "Selecione um usuário na busca ao lado para editar o plano de carreira."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedUser ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
            <UserCircle className="mb-3 h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm font-medium text-foreground">Nenhum usuário selecionado</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Busque e selecione um vendedor à esquerda para visualizar e atualizar plano, comissão e data de início.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email do usuário</Label>
              <Input
                id="email"
                value={selectedUser.email}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="careerPlanStartDate">Início no plano de carreira</Label>
              <DatePicker
                value={careerPlanStartDate}
                onChange={onCareerPlanStartDateChange}
                placeholder="Selecionar data de início"
                disabled={isSubmitting}
                fromYear={new Date().getFullYear() - 5}
                toYear={new Date().getFullYear() + 1}
              />
              <p className="text-xs text-muted-foreground">
                Data a partir da qual o vendedor passa a acumular clientes e estrelas no plano atual.
                Ao trocar o plano, o padrão é hoje; ajuste para uma data retroativa se necessário.
              </p>
              <p className="text-xs text-muted-foreground">
                Data salva no vendedor:{" "}
                <span className="font-medium text-foreground">
                  {formatCareerPlanStartDateLabel(selectedUser.inTheCareerPlanSince)}
                </span>
                {!selectedUser.inTheCareerPlanSince && (
                  <> — salve com uma data para habilitar o progresso de carreira.</>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Atualizando..." : "Atualizar carreira"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={isSubmitting}
              >
                Limpar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default CareerAssignmentCard;
