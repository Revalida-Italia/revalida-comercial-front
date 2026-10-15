import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Send } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  downloadContractPdf,
  downloadSignedContractPdf,
  refreshContractSignatureStatus,
  sendContractForSignature,
  type SaleContract,
} from "@/services/contractsApi";
import { cn } from "@/lib/utils";
import { canCreateStudentAccess } from "@/features/contracts/access";
import { MODEL_NAMES } from "@/features/contracts/contractFormModel";
import {
  CONTRACT_STATUS,
  contractorsLabel,
  formatGeneratedDate,
} from "@/features/contracts/contractListLabels";
import SignedContractActions from "@/features/contracts/SignedContractActions";
import { isSignedContract, knownSignedContractError } from "@/features/contracts/signedContract";

/** The send button follows the signature flag, as before. */
const SEND_ENABLED = import.meta.env.VITE_DOCUSIGN_BUTTON_FLAG === "true";

type Props = {
  contract: SaleContract;
  saleId: string;
  highlight?: boolean;
  onChanged: () => void;
};

function IconAction({
  label,
  onClick,
  pending,
  children,
}: {
  label: string;
  onClick: () => void;
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground"
          aria-label={label}
          disabled={pending}
          onClick={onClick}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function ContractListItem({ contract, saleId, highlight, onChanged }: Props) {
  const [sendOpen, setSendOpen] = useState(false);
  const signed = isSignedContract(contract);
  const statusKey = signed ? "SIGNED" : contract.status;
  const status = CONTRACT_STATUS[statusKey];

  const downloadMutation = useMutation({
    mutationFn: () => (signed ? downloadSignedContractPdf(contract.id) : downloadContractPdf(contract.id)),
    onError: (error: unknown) =>
      toast.error(knownSignedContractError(error) ?? "Não foi possível baixar o contrato. Tente novamente."),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendContractForSignature(contract.id),
    onSuccess: () => {
      toast.success("Contrato enviado para assinatura.");
      onChanged();
    },
    onError: () => toast.error("Não foi possível enviar para assinatura. Tente novamente."),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshContractSignatureStatus(contract.id),
    onSuccess: (updated) => {
      toast.success(updated.status === "SIGNED" ? "Contrato assinado." : "Status atualizado.");
      onChanged();
    },
    onError: () => toast.error("Não foi possível atualizar o status. Tente novamente."),
  });

  const recipients = (contract.signers ?? []).map((signer) => signer.email).filter(Boolean);
  const contractors = contractorsLabel(contract.signers);
  const generated = formatGeneratedDate(contract.generatedAt);

  const download = (
    <IconAction label="Baixar PDF" onClick={() => downloadMutation.mutate()} pending={downloadMutation.isPending}>
      <Download className="h-4 w-4" />
    </IconAction>
  );

  let actions: ReactNode;
  if (signed) {
    actions = (
      <>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={downloadMutation.isPending}
          onClick={() => downloadMutation.mutate()}
        >
          {downloadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Baixar contrato
        </Button>
      </>
    );
  } else if (contract.status === "GENERATED") {
    actions = SEND_ENABLED ? (
      <>
        {download}
        <Button
          size="sm"
          className="gap-1.5"
          disabled={sendMutation.isPending}
          onClick={() => setSendOpen(true)}
        >
          {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Enviar para assinatura
        </Button>
      </>
    ) : (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={downloadMutation.isPending}
        onClick={() => downloadMutation.mutate()}
      >
        {downloadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Baixar PDF
      </Button>
    );
  } else if (contract.status === "SENT") {
    actions = (
      <>
        {download}
        {contract.docusignEnvelopeId && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshMutation.isPending && "animate-spin")} />
            Atualizar status
          </Button>
        )}
      </>
    );
  } else {
    actions = (
      <>
        {download}
        <Button asChild size="sm" variant="outline">
          <Link to={`/vendas/${saleId}/contrato`}>Gerar novo contrato</Link>
        </Button>
      </>
    );
  }

  return (
    <li
      className={cn(
        "flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/60 py-3 transition-colors duration-700 last:border-b-0",
        highlight && "bg-primary/5",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <status.Icon className={cn("mt-0.5 h-5 w-5 shrink-0", status.iconClass)} aria-hidden="true" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-semibold">{MODEL_NAMES[contract.productType] ?? "Contrato"}</span>
            <span className="text-[13px] text-muted-foreground">{status.label}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {[contractors, generated ? `Gerado em ${generated}` : ""].filter(Boolean).join(" · ")}
          </p>
          {contract.signerEmail && <p className="text-[13px] text-muted-foreground">{contract.signerEmail}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {signed && canCreateStudentAccess() && <SignedContractActions contract={contract} onChanged={onChanged} />}
      </div>

      <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar para assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              {recipients.length > 0
                ? `O contrato será enviado para ${recipients.join(", ")}.`
                : "O contrato será enviado para os contratantes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => sendMutation.mutate()}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
