import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CommissionBreakdownResult } from "@/services/commissionApi";
import type { SaleStatus } from "@/services/commercialApi";
import type { UserSearchResult } from "@/services/usersApi";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
import { SALE_STATUS_OPTIONS } from "../constants";
import type { ConfiguredSalePayment, FilledSaleCustomer, SalePaymentDraft, SaleSummaryItem } from "../types";

type ConfirmStepProps = {
  filledCustomers: FilledSaleCustomer[];
  saleItems: SaleSummaryItem[];
  configuredPayments: ConfiguredSalePayment[];
  commissionBreakdown: CommissionBreakdownResult;
  estimatedCommission: number;
  currency: string;
  careerPlanName?: string;
  canSubmit: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: () => void;
  getFeeRate: (gateway: string, paymentType: string) => number;
  paymentGrossValue: (payment: SalePaymentDraft) => number;
  isEditMode?: boolean;
  status?: SaleStatus;
  soldAt?: string;
  sellerId?: string;
  sellerOptions?: UserSearchResult[];
  sellersLoading?: boolean;
  showSellerSelect?: boolean;
  onStatusChange?: (value: SaleStatus) => void;
  onSoldAtChange?: (value: string) => void;
  onSellerIdChange?: (value: string) => void;
  onSellerSearchChange?: (value: string) => void;
  sellerSearchTerm?: string;
};

const ConfirmStep = ({
  filledCustomers,
  saleItems,
  configuredPayments,
  commissionBreakdown,
  estimatedCommission,
  currency,
  careerPlanName,
  canSubmit,
  isSaving,
  onBack,
  onSubmit,
  getFeeRate,
  paymentGrossValue,
  isEditMode = false,
  status = "PENDING",
  soldAt = "",
  sellerId = "",
  sellerOptions = [],
  sellersLoading = false,
  showSellerSelect = false,
  onStatusChange,
  onSoldAtChange,
  onSellerIdChange,
  onSellerSearchChange,
  sellerSearchTerm = "",
}: ConfirmStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{isEditMode ? "Confirmar edição" : "Confirmar venda"}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {isEditMode && (
        <div className="mx-auto max-w-2xl space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Dados da venda</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status da venda</Label>
              <Select value={status} onValueChange={(value) => onStatusChange?.(value as SaleStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data da venda</Label>
              <DatePicker value={soldAt} onChange={(value) => onSoldAtChange?.(value)} />
            </div>
          </div>

          {showSellerSelect && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Buscar vendedor</Label>
                <Input
                  value={sellerSearchTerm}
                  onChange={(event) => onSellerSearchChange?.(event.target.value)}
                  placeholder="Nome ou e-mail do vendedor"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor</Label>
                <Select value={sellerId} onValueChange={(value) => onSellerIdChange?.(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={sellersLoading ? "Carregando..." : "Selecione o vendedor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sellerOptions.map((seller) => {
                      const value = seller.externalId || seller.id;
                      return (
                        <SelectItem key={seller.id} value={value}>
                          {seller.name || seller.email}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        <SaleSummary
          filledCustomers={filledCustomers}
          saleItems={saleItems}
          configuredPayments={configuredPayments}
          commissionBreakdown={commissionBreakdown}
          estimatedCommission={estimatedCommission}
          currency={currency}
          careerPlanName={careerPlanName}
          getFeeRate={getFeeRate}
          paymentGrossValue={paymentGrossValue}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || isSaving}>
          {isSaving ? "Salvando..." : isEditMode ? "Salvar alterações" : "Confirmar venda"}
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default ConfirmStep;
