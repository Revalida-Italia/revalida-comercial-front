import { CircleCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PublicPaymentResult from "./PublicPaymentResult";
import { paymentSessionReference } from "./paymentSessionReference";

const SUCCESS_MESSAGE = "Pagamento recebido! A confirmação chega em instantes.";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const reference = paymentSessionReference(params.get("session_id"));

  return (
    <PublicPaymentResult title={SUCCESS_MESSAGE} tone="success" icon={<CircleCheck className="h-7 w-7" aria-hidden="true" />}>
      {reference ? (
        <p className="text-xs text-muted-foreground">
          Referência <span className="font-medium text-foreground">••••{reference}</span>
        </p>
      ) : null}
    </PublicPaymentResult>
  );
};

export default PaymentSuccess;
