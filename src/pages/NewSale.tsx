import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createMockSale,
  currencyLabels,
  currencySymbols,
  demoSellerName,
  formatMoney,
  formatPercent,
  gatewayLabels,
  gatewayOptions,
  getGatewayTaxRate,
  moduleNames,
  paymentTypeDescriptions,
  paymentTypeLabels,
  previewSaleFromDraft,
  productOptions,
  type Currency,
  type PaymentGateway,
  type PaymentType,
  type ProductCode,
} from "@/lib/mockData";

const steps = ["Dados da venda", "Cronograma dos módulos", "Pagamentos", "Revisão"];
const today = new Date().toISOString().slice(0, 10);

interface PaymentFormRow {
  id: string;
  type: PaymentType | "";
  value: string;
  currency: Currency;
  gateway: PaymentGateway | "";
  firstDueDate: string;
  installments: string;
  installmentValue: string;
}

interface ModuleFormFields {
  releaseDate: string;
  value: string;
}

const createPaymentRow = (currency: Currency): PaymentFormRow => ({
  id: `payment-${Math.random().toString(36).slice(2, 10)}`,
  type: "",
  value: "",
  currency,
  gateway: "",
  firstDueDate: today,
  installments: "",
  installmentValue: "",
});

const isRecurringType = (paymentType: PaymentType | "") =>
  paymentType === "INSTALLMENT" || paymentType === "SUBSCRIPTION";

