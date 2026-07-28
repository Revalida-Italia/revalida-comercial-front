import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2, MessageCircle, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notranslate } from "@/components/Notranslate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DisplayCurrencySelect from "@/components/DisplayCurrencySelect";
import SaleDetailPreview from "@/features/sales/organisms/SaleDetailPreview";
import EditableSection from "@/features/sales/organisms/EditableSection";
import CreatePaymentLinkDialog from "@/features/sales/organisms/CreatePaymentLinkDialog";
import SendPaymentLinkDialog from "@/features/sales/organisms/SendPaymentLinkDialog";
import SaleArchiveDeleteActions from "@/features/sales/organisms/SaleArchiveDeleteActions";
import { getSaleCommissionValue, getSaleContractValue, getSaleSellerInfo } from "@/features/sales/utils";
import { saleHasPaymentLink } from "@/features/sales/utils/paymentLink";
import { getProfile, hasRole } from "@/lib/session";
import { canMutateSales } from "@/services/usersApi";
import { getSaleById } from "@/services/commercialApi";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";
import {
  convertBrlWithSaleRate,
  formatSaleExchangeRateLabel,
  getSaleRateBrl,
  hasSaleExchangeRate,
} from "@/shared/utils/exchange";

const SaleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = getProfile();
  const isAdmin = hasRole("ADMIN");
  const canMutate = canMutateSales(profile?.role);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("BRL");

  const saleQuery = useQuery({
    queryKey: ["sale", id],
    queryFn: () => getSaleById(id!),
    enabled: Boolean(id),
  });

  const sale = saleQuery.data;

  if (saleQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando venda...</p>;
  }

  if (saleQuery.isError) {
    return <p className="text-sm text-destructive">Erro ao carregar venda: {(saleQuery.error as Error).message}</p>;
  }

  const hasPaymentLink = saleHasPaymentLink(sale ?? {});
  const hasPayments = (sale?.payments?.length ?? 0) > 0;
  const isArchived = String(sale?.status ?? "").toUpperCase() === "ARCHIVED";

  if (!sale) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Venda não encontrada.</p>
      </div>
    );
  }

  const sellerCard = (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Vendedor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2">
          <UserCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium break-words">{getSaleSellerInfo(sale)}</p>
            {sale.seller?.careerPlan?.name && (
              <p className="text-xs text-muted-foreground mt-1">
                <Notranslate>{sale.seller.careerPlan.name}</Notranslate>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const contractBrl = getSaleContractValue(sale);
  const commissionBrl = getSaleCommissionValue(sale);
  const exchangeRateLabel = formatSaleExchangeRateLabel(sale);
  const hasSnapshot = hasSaleExchangeRate(sale, "USD") || hasSaleExchangeRate(sale, "EUR");

  const contractDisplay = displayCurrency === "BRL" || !hasSaleExchangeRate(sale, displayCurrency)
    ? formatCurrency(contractBrl, "BRL")
    : formatCurrency(convertBrlWithSaleRate(contractBrl, displayCurrency, sale) ?? 0, displayCurrency);

  const commissionDisplay = displayCurrency === "BRL" || !hasSaleExchangeRate(sale, displayCurrency)
    ? formatCurrency(commissionBrl, "BRL")
    : formatCurrency(convertBrlWithSaleRate(commissionBrl, displayCurrency, sale) ?? 0, displayCurrency);

  const missingRateForDisplay = displayCurrency !== "BRL" && !hasSaleExchangeRate(sale, displayCurrency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Detalhes da venda</h1>
          <p className="text-muted-foreground">ID: {sale.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DisplayCurrencySelect
            value={displayCurrency}
            onChange={setDisplayCurrency}
            label="Moeda de exibição"
          />
          {canMutate && !hasPaymentLink && !isArchived && (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={!hasPayments}
              onClick={() => setCreateLinkOpen(true)}
            >
              <Link2 className="h-4 w-4" />
              Link Hotmart
            </Button>
          )}
          {canMutate && !isArchived && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!hasPaymentLink}
              onClick={() => setWhatsappOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              Enviar link WhatsApp
            </Button>
          )}
          {isAdmin && (
            <SaleArchiveDeleteActions
              sale={sale}
              size="default"
              onDeleted={() => navigate("/dashboard", { replace: true })}
            />
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" />Voltar para o dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {canMutate && !isArchived ? (
          <EditableSection editTo={`/vendas/${sale.id}/editar?step=4`} label="Editar vendedor e status" className="h-full">
            {sellerCard}
          </EditableSection>
        ) : (
          sellerCard
        )}
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
          <CardContent className="space-y-1">
            <p className="text-base font-semibold">{contractDisplay}</p>
            {displayCurrency !== "BRL" && !missingRateForDisplay && (
              <p className="text-xs text-muted-foreground">{formatCurrency(contractBrl, "BRL")}</p>
            )}
            {missingRateForDisplay && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-900">
                sem cotação
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Comissao total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-base font-semibold text-primary">{commissionDisplay}</p>
            {displayCurrency !== "BRL" && !missingRateForDisplay && (
              <p className="text-xs text-muted-foreground">{formatCurrency(commissionBrl, "BRL")}</p>
            )}
            {missingRateForDisplay && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-900">
                sem cotação
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cotação usada nesta venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hasSnapshot && exchangeRateLabel ? (
            <>
              <p className="text-sm text-foreground">{exchangeRateLabel}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {getSaleRateBrl(sale, "USD") != null && (
                  <span>
                    Contrato em USD:{" "}
                    <strong className="text-foreground">
                      {formatCurrency(convertBrlWithSaleRate(contractBrl, "USD", sale) ?? 0, "USD")}
                    </strong>
                  </span>
                )}
                {getSaleRateBrl(sale, "EUR") != null && (
                  <span>
                    Contrato em EUR:{" "}
                    <strong className="text-foreground">
                      {formatCurrency(convertBrlWithSaleRate(contractBrl, "EUR", sale) ?? 0, "EUR")}
                    </strong>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cotação do histórico corresponde ao dia de criação da venda {formatDateTime(sale.createdAt)}.
              </p>
            </>
          ) : (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-900">
              sem cotação
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview completo</CardTitle>
          {canMutate && !isArchived ? (
            <p className="text-xs text-muted-foreground">
              Passe o mouse sobre cada seção para editar. Valores do preview permanecem em BRL.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Visualização somente leitura. Valores do preview permanecem em BRL.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <SaleDetailPreview sale={sale} readOnly={!canMutate || isArchived} />
        </CardContent>
      </Card>

      <CreatePaymentLinkDialog sale={sale} open={createLinkOpen} onOpenChange={setCreateLinkOpen} />
      <SendPaymentLinkDialog sale={sale} open={whatsappOpen} onOpenChange={setWhatsappOpen} />
    </div>
  );
};

export default SaleDetails;
