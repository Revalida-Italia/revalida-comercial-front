import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { mockSales, currencySymbols, paymentTypeLabels } from "@/lib/mockData";
import { useState } from "react";
import { AlertCircle } from "lucide-react";

const AdminDashboard = () => {
  const [taxRate, setTaxRate] = useState("17");
  const [commissionRate, setCommissionRate] = useState("5");
  const [fixedCosts, setFixedCosts] = useState("");

  const totalContracts = mockSales.reduce((a, s) => a + s.contractValue, 0);
  const realReceived = 14200; // Mock
  const margin = fixedCosts ? ((realReceived / parseFloat(fixedCosts)) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Painel Admin</h1>
        <p className="text-muted-foreground mt-1">Processamento e gestão financeira</p>
      </div>

      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-foreground text-sm">Protótipo — Visão Admin</p>
          <p className="text-sm text-muted-foreground">
            As regras de cálculo do admin ainda não estão implementadas. Esta é uma visualização de referência.
          </p>
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="glass-card">
          <CardContent className="p-6 space-y-3">
            <Label>Taxa de Intermediação (%)</Label>
            <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Aplicada sobre Hotmart, Asaas, Wise, PayPal</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6 space-y-3">
            <Label>Comissão do Vendedor (%)</Label>
            <Input type="number" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Sobre o valor real recebido</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6 space-y-3">
            <Label>Custos Fixos Mensais (R$)</Label>
            <Input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(e.target.value)} placeholder="0,00" />
            <p className="text-xs text-muted-foreground">Inserção manual</p>
          </CardContent>
        </Card>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total de Contratos (Mês)</p>
            <p className="text-2xl font-bold text-foreground mt-1">R$ {totalContracts.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Valor Real Recebido</p>
            <p className="text-2xl font-bold text-foreground mt-1">R$ {realReceived.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Margem Real Mensal</p>
            <p className="text-2xl font-bold text-primary mt-1">{margin}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Vendas por Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vendedor</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Contrato</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Produtos</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Pagamento</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {mockSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2 text-foreground">Usuário Demo</td>
                    <td className="py-3 px-2 text-foreground">{sale.clientNames.join(", ")}</td>
                    <td className="py-3 px-2 text-foreground">
                      {currencySymbols[sale.currency]} {sale.contractValue.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-2">
                      {sale.modules.map((m) => (
                        <Badge key={m} variant="outline" className="mr-1 text-xs">M{m}</Badge>
                      ))}
                    </td>
                    <td className="py-3 px-2 text-foreground">
                      {sale.payments.map((p) => paymentTypeLabels[p.type]).join(", ")}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-foreground">
                      {sale.commission != null ? `R$ ${sale.commission.toLocaleString("pt-BR")}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
