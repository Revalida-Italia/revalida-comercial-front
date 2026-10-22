import { CircleSlash } from "lucide-react";
import PublicPaymentResult from "./PublicPaymentResult";

const CANCEL_TITLE = "Pagamento não concluído";
const CANCEL_GUIDANCE =
  "Nenhuma cobrança foi feita. Para tentar de novo, abra novamente o link de pagamento que você recebeu ou fale com seu consultor.";

const PaymentCancel = () => {
  return (
    <PublicPaymentResult title={CANCEL_TITLE} tone="neutral" icon={<CircleSlash className="h-7 w-7" aria-hidden="true" />}>
      <p className="text-base leading-relaxed text-muted-foreground">{CANCEL_GUIDANCE}</p>
    </PublicPaymentResult>
  );
};

export default PaymentCancel;
