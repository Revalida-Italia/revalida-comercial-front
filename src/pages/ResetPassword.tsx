import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearPersistedResetEmail,
  confirmPasswordReset,
  getPasswordResetErrorMessage,
  persistResetEmail,
  readPersistedResetEmail,
  requestPasswordReset,
} from "@/services/authApi";
import { setAuthNotice } from "@/lib/session";
import loginBg from "@/assets/login-bg.jpg";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    const persisted = emailFromQuery || readPersistedResetEmail();
    if (persisted) {
      setEmail(persisted);
      persistResetEmail(persisted);
    }
  }, [emailFromQuery]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await confirmPasswordReset({
        email,
        code,
        newPassword,
      });
    },
    onSuccess: () => {
      clearPersistedResetEmail();
      setAuthNotice("Senha redefinida com sucesso. Faca login para continuar.");
      toast.success("Senha redefinida com sucesso.");
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getPasswordResetErrorMessage(error));
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      await requestPasswordReset(email);
    },
    onSuccess: () => {
      persistResetEmail(email);
      toast.success("Se existir uma conta com este e-mail, enviamos um novo codigo.");
    },
    onError: (error: unknown) => {
      toast.error(getPasswordResetErrorMessage(error));
    },
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "E-mail e obrigatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "E-mail invalido";
    }

    if (!code.trim()) {
      nextErrors.code = "Codigo e obrigatorio";
    }

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

    resetMutation.mutate();
  };

  const onResend = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrors((current) => ({ ...current, email: "Informe o e-mail para reenviar o codigo." }));
      toast.error("Informe o e-mail para reenviar o codigo.");
      return;
    }

    resendMutation.mutate();
  };

  const isPending = resetMutation.isPending || resendMutation.isPending;

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
            <h2 className="mb-2 text-4xl font-display font-bold text-primary-foreground">Nova senha</h2>
            <p className="text-lg text-primary-foreground/70">Use o codigo enviado por e-mail</p>
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
            <h1 className="text-3xl font-body font-bold text-foreground">Redefinir senha</h1>
            <p className="text-muted-foreground">
              Digite o codigo recebido e escolha uma nova senha.
            </p>
          </div>

          <div className="h-px bg-border" />

          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Se existir uma conta com este e-mail, enviamos um codigo. Digite-o abaixo com a nova senha.
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
                className={errors.email ? "border-destructive" : ""}
                disabled={isPending}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Codigo</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Codigo do e-mail"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (errors.code) setErrors((current) => ({ ...current, code: undefined }));
                }}
                className={errors.code ? "border-destructive" : ""}
                disabled={isPending}
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    if (errors.newPassword) {
                      setErrors((current) => ({ ...current, newPassword: undefined }));
                    }
                  }}
                  className={errors.newPassword ? "border-destructive" : ""}
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              <p className="text-xs text-muted-foreground">
                Minimo 8 caracteres, com maiuscula, minuscula, numero e simbolo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (errors.confirmPassword) {
                    setErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }
                }}
                className={errors.confirmPassword ? "border-destructive" : ""}
                disabled={isPending}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isPending}>
              <KeyRound className="mr-2 h-4 w-4" />
              {resetMutation.isPending ? "Redefinindo..." : "Redefinir senha"}
            </Button>

            <div className="flex flex-col items-center gap-2 text-sm">
              <button
                type="button"
                onClick={onResend}
                disabled={isPending}
                className="text-primary transition-colors hover:underline disabled:opacity-60"
              >
                {resendMutation.isPending ? "Reenviando..." : "Reenviar codigo"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/", { replace: true })}
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </button>
            </div>
          </form>

          <div className="h-px bg-border" />

          <p className="text-center text-xs text-muted-foreground">Sistema Comercial do Portal Revalida © 2026</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
