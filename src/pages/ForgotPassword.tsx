import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPasswordResetErrorMessage,
  persistResetEmail,
  requestPasswordReset,
} from "@/services/authApi";
import loginBg from "@/assets/login-bg.jpg";

interface ForgotPasswordLocationState {
  email?: string;
}

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ForgotPasswordLocationState | null) ?? null;

  const [email, setEmail] = useState(state?.email?.trim() ?? "");
  const [emailError, setEmailError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: async () => {
      await requestPasswordReset(email);
    },
    onSuccess: () => {
      const normalized = email.trim().toLowerCase();
      persistResetEmail(normalized);
      toast.success("Se existir uma conta com este e-mail, enviamos um codigo.");
      navigate(`/redefinir-senha?email=${encodeURIComponent(normalized)}`, { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getPasswordResetErrorMessage(error));
    },
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("E-mail e obrigatorio");
      toast.error("Informe o e-mail da conta.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("E-mail invalido");
      toast.error("Informe um e-mail valido.");
      return;
    }

    setEmailError(undefined);
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        <img src={loginBg} alt="Background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 gradient-primary opacity-70" />
        <div className="relative z-10 flex items-end p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="mb-2 text-4xl font-display font-bold text-primary-foreground">Recuperar senha</h2>
            <p className="text-lg text-primary-foreground/70">Enviaremos um codigo para o seu e-mail</p>
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
            <h1 className="text-3xl font-body font-bold text-foreground">Esqueceu a senha?</h1>
            <p className="text-muted-foreground">
              Informe o e-mail da sua conta. Se existir, enviaremos um codigo de recuperacao.
            </p>
          </div>

          <div className="h-px bg-border" />

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError(undefined);
                }}
                className={emailError ? "border-destructive" : ""}
                disabled={mutation.isPending}
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>

            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={mutation.isPending}>
              {mutation.isPending ? "Enviando..." : "Enviar codigo"}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </button>
          </form>

          <div className="h-px bg-border" />

          <p className="text-center text-xs text-muted-foreground">Sistema Comercial do Portal Revalida © 2026</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
