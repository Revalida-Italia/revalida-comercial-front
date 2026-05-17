import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Banknote, CreditCard, Landmark, MinusCircle, Package, Plus, Trash2, TrendingDown, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createSale, listGatewayFees, listProducts } from "@/lib/commercialApi";
import type { CreateSaleCustomer } from "@/lib/commercialApi";
import { buildCommissionBreakdown, normalizeCommissionRate } from "@/lib/commission";
import { getProfile } from "@/lib/session";

const STEP_LABELS = ["Clientes", "Produto", "Pagamentos", "Resumo"];
const MAX_INSTALLMENTS = 120;

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ENTRY: "Entrada",
  INSTALLMENT: "Parcelamento",
  SUBSCRIPTION: "Assinatura",
  FULL_PAYMENT: "A vista",
};

type SalePaymentDraft = {
  gateway: string;
  paymentType: string;
  amount: string;
  totalInstallments: string;
};

const EMPTY_CUSTOMER: CreateSaleCustomer = { name: "", document: "" };
const EMPTY_PAYMENT: SalePaymentDraft = { gateway: "", paymentType: "", amount: "", totalInstallments: "1" };

function normalizeInstallments(rawValue: string): string {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }
  const normalized = Math.max(1, Math.min(Number(digitsOnly), MAX_INSTALLMENTS));
  return String(normalized);
}

