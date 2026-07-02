import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { clearSession, getProfile, setAuthNotice } from "@/lib/session";
import { getDeleteProfileErrorMessage } from "@/features/profile/deleteProfileErrors";
import { deleteProfile } from "@/services/usersApi";

const CONFIRMATION_TEXT = "EXCLUIR";
const ACCOUNT_DELETED_MESSAGE = "Conta excluída com sucesso.";

type DeleteProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetSub: string;
  targetName?: string;
  isOwnProfile: boolean;
  onDeleted?: () => void;
};

const DeleteProfileDialog = ({
  open,
  onOpenChange,
  targetSub,
  targetName,
  isOwnProfile,
  onDeleted,
}: DeleteProfileDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [confirmationInput, setConfirmationInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmationInput("");
      setErrorMessage(null);
    }
  }, [open]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteProfile(targetSub),
    onSuccess: () => {
      onOpenChange(false);
      setConfirmationInput("");
      setErrorMessage(null);

      if (isOwnProfile) {
        clearSession();
        setAuthNotice(ACCOUNT_DELETED_MESSAGE);
        toast({
          title: "Conta excluída",
          description: ACCOUNT_DELETED_MESSAGE,
        });
        navigate("/", { replace: true });
        return;
      }

      toast({
        title: "Conta excluída",
        description: "O perfil do usuário foi excluído com sucesso.",
      });
      onDeleted?.();
    },
    onError: (error) => {
      const message = getDeleteProfileErrorMessage(error, isOwnProfile);
      setErrorMessage(message);
      toast({
        variant: "destructive",
        title: "Erro ao excluir conta",
        description: message,
      });
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteMutation.isPending) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const isConfirmationValid = confirmationInput.trim().toUpperCase() === CONFIRMATION_TEXT;
  const dialogTitle = isOwnProfile ? "Excluir conta?" : "Excluir conta do usuário?";
  const dialogDescription = isOwnProfile
    ? "Esta ação é permanente e não pode ser desfeita. Sua conta será removida do sistema."
    : `Esta ação é permanente e não pode ser desfeita. O perfil de ${targetName || "este usuário"} será removido do sistema.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-profile-confirmation">
            Digite <span className="font-semibold">{CONFIRMATION_TEXT}</span> para confirmar
          </Label>
          <Input
            id="delete-profile-confirmation"
            value={confirmationInput}
            onChange={(event) => setConfirmationInput(event.target.value)}
            placeholder={CONFIRMATION_TEXT}
            disabled={deleteMutation.isPending}
            autoComplete="off"
          />
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmationValid || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir conta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function isOwnProfileSub(targetSub: string): boolean {
  const currentProfile = getProfile();
  return currentProfile?.sub === targetSub || currentProfile?.externalId === targetSub;
}

export default DeleteProfileDialog;
