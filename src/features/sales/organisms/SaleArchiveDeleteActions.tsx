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
import { archiveSale, deleteSale, type SaleRecord } from "@/services/commercialApi";
import { saleHasPaidRecords, saleHasActiveSubscription } from "../utils";

type SaleArchiveDeleteActionsProps = {
  sale: SaleRecord;
  size?: "sm" | "default";
  onDeleted?: () => void;
  className?: string;
};

function getSaleActionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Não foi possível concluir a operação.";
  }

  if (error.message === "SALE_HAS_PAID_RECORDS") {
    return "Esta venda tem pagamentos ou comissões pagas. Use Arquivar.";
  }

  if (error.message === "COBRANCA_TOKEN_REQUIRED") {
    return "Token de cobrança necessário para cancelar a assinatura. Faça login novamente.";
  }

  if (error.message === "SALE_NOT_FOUND") {
    return "Venda não encontrada.";
  }

  return error.message || "Não foi possível concluir a operação.";
}

const SaleArchiveDeleteActions = ({
  sale,
  size = "sm",
  onDeleted,
  className,
}: SaleArchiveDeleteActionsProps) => {
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
        toast.success("Venda já estava arquivada");
      } else {
        toast.success(
          result.subscriptionCancelled
            ? "Venda arquivada e assinatura cancelada"
            : "Venda arquivada",
        );
      }

      if (result.remoteInstallmentsNotCancelled) {
        toast.warning("Parcelas avulsas no gateway podem continuar ativas — revise no Asaas.");
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
          ? "Venda excluída e assinatura cancelada"
          : "Venda excluída",
      );

      if (result.remoteInstallmentsNotCancelled) {
        toast.warning("Parcelas avulsas no gateway podem continuar ativas — revise no Asaas.");
      }

      setDeleteOpen(false);
      await invalidateSales();
      onDeleted?.();
    },
    onError: (error) => {
      toast.error(getSaleActionErrorMessage(error));
    },
  });

  const buttonSize = size === "sm" ? "sm" : "default";
  const buttonClass = size === "sm" ? "h-7 gap-1 px-2 text-[11px]" : "gap-1.5";

  if (isArchived) {
    return (
      <Button type="button" variant="outline" size={buttonSize} className={buttonClass} disabled>
        <Archive className="h-3.5 w-3.5" />
        Arquivada
      </Button>
    );
  }

  return (
    <>
      <div className={className ?? "flex flex-wrap items-center gap-1.5"}>
        <Button
          type="button"
          variant="outline"
          size={buttonSize}
          className={buttonClass}
          onClick={() => setArchiveOpen(true)}
        >
          <Archive className="h-3.5 w-3.5" />
          Arquivar
        </Button>
        <Button
          type="button"
          variant="outline"
          size={buttonSize}
          className={`${buttonClass} text-destructive hover:text-destructive`}
          disabled={hasPaid}
          title={hasPaid ? "Venda com registros pagos — use Arquivar" : "Excluir permanentemente"}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </Button>
      </div>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar venda?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  A venda deixa de cobrar o restante e fica com status <strong className="text-foreground">ARCHIVED</strong>.
                  Pagamentos, comissões e clientes <strong className="text-foreground">permanecem</strong> no histórico.
                </p>
                {hasSubscription || hasPaid ? (
                  <p>
                    Cobranças futuras da assinatura serão canceladas quando houver assinatura Asaas ativa.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>Cancelar</AlertDialogCancel>
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
                  Arquivando...
                </>
              ) : (
                "Sim, arquivar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Esta ação <strong className="text-foreground">apaga de fato</strong> a venda e os dados em cascata
                  (clientes, itens, pagamentos e comissões).
                </p>
                <p>Só use em cadastro errado ou venda sem pagamentos/comissões pagos.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
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
                  Excluindo...
                </>
              ) : (
                "Sim, excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SaleArchiveDeleteActions;
