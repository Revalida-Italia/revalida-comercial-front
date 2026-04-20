import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import loginBg from "@/assets/login-bg.jpg";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "E-mail é obrigatório";
    if (!password) newErrors.password = "Senha é obrigatória";
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Prototype: just navigate
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={loginBg} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-primary opacity-70" />
        <div className="relative z-10 flex items-end p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-4xl font-display font-bold text-primary-foreground mb-2">
              Sistema Comercial
            </h2>
            <p className="text-primary-foreground/70 text-lg">
              Gerencie suas vendas de forma eficiente
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-body font-bold text-foreground">
              Bem-vindo!
            </h1>
            <p className="text-muted-foreground">
              Insira seu e-mail e senha para continuar.
            </p>
          </div>

          <div className="h-px bg-border" />

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="text-right">
              <button type="button" className="text-sm text-primary hover:underline">
                Esqueci minha senha?
              </button>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold">
              Acessar
            </Button>
          </form>

          <div className="h-px bg-border" />

          <p className="text-center text-xs text-muted-foreground">
            Sistema Comercial © 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
