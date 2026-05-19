import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommissionBreakdownResult } from "@/lib/commission";
import type { ConfiguredSalePayment, FilledSaleCustomer, SalePaymentDraft } from "../types";
import SaleSummary from "./SaleSummary";

type ConfirmStepProps = {
  filledCustomers: FilledSaleCustomer[];
  productName?: string;
  releaseDate: string;
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
  productName,
  releaseDate,
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
          productName={productName}
          releaseDate={releaseDate}
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
