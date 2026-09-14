import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SaleContractClient } from "@/services/contractsApi";

export type PortalLocale = "pt" | "en" | "es" | "it";

export type ProvisionPortalUserInput = {
  name: string;
  email: string;
  password: string;
  document?: string;
  phone?: string;
  locale: PortalLocale;
  sendAccessEmail: boolean;
};

const LOCALE_OPTIONS: Array<{ value: PortalLocale; label: string }> = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
];

type FormState = {
  name: string;
  email: string;
  password: string;
  document: string;
  phone: string;
  locale: PortalLocale;
  sendAccessEmail: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: SaleContractClient | null;
  isPending?: boolean;
  onSubmit: (input: ProvisionPortalUserInput) => Promise<void>;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function ProvisionPortalUserDialog({
  open,
  onOpenChange,
  client,
  isPending = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    document: "",
    phone: "",
    locale: "pt",
    sendAccessEmail: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setError(null);
    setShowPassword(false);
    setForm({
      name: client.name ?? "",
      email: client.email?.trim() || "",
      password: "",
      document: client.document ?? "",
      phone: client.phone?.trim() || "",
      locale: "pt",
      sendAccessEmail: true,
    });
  }, [open, client]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const document = form.document.trim();
    const phone = form.phone.trim();
    const password = form.password;

    if (!name) {
      setError("Informe o nome.");
      return;
    }
    if (!email) {
      setError("Informe o e-mail.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("E-mail inválido.");
      return;
    }
    if (!password) {
      setError("Informe a senha.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("A senha precisa de maiúscula, minúscula, número e caractere especial.");
      return;
    }

    try {
      await onSubmit({
        name,
        email,
        password,
        locale: form.locale,
        sendAccessEmail: form.sendAccessEmail,
        ...(document ? { document } : {}),
        ...(phone ? { phone } : {}),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar conta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova conta no portal</DialogTitle>
          <DialogDescription>
            Mesmos dados do cadastro de aluno no portal. O perfil fica fixo em Aluno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Conta do aluno
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="portal-user-name">Nome</Label>
            <Input
              id="portal-user-name"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="Nome completo"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-user-email">E-mail</Label>
            <Input
              id="portal-user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              placeholder="usuario@revalida.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-user-password">Senha</Label>
            <div className="relative">
              <Input
                id="portal-user-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value="student" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Aluno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select
                value={form.locale}
                onValueChange={(value) => setForm((c) => ({ ...c, locale: value as PortalLocale }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-user-document">Documento (opcional)</Label>
            <Input
              id="portal-user-document"
              value={form.document}
              onChange={(e) => setForm((c) => ({ ...c, document: e.target.value }))}
              placeholder="CPF ou documento"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-user-phone">Telefone (opcional)</Label>
            <Input
              id="portal-user-phone"
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
              placeholder="Com DDI se possível"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Enviar e-mail de acesso</p>
              <p className="text-xs text-muted-foreground">
                Envia o link da plataforma, usuário e senha inicial para o e-mail cadastrado.
              </p>
            </div>
            <Switch
              checked={form.sendAccessEmail}
              onCheckedChange={(checked) => setForm((c) => ({ ...c, sendAccessEmail: checked }))}
              aria-label="Enviar e-mail de acesso"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
