import { Badge } from "@/components/ui/badge";
import { Notranslate } from "@/components/Notranslate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listCareerPlans } from "@/services/careerPlansApi";
import {
  createUserByAdmin,
  listSystemRoles,
  type CreateUserInput,
  type UserRole,
} from "@/services/usersApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ShieldPlus, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapCreateUserError(error: unknown): string {
  const fallback = "Nao foi possivel criar o usuario. Tente novamente.";
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message;

  if (message.includes("USER_ALREADY_EXISTS")) {
    return "Usuario ja existe.";
  }

  if (message.includes("CAREER_PLAN_NOT_FOUND")) {
    return "Plano de carreira nao encontrado.";
  }

  if (message.includes("CAREER_PLAN_NOT_ALLOWED_FOR_ROLE")) {
    return "Este perfil nao aceita plano de carreira.";
  }

  if (message.includes("COGNITO_CREATE_FAILED") || message.includes("COGNITO_GROUP_NOT_FOUND")) {
    return "Nao foi possivel criar o usuario no autenticador. Tente novamente.";
  }

  if (message.includes("COGNITO_USER_POOL_NOT_CONFIGURED")) {
    return "Servidor de autenticacao nao configurado.";
  }

  if (message.includes("INTERNAL_ERROR")) {
    return "Nao foi possivel concluir a operacao. Tente novamente.";
  }

  if (message.includes("400")) {
    return "Dados invalidos. Verifique os campos obrigatorios.";
  }

  return message || fallback;
}

const AdminCreateUserFeature = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [careerPlanId, setCareerPlanId] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const {
    data: roleOptions = [],
    isLoading: isLoadingRoles,
    isError: isRolesError,
  } = useQuery({
    queryKey: ["systemRoles"],
    queryFn: listSystemRoles,
  });

  const { data: careerPlans = [], isLoading: isLoadingCareerPlans } = useQuery({
    queryKey: ["careerPlans"],
    queryFn: listCareerPlans,
  });

  const selectedRoleOption = useMemo(
    () => roleOptions.find((option) => option.value === role),
    [role, roleOptions],
  );

  const allowsCareerPlan = selectedRoleOption?.allowsCareerPlan === true;

  useEffect(() => {
    if (!allowsCareerPlan) {
      setCareerPlanId("");
    }
  }, [allowsCareerPlan]);

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCareerPlanId = careerPlanId.trim();
      const normalizedTemporaryPassword = temporaryPassword.trim();

      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        throw new Error("Informe um email valido.");
      }

      if (!normalizedName) {
        throw new Error("Informe o nome do usuario.");
      }

      if (!role) {
        throw new Error("Selecione o perfil do usuario.");
      }

      if (!normalizedTemporaryPassword || !PASSWORD_PATTERN.test(normalizedTemporaryPassword)) {
        throw new Error("Senha temporaria invalida. Use 8+ caracteres com maiuscula, minuscula, numero e simbolo.");
      }

      const payload: CreateUserInput = {
        email: normalizedEmail,
        role,
        name: normalizedName,
        temporaryPassword: normalizedTemporaryPassword,
        ...(allowsCareerPlan && normalizedCareerPlanId
          ? { careerPlanId: normalizedCareerPlanId }
          : {}),
      };

      await createUserByAdmin(payload);
    },
    onSuccess: () => {
      const hadCareerPlan = Boolean(careerPlanId.trim());
      toast.success(
        hadCareerPlan
          ? "Usuário criado. A data de início no plano foi definida como hoje; ajuste em Gerenciar carreira se precisar de data retroativa."
          : "Usuario criado com sucesso.",
      );
      setName("");
      setEmail("");
      setRole("");
      setCareerPlanId("");
      setTemporaryPassword("");
    },
    onError: (error: unknown) => {
      toast.error(mapCreateUserError(error));
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createUserMutation.mutate();
  };

  const isSubmitting = createUserMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.05] shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        <CardHeader className="relative">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">
            <Sparkles className="h-3.5 w-3.5" />
            Fluxo Admin
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Criar Usuário
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm text-muted-foreground">
            Cadastro rápido de usuários com perfil, plano de carreira e senha temporária.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dados do novo usuário</CardTitle>
            <CardDescription>
              Envie apenas campos válidos. Em caso de erro, os dados do formulário são mantidos.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin-create-user-name">Nome</Label>
                  <Input
                    id="admin-create-user-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex: Joao Silva"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-create-user-email">Email</Label>
                  <Input
                    id="admin-create-user-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@empresa.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin-create-user-role">Perfil</Label>
                  {isLoadingRoles ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={role}
                      onValueChange={(value: UserRole) => setRole(value)}
                      disabled={isSubmitting || isRolesError || roleOptions.length === 0}
                    >
                      <SelectTrigger id="admin-create-user-role">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {isRolesError ? (
                    <p className="text-xs text-destructive">Nao foi possivel carregar os perfis.</p>
                  ) : null}
                  {selectedRoleOption ? (
                    <p className="text-xs text-muted-foreground">{selectedRoleOption.hint}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-create-user-career-plan">Plano de carreira (opcional)</Label>
                  <Select
                    value={careerPlanId}
                    onValueChange={setCareerPlanId}
                    disabled={isSubmitting || isLoadingCareerPlans || !allowsCareerPlan}
                  >
                    <SelectTrigger id="admin-create-user-career-plan">
                      <SelectValue
                        placeholder={allowsCareerPlan ? "Selecionar plano" : "Indisponivel para este perfil"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {careerPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <Notranslate>{plan.name}</Notranslate>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {careerPlanId && allowsCareerPlan ? (
                    <p className="text-xs text-muted-foreground">
                      Na criação, a data de início no plano será hoje. Para data retroativa, use Gerenciar carreira após criar o usuário.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-create-user-temporary-password">Senha temporaria</Label>
                <Input
                  id="admin-create-user-temporary-password"
                  type="password"
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  placeholder="Ex: SenhaTemp@123"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Regras: minimo 8 caracteres, com letra maiuscula, minuscula, numero e simbolo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button type="submit" className="min-w-40 gap-2" disabled={isSubmitting}>
                  <ShieldPlus className="h-4 w-4" />
                  {isSubmitting ? "Criando..." : "Criar usuario"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setName("");
                    setEmail("");
                    setRole("");
                    setCareerPlanId("");
                    setTemporaryPassword("");
                  }}
                >
                  Limpar formulario
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Checklist de criacao</CardTitle>
            <CardDescription>Dicas para cadastro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/80 bg-card/90 p-3">
              <p className="mb-2 font-medium">Validacoes importantes</p>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  Email valido e perfil obrigatorio.
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  Plano de carreira apenas para perfis comerciais (`allowsCareerPlan`).
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  Gestor de custos acessa somente o calendário de custos fixos.
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  A senha é temporária e será solicitada a troca no primeiro login.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCreateUserFeature;
