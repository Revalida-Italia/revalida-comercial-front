import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
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
import { createPortalStudents, type SaleContract } from "@/services/contractsApi";
import {
  isSignedContract,
  knownSignedContractError,
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

/** "Criar acesso dos alunos": only for signed contracts. The caller decides who may see it. */
export default function SignedContractActions({ contract, onChanged }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failures, setFailures] = useState<CreatePortalStudentsResponse["results"]>([]);

  const createStudentsMutation = useMutation({
    mutationFn: () => createPortalStudents(contract.id),
    onSuccess: (payload) => {
      const failed = payload.results.filter((result) => result.status === "failed");
      setFailures(failed);
      const ok = payload.summary.created + payload.summary.alreadyExists;
      if (failed.length > 0) {
        toast.error(
          failed.length === 1
            ? "Não foi possível criar o acesso de 1 aluno."
            : `Não foi possível criar o acesso de ${failed.length} alunos.`,
        );
      }
      if (ok > 0) toast.success(`Acesso criado para ${ok} aluno(s).`);
      onChanged?.();
    },
    onError: (error: unknown) => {
      toast.error(knownSignedContractError(error) ?? "Não foi possível criar o acesso dos alunos. Tente novamente.");
    },
  });

  if (!isSignedContract(contract)) return null;

  const people = (contract.signers ?? []).filter((signer) => signer.email).map(signerLabel);

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={createStudentsMutation.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {createStudentsMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <GraduationCap className="h-3.5 w-3.5" />
        )}
        Criar acesso dos alunos
      </Button>

      {failures.length > 0 && (
        <ul className="space-y-0.5 text-[13px] text-destructive">
          {failures.map((failure, index) => (
            <li key={failure.signerId ?? `${failure.email}-${index}`}>
              Não foi possível criar o acesso de {failure.name || failure.email || "um aluno"}.
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar acesso dos alunos?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {people.length > 0 ? (
                  <>
                    <p>O acesso será criado para:</p>
                    <ul className="mt-2 space-y-0.5">
                      {people.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>O acesso será criado para todos os contratantes deste contrato.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFailures([]);
                createStudentsMutation.mutate();
              }}
            >
              Criar acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
