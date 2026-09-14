import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import DisplayCurrencySelect from "@/components/DisplayCurrencySelect";
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
import { fetchExchangeRates, type DisplayCurrency } from "@/services/exchangeRatesApi";
import type { CashMovementKind, CashMovementStatus } from "@/services/treasuryApi";
import { convertToBrl, formatRateDateLabel } from "@/shared/utils/exchange";
import { formatCurrency } from "@/shared/utils/format";

type BankOption = { id: string; name: string; institution: string };
type CenterOption = { id: string; name: string; code: string | null };

export type CreateCashMovementFormPayload = {
  direction: "IN" | "OUT";
  kind: CashMovementKind;
  amount: number;
  currency: DisplayCurrency;
  dueDate: string;
  bankAccountId: string;
  costCenterId?: string | null;
  description?: string | null;
  status: CashMovementStatus;
  paidAt?: string | null;
};

type CashMovementDialogProps = {
  open: boolean;
  bankAccounts: BankOption[];
  costCenters: CenterOption[];
  initialDate?: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCashMovementFormPayload) => void;
};

const KIND_OPTIONS: Array<{ value: CashMovementKind; label: string; direction: "IN" | "OUT" }> = [
  { value: "MANUAL_RECEIVABLE", label: "Entrada manual", direction: "IN" },
  { value: "MANUAL_PAYABLE", label: "Saída / a pagar", direction: "OUT" },
  { value: "REFUND", label: "Estorno", direction: "OUT" },
];

const NONE_VALUE = "__none__";

const CashMovementDialog = ({
  open,
  bankAccounts,
  costCenters,
  initialDate,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CashMovementDialogProps) => {
  const [kind, setKind] = useState<CashMovementKind>("MANUAL_PAYABLE");
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<DisplayCurrency>("BRL");
  const [dueDate, setDueDate] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [costCenterId, setCostCenterId] = useState(NONE_VALUE);
  const [status, setStatus] = useState<CashMovementStatus>("PENDING");
  const [description, setDescription] = useState("");

  const needsExchangeRates = inputCurrency !== "BRL";
  const exchangeRatesQuery = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: fetchExchangeRates,
    enabled: open && needsExchangeRates,
  });

  useEffect(() => {
    if (!open) return;
    setKind("MANUAL_PAYABLE");
    setAmount("");
    setInputCurrency("BRL");
    setDueDate(initialDate || format(new Date(), "yyyy-MM-dd"));
    setBankAccountId(bankAccounts[0]?.id ?? "");
    setCostCenterId(NONE_VALUE);
    setStatus("PENDING");
    setDescription("");
  }, [open, initialDate, bankAccounts]);

  const selectedKind = KIND_OPTIONS.find((item) => item.value === kind) ?? KIND_OPTIONS[0];
  const numericAmount = Number(amount);
  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const exchangeRates = exchangeRatesQuery.data?.rates ?? null;
  const hasExchangeRatesReady = !needsExchangeRates || Boolean(exchangeRates);
  const brlEquivalent = useMemo(() => {
    if (!hasValidAmount) return null;
    if (!needsExchangeRates) return numericAmount;
    if (!exchangeRates) return null;
    try {
      return convertToBrl(numericAmount, inputCurrency, exchangeRates);
    } catch {
      return null;
    }
  }, [hasValidAmount, needsExchangeRates, numericAmount, inputCurrency, exchangeRates]);

  const handleSubmit = () => {
    const bankId = bankAccountId || bankAccounts[0]?.id;
    if (!bankId || !dueDate || !hasValidAmount) {
      toast.error("Preencha conta, valor e data.");
      return;
    }
    if (needsExchangeRates && !exchangeRates) {
      toast.error("Cotação indisponível para converter o valor para BRL.");
      return;
    }

    onSubmit({
      kind,
      direction: selectedKind.direction,
      amount: numericAmount,
      currency: inputCurrency,
      dueDate,
      bankAccountId: bankId,
      costCenterId: costCenterId === NONE_VALUE ? null : costCenterId,
      description: description.trim() || null,
      status,
      paidAt: status === "PAID" ? dueDate : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            Entrada, saída ou estorno. O lançamento aparece como evento no calendário e é sempre gravado em BRL.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as CashMovementKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DisplayCurrencySelect
            label="Moeda do valor"
            value={inputCurrency}
            onChange={setInputCurrency}
            ratesStale={Boolean(exchangeRatesQuery.data?.stale) && needsExchangeRates}
            rateDate={exchangeRatesQuery.data?.rateDate}
            triggerClassName="w-full"
          />

          <div className="grid gap-2">
            <Label>Valor ({inputCurrency})</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Vencimento</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Conta</Label>
            <Select value={bankAccountId || bankAccounts[0]?.id || ""} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Centro (opcional)</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>
                {costCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CashMovementStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex.: reembolso cliente X"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
            {needsExchangeRates && exchangeRatesQuery.isLoading && <p>Carregando cotação...</p>}
            {needsExchangeRates && exchangeRatesQuery.isError && (
              <p className="text-destructive">
                Não foi possível carregar a cotação. Use BRL ou tente novamente.
              </p>
            )}
            {needsExchangeRates && exchangeRates && (
              <div className="space-y-1">
                <p>
                  1 USD = {formatCurrency(exchangeRates.USD, "BRL")}
                  {" · "}
                  1 EUR = {formatCurrency(exchangeRates.EUR, "BRL")}
                  {exchangeRatesQuery.data?.rateDate
                    ? ` · ${formatRateDateLabel(exchangeRatesQuery.data.rateDate)}`
                    : ""}
                </p>
                {brlEquivalent != null && (
                  <p>
                    Valor gravado em BRL: <strong>{formatCurrency(brlEquivalent, "BRL")}</strong>
                  </p>
                )}
              </div>
            )}
            {!needsExchangeRates && (
              <p>A movimentação é gravada em BRL. USD e EUR usam a cotação do dia e guardam a taxa usada.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || bankAccounts.length === 0 || (needsExchangeRates && !hasExchangeRatesReady)}
          >
            {isSubmitting ? "Salvando..." : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashMovementDialog;
