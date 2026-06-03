import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SaleDetailPreview from "@/features/sales/organisms/SaleDetailPreview";
import SendPaymentLinkDialog from "@/features/sales/organisms/SendPaymentLinkDialog";
import { getSaleCommissionValue, getSaleContractValue, getSaleSellerInfo } from "@/features/sales/utils";
import { listSales } from "@/services/commercialApi";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";

const SaleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: () => listSales(),
  });

  const sale = useMemo(() => salesQuery.data?.sales.find((item) => item.id === id), [id, salesQuery.data?.sales]);

  if (salesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando venda...</p>;
  }

  if (salesQuery.isError) {
    return <p className="text-sm text-destructive">Erro ao carregar venda: {(salesQuery.error as Error).message}</p>;
  }

  const hasPaymentLink = sale?.payments.some((payment) => payment.linkPagamento) ?? false;

  if (!sale) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/vendas"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Venda não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Detalhes da venda</h1>
          <p className="text-muted-foreground">ID: {sale.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!hasPaymentLink}
            onClick={() => setWhatsappOpen(true)}
          >
            <MessageCircle className="h-4 w-4" />
            Enviar link WhatsApp
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/vendas"><ArrowLeft className="mr-1 h-4 w-4" />Voltar para lista</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{getSaleSellerInfo(sale)}</p>
                {sale.seller?.careerPlan?.name && (
                  <p className="text-xs text-muted-foreground mt-1">{sale.seller.careerPlan.name}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Criada em</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{formatDateTime(sale.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contrato total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{formatCurrency(getSaleContractValue(sale), sale.currency || "BRL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Comissao total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold text-primary">{formatCurrency(getSaleCommissionValue(sale), "BRL")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview completo</CardTitle>
        </CardHeader>
        <CardContent>
          <SaleDetailPreview sale={sale} />
        </CardContent>
      </Card>

      <SendPaymentLinkDialog sale={sale} open={whatsappOpen} onOpenChange={setWhatsappOpen} />
    </div>
  );
};

export default SaleDetails;
