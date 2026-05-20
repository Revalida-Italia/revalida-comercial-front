import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { listSales } from "@/services/commercialApi";
import SaleListCard from "@/features/sales/organisms/SaleListCard";
import SalesSummaryCards from "@/features/sales/organisms/SalesSummaryCards";

const SalesList = () => {
  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: listSales,
  });

  if (salesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando vendas...</p>;
  }

  if (salesQuery.isError) {
    return <p className="text-sm text-destructive">Erro ao carregar vendas: {(salesQuery.error as Error).message}</p>;
  }

  const sales = salesQuery.data?.sales ?? [];
  const summary = salesQuery.data?.summary ?? {
    totalSales: 0,
    totalAmount: 0,
    comission: 0,
    comissionFuture: 0,
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/70 p-4">
        <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
        <p className="text-muted-foreground">Historico comercial com resumo financeiro e acesso ao detalhe completo.</p>
      </div>

      <SalesSummaryCards summary={summary} />

      <Card>
        <CardContent className="space-y-2.5 p-3 md:p-4">
          {sales.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma venda encontrada.</p>
          )}

          {sales.map((sale) => (
            <SaleListCard key={sale.id} sale={sale} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesList;
