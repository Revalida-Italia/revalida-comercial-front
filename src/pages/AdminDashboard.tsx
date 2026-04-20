import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  defaultCommissionPercentage,
  formatMoney,
  formatPercent,
  gatewayLabels,
  getAdminSummary,
  monthlyCostOptions,
  moduleNames,
  paymentTaxRules,
  paymentTypeLabels,
} from "@/lib/mockData";
import { useState } from "react";

const AdminDashboard = () => {
  const summary = getAdminSummary();
  const [commissionRate, setCommissionRate] = useState(String(defaultCommissionPercentage));
  const [fixedCosts, setFixedCosts] = useState(String(summary.monthlyCost));
  const fixedCostNumber = Number(fixedCosts) || 0;
  const liveMargin = fixedCostNumber > 0 ? (summary.paidAmountBRL / fixedCostNumber) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Painel admin</h1>
        <p className="mt-1 text-muted-foreground">Visão consolidada das vendas, regras de taxação e impacto em margem e comissão.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="space-y-3 p-6">
            <Label>Comissão padrão do vendedor (%)</Label>
            <Input type="number" value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} />
            <p className="text-xs text-muted-foreground">Mock editável para a demo. Os contratos atuais seguem a configuração gravada em cada venda.</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="space-y-3 p-6">
            <Label>Custos fixos mensais (R$)</Label>
            <Input type="number" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} placeholder="0.00" />
            <p className="text-xs text-muted-foreground">Referências mockadas: {monthlyCostOptions.map((option) => `${option.monthLabel} ${formatMoney(option.amount)}`).join(" • ")}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="space-y-3 p-6">
            <Label>Margem real mensal</Label>
            <p className="text-3xl font-semibold text-primary">{formatPercent(liveMargin)}</p>
            <p className="text-xs text-muted-foreground">Fórmula de demo: valor real recebido dividido por custos fixos do mês.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Valor real recebido</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatMoney(summary.paidAmountBRL)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total de contratos</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatMoney(summary.totalContractsBRL)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Comissões previstas</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatMoney(summary.totalCommissionBRL)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Vendas registradas</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.sales.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Taxas por gateway e método</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(paymentTaxRules).map(([gateway, rules]) => (
              <div key={gateway} className="rounded-3xl border border-border/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-foreground">{gatewayLabels[gateway as keyof typeof gatewayLabels]}</p>
                  <Badge variant="outline">Tabela ativa</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(rules).map(([paymentType, rate]) => (
                    <div key={`${gateway}-${paymentType}`} className="flex items-center justify-between rounded-2xl bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-foreground">{paymentTypeLabels[paymentType as keyof typeof paymentTypeLabels]}</span>
                      <span className="font-semibold text-foreground">{formatPercent(rate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Comissões por vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.commissionsBySeller.map((seller) => (
              <div key={seller.sellerName} className="rounded-3xl border border-border/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{seller.sellerName}</p>
                    <p className="text-sm text-muted-foreground">{seller.salesCount} venda(s) • Comissão {formatPercent(seller.commissionRate)}</p>
                  </div>
                  <Badge variant="secondary">{formatMoney(seller.totalCommissionBRL)}</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Recebido</p>
                    <p className="font-semibold text-foreground">{formatMoney(seller.paidAmountBRL)}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Comissão total</p>
                    <p className="font-semibold text-foreground">{formatMoney(seller.totalCommissionBRL)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Breakdown consolidado das vendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.sales.map((sale) => (
            <div key={sale.id} className="rounded-3xl border border-border/60 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">{sale.sellerName} • {sale.clientNames.join(", ")}</p>
                  <p className="text-sm text-muted-foreground">{sale.createdAt} • {sale.products.map((product) => moduleNames[product]).join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{formatMoney(sale.contractValue, sale.currency)}</Badge>
                  <Badge variant="secondary">{formatMoney(sale.totalCommissionBRL)}</Badge>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="py-3 pr-3 font-medium">Pagamento</th>
                      <th className="py-3 pr-3 font-medium">Gateway</th>
                      <th className="py-3 pr-3 font-medium">Base BRL</th>
                      <th className="py-3 pr-3 font-medium">Taxa</th>
                      <th className="py-3 pr-3 font-medium">Após taxa</th>
                      <th className="py-3 text-right font-medium">Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.commissionLines.map((line) => (
                      <tr key={line.id} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-3 text-foreground">
                          {paymentTypeLabels[line.paymentType]}
                          {line.installmentNumber ? ` • Parcela ${line.installmentNumber}` : ""}
                        </td>
                        <td className="py-3 pr-3 text-foreground">{gatewayLabels[line.gateway]}</td>
                        <td className="py-3 pr-3 text-foreground">{formatMoney(line.amountBRL)}</td>
                        <td className="py-3 pr-3 text-foreground">{formatPercent(line.appliedTaxPercentage)}</td>
                        <td className="py-3 pr-3 text-foreground">{formatMoney(line.valueAfterTaxBRL)}</td>
                        <td className="py-3 text-right font-semibold text-primary">{formatMoney(line.finalValueBRL)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
