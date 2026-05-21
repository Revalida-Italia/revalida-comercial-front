import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeNewPasswordChallenge } from "@/services/authApi";
import { setAuthNotice } from "@/lib/session";
import loginBg from "@/assets/login-bg.jpg";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

interface FirstAccessLocationState {
  email?: string;
  session?: string;
  challengeName?: string;
}

const FirstAccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as FirstAccessLocationState | null) ?? null;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const isChallengeValid = useMemo(
    () => state?.challengeName === "NEW_PASSWORD_REQUIRED" && Boolean(state?.email) && Boolean(state?.session),
    [state],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!state?.email || !state.session) {
        throw new Error("Sessao de desafio invalida. Faca login novamente.");
      }

      await completeNewPasswordChallenge({
        email: state.email,
        session: state.session,
        newPassword,
      });
    },
    onSuccess: () => {
      setAuthNotice("Senha atualizada com sucesso. Faca login para continuar.");
      toast.success("Nova senha definida com sucesso.");
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel definir a nova senha.");
    },
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isChallengeValid) {
      toast.error("Sessao de primeiro acesso invalida. Faca login novamente.");
      navigate("/", { replace: true });
      return;
    }

    const nextErrors: typeof errors = {};

    if (!newPassword) {
      nextErrors.newPassword = "Nova senha e obrigatoria";
    } else if (!PASSWORD_PATTERN.test(newPassword)) {
      nextErrors.newPassword = "Use 8+ caracteres com maiuscula, minuscula, numero e simbolo";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirme a nova senha";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "As senhas precisam ser iguais";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrija os campos obrigatorios.");
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        <img src={loginBg} alt="Background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 gradient-primary opacity-75" />
        <div className="relative z-10 flex items-end p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="mb-2 text-4xl font-display font-bold text-primary-foreground">Primeiro Acesso</h2>
            <p className="text-lg text-primary-foreground/70">Defina sua senha para liberar o acesso a plataforma</p>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="space-y-2 text-center">
            <div className="mb-4 inline-flex items-center gap-2 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-body font-bold text-foreground">Crie sua nova senha</h1>
            <p className="text-muted-foreground">{state?.email ?? "Confirme sua nova senha para continuar."}</p>
          </div>

          <div className="h-px bg-border" />

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    if (errors.newPassword) {
                      setErrors((current) => ({ ...current, newPassword: undefined }));
                    }
                  }}
                  className={errors.newPassword ? "border-destructive" : ""}
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showNewPassword ? "Ocultar nova senha" : "Mostrar nova senha"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              <p className="text-xs text-muted-foreground">
                Minimo 8 caracteres, com maiuscula, minuscula, numero e simbolo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (errors.confirmPassword) {
                      setErrors((current) => ({ ...current, confirmPassword: undefined }));
                    }
                  }}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showConfirmPassword ? "Ocultar confirmacao" : "Mostrar confirmacao"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={mutation.isPending}>
              <KeyRound className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Confirmando..." : "Confirmar nova senha"}
            </Button>
          </form>

          <div className="h-px bg-border" />

          <p className="text-center text-xs text-muted-foreground">Sistema Comerciald Portal Revalida © 2026</p>
        </motion.div>
      </div>
    </div>
  );
};

export default FirstAccess;
