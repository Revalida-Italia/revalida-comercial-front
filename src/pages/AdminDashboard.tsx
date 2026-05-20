import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSales } from "@/lib/commercialApi";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const AdminDashboard = () => {
  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: listSales,
  });

  const summary = useMemo(() => {
    const sales = salesQuery.data?.sales ?? [];
    const apiSummary = salesQuery.data?.summary;

    if (apiSummary) {
      return {
        totalSales: apiSummary.totalSales ?? sales.length,
        totalAmount: Number(apiSummary.totalAmount ?? 0),
        totalCommission: Number(apiSummary.comission ?? apiSummary.commission ?? 0),
      };
    }

    const totalAmount = sales.reduce((acc, sale) => acc + Number(sale.contractValue || 0), 0);
    const totalCommission = sales.reduce(
      (acc, sale) => acc + sale.commissions.reduce((cAcc, commission) => cAcc + Number(commission.amount || 0), 0),
      0,
    );

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
    </div>
  );
};

export default AdminDashboard;
