import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommissionBreakdownResult } from "@/services/commissionApi";
import SaleSummary from "@/features/new-sale/organisms/SaleSummary";
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
}: ConfirmStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Confirmar venda</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
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
          {isSaving ? "Salvando..." : "Confirmar venda"}
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default ConfirmStep;
