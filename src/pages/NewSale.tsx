import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { gatewayOptions, currencySymbols } from "@/lib/mockData";

const steps = ["Dados da Venda", "Módulos", "Pagamentos", "Revisão"];

type Currency = "EUR" | "USD" | "BRL";

interface PaymentRow {
  type: string;
  value: string;
  currency: Currency;
  gateway: string;
  installments: string;
  installmentValue: string;
}

const NewSale = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1
  const [slots, setSlots] = useState("1");
  const [clientNames, setClientNames] = useState<string[]>([""]);
  const [contractValue, setContractValue] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");

  // Step 2
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [moduleDates, setModuleDates] = useState<Record<number, string>>({});

  // Step 3
  const [payments, setPayments] = useState<PaymentRow[]>([
    { type: "", value: "", currency: "EUR", gateway: "", installments: "", installmentValue: "" },
  ]);

  const slotsNum = parseInt(slots) || 1;

  const handleSlotsChange = (val: string) => {
    const num = parseInt(val) || 1;
    setSlots(val);
    setClientNames((prev) => {
      const arr = [...prev];
      while (arr.length < num) arr.push("");
      return arr.slice(0, num);
    });
  };

  const toggleModule = (m: number) => {
    setSelectedModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort()
    );
  };

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      { type: "", value: "", currency, gateway: "", installments: "", installmentValue: "" },
    ]);
  };

  const removePayment = (idx: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePayment = (idx: number, field: keyof PaymentRow, val: string) => {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  };

  const handleSubmit = () => {
    toast.success("Venda registrada com sucesso!", {
      description: "O admin irá processar o cálculo da comissão.",
    });
    navigate("/vendas");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Nova Venda</h1>
        <p className="text-muted-foreground mt-1">Registre o fechamento de uma venda</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                i < step
                  ? "bg-success text-success-foreground"
                  : i === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Dados da Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Quantidade de Vagas</Label>
                    <Input type="number" min="1" value={slots} onChange={(e) => handleSlotsChange(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">€ Euro</SelectItem>
                        <SelectItem value="USD">$ Dólar</SelectItem>
                        <SelectItem value="BRL">R$ Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Nome(s) do(s) Cliente(s)</Label>
                  {clientNames.map((name, i) => (
                    <Input
                      key={i}
                      placeholder={`Cliente ${i + 1}`}
                      value={name}
                      onChange={(e) => {
                        const arr = [...clientNames];
                        arr[i] = e.target.value;
                        setClientNames(arr);
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Valor Total do Contrato</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      {currencySymbols[currency]}
                    </span>
                    <Input
                      type="number"
                      className="pl-10"
                      placeholder="0,00"
                      value={contractValue}
                      onChange={(e) => setContractValue(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Produtos / Módulos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleModule(m)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        selectedModules.includes(m)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        selectedModules.includes(m) ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {selectedModules.includes(m) && <Check className="h-3 w-3" />}
                      </div>
                      <p className="font-medium text-foreground">Módulo {m}</p>
                    </button>
                  ))}
                </div>

                {selectedModules.length > 1 && (
                  <div className="space-y-4">
                    <Label>Datas de Liberação por Módulo</Label>
                    {selectedModules.map((m) => (
                      <div key={m} className="flex items-center gap-4">
                        <Badge variant="outline">Módulo {m}</Badge>
                        <Input
                          type="date"
                          value={moduleDates[m] || ""}
                          onChange={(e) => setModuleDates((prev) => ({ ...prev, [m]: e.target.value }))}
                          className="max-w-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {selectedModules.length > 1 && (
                  <div className="space-y-4">
                    <Label>Valores por Data (se datas diferentes)</Label>
                    {selectedModules.map((m) => (
                      <div key={m} className="flex items-center gap-4">
                        <Badge variant="outline">Valor {m}</Badge>
                        <div className="relative flex-1 max-w-xs">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {currencySymbols[currency]}
                          </span>
                          <Input type="number" className="pl-10" placeholder="0,00" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display">Fluxo de Pagamento</CardTitle>
                  <Button variant="outline" size="sm" onClick={addPayment}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {payments.map((p, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Pagamento {idx + 1}</p>
                      {payments.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removePayment(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <Select value={p.type} onValueChange={(v) => updatePayment(idx, "type", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reserva">Reserva de Vaga (PIX)</SelectItem>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="avista">À Vista</SelectItem>
                            <SelectItem value="parcelamento">Parcelamento</SelectItem>
                            <SelectItem value="recorrencia">Assinatura/Recorrência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Local de Pagamento</Label>
                        <Select value={p.gateway} onValueChange={(v) => updatePayment(idx, "gateway", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {gatewayOptions.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {currencySymbols[currency]}
                          </span>
                          <Input
                            type="number"
                            className="pl-10"
                            placeholder="0,00"
                            value={p.value}
                            onChange={(e) => updatePayment(idx, "value", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Moeda</Label>
                        <Select value={p.currency} onValueChange={(v) => updatePayment(idx, "currency", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EUR">€ Euro</SelectItem>
                            <SelectItem value="USD">$ Dólar</SelectItem>
                            <SelectItem value="BRL">R$ Real</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(p.type === "parcelamento" || p.type === "recorrencia") && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Qtd de Parcelas</Label>
                          <Input
                            type="number"
                            min="1"
                            value={p.installments}
                            onChange={(e) => updatePayment(idx, "installments", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor da Parcela</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              {currencySymbols[p.currency]}
                            </span>
                            <Input
                              type="number"
                              className="pl-10"
                              placeholder="0,00"
                              value={p.installmentValue}
                              onChange={(e) => updatePayment(idx, "installmentValue", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Revisão da Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Vagas</p><p className="font-medium text-foreground">{slots}</p></div>
                  <div><p className="text-muted-foreground">Cliente(s)</p><p className="font-medium text-foreground">{clientNames.filter(Boolean).join(", ") || "—"}</p></div>
                  <div><p className="text-muted-foreground">Valor do Contrato</p><p className="font-medium text-foreground">{currencySymbols[currency]} {contractValue || "0"}</p></div>
                  <div><p className="text-muted-foreground">Módulos</p><p className="font-medium text-foreground">{selectedModules.map((m) => `Módulo ${m}`).join(", ") || "—"}</p></div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Pagamentos</p>
                  {payments.filter((p) => p.type).map((p, i) => (
                    <div key={i} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span className="text-foreground capitalize">{p.type.replace("avista", "à vista")} — {p.gateway}</span>
                      <span className="font-medium text-foreground">{currencySymbols[p.currency]} {p.value || "0"}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Comissão</p>
                  <p className="text-lg font-semibold text-primary">Será calculada pelo Admin</p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? navigate("/dashboard") : setStep(step - 1))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 0 ? "Cancelar" : "Voltar"}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Próximo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit}>
            Registrar Venda
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewSale;
