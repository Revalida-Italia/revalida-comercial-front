import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { archiveSale, deleteSale, type SaleRecord } from "@/services/commercialApi";
import { saleHasPaidRecords, saleHasActiveSubscription } from "../utils";

type SaleArchiveDeleteActionsProps = {
  sale: SaleRecord;
  size?: "sm" | "default";
  onDeleted?: () => void;
  className?: string;
};

function getSaleActionErrorMessage(error: unknown): string {
  const fallback = t("sales.actionError.failed");
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback;
  }

  if (error.message === "SALE_HAS_PAID_RECORDS") {
    return t("sales.actionError.paidRecords");
  }

  if (error.message === "COBRANCA_TOKEN_REQUIRED") {
    return t("sales.actionError.signInAgain");
  }

  if (error.message === "SALE_NOT_FOUND") {
    return t("sales.actionError.notFound");
  }

  if (/^[A-Z0-9_]+$/.test(error.message) || /asaas|token de cobrança|cascata|\bARCHIVED\b/i.test(error.message)) {
    return fallback;
  }

  return error.message;
}

export function useSaleArchiveDelete(sale: SaleRecord, onDeleted?: () => void) {
  const queryClient = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isArchived = String(sale.status).toUpperCase() === "ARCHIVED";
  const hasPaid = saleHasPaidRecords(sale);
  const hasSubscription = saleHasActiveSubscription(sale);

  const invalidateSales = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales"] }),
      queryClient.invalidateQueries({ queryKey: ["sale", sale.id] }),
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] }),
    ]);
  };

  const archiveMutation = useMutation({
    mutationFn: () => archiveSale(sale.id),
    onSuccess: async (result) => {
      if (result.alreadyArchived) {
        toast.success(t("sales.archive.already"));
      } else {
        toast.success(
          result.subscriptionCancelled
            ? t("sales.archive.doneSubscription")
            : t("sales.archive.done"),
        );
      }

      if (result.remoteInstallmentsNotCancelled) {
        toast.warning(t("sales.actionError.installmentsLeft"));
      }

      setArchiveOpen(false);
      await invalidateSales();
    },
    onError: (error) => {
      toast.error(getSaleActionErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSale(sale.id),
    onSuccess: async (result) => {
      toast.success(
        result.subscriptionCancelled
          ? t("sales.removeDialog.doneSubscription")
          : t("sales.removeDialog.done"),
      );

      if (result.remoteInstallmentsNotCancelled) {
        toast.warning(t("sales.actionError.installmentsLeft"));
      }

      setDeleteOpen(false);
      await invalidateSales();
      onDeleted?.();
    },
    onError: (error) => {
      toast.error(getSaleActionErrorMessage(error));
    },
  });

  const openArchive = () => setArchiveOpen(true);
  const openDelete = () => setDeleteOpen(true);

  const dialogs = (
    <>
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sales.archive.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t("sales.archive.body")}</p>
                {hasSubscription ? <p>{t("sales.archive.subscription")}</p> : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                archiveMutation.mutate();
              }}
            >
              {archiveMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  {t("sales.archive.working")}
                </>
              ) : (
                t("sales.archive.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sales.removeDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t("sales.removeDialog.body")}</p>
                <p>{t("sales.removeDialog.hint")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  {t("sales.removeDialog.working")}
                </>
              ) : (
                t("sales.removeDialog.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { isArchived, hasPaid, openArchive, openDelete, dialogs };
}

const SaleArchiveDeleteActions = ({
  sale,
  size = "sm",
  onDeleted,
  className,
}: SaleArchiveDeleteActionsProps) => {
  const { isArchived, hasPaid, openArchive, openDelete, dialogs } = useSaleArchiveDelete(sale, onDeleted);
  const buttonSize = size === "sm" ? "sm" : "default";
  const buttonClass = size === "sm" ? "h-7 shrink-0 gap-1 px-1.5 text-[11px] sm:px-2" : "gap-1.5";
  const labelClass = size === "sm" ? "sr-only sm:not-sr-only sm:whitespace-nowrap" : undefined;

  if (isArchived) {
    return (
      <Button type="button" variant="outline" size={buttonSize} className={buttonClass} disabled>
        <Archive className="h-3.5 w-3.5" />
        <span className={labelClass}>{t("sales.actions.archived")}</span>
      </Button>
    );
  }

  return (
    <>
      <div className={className ?? "flex flex-wrap items-center gap-1"}>
        <Button
          type="button"
          variant="outline"
          size={buttonSize}
          className={buttonClass}
          aria-label={t("sales.actions.archive")}
          title={t("sales.actions.archive")}
          onClick={openArchive}
        >
          <Archive className="h-3.5 w-3.5" />
          <span className={labelClass}>{t("sales.actions.archive")}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size={buttonSize}
          className={`${buttonClass} text-destructive hover:text-destructive`}
          disabled={hasPaid}
          aria-label={t("sales.actions.remove")}
          title={hasPaid ? t("sales.actions.removeBlocked") : t("sales.actions.removeReady")}
          onClick={openDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className={labelClass}>{t("sales.actions.remove")}</span>
        </Button>
      </div>
      {dialogs}
    </>
  );
};

export default SaleArchiveDeleteActions;
