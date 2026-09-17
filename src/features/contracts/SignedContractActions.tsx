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
  inferPortalPassword,
  isSignedContract,
  portalStudentStatusLabel,
  type PortalStudentResult,
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
  const [studentResults, setStudentResults] = useState<PortalStudentResult[] | null>(null);
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
      setStudentResults(payload.results);
      const summary = formatPortalStudentsSummary(payload.results);
      if (payload.results.some((result) => result.status === "failed")) {
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

  const signerEmails = (contract.signers ?? [])
    .map((signer) => signer.email)
    .filter(Boolean);
  const confirmLines = (contract.signers ?? [])
    .filter((signer) => signer.email)
    .map(signerLabel);

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
      setStudentResults(null);
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
        {signerEmails.length > 0 ? ` · ${signerEmails.length} signatário(s)` : ""}.
      </p>

      {createStudentsMutation.isPending && (
        <div className="space-y-1.5 rounded-md border bg-muted/40 p-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Criando alunos no portal
            {signerEmails.length > 0 ? ` (${signerEmails.length})` : ""}…
          </div>
          <Progress value={45} className="h-1.5" />
        </div>
      )}

      {studentResults && (
        <Alert className={studentResults.some((result) => result.status === "failed") ? "border-destructive/40" : ""}>
          {studentResults.some((result) => result.status === "failed") ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertTitle>Resultado da criação de alunos</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{formatPortalStudentsSummary(studentResults)}</p>
            <ul className="space-y-1.5">
              {studentResults.map((result, index) => {
                const password =
                  result.temporaryPassword ??
                  (result.status === "created" && result.name
                    ? inferPortalPassword(result.name)
                    : null);
                return (
                  <li
                    key={`${result.email}-${index}`}
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
                    {password && result.status === "created" ? (
                      <span className="text-xs text-muted-foreground">senha {password}</span>
                    ) : null}
                    {result.status === "failed" && result.error ? (
                      <span className="text-xs text-destructive">{result.error}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
