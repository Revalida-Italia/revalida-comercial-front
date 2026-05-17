import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listSales } from "@/lib/commercialApi";

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(value || 0);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
        <p className="text-muted-foreground">Lista completa de vendas vinda da API comercial.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historico de vendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(salesQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma venda encontrada.</p>
          )}

          {(salesQuery.data ?? []).map((sale) => (
            <div key={sale.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{sale.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {sale.productName ?? "Produto"} • {sale.createdAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sale.paymentType}</Badge>
                  <Badge>{sale.status}</Badge>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                <p>Gateway: {sale.gateway}</p>
                <p>Vendedor: {sale.sellerName ?? sale.sellerId}</p>
                <p>Valor: {formatCurrency(sale.amount || 0, sale.currency)}</p>
                <p>Comissao: {formatCurrency(sale.commissionAmount || 0, "BRL")}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesList;