const NewSale = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [slots, setSlots] = useState("1");
  const [clientNames, setClientNames] = useState<string[]>([""]);
  const [contractValue, setContractValue] = useState("");
  const [currency, setCurrency] = useState<Currency>("BRL");

  const [selectedProducts, setSelectedProducts] = useState<ProductCode[]>([]);
  const [moduleFields, setModuleFields] = useState<Record<string, ModuleFormFields>>({});

  const [payments, setPayments] = useState<PaymentFormRow[]>([createPaymentRow("BRL")]);

  const slotsCount = Math.max(Number(slots) || 1, 1);
  const contractNumber = Number(contractValue) || 0;

  const setSlotsValue = (nextValue: string) => {
    const nextCount = Math.max(Number(nextValue) || 1, 1);
    setSlots(nextValue);
    setClientNames((currentNames) => {
      const nextNames = [...currentNames];
      while (nextNames.length < nextCount) {
        nextNames.push("");
      }
      return nextNames.slice(0, nextCount);
    });
  };

  const updateClientName = (index: number, value: string) => {
    setClientNames((currentNames) => currentNames.map((name, currentIndex) => (currentIndex === index ? value : name)));
  };

  const toggleProduct = (product: ProductCode) => {
    setSelectedProducts((currentProducts) => {
      const exists = currentProducts.includes(product);
      if (exists) {
        return currentProducts.filter((currentProduct) => currentProduct !== product);
      }

      return [...currentProducts, product];
    });

    setModuleFields((currentFields) => ({
      ...currentFields,
      [product]: currentFields[product] ?? { releaseDate: today, value: "" },
    }));
  };

  const updateModuleField = (product: ProductCode, field: keyof ModuleFormFields, value: string) => {
    setModuleFields((currentFields) => ({
      ...currentFields,
      [product]: {
        ...(currentFields[product] ?? { releaseDate: today, value: "" }),
        [field]: value,
      },
    }));
  };

  const addPayment = () => {
    setPayments((currentPayments) => [...currentPayments, createPaymentRow(currency)]);
  };

  const removePayment = (paymentId: string) => {
    setPayments((currentPayments) => currentPayments.filter((payment) => payment.id !== paymentId));
  };

  const updatePayment = (paymentId: string, field: keyof PaymentFormRow, value: string) => {
    setPayments((currentPayments) =>
      currentPayments.map((payment) => {
        if (payment.id !== paymentId) {
          return payment;
        }

        if (field === "type") {
          const nextType = value as PaymentType;
          return {
            ...payment,
            type: nextType,
            gateway: nextType === "SLOT_RESERVATION" ? "PIX" : payment.gateway,
            value: isRecurringType(nextType) ? "" : payment.value,
          };
        }

        if (field === "gateway") {
          return { ...payment, gateway: value as PaymentGateway };
        }

        if (field === "currency") {
          return { ...payment, currency: value as Currency };
        }

        return { ...payment, [field]: value };
      })
    );
  };

  const moduleTotal = selectedProducts.reduce((total, product) => {
    const value = Number(moduleFields[product]?.value) || 0;
    return total + value;
  }, 0);

  const paymentTotal = payments.reduce((total, payment) => {
    if (isRecurringType(payment.type)) {
      return total + (Number(payment.installments) || 0) * (Number(payment.installmentValue) || 0);
    }

    return total + (Number(payment.value) || 0);
  }, 0);

  const getDraftPreview = () => {
    if (!contractNumber || selectedProducts.length === 0) {
      return null;
    }

    const normalizedClientNames = clientNames.map((name) => name.trim()).filter(Boolean);
    const moduleSchedules = selectedProducts
      .map((product) => {
        const fields = moduleFields[product];
        const value = Number(fields?.value);

        if (!fields?.releaseDate || !value) {
          return null;
        }

        return {
          product,
          releaseDate: fields.releaseDate,
          value,
        };
      })
      .filter(Boolean);

    if (moduleSchedules.length !== selectedProducts.length) {
      return null;
    }

    const paymentDrafts = payments
      .map((payment) => {
        if (!payment.type || !payment.firstDueDate) {
          return null;
        }

        const gateway = payment.type === "SLOT_RESERVATION" ? "PIX" : payment.gateway;
        if (!gateway) {
          return null;
        }

        const recurring = isRecurringType(payment.type);
        const installments = recurring ? Number(payment.installments) : undefined;
        const installmentValue = recurring ? Number(payment.installmentValue) : undefined;
        const totalValue = recurring
          ? (installments || 0) * (installmentValue || 0)
          : Number(payment.value);

        if (!totalValue) {
          return null;
        }

        return {
          type: payment.type,
          value: totalValue,
          currency: payment.currency,
          gateway,
          firstDueDate: payment.firstDueDate,
          installments,
          installmentValue,
        };
      })
      .filter(Boolean);

    if (paymentDrafts.length !== payments.length) {
      return null;
    }

    return previewSaleFromDraft({
      sellerName: demoSellerName,
      clientNames: normalizedClientNames,
      slots: slotsCount,
      contractValue: contractNumber,
      currency,
      moduleSchedules,
      payments: paymentDrafts,
    });
  };

  const preview = getDraftPreview();

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (!contractNumber || contractNumber <= 0) {
        return "Informe o valor total do contrato.";
      }

      if (slotsCount < 1) {
        return "A venda precisa ter pelo menos uma vaga.";
      }

      const emptyClientName = clientNames.some((name) => !name.trim());
      if (emptyClientName) {
        return "Preencha o nome de todos os clientes vinculados à venda.";
      }
    }

    if (stepIndex === 1) {
      if (selectedProducts.length === 0) {
        return "Selecione pelo menos um módulo vendido.";
      }

      const missingModuleFields = selectedProducts.some((product) => {
        const fields = moduleFields[product];
        return !fields?.releaseDate || !(Number(fields.value) > 0);
      });

      if (missingModuleFields) {
        return "Cada módulo precisa de data de liberação e valor específico.";
      }

      if (Math.abs(moduleTotal - contractNumber) > 0.01) {
        return "A soma dos módulos precisa fechar o valor total do contrato.";
      }
    }

    if (stepIndex === 2) {
      if (payments.length === 0) {
        return "Adicione pelo menos uma linha de pagamento.";
      }

      const invalidPayment = payments.some((payment) => {
        if (!payment.type || !payment.firstDueDate) {
          return true;
        }

        if (payment.type !== "SLOT_RESERVATION" && !payment.gateway) {
          return true;
        }

        if (isRecurringType(payment.type)) {
          return !(Number(payment.installments) > 0 && Number(payment.installmentValue) > 0);
        }

        return !(Number(payment.value) > 0);
      });

      if (invalidPayment) {
        return "Revise as linhas de pagamento e preencha todos os campos obrigatórios.";
      }

      if (Math.abs(paymentTotal - contractNumber) > 0.01) {
        return "A soma dos pagamentos precisa fechar o valor total do contrato.";
      }
    }

    return null;
  };

  const goToNextStep = () => {
    const validationError = validateStep(step);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  };

  const submitSale = () => {
    const validationError = validateStep(0) || validateStep(1) || validateStep(2);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!preview) {
      toast.error("Não foi possível gerar a prévia da venda. Revise os dados e tente novamente.");
      return;
    }

    const sale = createMockSale({
      clientNames: preview.clientNames,
      slots: preview.slots,
      contractValue: preview.contractValue,
      currency: preview.currency,
      moduleSchedules: preview.moduleSchedules,
      payments: preview.payments.map((payment) => ({
        type: payment.type,
        value: payment.value,
        currency: payment.currency,
        gateway: payment.gateway,
        firstDueDate: payment.firstDueDate,
        installments: payment.installments,
        installmentValue: payment.installmentValue,
      })),
    });

    toast.success("Venda registrada com sucesso.", {
      description: `Comissão prevista: ${formatMoney(sale.totalCommissionBRL)} em ${sale.commissionLines.length} linha(s) de pagamento.`,
    });
    navigate("/vendas");
  };

  const renderStepNavigation = () => (
    <div className="flex items-center gap-2 self-start md:self-auto">
      <Button type="button" variant="outline" onClick={() => (step === 0 ? navigate("/dashboard") : setStep(step - 1))}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        {step === 0 ? "Cancelar" : "Voltar"}
      </Button>

      {step < steps.length - 1 ? (
        <Button type="button" onClick={goToNextStep}>
          Próximo
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" onClick={submitSale}>
          Registrar venda
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1460px] space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Nova venda</h1>
          <p className="mt-1 text-muted-foreground">
            Monte o contrato, distribua os módulos e simule a comissão conforme gateway e forma de pagamento.
          </p>
        </div>
        <Card className="glass-card w-full lg:max-w-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vendedora da demo</p>
              <p className="text-lg font-semibold text-foreground">{demoSellerName}</p>
            </div>
            <Badge variant="secondary">Comissão padrão 5%</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                index < step
                  ? "bg-success text-success-foreground"
                  : index === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {index < step ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={`text-sm ${index === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.62fr_0.88fr]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.22 }}
          >
            {step === 0 && (
              <Card className="glass-card">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <CardTitle className="font-display">Dados básicos da venda</CardTitle>
                  {renderStepNavigation()}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Quantidade de vagas</Label>
                      <Input type="number" min="1" value={slots} onChange={(event) => setSlotsValue(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Moeda do contrato</Label>
                      <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(currencyLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {currencySymbols[value as Currency]} {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor total do contrato</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {currencySymbols[currency]}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="pl-14"
                          value={contractValue}
                          onChange={(event) => setContractValue(event.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Nome(s) dos clientes</Label>
                      <Badge variant="outline">{slotsCount} vaga(s)</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {clientNames.map((name, index) => (
                        <Input
                          key={`${index}-${slotsCount}`}
                          placeholder={`Cliente ${index + 1}`}
                          value={name}
                          onChange={(event) => updateClientName(index, event.target.value)}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quando houver mais de uma vaga, todos os nomes precisam ser informados para a venda seguir para revisão.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card className="glass-card">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <CardTitle className="font-display">Cronograma de liberação</CardTitle>
                  {renderStepNavigation()}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {productOptions.map((product) => {
                      const isActive = selectedProducts.includes(product);

                      return (
                        <button
                          key={product}
                          type="button"
                          onClick={() => toggleProduct(product)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            isActive
                              ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                              : "border-border bg-background hover:border-primary/40"
                          }`}
                        >
                          <div className="mb-5 flex items-center justify-between">
                            <Badge variant={isActive ? "default" : "secondary"}>{product.replace("MODULE_", "Módulo ")}</Badge>
                            {isActive && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="font-medium text-foreground">{moduleNames[product]}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Defina valor e data de liberação para este produto.</p>
                        </button>
                      );
                    })}
                  </div>

                  {selectedProducts.length > 0 && (
                    <div className="space-y-4 rounded-3xl border border-border/70 bg-background/70 p-4">
                      <div className="flex items-center justify-between">
                        <Label>Detalhamento por módulo</Label>
                        <Badge variant={Math.abs(moduleTotal - contractNumber) <= 0.01 ? "default" : "secondary"}>
                          Total dos módulos: {formatMoney(moduleTotal, currency)}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {selectedProducts.map((product) => (
                          <div key={product} className="grid gap-3 rounded-2xl border border-border/60 p-3.5 md:grid-cols-[1.1fr_1fr_1fr]">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{moduleNames[product]}</p>
                              <p className="text-xs text-muted-foreground">{product}</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Data de liberação</Label>
                              <Input
                                type="date"
                                value={moduleFields[product]?.releaseDate ?? today}
                                onChange={(event) => updateModuleField(product, "releaseDate", event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Valor do módulo</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={moduleFields[product]?.value ?? ""}
                                onChange={(event) => updateModuleField(product, "value", event.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        O somatório dos módulos precisa fechar exatamente o valor total do contrato para a venda ser registrada.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <CardTitle className="font-display">Configuração de pagamentos</CardTitle>
                    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
                      <Button type="button" variant="outline" onClick={addPayment}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar linha
                      </Button>
                      {renderStepNavigation()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {payments.map((payment, index) => {
                    const recurring = isRecurringType(payment.type);
                    const effectiveGateway = payment.type === "SLOT_RESERVATION" ? "PIX" : payment.gateway;
                    const taxRate = payment.type && effectiveGateway ? getGatewayTaxRate(effectiveGateway, payment.type) : 0;
                    const scheduledTotal = recurring
                      ? (Number(payment.installments) || 0) * (Number(payment.installmentValue) || 0)
                      : Number(payment.value) || 0;

                    return (
                      <div key={payment.id} className="rounded-3xl border border-border/70 bg-background/70 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">Pagamento {index + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.type ? paymentTypeDescriptions[payment.type] : "Escolha a forma de pagamento para liberar a regra de taxação."}
                            </p>
                          </div>
                          {payments.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(payment.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1.1fr_0.95fr_1fr]">
                          <div className="space-y-2">
                            <Label>Forma de pagamento</Label>
                            <Select value={payment.type || undefined} onValueChange={(value) => updatePayment(payment.id, "type", value)}>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(paymentTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Gateway</Label>
                            <Select
                              value={effectiveGateway || undefined}
                              onValueChange={(value) => updatePayment(payment.id, "gateway", value)}
                              disabled={payment.type === "SLOT_RESERVATION"}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {(payment.type === "SLOT_RESERVATION" ? ["PIX"] : gatewayOptions).map((gateway) => (
                                  <SelectItem key={gateway} value={gateway}>
                                    {gatewayLabels[gateway]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Moeda</Label>
                            <Select value={payment.currency} onValueChange={(value) => updatePayment(payment.id, "currency", value)}>
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(currencyLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {currencySymbols[value as Currency]} {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>{recurring ? "Primeira cobrança" : "Data do pagamento"}</Label>
                            <Input
                              type="date"
                              value={payment.firstDueDate}
                              onChange={(event) => updatePayment(payment.id, "firstDueDate", event.target.value)}
                            />
                          </div>
                        </div>

                        {recurring ? (
                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Quantidade de parcelas/cobranças</Label>
                              <Input
                                type="number"
                                min="1"
                                value={payment.installments}
                                onChange={(event) => updatePayment(payment.id, "installments", event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Valor por parcela</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={payment.installmentValue}
                                onChange={(event) => updatePayment(payment.id, "installmentValue", event.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total agendado</p>
                              <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(scheduledTotal, payment.currency)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Comissão calculada por cobrança, nunca sobre o total agregado.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Valor do pagamento</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={payment.value}
                                onChange={(event) => updatePayment(payment.id, "value", event.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Taxa aplicada</p>
                              <p className="mt-2 text-xl font-semibold text-foreground">{formatPercent(taxRate)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {payment.type === "SLOT_RESERVATION"
                                  ? "Reserva de vaga fica fixa no PIX, com taxa de 0%."
                                  : "Taxa puxada da combinação gateway + forma de pagamento."}
                              </p>
                            </div>
                          </div>
                        )}

                        {payment.type && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="outline">Taxa {formatPercent(taxRate)}</Badge>
                            <Badge variant="outline">Total da linha {formatMoney(scheduledTotal, payment.currency)}</Badge>
                            {recurring && <Badge variant="secondary">Comissão por parcela</Badge>}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Fechamento financeiro do contrato</p>
                      <p className="text-xs text-muted-foreground">Use a soma dos pagamentos para fechar exatamente o valor do contrato.</p>
                    </div>
                    <Badge variant={Math.abs(paymentTotal - contractNumber) <= 0.01 ? "default" : "secondary"}>
                      Pagamentos: {formatMoney(paymentTotal, currency)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="glass-card">
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <CardTitle className="font-display">Revisão final da venda</CardTitle>
                  {renderStepNavigation()}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border/60 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Clientes</p>
                      <p className="mt-2 font-semibold text-foreground">{clientNames.join(", ")}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vagas</p>
                      <p className="mt-2 font-semibold text-foreground">{slotsCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Contrato</p>
                      <p className="mt-2 font-semibold text-foreground">{formatMoney(contractNumber, currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Comissão prevista</p>
                      <p className="mt-2 font-semibold text-primary">{preview ? formatMoney(preview.totalCommissionBRL) : "Preencha os dados"}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Módulos vendidos</Label>
                      <Badge variant="outline">{selectedProducts.length} item(ns)</Badge>
                    </div>
                    <div className="space-y-3">
                      {preview?.moduleSchedules.map((moduleSchedule) => (
                        <div key={moduleSchedule.product} className="flex flex-col gap-2 rounded-2xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{moduleNames[moduleSchedule.product]}</p>
                            <p className="text-sm text-muted-foreground">Liberação em {moduleSchedule.releaseDate}</p>
                          </div>
                          <p className="font-semibold text-foreground">{formatMoney(moduleSchedule.value, currency)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Prévia das linhas de comissão</Label>
                      <Badge variant="secondary">{preview?.commissionLines.length ?? 0} eventos</Badge>
                    </div>
                    <div className="space-y-3">
                      {preview?.commissionLines.map((line) => (
                        <div key={line.id} className="grid gap-2.5 rounded-2xl border border-border/60 p-3.5 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:items-center">
                          <div>
                            <p className="font-medium text-foreground">
                              {paymentTypeLabels[line.paymentType]}
                              {line.installmentNumber ? ` • Parcela ${line.installmentNumber}` : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {gatewayLabels[line.gateway]} • {line.paymentDate}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Base</p>
                            <p className="font-medium text-foreground">{formatMoney(line.originalAmount, line.originalCurrency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Após taxa</p>
                            <p className="font-medium text-foreground">{formatMoney(line.valueAfterTaxBRL)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Comissão</p>
                            <p className="font-semibold text-primary">{formatMoney(line.finalValueBRL)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="space-y-5">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Resumo operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3.5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Contrato</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(contractNumber, currency)}</p>
                </div>
                <Badge variant="outline">{currency}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-border/60 p-3.5">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Módulos alocados</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{selectedProducts.length}</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(moduleTotal, currency)} distribuídos</p>
                </div>
                <div className="rounded-2xl border border-border/60 p-3.5">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Pagamentos configurados</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{payments.length}</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(paymentTotal, currency)} planejados</p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Comissão em BRL</p>
                <p className="mt-2 text-2xl font-semibold text-primary">
                  {preview ? formatMoney(preview.totalCommissionBRL) : "Preencha os dados para simular"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cálculo considerando taxa por gateway + método e comissão padrão de 5%.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Regras aplicadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Reserva de vaga força PIX e taxa zero.</p>
              <p>Hotmart e Asaas cobram 4% em pagamento simples e 17% em parcelamento.</p>
              <p>Nubank e Wise aplicam 2% em qualquer forma de pagamento.</p>
              <p>PayPal aplica 10% em todas as modalidades.</p>
              <p>Parcelamento e assinatura geram uma linha de comissão para cada cobrança agendada.</p>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default NewSale;
