import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, resolveProfile } from "@/lib/authApi";
import { consumeAuthNotice, setProfile, setSession } from "@/lib/session";
import loginBg from "@/assets/login-bg.jpg";

const SESSION_EXPIRED_REASON = "session-expired";
const SESSION_EXPIRED_MESSAGE = "Sessao encerrada. Faca login novamente.";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const notice = consumeAuthNotice();
    const reason = new URLSearchParams(window.location.search).get("reason");

    if (!notice && reason !== SESSION_EXPIRED_REASON) {
      return;
    }

    const message = notice ?? SESSION_EXPIRED_MESSAGE;
    setAuthMessage(message);
    toast.error(message);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const authResult = await login(email, password);
      setSession(authResult.session);

      const profile = await resolveProfile(authResult.userId, {
        email: authResult.email,
        role: authResult.role,
      });

      setProfile(profile);
      return profile;
    },
    onSuccess: (profile) => {
      toast.success("Login realizado com sucesso.");
      navigate(profile.role === "ADMIN" ? "/admin" : "/dashboard", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel autenticar.");
    },
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (!email) {
      nextErrors.email = "E-mail e obrigatorio";
    }
    if (!password) {
      nextErrors.password = "Senha e obrigatoria";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Preencha os campos obrigatorios.");
      return;
    }

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
            <h2 className="mb-2 text-4xl font-display font-bold text-primary-foreground">Sistema Comercial</h2>
            <p className="text-lg text-primary-foreground/70">Gerencie suas vendas de forma eficiente</p>
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
            <h1 className="text-3xl font-body font-bold text-foreground">Bem-vindo!</h1>
            <p className="text-muted-foreground">Insira seu e-mail e senha para continuar.</p>
          </div>

          <div className="h-px bg-border" />

          {authMessage && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {authMessage}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) {
                    setErrors((current) => ({ ...current, email: undefined }));
                  }
                }}
                className={errors.email ? "border-destructive" : ""}
                disabled={mutation.isPending}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) {
                      setErrors((current) => ({ ...current, password: undefined }));
                    }
                  }}
                  className={errors.password ? "border-destructive" : ""}
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="text-right">
              <button type="button" className="text-sm text-primary hover:underline">
                Esqueci minha senha?
              </button>
            </div>

            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={mutation.isPending}>
              {mutation.isPending ? "Entrando..." : "Acessar"}
            </Button>
          </form>

          <div className="h-px bg-border" />

          <p className="text-center text-xs text-muted-foreground">Sistema Comerciald Portal Revalida © 2026</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
