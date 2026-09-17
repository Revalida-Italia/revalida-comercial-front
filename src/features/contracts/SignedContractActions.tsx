import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  createPortalStudents,
  downloadSignedContractPdf,
  type SaleContract,
} from "@/services/contractsApi";
import {
  defaultPortalPasswordHint,
  formatPortalStudentsSummary,
  isSignedContract,
  portalStudentStatusLabel,
  type CreatePortalStudentsResponse,
} from "@/features/contracts/signedContract";

type Props = {
  contract: SaleContract;
  onChanged?: () => void;
};

function signerLabel(signer: NonNullable<SaleContract["signers"]>[number]): string {
  const name = signer.name?.trim();
  return name ? `${name} (${signer.email})` : signer.email;
}

export default function SignedContractActions({ contract, onChanged }: Props) {
  const [provision, setProvision] = useState<CreatePortalStudentsResponse | null>(null);
  const passwordHint = defaultPortalPasswordHint();

  const downloadMutation = useMutation({
    mutationFn: () => downloadSignedContractPdf(contract.id),
    onSuccess: () => {
      toast.success("Download do contrato assinado iniciado.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Falha ao baixar o contrato assinado.");
    },
  });

  const createStudentsMutation = useMutation({
    mutationFn: () => createPortalStudents(contract.id),
    onSuccess: (payload) => {
      setProvision(payload);
      const summary = formatPortalStudentsSummary(payload.summary);
      if (payload.summary.failed > 0) {
        toast.error(`Alunos criados com pendências: ${summary}`);
      } else {
        toast.success(`Alunos no portal: ${summary}`);
      }
      onChanged?.();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Falha ao criar alunos no portal.");
    },
  });

  if (!isSignedContract(contract)) {
    return null;
  }

  const signers = contract.signers ?? [];
  const confirmLines = signers.filter((signer) => signer.email).map(signerLabel);

  const handleCreateStudents = () => {
    const recipients =
      confirmLines.length > 0
        ? `\n\n${confirmLines.map((line) => `• ${line}`).join("\n")}`
        : "";
    const confirmed = window.confirm(
      `Criar alunos no portal para todos os signatários deste contrato?${recipients}\n\n` +
        `Senha inicial no padrão ${passwordHint}. O e-mail de acesso é enviado pelo core com a senha no corpo.`,
    );
    if (confirmed) {
      setProvision(null);
      createStudentsMutation.mutate();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={downloadMutation.isPending}
          onClick={() => downloadMutation.mutate()}
        >
          {downloadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Baixar contrato
        </Button>
        <Button
          size="sm"
          className="gap-1"
          disabled={createStudentsMutation.isPending}
          onClick={handleCreateStudents}
        >
          {createStudentsMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GraduationCap className="h-3.5 w-3.5" />
          )}
          Criar alunos no portal
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Senha inicial: <span className="font-medium text-foreground">{passwordHint}</span>
        {" · "}
        e-mail de acesso enviado pelo core com a senha no corpo
        {signers.length > 0 ? ` · ${signers.length} signatário(s)` : ""}.
      </p>

      {createStudentsMutation.isPending && (
        <div className="space-y-1.5 rounded-md border bg-muted/40 p-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Criando alunos no portal
            {signers.length > 0 ? ` (${signers.length})` : ""}…
          </div>
          <Progress value={45} className="h-1.5" />
        </div>
      )}

      {provision && (
        <Alert className={provision.summary.failed > 0 ? "border-destructive/40" : ""}>
          {provision.summary.failed > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertTitle>Resultado da criação de alunos</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{formatPortalStudentsSummary(provision.summary)}</p>
            <ul className="space-y-1.5">
              {provision.results.map((result, index) => (
                <li
                  key={result.signerId ?? `${result.email}-${index}`}
                  className="flex flex-wrap items-center gap-2 text-foreground"
                >
                  <Badge
                    variant={
                      result.status === "failed"
                        ? "destructive"
                        : result.status === "already_exists"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {portalStudentStatusLabel(result.status)}
                  </Badge>
                  <span>
                    {result.name ? `${result.name} · ` : ""}
                    {result.email || "e-mail não informado"}
                  </span>
                  {result.coreUserId ? (
                    <span className="text-xs text-muted-foreground">core {result.coreUserId}</span>
                  ) : null}
                  {result.status === "failed" && result.error ? (
                    <span className="text-xs text-destructive">{result.error}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
