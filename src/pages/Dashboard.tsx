import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveProfile } from "@/services/authApi";
import { listSales } from "@/services/commercialApi";
import { getProfile, setProfile } from "@/lib/session";
import { getSaleContractValue, getSaleCustomerNames, getSaleProductName } from "@/features/sales/utils";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";

const Dashboard = () => {
  const currentProfile = getProfile();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => resolveProfile(currentProfile?.sub ?? "", {
      email: currentProfile?.email,
      role: currentProfile?.role,
    }),
    enabled: Boolean(currentProfile?.sub),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: listSales,
  });

  const metrics = useMemo(() => {
    const sales = salesQuery.data?.sales ?? [];
    const apiSummary = salesQuery.data?.summary;

    return {
      totalSales: apiSummary?.totalSales ?? sales.length,
      totalAmount: Number(apiSummary?.totalAmount ?? sales.reduce((acc, sale) => acc + Number(sale.contractValue || 0), 0)),
      totalCommission: Number(
        apiSummary?.comission
        ?? apiSummary?.commission
        ?? sales.reduce(
          (acc, sale) => acc + sale.commissions.reduce((cAcc, commission) => cAcc + Number(commission.amount || 0), 0),
          0,
        ),
      ),
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
            <p className="text-3xl font-semibold">{formatCurrency(metrics.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissao total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(metrics.totalCommission)}</p>
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
                <p className="font-medium text-foreground">{getSaleCustomerNames(sale)}</p>
                <p className="text-sm text-muted-foreground">{getSaleProductName(sale)} • {formatDateTime(sale.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sale.status}</Badge>
                <span className="font-semibold">{formatCurrency(getSaleContractValue(sale))}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
