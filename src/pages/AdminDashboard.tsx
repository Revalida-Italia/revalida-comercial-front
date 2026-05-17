import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSales } from "@/lib/commercialApi";
import { updateUserCareerPlan } from "@/lib/authApi";

const careerLevels = [
  "TRAINEE_JUNIOR",
  "TRAINEE_PLENO",
  "TRAINEE_SENIOR",
  "LANCAMENTO_GERENTE",
  "GERENTE",
  "GERENTE_PLENO",
  "GERENTE_SENIOR",
  "DIRETOR",
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [userSub, setUserSub] = useState("");
  const [careerLevel, setCareerLevel] = useState("TRAINEE_JUNIOR");
  const [commissionPct, setCommissionPct] = useState("5");

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: listSales,
  });

  const careerMutation = useMutation({
    mutationFn: async () => {
      if (!userSub.trim()) {
        throw new Error("Informe o sub/externalId do usuario.");
      }

      await updateUserCareerPlan(userSub.trim(), careerLevel, Number(commissionPct));
    },
    onSuccess: async () => {
      toast.success("Plano de carreira atualizado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      setUserSub("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar plano de carreira.");
    },
  });

  const summary = useMemo(() => {
    const sales = salesQuery.data ?? [];
    const totalAmount = sales.reduce((acc, sale) => acc + (sale.amount || 0), 0);
    const totalCommission = sales.reduce((acc, sale) => acc + (sale.commissionAmount || 0), 0);

    return {
      totalSales: sales.length,
      totalAmount,
      totalCommission,
    };
  }, [salesQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin</h1>
        <p className="text-muted-foreground">Operacoes administrativas apenas com APIs reais.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.totalSales}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{money.format(summary.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissoes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{money.format(summary.totalCommission)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Associar usuario a nivel de carreira</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Sub/externalId do usuario</Label>
            <Input value={userSub} onChange={(event) => setUserSub(event.target.value)} placeholder="ex: auth0|abc123" />
          </div>

          <div className="space-y-2">
            <Label>Nivel de carreira</Label>
            <Select value={careerLevel} onValueChange={setCareerLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {careerLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Percentual de comissao (%)</Label>
            <Input type="number" step="0.01" value={commissionPct} onChange={(event) => setCommissionPct(event.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Button onClick={() => careerMutation.mutate()} disabled={careerMutation.isPending}>
              {careerMutation.isPending ? "Atualizando..." : "Atualizar carreira"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
