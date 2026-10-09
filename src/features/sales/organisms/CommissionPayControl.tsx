import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  commissionHoldLabel,
  commissionStatusText,
  isCancelledStatus,
  type CommissionPayView,
} from "@/features/sales/utils/commissionStatus";

export type { CommissionPayView };

type CommissionPayControlProps = {
  commission?: CommissionPayView | null;
  canPayCommission?: boolean;
  isPaying?: boolean;
  onPay?: () => void;
};

const CommissionPayControl = ({
  commission,
  canPayCommission = false,
  isPaying = false,
  onPay,
}: CommissionPayControlProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!commission) {
    return null;
  }

  const status = String(commission.status ?? "").toUpperCase();
  const isPaid = status === "PAID";
  const isCancelled = isCancelledStatus(status);
  const showAction = Boolean(
    canPayCommission
    && onPay
    && !isPaid
    && !isCancelled
    && (commission.canPay || commission.eligibleAt),
  );
  const holdLabel = !commission.canPay ? commissionHoldLabel(commission.eligibleAt) : null;

  return (
    <div className="space-y-1">
      <p className={`text-xs ${isCancelled ? "text-muted-foreground" : "text-foreground"}`}>
        Comissão: {commissionStatusText(commission)}
      </p>
      {showAction && (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={!commission.canPay || isPaying}
            onClick={() => setConfirmOpen(true)}
          >
            {isPaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Marcar comissão como paga
          </Button>
          {holdLabel && (
            <p className="text-[10px] text-muted-foreground">{holdLabel}</p>
          )}
        </>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar comissão como paga?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o pagamento manual desta comissão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPaying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPaying || !commission.canPay}
              onClick={() => {
                setConfirmOpen(false);
                onPay?.();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommissionPayControl;
