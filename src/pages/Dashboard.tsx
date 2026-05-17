import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSales } from "@/lib/commercialApi";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const Dashboard = () => {
  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: listSales,
  });

  const metrics = useMemo(() => {
    const sales = salesQuery.data ?? [];

    return {
      totalSales: sales.length,
      totalAmount: sales.reduce((acc, sale) => acc + (sale.amount || 0), 0),
      totalCommission: sales.reduce((acc, sale) => acc + (sale.commissionAmount || 0), 0),
      latest: sales.slice(0, 5),
    };
  }, [salesQuery.data]);

  if (salesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando dados de vendas...</p>;
  }

  if (salesQuery.isError) {
    return <p className="text-sm text-destructive">Erro ao carregar dashboard: {(salesQuery.error as Error).message}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard comercial</h1>
        <p className="text-muted-foreground">Indicadores reais obtidos da API comercial.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics.totalSales}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{money.format(metrics.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissao total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{money.format(metrics.totalCommission)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimas vendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.latest.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda encontrada.</p>}
          {metrics.latest.map((sale) => (
            <div key={sale.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{sale.customerName}</p>
                <p className="text-sm text-muted-foreground">{sale.productName ?? "Produto"} • {sale.createdAt}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sale.status}</Badge>
                <span className="font-semibold">{money.format(sale.amount || 0)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