const NewSale = () => {
  const queryClient = useQueryClient();
  const profile = getProfile();

  const [step, setStep] = useState(1);

  // Step 1: Customers
  const [customers, setCustomers] = useState<CreateSaleCustomer[]>([{ ...EMPTY_CUSTOMER }]);

  // Step 2: Product
  const [productId, setProductId] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  // Step 3: Payments
  const [currency, setCurrency] = useState("BRL");
  const [payments, setPayments] = useState<SalePaymentDraft[]>([{ ...EMPTY_PAYMENT }]);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const gatewayFeesQuery = useQuery({
    queryKey: ["gateway-fees"],
    queryFn: listGatewayFees,
    enabled: step >= 3,
  });

  const productName = productsQuery.data?.find((p) => p.id === productId)?.name;
  const commissionRate = useMemo(() => {
    const profileAny = profile as unknown as Record<string, unknown> | null;
    const careerPlanAny = (profileAny?.careerPlan as Record<string, unknown> | undefined) ?? {};

    const candidates: unknown[] = [
      careerPlanAny.individualCommissionRate,
      careerPlanAny.commissionPercentage,
      profileAny?.individualCommissionRate,
      profileAny?.commissionPercentage,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeCommissionRate(candidate);
      if (normalized > 0) {
        return normalized;
      }
    }

    return 0;
  }, [profile]);

  const filledCustomers = useMemo(
    () => customers.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), document: c.document?.trim() || undefined })),
    [customers],
  );

  function getFeeRate(gateway: string, paymentType: string): number {
    if (!gateway || !paymentType) return 0;
    const feeConfig = gatewayFeesQuery.data?.find((item) => item.gateway === gateway);
    return feeConfig?.paymentOptions.find((option) => option.paymentType === paymentType)?.feeRate ?? 0;
  }

  function paymentGrossValue(payment: SalePaymentDraft): number {
    const amount = Number(payment.amount);
    if (!amount) return 0;
    if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
      return amount * (Number(normalizeInstallments(payment.totalInstallments || "1")) || 1);
    }
    return amount;
  }

  const configuredPayments = useMemo(
    () => payments
      .filter((payment) => Number(payment.amount) > 0 && payment.gateway && payment.paymentType)
      .map((payment) => ({
        gateway: payment.gateway,
        paymentType: payment.paymentType,
        amount: Number(payment.amount),
        totalInstallments: ["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)
          ? Number(normalizeInstallments(payment.totalInstallments || "1"))
          : undefined,
        feeRate: getFeeRate(payment.gateway, payment.paymentType),
      })),
    [payments, gatewayFeesQuery.data],
  );

  const commissionBreakdown = useMemo(
    () => buildCommissionBreakdown(configuredPayments, commissionRate),
    [configuredPayments, commissionRate],
  );

  const totalSaleValue = commissionBreakdown.totalGross;
  const estimatedCommission = commissionBreakdown.totalCommission;

  const canGoStep2 = filledCustomers.length > 0;
  const canGoStep3 = Boolean(productId && releaseDate);

  const hasValidPayments = payments.length > 0
    && payments.every((payment) => {
      const amountOk = Number(payment.amount) > 0;
      const baseOk = Boolean(payment.gateway && payment.paymentType && amountOk);
      if (!baseOk) return false;
      if (["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType)) {
        return Number(normalizeInstallments(payment.totalInstallments || "1")) >= 1;
      }
      return true;
    });

  const canGoStep4 = hasValidPayments;
  const canSubmit = canGoStep2 && canGoStep3 && canGoStep4 && Boolean(profile?.sub);

  function updateCustomer(index: number, field: keyof CreateSaleCustomer, value: string) {
    setCustomers((prev) => prev.map((customer, i) => (i === index ? { ...customer, [field]: value } : customer)));
  }

  function addCustomer() {
    setCustomers((prev) => [...prev, { ...EMPTY_CUSTOMER }]);
  }

  function removeCustomer(index: number) {
    setCustomers((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePayment(index: number, field: keyof SalePaymentDraft, value: string) {
    setPayments((prev) => prev.map((payment, i) => {
      if (i !== index) return payment;
      if (field === "gateway") {
        return { ...payment, gateway: value, paymentType: "" };
      }
      if (field === "paymentType") {
        return {
          ...payment,
          paymentType: value,
          totalInstallments: payment.totalInstallments || "1",
        };
      }
      if (field === "totalInstallments") {
        return { ...payment, totalInstallments: normalizeInstallments(value) };
      }
      return { ...payment, [field]: value };
    }));
  }

  function addPayment() {
    setPayments((prev) => [...prev, { ...EMPTY_PAYMENT }]);
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.sub) {
        throw new Error("Usuario sem sub/externalId no perfil.");
      }

      if (configuredPayments.length === 0) {
        throw new Error("Adicione pelo menos um pagamento valido.");
      }

      await createSale({
        sellerId: profile.sub,
        currency,
        clients: filledCustomers.map((c) => ({
          nameCiphertext: c.name,
          documentCiphertext: c.document ?? "",
        })),
        items: [{ productId, releaseDate }],
        payments: configuredPayments.map((payment) => ({
          gateway: payment.gateway,
          type: payment.paymentType,
          amount: payment.amount,
          ...(payment.totalInstallments ? { totalInstallments: payment.totalInstallments } : {}),
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda criada com sucesso.");
      setStep(1);
      setCustomers([{ ...EMPTY_CUSTOMER }]);
      setProductId("");
      setReleaseDate("");
      setCurrency("BRL");
      setPayments([{ ...EMPTY_PAYMENT }]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar venda.");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nova venda</h1>
        <p className="text-muted-foreground">Preencha as informacoes passo a passo.</p>
      </div>

      <div className="flex items-center">
        {STEP_LABELS.map((label, index) => {
          const n = index + 1;
          const isActive = step === n;
          const isDone = step > n;
          return (
            <div key={n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? "\u2713" : n}
                </div>
                <span className={`text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div className={`mx-4 h-px w-8 flex-shrink-0 ${isDone ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customers.map((customer, index) => (
                  <div key={index} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Cliente {index + 1}</span>
                      {customers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomer(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Nome *</Label>
                        <Input
                          value={customer.name}
                          onChange={(event) => updateCustomer(index, "name", event.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Documento</Label>
                        <Input
                          value={customer.document ?? ""}
                          onChange={(event) => updateCustomer(index, "document", event.target.value)}
                          placeholder="CPF, RG, passaporte..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="w-full gap-2" onClick={addCustomer}>
                  <Plus className="h-4 w-4" />
                  Adicionar cliente
                </Button>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(2)} disabled={!canGoStep2}>
                    Proximo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Produto</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Produto *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={productsQuery.isLoading ? "Carregando produtos..." : "Selecione um produto"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(productsQuery.data ?? []).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Data de liberacao *</Label>
                  <Input type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Data em que o produto estara disponivel para o cliente.
                  </p>
                </div>

                <div className="md:col-span-2 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!canGoStep3}>
                    Proximo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payments.map((payment, index) => {
                  const gatewayConfig = gatewayFeesQuery.data?.find((item) => item.gateway === payment.gateway);
                  const feeRate = getFeeRate(payment.gateway, payment.paymentType);
                  const amount = Number(payment.amount);
                  const installments = Number(payment.totalInstallments) || 1;
                  const paymentValue = paymentGrossValue(payment);

                  return (
                    <div key={index} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Pagamento {index + 1}</span>
                        {payments.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removePayment(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Gateway *</Label>
                          <Select
                            value={payment.gateway}
                            onValueChange={(value) => updatePayment(index, "gateway", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={gatewayFeesQuery.isLoading ? "Carregando..." : "Selecione"} />
                            </SelectTrigger>
                            <SelectContent>
                              {(gatewayFeesQuery.data ?? []).map((gatewayItem) => (
                                <SelectItem key={gatewayItem.gateway} value={gatewayItem.gateway}>
                                  {gatewayItem.gateway}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Forma de pagamento *</Label>
                          <Select
                            value={payment.paymentType}
                            onValueChange={(value) => updatePayment(index, "paymentType", value)}
                            disabled={!payment.gateway}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {(gatewayConfig?.paymentOptions ?? []).map((option) => (
                                <SelectItem key={option.paymentType} value={option.paymentType}>
                                  {PAYMENT_TYPE_LABELS[option.paymentType] ?? option.paymentType} - taxa {option.feeRate}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>
                            Valor{["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType) ? " por parcela/mes" : ""} *
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={payment.amount}
                            onChange={(event) => updatePayment(index, "amount", event.target.value)}
                            placeholder="0,00"
                          />
                        </div>

                        {["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType) && (
                          <div className="space-y-1.5">
                            <Label>{payment.paymentType === "SUBSCRIPTION" ? "Meses *" : "Parcelas *"}</Label>
                            <Input
                              type="number"
                              min="1"
                              max={MAX_INSTALLMENTS}
                              value={payment.totalInstallments}
                              onChange={(event) => updatePayment(index, "totalInstallments", event.target.value)}
                              onWheel={(event) => event.currentTarget.blur()}
                            />
                          </div>
                        )}
                      </div>

                      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                        {amount > 0 ? (
                          <div className="space-y-1">
                            <p>
                              Taxa do gateway: <strong>{feeRate}%</strong>
                            </p>
                            <p>
                              Valor deste pagamento: <strong>{paymentValue.toLocaleString("pt-BR", { style: "currency", currency })}</strong>
                            </p>
                            {["INSTALLMENT", "SUBSCRIPTION"].includes(payment.paymentType) && (
                              <p>
                                {payment.paymentType === "SUBSCRIPTION" ? "Meses" : "Parcelas"}: <strong>{installments}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p>Preencha o valor para visualizar os totais.</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button variant="outline" size="sm" className="w-full gap-2" onClick={addPayment}>
                  <Plus className="h-4 w-4" />
                  Adicionar pagamento
                </Button>

                <div className="md:col-span-2 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!canGoStep4}>
                    Proximo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Confirmar venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mx-auto max-w-2xl space-y-4 text-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Clientes
                    </div>
                    {filledCustomers.length === 0 ? (
                      <p className="italic text-muted-foreground">Nenhum cliente adicionado</p>
                    ) : (
                      <ul className="space-y-1">
                        {filledCustomers.map((customer, index) => (
                          <li key={index}>
                            <p className="font-medium leading-tight">{customer.name}</p>
                            {customer.document && <p className="text-xs text-muted-foreground">{customer.document}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      Produto
                    </div>
                    {productName ? (
                      <>
                        <p className="font-medium">{productName}</p>
                        {releaseDate && <p className="text-xs text-muted-foreground">Liberacao: {releaseDate}</p>}
                      </>
                    ) : (
                      <p className="italic text-muted-foreground">Nao selecionado</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" />
                      Pagamentos
                    </div>
                    {configuredPayments.length === 0 ? (
                      <p className="italic text-muted-foreground">Nenhum pagamento configurado</p>
                    ) : (
                      <ul className="space-y-2">
                        {configuredPayments.map((payment, index) => (
                          <li key={index} className="rounded-md border p-2">
                            <p className="font-medium">{payment.gateway}</p>
                            <p className="text-muted-foreground">
                              {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                              {(() => {
                                const feeRate = getFeeRate(payment.gateway, payment.paymentType);
                                return feeRate > 0 ? ` - taxa ${feeRate}%` : "";
                              })()}
                            </p>
                            <p className="font-medium">
                              {paymentGrossValue({
                                gateway: payment.gateway,
                                paymentType: payment.paymentType,
                                amount: String(payment.amount),
                                totalInstallments: String(payment.totalInstallments ?? 1),
                              }).toLocaleString("pt-BR", { style: "currency", currency })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Comissao estimada
                    </div>
                    {configuredPayments.length > 0 ? (
                      <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                        <p className="text-xl font-bold text-primary">
                          {estimatedCommission.toLocaleString("pt-BR", { style: "currency", currency })}
                        </p>
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Award className="h-3 w-3" />
                            {profile?.careerPlan?.name ?? "Nao carregado"} · {commissionBreakdown.commissionRate}%
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Banknote className="h-3 w-3" />
                            Bruto total: {commissionBreakdown.totalGross.toLocaleString("pt-BR", { style: "currency", currency })}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Landmark className="h-3 w-3" />
                            Taxas gateway: {commissionBreakdown.totalFees.toLocaleString("pt-BR", { style: "currency", currency })}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingDown className="h-3 w-3" />
                            Liquido: {commissionBreakdown.totalNet.toLocaleString("pt-BR", { style: "currency", currency })}
                          </p>
                        </div>
                        <div className="space-y-2 pt-1">
                          {commissionBreakdown.payments.map((payment, idx) => (
                            <div key={`${payment.gateway}-${payment.paymentType}-${idx}`} className="rounded-md border bg-background p-2 space-y-0.5">
                              <p className="text-xs font-semibold text-foreground">
                                {payment.gateway} · {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3 w-3" /> Bruto: {payment.grossAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                              <p className="flex items-center gap-1 text-xs text-muted-foreground"><MinusCircle className="h-3 w-3" /> Taxa ({payment.feeRate}%): {payment.feeAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                              <p className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="h-3 w-3" /> Liquido: {payment.netAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                              <p className="flex items-center gap-1 text-xs font-medium text-primary"><TrendingUp className="h-3 w-3" /> Comissao: {payment.commissionAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                              {payment.paymentType === "SUBSCRIPTION" && payment.monthlyCommissions && (
                                <div className="mt-1.5 rounded border border-dashed p-1.5 space-y-1">
                                  <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                    <CreditCard className="h-3 w-3" /> {payment.monthlyCommissions.length} parcelas mensais
                                  </p>
                                  {payment.monthlyCommissions.slice(0, 24).map((month) => (
                                    <div key={month.month} className="flex justify-between text-[11px] text-muted-foreground">
                                      <span>Mês {month.month}</span>
                                      <span className="space-x-2">
                                        <span className="text-muted-foreground/70">bruto {month.grossAmount.toLocaleString("pt-BR", { style: "currency", currency })}</span>
                                        <span className="font-medium text-foreground">→ {month.commissionAmount.toLocaleString("pt-BR", { style: "currency", currency })}</span>
                                      </span>
                                    </div>
                                  ))}
                                  {payment.monthlyCommissions.length > 24 && (
                                    <p className="text-[11px] text-muted-foreground">... +{payment.monthlyCommissions.length - 24} meses</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="italic text-muted-foreground">Preencha os pagamentos para calcular</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Voltar
                  </Button>
                  <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
                    {mutation.isPending ? "Salvando..." : "Confirmar venda"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Previa da venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Clientes
                </div>
                {filledCustomers.length === 0 ? (
                  <p className="italic text-muted-foreground">Nenhum cliente adicionado</p>
                ) : (
                  <ul className="space-y-1">
                    {filledCustomers.map((customer, index) => (
                      <li key={index}>
                        <p className="font-medium leading-tight">{customer.name}</p>
                        {customer.document && <p className="text-xs text-muted-foreground">{customer.document}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Produto
                </div>
                {productName ? (
                  <>
                    <p className="font-medium">{productName}</p>
                    {releaseDate && <p className="text-xs text-muted-foreground">Liberacao: {releaseDate}</p>}
                  </>
                ) : (
                  <p className="italic text-muted-foreground">Nao selecionado</p>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pagamentos
                </div>
                {configuredPayments.length === 0 ? (
                  <p className="italic text-muted-foreground">Nenhum pagamento configurado</p>
                ) : (
                  <ul className="space-y-2">
                    {configuredPayments
                      .map((payment, index) => (
                        <li key={index} className="rounded-md border p-2">
                          <p className="font-medium">{payment.gateway}</p>
                          <p className="text-muted-foreground">
                            {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                            {(() => {
                              const feeRate = getFeeRate(payment.gateway, payment.paymentType);
                              return feeRate > 0 ? ` - taxa ${feeRate}%` : "";
                            })()}
                          </p>
                          <p className="font-medium">
                            {paymentGrossValue({
                              gateway: payment.gateway,
                              paymentType: payment.paymentType,
                              amount: String(payment.amount),
                              totalInstallments: String(payment.totalInstallments ?? 1),
                            }).toLocaleString("pt-BR", { style: "currency", currency })}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Comissao estimada
                </div>
                {configuredPayments.length > 0 ? (
                  <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xl font-bold text-primary">
                      {estimatedCommission.toLocaleString("pt-BR", { style: "currency", currency })}
                    </p>

                    <div className="space-y-0.5">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Award className="h-3 w-3" />
                        {profile?.careerPlan?.name ?? "Nao carregado"} · {commissionBreakdown.commissionRate}%
                      </p>
                      {commissionBreakdown.commissionRate === 0 && (
                        <p className="text-xs text-amber-700">
                          Taxa nao encontrada; recarregue o login.
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Banknote className="h-3 w-3" />
                        Bruto total: {commissionBreakdown.totalGross.toLocaleString("pt-BR", { style: "currency", currency })}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Landmark className="h-3 w-3" />
                        Taxas gateway: {commissionBreakdown.totalFees.toLocaleString("pt-BR", { style: "currency", currency })}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        Liquido: {commissionBreakdown.totalNet.toLocaleString("pt-BR", { style: "currency", currency })}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {commissionBreakdown.payments.map((payment, idx) => (
                        <div key={`${payment.gateway}-${payment.paymentType}-${idx}`} className="rounded-md border bg-background p-2 space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            {payment.gateway} · {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3 w-3" /> Bruto: {payment.grossAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground"><MinusCircle className="h-3 w-3" /> Taxa ({payment.feeRate}%): {payment.feeAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingDown className="h-3 w-3" /> Liquido: {payment.netAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>
                          <p className="flex items-center gap-1 text-xs font-medium text-primary"><TrendingUp className="h-3 w-3" /> Comissao: {payment.commissionAmount.toLocaleString("pt-BR", { style: "currency", currency })}</p>

                          {payment.paymentType === "SUBSCRIPTION" && payment.monthlyCommissions && (
                            <div className="mt-1.5 rounded border border-dashed p-1.5 space-y-1">
                              <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                <CreditCard className="h-3 w-3" /> {payment.monthlyCommissions.length} parcelas mensais
                              </p>
                              {payment.monthlyCommissions.slice(0, 24).map((month) => (
                                <div key={month.month} className="flex justify-between text-[11px] text-muted-foreground">
                                  <span>Mês {month.month}</span>
                                  <span className="space-x-2">
                                    <span className="text-muted-foreground/70">bruto {month.grossAmount.toLocaleString("pt-BR", { style: "currency", currency })}</span>
                                    <span className="font-medium text-foreground">→ {month.commissionAmount.toLocaleString("pt-BR", { style: "currency", currency })}</span>
                                  </span>
                                </div>
                              ))}
                              {payment.monthlyCommissions.length > 24 && (
                                <p className="text-[11px] text-muted-foreground">... +{payment.monthlyCommissions.length - 24} meses</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="italic text-muted-foreground">Preencha os pagamentos para calcular</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewSale;
