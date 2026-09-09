import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DisplayCurrency } from "@/services/exchangeRatesApi";
import {
  createBankAccount,
  createCostCenter,
  getBankBalanceReport,
  listBankAccounts,
  listCostCenters,
  removeBankAccount,
  removeCostCenter,
  setBankInitialBalance,
} from "@/services/treasuryApi";
import { formatCurrency } from "@/shared/utils/format";

const TreasuryFeature = () => {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState("");
  const [bankInstitution, setBankInstitution] = useState("");
  const [bankCurrency, setBankCurrency] = useState<DisplayCurrency>("BRL");
  const [bankInitialBalance, setBankInitialBalance] = useState("");
  const [centerName, setCenterName] = useState("");
  const [centerCode, setCenterCode] = useState("");
  const [pendingInitialByAccount, setPendingInitialByAccount] = useState<Record<string, string>>({});

  const banksQuery = useQuery({
    queryKey: ["treasury-bank-accounts"],
    queryFn: listBankAccounts,
  });

  const centersQuery = useQuery({
    queryKey: ["treasury-cost-centers"],
    queryFn: listCostCenters,
  });

  const balancesQuery = useQuery({
    queryKey: ["treasury-bank-balances"],
    queryFn: getBankBalanceReport,
  });

  const createBankMutation = useMutation({
    mutationFn: createBankAccount,
    onSuccess: async () => {
      setBankName("");
      setBankInstitution("");
      setBankCurrency("BRL");
      setBankInitialBalance("");
      await queryClient.invalidateQueries({ queryKey: ["treasury-bank-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["treasury-bank-balances"] });
      toast.success("Conta bancária criada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setInitialBalanceMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => setBankInitialBalance(id, amount),
    onSuccess: async (_data, variables) => {
      setPendingInitialByAccount((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["treasury-bank-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["treasury-bank-balances"] });
      toast.success("Saldo inicial definido (não editável depois)");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeBankMutation = useMutation({
    mutationFn: removeBankAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["treasury-bank-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["treasury-bank-balances"] });
      toast.success("Conta removida");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createCenterMutation = useMutation({
    mutationFn: createCostCenter,
    onSuccess: async () => {
      setCenterName("");
      setCenterCode("");
      await queryClient.invalidateQueries({ queryKey: ["treasury-cost-centers"] });
      toast.success("Centro de custo criado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeCenterMutation = useMutation({
    mutationFn: removeCostCenter,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["treasury-cost-centers"] });
      toast.success("Centro de custo removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const banks = banksQuery.data ?? [];
  const centers = centersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 px-4 py-4">
        <h1 className="text-xl font-bold tracking-tight">Finanças</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Contas, centros e saldo. Lançamentos de caixa ficam no Calendário de Movimentações.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" />
              Contas bancárias
            </CardTitle>
            <CardDescription>
              Nubank, Wise, Caixa… Saldo inicial só pode ser definido uma vez; depois só via movimentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_90px_110px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!bankName.trim() || !bankInstitution.trim()) return;
                const opening = bankInitialBalance.trim() === "" ? null : Number(bankInitialBalance);
                if (opening != null && (!Number.isFinite(opening) || opening < 0)) {
                  toast.error("Saldo inicial inválido");
                  return;
                }
                createBankMutation.mutate({
                  name: bankName.trim(),
                  institution: bankInstitution.trim(),
                  currency: bankCurrency,
                  initialBalance: opening,
                });
              }}
            >
              <Input
                placeholder="Nome"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <Input
                placeholder="Instituição"
                value={bankInstitution}
                onChange={(e) => setBankInstitution(e.target.value)}
              />
              <Select value={bankCurrency} onValueChange={(v) => setBankCurrency(v as DisplayCurrency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Saldo inicial"
                value={bankInitialBalance}
                onChange={(e) => setBankInitialBalance(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={createBankMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            <ul className="space-y-2">
              {banks.map((account) => (
                <li
                  key={account.id}
                  className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.institution} · {account.currency}
                        {account.initialBalance != null
                          ? ` · Inicial: ${formatCurrency(Number(account.initialBalance))}`
                          : " · Sem saldo inicial"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => removeBankMutation.mutate(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {account.initialBalance == null ? (
                    <form
                      className="mt-2 flex flex-wrap items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const raw = pendingInitialByAccount[account.id] ?? "";
                        const amount = Number(raw);
                        if (!Number.isFinite(amount) || amount < 0) {
                          toast.error("Informe um saldo inicial válido");
                          return;
                        }
                        setInitialBalanceMutation.mutate({ id: account.id, amount });
                      }}
                    >
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 max-w-[140px]"
                        placeholder="Definir inicial"
                        value={pendingInitialByAccount[account.id] ?? ""}
                        onChange={(e) =>
                          setPendingInitialByAccount((prev) => ({
                            ...prev,
                            [account.id]: e.target.value,
                          }))
                        }
                      />
                      <Button type="submit" size="sm" variant="secondary" disabled={setInitialBalanceMutation.isPending}>
                        Definir
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
              {banks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Centros de custo</CardTitle>
            <CardDescription>Brasil, Itália, Comercial, Administrativo…</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-2 sm:grid-cols-[1fr_120px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!centerName.trim()) return;
                createCenterMutation.mutate({
                  name: centerName.trim(),
                  code: centerCode.trim() || undefined,
                });
              }}
            >
              <Input
                placeholder="Nome"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
              />
              <Input
                placeholder="Código"
                value={centerCode}
                onChange={(e) => setCenterCode(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={createCenterMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            <ul className="space-y-2">
              {centers.map((center) => (
                <li
                  key={center.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{center.name}</p>
                    {center.code ? (
                      <p className="text-xs text-muted-foreground">{center.code}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeCenterMutation.mutate(center.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {centers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum centro cadastrado.</p>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Saldo por conta
          </CardTitle>
          <CardDescription>
            Saldo = saldo inicial (se definido) + movimentos pagos (entradas − saídas/estornos). O inicial não é
            editável depois — só muda com IN/OUT no calendário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(balancesQuery.data ?? []).map((row) => (
              <li
                key={row.bankAccount.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{row.bankAccount.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.bankAccount.institution} · {row.bankAccount.currency}
                    {row.bankAccount.initialBalance != null
                      ? ` · Inicial ${formatCurrency(Number(row.bankAccount.initialBalance))}`
                      : ""}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">{formatCurrency(row.balance)}</p>
              </li>
            ))}
            {(balancesQuery.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Cadastre uma conta para ver o saldo.</p>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasuryFeature;
